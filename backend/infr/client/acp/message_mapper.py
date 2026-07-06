from __future__ import annotations

"""Map ACP session updates into Velpos normalized messages."""

from typing import Any

from domain.session.acl.agent_gateway import NormalizedMessage


TEXT_UPDATE_TYPES = {
    "agent_message_chunk",
    "text",
    "content_delta",
    "message_delta",
}
TOOL_CALL_TYPES = {"tool_call", "tool_use", "tool_call_start"}
SYSTEM_UPDATE_TYPES = {"terminal", "progress", "task", "status", "plan", "todos"}
SKIP_UPDATE_TYPES = {
    "user_message_chunk",
    "agent_thought_chunk",
    "plan_update",
    "plan_removed",
    "available_commands_update",
    "current_mode_update",
    "config_option_update",
    "session_info_update",
    "usage_update",
    "cursor/task",
    "cursor/update_todos",
}


def map_acp_update(payload: Any) -> NormalizedMessage | None:
    """Map one ACP update payload into Velpos' normalized message contract.

    The Python SDK schema should be preferred once AcpGateway lifecycle is
    connected. This function intentionally accepts dictionaries so Cursor
    extension fields can be handled conservatively during early integration.

    Args:
        payload: Raw ACP update or a JSON-RPC notification params object.

    Returns:
        A normalized Velpos message, or ``None`` when the update should be
        ignored (no user-visible value).

    Raises:
        ValueError: If payload is not an object.
    """
    if not isinstance(payload, dict):
        raise ValueError("ACP update must be an object")

    update = payload.get("update", payload)
    if not isinstance(update, dict):
        raise ValueError("ACP update must be an object")

    update_type = _update_type(update)
    if update_type in SKIP_UPDATE_TYPES:
        return None
    if update_type in TEXT_UPDATE_TYPES:
        return _text_message(update)
    if update_type in TOOL_CALL_TYPES:
        return _tool_call_message(update)
    if update_type == "tool_call_update":
        return _tool_call_update_message(update)
    if update_type in SYSTEM_UPDATE_TYPES:
        return _system_message(update, update_type)

    return None


def _update_type(update: dict[str, Any]) -> str:
    # ``sessionUpdate`` is the canonical ACP discriminator; ``kind`` on tool-call
    # payloads is the tool category (read/execute/...) and must not win here.
    for key in ("sessionUpdate", "update_type", "type", "kind"):
        value = update.get(key)
        if value:
            return str(value)
    return "unknown"


def _text_message(update: dict[str, Any]) -> NormalizedMessage:
    text = update.get("text")
    if text is None:
        content = update.get("content")
        if isinstance(content, dict):
            text = content.get("text")
        else:
            text = content
    if text is None:
        text = update.get("delta")
    return {
        "message_type": "assistant",
        "content": {"blocks": [{"type": "text", "text": str(text or "")}]},
    }


def _tool_call_id(update: dict[str, Any]) -> str:
    return str(
        update.get("id")
        or update.get("tool_call_id")
        or update.get("toolCallId")
        or ""
    )


def _tool_call_name(update: dict[str, Any]) -> str:
    return str(
        update.get("name")
        or update.get("tool_name")
        or update.get("title")
        or update.get("kind")
        or ""
    )


def _extract_tool_input(update: dict[str, Any]) -> dict[str, Any]:
    raw = (
        update.get("rawInput")
        or update.get("raw_input")
        or update.get("input")
        or update.get("arguments")
        or update.get("toolInput")
        or update.get("tool_input")
    )
    if isinstance(raw, dict) and raw:
        return dict(raw)
    if raw not in (None, {}, ""):
        return {"value": raw}

    locations = update.get("locations")
    if isinstance(locations, list) and locations:
        first = locations[0]
        if isinstance(first, dict):
            result: dict[str, Any] = {}
            if first.get("path"):
                result["path"] = first["path"]
            if first.get("line") is not None:
                result["line"] = first["line"]
            if result:
                return result

    return {}


def _tool_call_message(update: dict[str, Any]) -> NormalizedMessage:
    return {
        "message_type": "assistant",
        "content": {
            "blocks": [
                {
                    "type": "tool_use",
                    "id": _tool_call_id(update),
                    "name": _tool_call_name(update),
                    "input": _extract_tool_input(update),
                }
            ]
        },
    }


def _tool_call_update_message(update: dict[str, Any]) -> NormalizedMessage | None:
    tool_id = _tool_call_id(update)
    if not tool_id:
        return None

    tool_input = _extract_tool_input(update)
    if not tool_input:
        return None

    return {
        "message_type": "assistant",
        "content": {
            "blocks": [
                {
                    "type": "tool_use",
                    "id": tool_id,
                    "name": _tool_call_name(update),
                    "input": tool_input,
                }
            ]
        },
    }


def _system_message(update: dict[str, Any], update_type: str) -> NormalizedMessage:
    subtype = str(update.get("subtype") or update.get("status") or update_type)
    content = {"subtype": subtype}
    for key in ("task_id", "terminal_id", "description", "summary", "last_tool_name"):
        if key in update:
            content[key] = update[key]
    return {
        "message_type": "system",
        "content": content,
    }
