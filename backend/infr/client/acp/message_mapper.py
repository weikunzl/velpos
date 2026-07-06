from __future__ import annotations

"""Map ACP session updates into Velpos normalized messages."""

from typing import Any

from domain.session.acl.agent_gateway import NormalizedMessage


TEXT_UPDATE_TYPES = {"agent_message_chunk", "text", "content_delta", "message_delta"}
TOOL_CALL_TYPES = {"tool_call", "tool_use", "tool_call_start"}
SYSTEM_UPDATE_TYPES = {"terminal", "progress", "task", "status", "plan", "todos"}


def map_acp_update(payload: Any) -> NormalizedMessage:
    """Map one ACP update payload into Velpos' normalized message contract.

    The Python SDK schema should be preferred once AcpGateway lifecycle is
    connected. This function intentionally accepts dictionaries so Cursor
    extension fields can be handled conservatively during early integration.

    Args:
        payload: Raw ACP update or a JSON-RPC notification params object.

    Returns:
        A normalized Velpos message.

    Raises:
        ValueError: If payload is not an object.
    """
    if not isinstance(payload, dict):
        raise ValueError("ACP update must be an object")

    update = payload.get("update", payload)
    if not isinstance(update, dict):
        raise ValueError("ACP update must be an object")

    update_type = _update_type(update)
    if update_type in TEXT_UPDATE_TYPES:
        return _text_message(update)
    if update_type in TOOL_CALL_TYPES:
        return _tool_call_message(update)
    if update_type in SYSTEM_UPDATE_TYPES:
        return _system_message(update, update_type)

    return {
        "message_type": "system",
        "content": {
            "subtype": "acp_unknown_update",
            "raw_type": update_type,
        },
    }


def _update_type(update: dict[str, Any]) -> str:
    for key in ("type", "kind", "sessionUpdate", "update_type"):
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


def _tool_call_message(update: dict[str, Any]) -> NormalizedMessage:
    tool_input = update.get("input") or update.get("arguments") or {}
    if not isinstance(tool_input, dict):
        tool_input = {"value": tool_input}

    return {
        "message_type": "assistant",
        "content": {
            "blocks": [
                {
                    "type": "tool_use",
                    "id": str(update.get("id") or update.get("tool_call_id") or ""),
                    "name": str(update.get("name") or update.get("tool_name") or ""),
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
