from __future__ import annotations

import unittest

from infr.client.acp.message_mapper import map_acp_update


class TestAcpMessageMapper(unittest.TestCase):
    def test_maps_text_update_to_assistant_message(self) -> None:
        message = map_acp_update({"type": "agent_message_chunk", "text": "hello"})

        self.assertEqual(
            {
                "message_type": "assistant",
                "content": {"blocks": [{"type": "text", "text": "hello"}]},
            },
            message,
        )

    def test_maps_nested_text_update(self) -> None:
        message = map_acp_update({"sessionId": "s1", "update": {"kind": "text", "content": "hello"}})

        self.assertEqual("assistant", message["message_type"])
        self.assertEqual([{"type": "text", "text": "hello"}], message["content"]["blocks"])

    def test_maps_cursor_documented_agent_message_chunk(self) -> None:
        message = map_acp_update(
            {
                "sessionId": "s1",
                "update": {
                    "sessionUpdate": "agent_message_chunk",
                    "content": {"type": "text", "text": "hello"},
                },
            }
        )

        self.assertEqual("assistant", message["message_type"])
        self.assertEqual([{"type": "text", "text": "hello"}], message["content"]["blocks"])

    def test_maps_tool_call_to_tool_use_block(self) -> None:
        message = map_acp_update(
            {
                "type": "tool_call",
                "id": "tool-1",
                "name": "read_file",
                "input": {"path": "README.md"},
            }
        )

        self.assertEqual(
            {
                "message_type": "assistant",
                "content": {
                    "blocks": [
                        {
                            "type": "tool_use",
                            "id": "tool-1",
                            "name": "read_file",
                            "input": {"path": "README.md"},
                        }
                    ]
                },
            },
            message,
        )

    def test_maps_progress_to_system_message(self) -> None:
        message = map_acp_update({"type": "terminal", "subtype": "created", "terminal_id": "term-1"})

        self.assertEqual("system", message["message_type"])
        self.assertEqual("created", message["content"]["subtype"])
        self.assertEqual("term-1", message["content"]["terminal_id"])

    def test_unknown_update_is_ignored(self) -> None:
        message = map_acp_update({"type": "future_extension", "value": 42})

        self.assertIsNone(message)

    def test_agent_thought_chunk_is_ignored(self) -> None:
        message = map_acp_update(
            {
                "sessionId": "s1",
                "update": {
                    "sessionUpdate": "agent_thought_chunk",
                    "content": {"type": "text", "text": "thinking"},
                },
            }
        )

        self.assertIsNone(message)

    def test_tool_call_update_without_input_is_ignored(self) -> None:
        message = map_acp_update(
            {
                "update": {
                    "sessionUpdate": "tool_call_update",
                    "toolCallId": "tool-1",
                    "status": "in_progress",
                }
            }
        )

        self.assertIsNone(message)

    def test_tool_call_update_maps_raw_input_patch(self) -> None:
        message = map_acp_update(
            {
                "update": {
                    "sessionUpdate": "tool_call_update",
                    "toolCallId": "tool-1",
                    "title": "Read File",
                    "rawInput": {"path": "README.md"},
                }
            }
        )

        self.assertEqual("assistant", message["message_type"])
        block = message["content"]["blocks"][0]
        self.assertEqual("tool-1", block["id"])
        self.assertEqual("Read File", block["name"])
        self.assertEqual({"path": "README.md"}, block["input"])

    def test_tool_call_uses_locations_when_raw_input_missing(self) -> None:
        message = map_acp_update(
            {
                "update": {
                    "sessionUpdate": "tool_call",
                    "toolCallId": "tool-1",
                    "title": "Read File",
                    "kind": "read",
                    "locations": [{"path": "doc/acp-handoff.md", "line": 1}],
                }
            }
        )

        block = message["content"]["blocks"][0]
        self.assertEqual({"path": "doc/acp-handoff.md", "line": 1}, block["input"])

    def test_maps_acp_tool_call_with_kind_field(self) -> None:
        """Tool-call payloads carry ``kind`` (execute/read/...) — not the update type."""
        message = map_acp_update(
            {
                "update": {
                    "sessionUpdate": "tool_call",
                    "toolCallId": "tool-1",
                    "title": "Shell",
                    "kind": "execute",
                    "rawInput": {"command": "ls"},
                }
            }
        )

        self.assertEqual("assistant", message["message_type"])
        block = message["content"]["blocks"][0]
        self.assertEqual("tool-1", block["id"])
        self.assertEqual("Shell", block["name"])
        self.assertEqual({"command": "ls"}, block["input"])

    def test_malformed_update_raises_clear_error(self) -> None:
        with self.assertRaisesRegex(ValueError, "ACP update must be an object"):
            map_acp_update(["not", "an", "object"])


if __name__ == "__main__":
    unittest.main()
