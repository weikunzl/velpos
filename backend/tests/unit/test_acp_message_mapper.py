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

    def test_unknown_update_becomes_safe_system_diagnostic(self) -> None:
        message = map_acp_update({"type": "future_extension", "value": 42})

        self.assertEqual("system", message["message_type"])
        self.assertEqual("acp_unknown_update", message["content"]["subtype"])
        self.assertEqual("future_extension", message["content"]["raw_type"])

    def test_malformed_update_raises_clear_error(self) -> None:
        with self.assertRaisesRegex(ValueError, "ACP update must be an object"):
            map_acp_update(["not", "an", "object"])


if __name__ == "__main__":
    unittest.main()
