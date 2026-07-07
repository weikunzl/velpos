from __future__ import annotations

import json

DB_TITLE_MAX_LEN = 255

_TRANSIENT_AGENT_ERROR_MARKERS = (
    "RetriableError",
    "PING timed out",
    "Connection stalled",
    "[unavailable]",
)


def truncate_text(text: str, max_len: int = DB_TITLE_MAX_LEN, suffix: str = "…") -> str:
    """Truncate text to fit database/UI limits without breaking encoding."""
    if max_len <= 0:
        return ""
    value = str(text or "")
    if len(value) <= max_len:
        return value
    if max_len <= len(suffix):
        return suffix[:max_len]
    return value[: max_len - len(suffix)] + suffix


def summarize_tool_name(name: str, *, max_len: int = 200) -> str:
    """Compact long tool names (often shell commands) for timeline titles."""
    stripped = str(name or "").strip()
    if not stripped:
        return "unknown"
    if len(stripped) <= max_len:
        return stripped
    return truncate_text(stripped, max_len)


def is_transient_agent_error(error: BaseException | str) -> bool:
    """Whether an agent/backend error is likely transient and worth retrying."""
    text = str(error)
    return any(marker in text for marker in _TRANSIENT_AGENT_ERROR_MARKERS)


def safe_json_loads(s: str | None, default=None):
    if default is None:
        default = {}
    if not s:
        return default
    try:
        return json.loads(s)
    except (json.JSONDecodeError, TypeError):
        return default
