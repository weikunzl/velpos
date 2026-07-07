from __future__ import annotations

"""AgentGateway implementation for ACP providers."""

import asyncio
from dataclasses import dataclass
import inspect
import logging
import os
import time
from typing import Any, AsyncIterator, Awaitable, Callable

from domain.session.acl.agent_gateway import AgentCapability, AgentGateway, NormalizedMessage
from domain.shared.async_utils import safe_create_task
from infr.client.acp.client_handlers import AcpClientHandlers
from infr.client.acp.cursor_mcp_config import resolve_acp_mcp_servers
from infr.client.acp.message_mapper import map_acp_update
from infr.client.acp.provider import AgentProviderConfig
from infr.client.acp.transport import AcpTransport, StdioTransport


TransportFactory = Callable[[AgentProviderConfig], AcpTransport]

_CLIENT_REQUEST_METHODS = {
    "fs/read_text_file",
    "fs/write_text_file",
    "terminal/create",
    "terminal/output",
    "terminal/wait_for_exit",
    "terminal/kill",
    "terminal/release",
    "session/request_permission",
    "cursor/ask_question",
}


logger = logging.getLogger(__name__)


class AcpPromptCancelled(Exception):
    """Raised when a prompt loop exits due to session/cancel."""


@dataclass
class _AcpConnection:
    transport: AcpTransport
    session_id: str
    acp_session_id: str
    model: str
    cwd: str


class AcpGateway(AgentGateway):
    """Drive an ACP agent through Velpos' provider-agnostic AgentGateway port.

    Args:
        provider: ACP provider configuration.
        transport_factory: Optional factory used by tests and future transport
            implementations. Defaults to spawning a stdio subprocess.
    """

    def __init__(
        self,
        provider: AgentProviderConfig,
        transport_factory: TransportFactory | None = None,
        client_handlers: AcpClientHandlers | None = None,
        user_response_timeout: float = 3600.0,
    ) -> None:
        self.provider = provider
        self._transport_factory = transport_factory or self._default_transport_factory
        self._client_handlers = client_handlers or AcpClientHandlers()
        self._user_response_timeout = user_response_timeout
        self._connections: dict[str, _AcpConnection] = {}
        self._states: dict[str, str] = {}
        self._active_sessions: set[str] = set()
        self._pending_user_responses: dict[str, asyncio.Future[dict[str, Any]]] = {}
        self._pending_request_context: dict[str, dict[str, Any]] = {}
        self._cancel_events: dict[str, asyncio.Event] = {}
        self._broadcast_fn: Callable[[str, dict[str, Any]], Any] | None = None
        self._is_im_bound_fn: Callable[[str], Awaitable[bool]] | None = None
        self._sdk_session_ids: dict[str, str] = {}
        self._idle_timers: dict[str, asyncio.TimerHandle] = {}
        self._last_activity: dict[str, float] = {}
        self._idle_timeout = float(os.getenv("ACP_IDLE_TIMEOUT", os.getenv("CLAUDE_IDLE_TIMEOUT", "300")))
        self._lock = asyncio.Lock()
        self._request_id = 0

    def capabilities(self) -> set[AgentCapability]:
        return {AgentCapability.LOAD, AgentCapability.MODELS}

    async def connect(
        self,
        session_id: str,
        model: str,
        prompt: str,
        cwd: str = "",
        sdk_session_id: str | None = None,
        system_prompt: str | None = None,
        mcp_servers: dict | None = None,
        max_turns: int | None = None,
        max_budget_usd: float | None = None,
        **_ignored_kwargs: Any,
    ) -> AsyncIterator[NormalizedMessage]:
        """Open an ACP connection, create a session, and send the first prompt."""
        connection, resume_meta = await self._open_acp_connection(
            session_id=session_id,
            model=model,
            cwd=cwd,
            sdk_session_id=sdk_session_id,
            mcp_servers=mcp_servers,
        )
        if resume_meta is not None:
            yield resume_meta
        yield {"message_type": "_meta", "sdk_session_id": connection.acp_session_id}
        self._touch(session_id)
        async for message in self._prompt(connection, prompt):
            yield message
        self._states[session_id] = "connected"

    async def open_connection(
        self,
        session_id: str,
        model: str,
        cwd: str = "",
        sdk_session_id: str | None = None,
    ) -> None:
        """Open an ACP connection without prompting."""
        await self._open_acp_connection(session_id, model, cwd, sdk_session_id, None)

    async def send_query(self, session_id: str, prompt: str) -> AsyncIterator[NormalizedMessage]:
        """Send a follow-up prompt on an existing ACP session."""
        connection = self._connections.get(session_id)
        if connection is None:
            raise RuntimeError(f"No active ACP connection for session {session_id}")

        self._touch(session_id)
        async for message in self._prompt(connection, prompt):
            yield message
        self._states[session_id] = "connected"

    async def interrupt(self, session_id: str) -> None:
        """Send ACP session/cancel and stop the active prompt loop."""
        connection = self._connections.get(session_id)
        if connection is None:
            raise RuntimeError(f"No active ACP connection for session {session_id}")

        cancel_event = self._cancel_events.setdefault(session_id, asyncio.Event())
        cancel_event.set()
        await connection.transport.send_json(
            {
                "jsonrpc": "2.0",
                "method": "session/cancel",
                "params": {"sessionId": connection.acp_session_id},
            }
        )
        self._states[session_id] = "interrupted"

    async def disconnect(self, session_id: str) -> None:
        """Close the ACP transport and clear in-memory state."""
        timer = self._idle_timers.pop(session_id, None)
        if timer is not None:
            timer.cancel()
        connection = self._connections.pop(session_id, None)
        if connection is not None:
            await connection.transport.close()
        self._states[session_id] = "idle"
        self._active_sessions.discard(session_id)
        self._cancel_events.pop(session_id, None)
        await self._cancel_pending_response(session_id)

    async def cleanup_session(self, session_id: str) -> None:
        await self.disconnect(session_id)
        self._states.pop(session_id, None)
        self._sdk_session_ids.pop(session_id, None)
        self._last_activity.pop(session_id, None)
        await self._cancel_pending_response(session_id)

    def set_broadcast_fn(self, fn: Callable[[str, dict[str, Any]], Any]) -> None:
        """Set callback used to broadcast permission/choice events to Velpos WS."""
        self._broadcast_fn = fn

    def set_is_im_bound_fn(self, fn: Callable[[str], Awaitable[bool]]) -> None:
        self._is_im_bound_fn = fn

    def get_cached_sdk_session_id(self, session_id: str) -> str | None:
        return self._sdk_session_ids.get(session_id)

    def schedule_idle_disconnect(self, session_id: str, delay: float | None = None) -> None:
        if session_id not in self._connections:
            return
        old = self._idle_timers.pop(session_id, None)
        if old is not None:
            old.cancel()
        delay = delay if delay is not None else self._idle_timeout
        loop = asyncio.get_running_loop()
        self._idle_timers[session_id] = loop.call_later(
            delay,
            lambda sid=session_id: safe_create_task(self._idle_disconnect(sid), name=f"acp_idle_disconnect_{sid}"),
        )

    def _touch(self, session_id: str) -> None:
        self._last_activity[session_id] = time.monotonic()
        timer = self._idle_timers.pop(session_id, None)
        if timer is not None:
            timer.cancel()

    async def _idle_disconnect(self, session_id: str) -> None:
        self._idle_timers.pop(session_id, None)
        if session_id not in self._connections:
            return
        if session_id in self._active_sessions:
            self.schedule_idle_disconnect(session_id)
            return
        async with self._lock:
            has_pending = session_id in self._pending_user_responses
        if has_pending:
            self.schedule_idle_disconnect(session_id)
            return
        if self._is_im_bound_fn:
            try:
                if await self._is_im_bound_fn(session_id):
                    self.schedule_idle_disconnect(session_id)
                    return
            except Exception:
                logger.warning("ACP idle disconnect IM check failed: session=%s", session_id, exc_info=True)
        logger.info("ACP idle disconnect: session=%s", session_id)
        await self.disconnect(session_id)

    async def set_model(self, session_id: str, model: str) -> None:
        connection = self._connections.get(session_id)
        if connection is None:
            return
        connection.model = model

    async def set_permission_mode(self, session_id: str, mode: str) -> None:
        return None

    async def get_models(self) -> list[dict[str, Any]]:
        model = self.provider.default_model
        return [{"value": model, "displayName": model}]

    def is_connected(self, session_id: str) -> bool:
        return session_id in self._connections

    def is_process_alive(self, session_id: str) -> bool:
        connection = self._connections.get(session_id)
        if connection is None:
            return False
        process = getattr(connection.transport, "process", None)
        if process is None:
            return True
        return process.returncode is None

    def get_state(self, session_id: str) -> str:
        return self._states.get(session_id, "idle")

    def get_connected_model(self, session_id: str) -> str | None:
        connection = self._connections.get(session_id)
        return connection.model if connection else None

    def mark_active(self, session_id: str) -> None:
        self._active_sessions.add(session_id)

    def mark_idle(self, session_id: str) -> None:
        self._active_sessions.discard(session_id)

    def is_active(self, session_id: str) -> bool:
        return session_id in self._active_sessions

    def is_waiting_for_user_input(self, session_id: str) -> bool:
        future = self._pending_user_responses.get(session_id)
        return bool(future and not future.done())

    async def resolve_user_response(self, session_id: str, response_data: dict[str, Any]) -> bool:
        async with self._lock:
            future = self._pending_user_responses.get(session_id)
            if future is None or future.done():
                return False
            future.set_result(response_data)
            return True

    async def cancel_pending_response(self, session_id: str) -> bool:
        future = await self._cancel_pending_response(session_id)
        return future is not None

    async def get_pending_request_context(self, session_id: str) -> dict[str, Any] | None:
        async with self._lock:
            future = self._pending_user_responses.get(session_id)
            if future is None or future.done():
                return None
            return self._pending_request_context.get(session_id)

    async def _open_acp_connection(
        self,
        session_id: str,
        model: str,
        cwd: str,
        sdk_session_id: str | None,
        mcp_servers: dict | None,
    ) -> tuple[_AcpConnection, NormalizedMessage | None]:
        await self.disconnect(session_id)
        transport = self._transport_factory(self.provider)
        await transport.start()
        resume_meta: NormalizedMessage | None = None

        try:
            await self._send_request(
                transport,
                "initialize",
                {
                    "protocolVersion": 1,
                    "clientInfo": {"name": "velpos", "version": "0.2.0"},
                    "clientCapabilities": self._client_capabilities(),
                },
            )
            if self.provider.auth_method:
                await self._send_request(
                    transport,
                    "authenticate",
                    {"methodId": self.provider.auth_method},
                )
            acp_session_id, resume_meta = await self._create_or_load_acp_session(
                transport=transport,
                cwd=cwd,
                model=model,
                sdk_session_id=self._resolve_resume_target(session_id, sdk_session_id),
                mcp_servers=mcp_servers,
            )
        except Exception:
            await transport.close()
            self._states[session_id] = "idle"
            raise

        connection = _AcpConnection(
            transport=transport,
            session_id=session_id,
            acp_session_id=acp_session_id,
            model=model,
            cwd=cwd or "",
        )
        self._connections[session_id] = connection
        self._sdk_session_ids[session_id] = acp_session_id
        self._states[session_id] = "connected"
        return connection, resume_meta

    def _resolve_resume_target(self, session_id: str, sdk_session_id: str | None) -> str:
        if sdk_session_id is None:
            return self._sdk_session_ids.get(session_id, "")
        return sdk_session_id

    async def _create_or_load_acp_session(
        self,
        transport: AcpTransport,
        cwd: str,
        model: str,
        sdk_session_id: str,
        mcp_servers: dict | None,
    ) -> tuple[str, NormalizedMessage | None]:
        mcp_payload = _mcp_servers_payload(mcp_servers, cwd=cwd)
        resume_meta: NormalizedMessage | None = None

        if sdk_session_id:
            try:
                await self._send_request(
                    transport,
                    "session/load",
                    {
                        "sessionId": sdk_session_id,
                        "cwd": cwd,
                        "mcpServers": mcp_payload,
                    },
                )
                return sdk_session_id, None
            except Exception:
                logger.warning(
                    "ACP session/load failed for %s, falling back to session/new",
                    sdk_session_id,
                    exc_info=True,
                )
                resume_meta = {"message_type": "_meta", "resume_failed": True}

        result = await self._send_request(
            transport,
            "session/new",
            {
                "cwd": cwd,
                "model": model or self.provider.default_model,
                "sessionId": "",
                "mcpServers": mcp_payload,
            },
        )
        acp_session_id = str(result.get("sessionId") or "")
        if not acp_session_id:
            raise RuntimeError("ACP session/new did not return sessionId")
        return acp_session_id, resume_meta

    async def _prompt(
        self,
        connection: _AcpConnection,
        prompt: str,
    ) -> AsyncIterator[NormalizedMessage]:
        request_id = self._next_request_id()
        cancel_event = self._cancel_events.setdefault(connection.session_id, asyncio.Event())
        cancel_event.clear()
        await connection.transport.send_json(
            {
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "session/prompt",
                "params": {
                    "sessionId": connection.acp_session_id,
                    "prompt": [{"type": "text", "text": prompt}],
                },
            }
        )

        try:
            while True:
                message = await self._receive_message(connection, cancel_event)
                if await self._maybe_handle_inbound(connection, message):
                    continue
                if message.get("method") == "session/update":
                    params = message.get("params") or {}
                    mapped = map_acp_update(params)
                    if mapped is not None:
                        yield mapped
                    continue
                if message.get("id") == request_id:
                    self._raise_if_error("session/prompt", message)
                    yield _synthetic_result_message(message.get("result"))
                    return
        except AcpPromptCancelled:
            return
        finally:
            cancel_event.clear()

    async def _send_request(
        self,
        transport: AcpTransport,
        method: str,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        request_id = self._next_request_id()
        await transport.send_json(
            {
                "jsonrpc": "2.0",
                "id": request_id,
                "method": method,
                "params": params,
            }
        )
        while True:
            response = await self._receive_message(transport)
            if response.get("id") != request_id:
                continue
            self._raise_if_error(method, response)
            result = response.get("result") or {}
            return result if isinstance(result, dict) else {"value": result}

    def _client_capabilities(self) -> dict[str, Any]:
        return {
            "fs": {"readTextFile": True, "writeTextFile": True},
            "terminal": True,
        }

    async def _receive_message(
        self,
        target: AcpTransport | _AcpConnection,
        cancel_event: asyncio.Event | None = None,
    ) -> dict[str, Any]:
        transport = target.transport if isinstance(target, _AcpConnection) else target
        while True:
            if cancel_event is not None and cancel_event.is_set():
                raise AcpPromptCancelled()
            try:
                return await asyncio.wait_for(transport.receive_json(), timeout=0.5)
            except asyncio.TimeoutError:
                continue

    async def _maybe_handle_inbound(
        self,
        connection: _AcpConnection,
        message: dict[str, Any],
    ) -> bool:
        method = message.get("method")
        if method not in _CLIENT_REQUEST_METHODS:
            return False
        if message.get("id") is None:
            return False

        if method in {"session/request_permission", "cursor/ask_question"}:
            await self._handle_agent_request(connection, message)
            return True

        result: dict[str, Any]
        try:
            result = await self._handle_client_capability_request(connection, method, message.get("params") or {})
        except Exception as exc:
            await connection.transport.send_json(
                {
                    "jsonrpc": "2.0",
                    "id": message.get("id"),
                    "error": {"code": -32000, "message": str(exc)},
                }
            )
            return True

        await connection.transport.send_json(
            {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "result": result,
            }
        )
        return True

    async def _handle_client_capability_request(
        self,
        connection: _AcpConnection,
        method: str,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        handlers = self._client_handlers
        cwd = connection.cwd

        if method == "fs/read_text_file":
            content = await handlers.read_text_file(
                cwd=cwd,
                path=str(params.get("path") or ""),
                line=params.get("line"),
                limit=params.get("limit"),
            )
            return {"content": content}

        if method == "fs/write_text_file":
            await handlers.write_text_file(
                cwd=cwd,
                path=str(params.get("path") or ""),
                content=str(params.get("content") or ""),
            )
            return {}

        if method == "terminal/create":
            terminal_id = await handlers.create_terminal(
                cwd=cwd,
                command=str(params.get("command") or ""),
                args=params.get("args"),
                env=params.get("env"),
                terminal_cwd=params.get("cwd"),
                output_byte_limit=params.get("outputByteLimit"),
            )
            return {"terminalId": terminal_id}

        if method == "terminal/output":
            return await handlers.terminal_output(str(params.get("terminalId") or ""))

        if method == "terminal/wait_for_exit":
            result = await handlers.wait_for_terminal_exit(str(params.get("terminalId") or ""))
            return {
                "exitCode": result.get("exitCode"),
                "signal": result.get("signal"),
            }

        if method == "terminal/kill":
            await handlers.kill_terminal(str(params.get("terminalId") or ""))
            return {}

        if method == "terminal/release":
            await handlers.release_terminal(str(params.get("terminalId") or ""))
            return {}

        raise RuntimeError(f"Unhandled ACP client request: {method}")

    def _next_request_id(self) -> int:
        self._request_id += 1
        return self._request_id

    @staticmethod
    def _raise_if_error(method: str, response: dict[str, Any]) -> None:
        error = response.get("error")
        if not error:
            return
        if isinstance(error, dict):
            message = error.get("message") or str(error)
        else:
            message = str(error)
        raise RuntimeError(f"ACP request {method} failed: {message}")

    async def _handle_agent_request(
        self,
        connection: _AcpConnection,
        message: dict[str, Any],
    ) -> None:
        request_id = message.get("id")
        method = str(message.get("method") or "")
        params = message.get("params") or {}
        if not isinstance(params, dict):
            params = {}

        if method == "cursor/ask_question":
            result = await self._ask_user(connection.session_id, request_id, params)
        else:
            result = await self._request_permission(connection.session_id, request_id, params)

        await connection.transport.send_json(
            {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": result,
            }
        )

    async def _request_permission(
        self,
        session_id: str,
        request_id: Any,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        tool_call = params.get("toolCall") or params.get("tool_call") or {}
        if not isinstance(tool_call, dict):
            tool_call = {}

        tool_name = str(
            params.get("toolName")
            or params.get("tool_name")
            or tool_call.get("title")
            or tool_call.get("name")
            or tool_call.get("toolName")
            or tool_call.get("kind")
            or ""
        )
        tool_input = (
            params.get("toolInput")
            or params.get("tool_input")
            or tool_call.get("input")
            or tool_call.get("toolInput")
            or tool_call.get("rawInput")
            or {}
        )
        event_data = {
            "event": "permission_request",
            "tool_name": tool_name,
            "tool_input": str(tool_input)[:500],
        }
        response = await self._await_user_response(
            session_id=session_id,
            context={
                "request_id": request_id,
                "tool_name": tool_name,
                "tool_input": event_data["tool_input"],
            },
            event_data=event_data,
        )
        if response.get("decision") == "allow":
            return {"outcome": "allow"}
        return {
            "outcome": "deny",
            "message": str(response.get("message") or "User denied"),
        }

    async def _ask_user(
        self,
        session_id: str,
        request_id: Any,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        questions = params.get("questions") or []
        event_data = {
            "event": "user_choice_request",
            "tool_name": "cursor/ask_question",
            "questions": questions,
        }
        response = await self._await_user_response(
            session_id=session_id,
            context={
                "request_id": request_id,
                "tool_name": "cursor/ask_question",
                "questions": questions,
            },
            event_data=event_data,
        )
        answers = response.get("answers") or {}
        return {"answers": answers if isinstance(answers, dict) else {}}

    async def _await_user_response(
        self,
        session_id: str,
        context: dict[str, Any],
        event_data: dict[str, Any],
    ) -> dict[str, Any]:
        if self._broadcast_fn is None:
            return {"decision": "deny", "message": "No user interface is attached"}

        loop = asyncio.get_running_loop()
        future: asyncio.Future[dict[str, Any]] = loop.create_future()
        async with self._lock:
            self._pending_user_responses[session_id] = future
            self._pending_request_context[session_id] = context

        self._states[session_id] = "waiting_permission"
        await self._broadcast(session_id, event_data)
        try:
            return await asyncio.wait_for(future, timeout=self._user_response_timeout)
        except asyncio.TimeoutError:
            return {"decision": "deny", "message": "User response timeout"}
        finally:
            async with self._lock:
                self._pending_user_responses.pop(session_id, None)
                self._pending_request_context.pop(session_id, None)
            if self._states.get(session_id) == "waiting_permission":
                self._states[session_id] = "streaming"

    async def _broadcast(self, session_id: str, event_data: dict[str, Any]) -> None:
        if self._broadcast_fn is None:
            return
        result = self._broadcast_fn(session_id, event_data)
        if inspect.isawaitable(result):
            await result

    async def _cancel_pending_response(self, session_id: str) -> asyncio.Future[dict[str, Any]] | None:
        async with self._lock:
            future = self._pending_user_responses.pop(session_id, None)
            self._pending_request_context.pop(session_id, None)
        if future is not None and not future.done():
            future.cancel()
        return future

    @staticmethod
    def _default_transport_factory(provider: AgentProviderConfig) -> AcpTransport:
        if provider.transport != "stdio" or not provider.command:
            raise ValueError(f"Unsupported ACP provider transport: {provider.transport}")
        return StdioTransport(command=provider.command, args=provider.args, env=provider.env)


def _mcp_servers_payload(mcp_servers: dict | list | None, cwd: str = "") -> list[Any]:
    """Return ACP-compatible MCP server payload.

    Cursor ACP reads MCP from ``session/new.mcpServers`` and from
    ``.cursor/mcp.json``. Velpos merges both explicit list values and cwd-based
  config files into the ACP payload.
    """
    return resolve_acp_mcp_servers(mcp_servers, cwd=cwd)


def _synthetic_result_message(result: Any) -> NormalizedMessage:
    """Emit a Claude-compatible result when an ACP prompt turn completes."""
    result_dict = result if isinstance(result, dict) else {}
    return {
        "message_type": "result",
        "content": {
            "text": "",
            "duration_ms": 0,
            "duration_api_ms": 0,
            "num_turns": 1,
            "is_error": False,
            "total_cost_usd": 0,
            "stop_reason": result_dict.get("stopReason") or "end_turn",
            "usage": {"input_tokens": 0, "output_tokens": 0},
        },
    }
