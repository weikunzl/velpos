from __future__ import annotations

"""AgentGateway implementation for ACP providers."""

import asyncio
from dataclasses import dataclass
import inspect
from typing import Any, AsyncIterator, Callable

from domain.session.acl.agent_gateway import AgentCapability, AgentGateway, NormalizedMessage
from infr.client.acp.message_mapper import map_acp_update
from infr.client.acp.provider import AgentProviderConfig
from infr.client.acp.transport import AcpTransport, StdioTransport


TransportFactory = Callable[[AgentProviderConfig], AcpTransport]


@dataclass
class _AcpConnection:
    transport: AcpTransport
    session_id: str
    acp_session_id: str
    model: str


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
        user_response_timeout: float = 3600.0,
    ) -> None:
        self.provider = provider
        self._transport_factory = transport_factory or self._default_transport_factory
        self._user_response_timeout = user_response_timeout
        self._connections: dict[str, _AcpConnection] = {}
        self._states: dict[str, str] = {}
        self._active_sessions: set[str] = set()
        self._pending_user_responses: dict[str, asyncio.Future[dict[str, Any]]] = {}
        self._pending_request_context: dict[str, dict[str, Any]] = {}
        self._broadcast_fn: Callable[[str, dict[str, Any]], Any] | None = None
        self._lock = asyncio.Lock()
        self._request_id = 0

    def capabilities(self) -> set[AgentCapability]:
        """Initial ACP provider capabilities are conservative until verified."""
        return set()

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
    ) -> AsyncIterator[NormalizedMessage]:
        """Open an ACP connection, create a session, and send the first prompt."""
        connection = await self._open_acp_connection(
            session_id=session_id,
            model=model,
            cwd=cwd,
            sdk_session_id=sdk_session_id,
            mcp_servers=mcp_servers,
        )
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

        async for message in self._prompt(connection, prompt):
            yield message
        self._states[session_id] = "connected"

    async def interrupt(self, session_id: str) -> None:
        """Mark the session interrupted.

        ACP cancellation is handled in a later task; this keeps the current
        AgentGateway contract usable without pretending a provider capability
        that has not been verified against Cursor.
        """
        if session_id not in self._connections:
            raise RuntimeError(f"No active ACP connection for session {session_id}")
        self._states[session_id] = "interrupted"

    async def disconnect(self, session_id: str) -> None:
        """Close the ACP transport and clear in-memory state."""
        connection = self._connections.pop(session_id, None)
        if connection is not None:
            await connection.transport.close()
        self._states[session_id] = "idle"
        self._active_sessions.discard(session_id)
        await self._cancel_pending_response(session_id)

    async def cleanup_session(self, session_id: str) -> None:
        await self.disconnect(session_id)
        self._states.pop(session_id, None)
        await self._cancel_pending_response(session_id)

    def set_broadcast_fn(self, fn: Callable[[str, dict[str, Any]], Any]) -> None:
        """Set callback used to broadcast permission/choice events to Velpos WS."""
        self._broadcast_fn = fn

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
    ) -> _AcpConnection:
        await self.disconnect(session_id)
        transport = self._transport_factory(self.provider)
        await transport.start()

        try:
            await self._send_request(
                transport,
                "initialize",
                {
                    "protocolVersion": 1,
                    "clientInfo": {"name": "velpos", "version": "0.2.0"},
                    "clientCapabilities": {
                        "fs": {"readTextFile": False, "writeTextFile": False},
                        "terminal": False,
                    },
                },
            )
            result = await self._send_request(
                transport,
                "session/new",
                {
                    "cwd": cwd,
                    "model": model or self.provider.default_model,
                    "sessionId": sdk_session_id or "",
                    "mcpServers": mcp_servers or {},
                },
            )
        except Exception:
            await transport.close()
            self._states[session_id] = "idle"
            raise

        acp_session_id = str(result.get("sessionId") or sdk_session_id or session_id)
        connection = _AcpConnection(
            transport=transport,
            session_id=session_id,
            acp_session_id=acp_session_id,
            model=model,
        )
        self._connections[session_id] = connection
        self._states[session_id] = "connected"
        return connection

    async def _prompt(
        self,
        connection: _AcpConnection,
        prompt: str,
    ) -> AsyncIterator[NormalizedMessage]:
        request_id = self._next_request_id()
        await connection.transport.send_json(
            {
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "session/prompt",
                "params": {
                    "sessionId": connection.acp_session_id,
                    "prompt": prompt,
                },
            }
        )

        while True:
            message = await connection.transport.receive_json()
            method = message.get("method")
            if method in {"session/request_permission", "cursor/ask_question"}:
                await self._handle_agent_request(connection, message)
                continue
            if message.get("method") == "session/update":
                params = message.get("params") or {}
                yield map_acp_update(params)
                continue
            if message.get("id") == request_id:
                self._raise_if_error("session/prompt", message)
                return

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
            response = await transport.receive_json()
            if response.get("id") != request_id:
                continue
            self._raise_if_error(method, response)
            result = response.get("result") or {}
            return result if isinstance(result, dict) else {"value": result}

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
        tool_name = str(params.get("toolName") or params.get("tool_name") or "")
        tool_input = params.get("toolInput") or params.get("tool_input") or {}
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
