from __future__ import annotations

"""Provider-agnostic Agent gateway port and the normalized message contract.

This module defines the *stable seam* between Velpos application layer and any
underlying coding-agent backend (Claude Agent SDK, Cursor ACP, or a future
self-developed ACP agent).

Design principles (see doc/acp-integration-research.md §16):

1. **One port, many backends.** Every backend implements :class:`AgentGateway`.
   The application layer (``application/session/*``) and the WebSocket layer
   (``ohs/ws/session_ws.py``) depend only on this port, never on a concrete
   implementation.

2. **One normalized message contract.** ``connect`` / ``send_query`` /
   ``compact`` all yield :data:`NormalizedMessage` dicts of the exact same
   shape regardless of backend. This is the real contract downstream code
   relies on; do NOT introduce a second message model per backend.

3. **Capability-based degradation.** Backends differ (e.g. Cursor ACP has no
   ``/compact``). Instead of forcing every backend to fake Claude semantics,
   a backend advertises what it supports via :meth:`AgentGateway.capabilities`
   and the application layer guards optional operations accordingly.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, AsyncIterator, Literal, TypedDict


# ─────────────────────────────────────────────────────────────────────────────
# Normalized message contract
#
# Every streaming method yields dicts matching one of the shapes below. The
# concrete Claude implementation produces these in
# ``infr/client/claude_agent_gateway.py::_extract_message_info``; any new
# backend (e.g. AcpGateway) MUST map its native events into the same shapes.
# ─────────────────────────────────────────────────────────────────────────────

MessageType = Literal["assistant", "tool_result", "result", "system", "_meta"]
"""Discriminator carried by every normalized message under ``message_type``."""


class TextBlock(TypedDict):
    """A plain assistant text block."""

    type: Literal["text"]
    text: str


class ToolUseBlock(TypedDict):
    """An assistant tool invocation block."""

    type: Literal["tool_use"]
    name: str
    id: str
    input: dict[str, Any]


class ToolResultBlock(TypedDict, total=False):
    """A tool execution result block (may appear inside assistant content)."""

    type: Literal["tool_result"]
    tool_use_id: str
    content: Any
    is_error: bool


class ThinkingBlock(TypedDict):
    """Extended-thinking reasoning block."""

    type: Literal["thinking"]
    thinking: str


class NormalizedMessage(TypedDict, total=False):
    """The single message shape shared by all backends.

    Required:
        message_type: One of :data:`MessageType`.
        content: Type-specific payload. Common shapes:
            - assistant: ``{"blocks": [TextBlock | ToolUseBlock | ...]}``
            - tool_result: ``{"results": [ToolResultBlock, ...]}``
            - result: ``{"text": str, "usage": {...}, "is_error": bool, ...}``
            - system: ``{"subtype": str, ...task fields}``
            - _meta: control payload, e.g. ``{"resume_failed": True}``

    Optional top-level extras (present when the backend can supply them):
        input_tokens / output_tokens: usage counters (result messages).
        context_input_tokens: per-turn context size estimate (assistant).
        sdk_session_id: backend session id (Claude SDK session / ACP sessionId).
        sdk_user_message_uuid: source user message id for rewind support.
        resume_failed: set on ``_meta`` when resume fell back to a fresh session.
    """

    message_type: MessageType
    content: dict[str, Any]
    input_tokens: int
    output_tokens: int
    context_input_tokens: int
    sdk_session_id: str
    sdk_user_message_uuid: str
    resume_failed: bool


class AgentCapability(str, Enum):
    """Optional features a backend may or may not support.

    The application layer should call :meth:`AgentGateway.capabilities` and
    guard the corresponding operations rather than assuming Claude semantics.
    """

    COMPACT = "compact"
    """Supports context compaction (Claude ``/compact``)."""

    REWIND = "rewind"
    """Supports file/message rewind (checkpointing)."""

    MODELS = "models"
    """Can enumerate available models."""

    FORK = "fork"
    """Supports forking an existing session."""

    LOAD = "load"
    """Supports resuming/loading a previous session (ACP ``session/load``)."""

    CONTEXT_USAGE = "context_usage"
    """Can report live context-window usage."""

    SESSION_FILES = "session_files"
    """Persists per-session files that can be deleted (Claude JSONL)."""


class AgentGateway(ABC):
    """Provider-agnostic port for driving a coding agent.

    Concrete backends: ``infr/client/claude_agent_gateway.py`` (Claude Agent
    SDK) and the forthcoming ``infr/client/acp/acp_gateway.py`` (Cursor / any
    ACP agent). See module docstring for the contract.
    """

    # ── Capability introspection ─────────────────────────────────────────────

    def capabilities(self) -> set[AgentCapability]:
        """Return the optional features this backend supports.

        Base default is the conservative empty set. Each concrete backend
        overrides this to advertise what it actually implements.
        """
        return set()

    def supports(self, capability: AgentCapability) -> bool:
        """Convenience check for a single capability."""
        return capability in self.capabilities()

    # ── Connection lifecycle ─────────────────────────────────────────────────

    @abstractmethod
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
        """Connect to the agent and send the initial prompt.

        Creates a long-lived backend connection bound to ``session_id`` and
        streams :data:`NormalizedMessage` items until the turn completes.

        Args:
            session_id: Velpos session identifier for lifecycle management.
            model: Backend model name.
            prompt: Initial user prompt text.
            cwd: Working directory / workspace root for the agent.
            sdk_session_id: Resume selector. ``None`` means the backend may use
                its in-memory cache; ``""`` forces a fresh session; a real id
                resumes it; ``fork:<id>`` forks from that source session.
            system_prompt: Optional system prompt override.
            mcp_servers: Optional MCP server config (backend-dependent).
            max_turns: Optional turn cap.
            max_budget_usd: Optional cost cap.

        Yields:
            :data:`NormalizedMessage` items.
        """
        ...

    @abstractmethod
    async def open_connection(
        self,
        session_id: str,
        model: str,
        cwd: str = "",
        sdk_session_id: str | None = None,
    ) -> None:
        """Open a persistent connection without sending a prompt.

        Raises:
            RuntimeError: If a requested resume target cannot be restored.
        """
        ...

    @abstractmethod
    async def send_query(
        self,
        session_id: str,
        prompt: str,
    ) -> AsyncIterator[NormalizedMessage]:
        """Send a follow-up prompt on an existing connection.

        Yields:
            :data:`NormalizedMessage` items.
        """
        ...

    @abstractmethod
    async def interrupt(self, session_id: str) -> None:
        """Interrupt the active turn for a session."""
        ...

    @abstractmethod
    async def disconnect(self, session_id: str) -> None:
        """Disconnect and clean up the backend connection for a session."""
        ...

    async def disconnect_all(self) -> None:
        """Disconnect all active connections (server shutdown). Optional."""
        pass

    async def cleanup_session(self, session_id: str) -> None:
        """Remove all tracked state for a session after full deletion. Optional."""
        pass

    # ── Model / permission control ───────────────────────────────────────────

    @abstractmethod
    async def set_model(self, session_id: str, model: str) -> None:
        """Change the model for an active session."""
        ...

    @abstractmethod
    async def set_permission_mode(self, session_id: str, mode: str) -> None:
        """Change the permission mode for a session."""
        ...

    def get_permission_mode(self, session_id: str) -> str:
        """Return the effective permission mode for a session."""
        return "bypassPermissions"

    @abstractmethod
    async def get_models(self) -> list[dict[str, Any]]:
        """Return available models as dicts (at least ``value`` + ``displayName``).

        Backends without :attr:`AgentCapability.MODELS` may return a configured
        static list or an empty list.
        """
        ...

    # ── State introspection ──────────────────────────────────────────────────

    @abstractmethod
    def is_connected(self, session_id: str) -> bool:
        """Whether a persistent backend connection exists for the session."""
        ...

    def is_process_alive(self, session_id: str) -> bool:
        """Whether the underlying subprocess (if any) is still running."""
        return self.is_connected(session_id)

    def get_state(self, session_id: str) -> str:
        """Coarse backend state for UI diagnostics (e.g. idle/streaming)."""
        return "idle"

    def is_waiting_for_user_input(self, session_id: str) -> bool:
        """Whether a permission/choice response is pending for the session."""
        return False

    def get_connected_model(self, session_id: str) -> str | None:
        """Model used for the current connection, or ``None`` if disconnected."""
        return None

    # ── Active-session bookkeeping (idle cleanup protection) ──────────────────

    def mark_active(self, session_id: str) -> None:
        """Mark a session as actively running a query."""
        pass

    def mark_idle(self, session_id: str) -> None:
        """Mark a session as no longer actively running a query."""
        pass

    def is_active(self, session_id: str) -> bool:
        """Whether a session is actively running a query."""
        return False

    def schedule_idle_disconnect(self, session_id: str, delay: float | None = None) -> None:
        """Schedule a delayed disconnect for an idle session."""
        pass

    # ── Human-in-the-loop (permission / choice) ──────────────────────────────

    async def resolve_user_response(
        self, session_id: str, response_data: dict[str, Any]
    ) -> bool:
        """Resolve a pending permission decision or choice answer.

        Returns True if a pending response was resolved, False otherwise.
        """
        return False

    async def get_pending_request_context(
        self, session_id: str
    ) -> dict[str, Any] | None:
        """Return the pending request context if awaiting user input, else None."""
        return None

    # ── Optional / capability-gated operations ───────────────────────────────

    async def compact(self, session_id: str) -> AsyncIterator[NormalizedMessage]:
        """Compact session context. Requires :attr:`AgentCapability.COMPACT`.

        Raises:
            NotImplementedError: If the backend lacks the COMPACT capability.
        """
        raise NotImplementedError("compact is not supported by this backend")
        # noqa: make this an async generator for type consistency
        yield  # pragma: no cover

    async def rewind_files(self, session_id: str, user_message_id: str) -> None:
        """Rewind tracked files. Requires :attr:`AgentCapability.REWIND`."""
        pass

    async def get_context_usage(self, session_id: str) -> dict[str, Any] | None:
        """Return live context usage. Requires :attr:`AgentCapability.CONTEXT_USAGE`."""
        return None

    def delete_session_files(self, session_id: str, project_dir: str) -> None:
        """Delete per-session files. Requires :attr:`AgentCapability.SESSION_FILES`."""
        pass
