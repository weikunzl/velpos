from __future__ import annotations

"""Route Velpos sessions to concrete AgentGateway backends.

This gateway keeps the application and WebSocket layers depending on one
provider-agnostic port while allowing each session to select a concrete backend
such as the existing Claude Agent SDK or a future Cursor ACP provider.
"""

from typing import Any, AsyncIterator

from domain.session.acl.agent_gateway import AgentCapability, AgentGateway, NormalizedMessage


class RoutingAgentGateway(AgentGateway):
    """Dispatch AgentGateway operations to a session-bound backend.

    Args:
        default_provider: Provider used by sessions without an explicit binding.
        backends: Mapping from provider name to concrete gateway implementation.

    Raises:
        ValueError: If ``default_provider`` is not present in ``backends``.
    """

    def __init__(self, default_provider: str, backends: dict[str, AgentGateway]) -> None:
        if default_provider not in backends:
            raise ValueError(f"Unknown default agent provider: {default_provider}")
        self.default_provider = default_provider
        self.backends = dict(backends)
        self._session_providers: dict[str, str] = {}

    def bind_session_provider(self, session_id: str, provider: str) -> None:
        """Bind a Velpos session to a provider.

        Args:
            session_id: Velpos session identifier.
            provider: Provider key from ``backends``.

        Raises:
            ValueError: If provider is not registered.
        """
        self._ensure_provider(provider)
        self._session_providers[session_id] = provider

    def set_broadcast_fn(self, fn) -> None:
        """Forward broadcast callback to backends that support it."""
        for backend in self.backends.values():
            setter = getattr(backend, "set_broadcast_fn", None)
            if callable(setter):
                setter(fn)

    def set_is_im_bound_fn(self, fn) -> None:
        """Forward IM-bound callback to backends that support it."""
        for backend in self.backends.values():
            setter = getattr(backend, "set_is_im_bound_fn", None)
            if callable(setter):
                setter(fn)

    def set_persist_pending_request_context_fn(self, fn) -> None:
        """Forward pending request persistence callback to supported backends."""
        for backend in self.backends.values():
            setter = getattr(backend, "set_persist_pending_request_context_fn", None)
            if callable(setter):
                setter(fn)

    def get_session_provider(self, session_id: str) -> str:
        """Return the provider for a session, falling back to default."""
        return self._session_providers.get(session_id, self.default_provider)

    def provider_names(self) -> list[str]:
        """Return registered provider names for request validation."""
        return sorted(self.backends)

    def capabilities(self) -> set[AgentCapability]:
        """Return capabilities for the default backend."""
        return self.backends[self.default_provider].capabilities()

    def capabilities_for_session(self, session_id: str) -> set[AgentCapability]:
        """Return capabilities for the backend selected by a session."""
        return self._backend_for(session_id).capabilities()

    def supports_for_session(self, session_id: str, capability: AgentCapability) -> bool:
        """Return whether a session's selected backend supports a capability."""
        return capability in self.capabilities_for_session(session_id)

    def _backend_for(self, session_id: str) -> AgentGateway:
        provider = self.get_session_provider(session_id)
        self._ensure_provider(provider)
        return self.backends[provider]

    def _ensure_provider(self, provider: str) -> None:
        if provider not in self.backends:
            raise ValueError(f"Unknown agent provider: {provider}")

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
        **kwargs: Any,
    ) -> AsyncIterator[NormalizedMessage]:
        async for message in self._backend_for(session_id).connect(
            session_id=session_id,
            model=model,
            prompt=prompt,
            cwd=cwd,
            sdk_session_id=sdk_session_id,
            system_prompt=system_prompt,
            mcp_servers=mcp_servers,
            max_turns=max_turns,
            max_budget_usd=max_budget_usd,
            **kwargs,
        ):
            yield message

    async def open_connection(
        self,
        session_id: str,
        model: str,
        cwd: str = "",
        sdk_session_id: str | None = None,
    ) -> None:
        await self._backend_for(session_id).open_connection(session_id, model, cwd, sdk_session_id)

    async def open_fresh_connection(
        self,
        session_id: str,
        model: str,
        cwd: str = "",
    ) -> None:
        backend = self._backend_for(session_id)
        method = getattr(backend, "open_fresh_connection", None)
        if callable(method):
            await method(session_id, model, cwd)
            return
        await backend.open_connection(session_id, model, cwd, "")

    async def send_query(self, session_id: str, prompt: str) -> AsyncIterator[NormalizedMessage]:
        async for message in self._backend_for(session_id).send_query(session_id, prompt):
            yield message

    async def interrupt(self, session_id: str) -> None:
        await self._backend_for(session_id).interrupt(session_id)

    async def disconnect(self, session_id: str) -> None:
        await self._backend_for(session_id).disconnect(session_id)

    async def disconnect_all(self) -> None:
        for backend in self.backends.values():
            await backend.disconnect_all()

    async def cleanup_session(self, session_id: str) -> None:
        await self._backend_for(session_id).cleanup_session(session_id)
        self._session_providers.pop(session_id, None)

    async def set_model(self, session_id: str, model: str) -> None:
        await self._backend_for(session_id).set_model(session_id, model)

    async def set_permission_mode(self, session_id: str, mode: str) -> None:
        await self._backend_for(session_id).set_permission_mode(session_id, mode)

    def get_permission_mode(self, session_id: str) -> str:
        return self._backend_for(session_id).get_permission_mode(session_id)

    async def get_models(self) -> list[dict[str, Any]]:
        return await self.backends[self.default_provider].get_models()

    async def get_models_for_provider(self, provider: str) -> list[dict[str, Any]]:
        self._ensure_provider(provider)
        return await self.backends[provider].get_models()

    def is_connected(self, session_id: str) -> bool:
        return self._backend_for(session_id).is_connected(session_id)

    def is_process_alive(self, session_id: str) -> bool:
        return self._backend_for(session_id).is_process_alive(session_id)

    def get_state(self, session_id: str) -> str:
        return self._backend_for(session_id).get_state(session_id)

    def is_waiting_for_user_input(self, session_id: str) -> bool:
        return self._backend_for(session_id).is_waiting_for_user_input(session_id)

    def get_connected_model(self, session_id: str) -> str | None:
        return self._backend_for(session_id).get_connected_model(session_id)

    def mark_active(self, session_id: str) -> None:
        self._backend_for(session_id).mark_active(session_id)

    def mark_idle(self, session_id: str) -> None:
        self._backend_for(session_id).mark_idle(session_id)

    def is_active(self, session_id: str) -> bool:
        return self._backend_for(session_id).is_active(session_id)

    def schedule_idle_disconnect(self, session_id: str, delay: float | None = None) -> None:
        self._backend_for(session_id).schedule_idle_disconnect(session_id, delay)

    async def resolve_user_response(self, session_id: str, response_data: dict[str, Any]) -> bool:
        return await self._backend_for(session_id).resolve_user_response(session_id, response_data)

    async def cancel_pending_response(self, session_id: str) -> bool:
        backend = self._backend_for(session_id)
        method = getattr(backend, "cancel_pending_response", None)
        if callable(method):
            return await method(session_id)
        return False

    async def get_pending_request_context(self, session_id: str) -> dict[str, Any] | None:
        return await self._backend_for(session_id).get_pending_request_context(session_id)

    async def compact(self, session_id: str) -> AsyncIterator[NormalizedMessage]:
        async for message in self._backend_for(session_id).compact(session_id):
            yield message

    async def rewind_files(self, session_id: str, user_message_id: str) -> None:
        await self._backend_for(session_id).rewind_files(session_id, user_message_id)

    async def get_context_usage(self, session_id: str) -> dict[str, Any] | None:
        return await self._backend_for(session_id).get_context_usage(session_id)

    def delete_session_files(
        self,
        session_id: str,
        project_dir: str,
        sdk_session_id: str | None = None,
    ) -> None:
        backend = self._backend_for(session_id)
        method = getattr(backend, "delete_session_files")
        try:
            method(session_id, project_dir, sdk_session_id=sdk_session_id)
        except TypeError:
            method(session_id, project_dir)

    def get_cached_sdk_session_id(self, session_id: str) -> str | None:
        backend = self._backend_for(session_id)
        method = getattr(backend, "get_cached_sdk_session_id", None)
        if callable(method):
            return method(session_id)
        return None

    async def get_models_for_channel(self, host: str = "", api_key: str = "") -> list[dict[str, Any]]:
        backend = self.backends[self.default_provider]
        method = getattr(backend, "get_models_for_channel", None)
        if callable(method):
            return await method(host, api_key)
        return await backend.get_models()
