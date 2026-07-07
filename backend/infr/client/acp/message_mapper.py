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
    if update_type == "available_commands_update":
        return _available_commands_message(update)
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
    nested = _nested_tool_call(update)
    return str(
        update.get("id")
        or update.get("tool_call_id")
        or update.get("toolCallId")
        or nested.get("id")
        or nested.get("tool_call_id")
        or nested.get("toolCallId")
        or ""
    )


def _nested_tool_call(update: dict[str, Any]) -> dict[str, Any]:
    nested = update.get("toolCall") or update.get("tool_call")
    return nested if isinstance(nested, dict) else {}


def _tool_call_name(update: dict[str, Any]) -> str:
    nested = _nested_tool_call(update)
    return str(
        update.get("name")
        or update.get("tool_name")
        or update.get("title")
        or nested.get("title")
        or nested.get("name")
        or update.get("kind")
        or ""
    )


def _uri_to_path(uri: Any) -> str:
    if not isinstance(uri, str) or not uri:
        return ""
    if uri.startswith("file://"):
        return uri.removeprefix("file://")
    return uri


def _location_to_input(locations: list[Any]) -> dict[str, Any]:
    if not locations:
        return {}
    first = locations[0]
    if not isinstance(first, dict):
        return {}
    result: dict[str, Any] = {}
    path = (
        first.get("path")
        or first.get("file")
        or first.get("filePath")
        or first.get("file_path")
        or first.get("relativePath")
        or _uri_to_path(first.get("uri"))
    )
    if path:
        result["path"] = path
    if first.get("line") is not None:
        result["line"] = first["line"]
    if first.get("limit") is not None:
        result["limit"] = first["limit"]
    return result


def _normalize_scalar_input(raw: Any) -> dict[str, Any]:
    if raw in (None, "", {}):
        return {}
    if isinstance(raw, dict):
        return dict(raw)
    text = str(raw).strip()
    if not text:
        return {}
    if "/" in text or text.startswith("."):
        return {"path": text}
    return {"value": text}


def _extract_tool_input(update: dict[str, Any]) -> dict[str, Any]:
    nested = _nested_tool_call(update)
    merged: dict[str, Any] = {}
    for source in (update, nested):
        raw = (
            source.get("rawInput")
            or source.get("raw_input")
            or source.get("input")
            or source.get("arguments")
            or source.get("toolInput")
            or source.get("tool_input")
        )
        if isinstance(raw, dict) and raw:
            merged.update(dict(raw))
            continue
        scalar = _normalize_scalar_input(raw)
        if scalar:
            merged.update(scalar)

        target = source.get("target")
        if isinstance(target, str) and target.strip():
            merged.setdefault("path", target.strip())

        locations = source.get("locations")
        if isinstance(locations, list) and locations:
            merged.update(_location_to_input(locations))

    return merged


def _extract_tool_output(update: dict[str, Any]) -> Any:
    nested = _nested_tool_call(update)
    for source in (update, nested):
        for key in ("content", "output", "result", "text"):
            value = source.get(key)
            if value not in (None, "", {}, []):
                return value
    return None


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
    nested = _nested_tool_call(update)
    tool_id = _tool_call_id(update) or _tool_call_id(nested)
    if not tool_id:
        return None

    tool_input = _extract_tool_input(update)
    tool_output = _extract_tool_output(update)
    locations = update.get("locations")
    if not isinstance(locations, list):
        locations = nested.get("locations")
    status = update.get("status") or nested.get("status")

    if not tool_input and tool_output is None and not locations:
        return None

    block: dict[str, Any] = {
        "type": "tool_use",
        "id": tool_id,
        "name": _tool_call_name(update),
    }
    if tool_input:
        block["input"] = tool_input
    if tool_output is not None:
        block["output"] = tool_output
    if isinstance(locations, list) and locations:
        block["locations"] = locations
        if not block.get("input"):
            block["input"] = _location_to_input(locations)
    if status not in (None, ""):
        block["status"] = str(status)

    return {
        "message_type": "assistant",
        "content": {"blocks": [block]},
    }


def _available_commands_message(update: dict[str, Any]) -> NormalizedMessage | None:
    raw_commands = update.get("availableCommands") or update.get("available_commands") or []
    if not isinstance(raw_commands, list) or not raw_commands:
        return None

    commands: list[dict[str, Any]] = []
    for item in raw_commands:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        commands.append(
            {
                "name": name,
                "description": str(item.get("description") or "").strip(),
                "type": "skill",
                "isUserInvocable": True,
                "argumentHint": "",
            }
        )

    if not commands:
        return None

    return {
        "message_type": "_meta",
        "available_commands": commands,
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
