from __future__ import annotations

import unittest

from domain.session.model.message import Message
from domain.session.model.message_type import MessageType
from domain.session.model.session import Session


class TestSessionMessageMerge(unittest.TestCase):
    def test_merge_or_add_message_appends_consecutive_assistant_text(self) -> None:
        session = Session.create(model="auto", provider="cursor")
        first = Message.create(
            message_type=MessageType.ASSISTANT,
            content={"blocks": [{"type": "text", "text": "hel"}]},
        )
        second = Message.create(
            message_type=MessageType.ASSISTANT,
            content={"blocks": [{"type": "text", "text": "lo"}]},
        )

        stored, merged, _index = session.merge_or_add_message(first)
        self.assertFalse(merged)
        self.assertEqual("hel", stored.content["blocks"][0]["text"])

        stored, merged, index = session.merge_or_add_message(second)
        self.assertTrue(merged)
        self.assertEqual(0, index)
        self.assertEqual("hello", stored.content["blocks"][0]["text"])
        self.assertEqual(1, len(session.messages))

    def test_merge_or_add_message_merges_tool_use_into_assistant_turn(self) -> None:
        session = Session.create(model="auto", provider="cursor")
        session.merge_or_add_message(
            Message.create(
                message_type=MessageType.ASSISTANT,
                content={"blocks": [{"type": "text", "text": "before"}]},
            )
        )
        session.merge_or_add_message(
            Message.create(
                message_type=MessageType.ASSISTANT,
                content={
                    "blocks": [
                        {
                            "type": "tool_use",
                            "id": "tool-1",
                            "name": "read_file",
                            "input": {},
                        }
                    ]
                },
            )
        )
        session.merge_or_add_message(
            Message.create(
                message_type=MessageType.ASSISTANT,
                content={
                    "blocks": [
                        {
                            "type": "tool_use",
                            "id": "tool-2",
                            "name": "grep",
                            "input": {},
                        }
                    ]
                },
            )
        )

        self.assertEqual(1, len(session.messages))
        blocks = session.messages[0].content["blocks"]
        self.assertEqual(3, len(blocks))
        self.assertEqual("text", blocks[0]["type"])
        self.assertEqual("tool_use", blocks[1]["type"])
        self.assertEqual("tool-2", blocks[2]["id"])

    def test_compact_consecutive_assistant_messages_collapses_acp_turn(self) -> None:
        session = Session.create(model="auto", provider="cursor")
        for _ in range(5):
            session.merge_or_add_message(
                Message.create(
                    message_type=MessageType.ASSISTANT,
                    content={
                        "blocks": [
                            {
                                "type": "tool_use",
                                "id": f"tool-{_}",
                                "name": "grep",
                                "input": {},
                            }
                        ]
                    },
                )
            )
        session.add_message(
            Message.create(message_type=MessageType.USER, content={"text": "next"})
        )
        session.merge_or_add_message(
            Message.create(
                message_type=MessageType.ASSISTANT,
                content={"blocks": [{"type": "text", "text": "done"}]},
            )
        )

        compacted = Session.compact_consecutive_assistant_messages(session.messages)
        self.assertEqual(3, len(compacted))
        self.assertEqual("user", compacted[1].message_type.value)
        self.assertEqual(5, len(compacted[0].content["blocks"]))

    def test_merge_or_add_message_keeps_user_boundary(self) -> None:
        session = Session.create(model="auto", provider="cursor")
        session.merge_or_add_message(
            Message.create(
                message_type=MessageType.ASSISTANT,
                content={"blocks": [{"type": "text", "text": "before"}]},
            )
        )
        session.add_message(
            Message.create(message_type=MessageType.USER, content={"text": "hi"})
        )
        session.merge_or_add_message(
            Message.create(
                message_type=MessageType.ASSISTANT,
                content={
                    "blocks": [
                        {
                            "type": "tool_use",
                            "id": "tool-1",
                            "name": "read_file",
                            "input": {},
                        }
                    ]
                },
            )
        )

        self.assertEqual(3, len(session.messages))

    def test_merge_or_add_message_patches_tool_use_by_id(self) -> None:
        session = Session.create(model="auto", provider="cursor")
        session.merge_or_add_message(
            Message.create(
                message_type=MessageType.ASSISTANT,
                content={
                    "blocks": [
                        {
                            "type": "tool_use",
                            "id": "tool-1",
                            "name": "Read File",
                            "input": {},
                        }
                    ]
                },
            )
        )
        session.merge_or_add_message(
            Message.create(
                message_type=MessageType.ASSISTANT,
                content={
                    "blocks": [
                        {
                            "type": "tool_use",
                            "id": "tool-2",
                            "name": "grep",
                            "input": {},
                        }
                    ]
                },
            )
        )

        stored, merged, index = session.merge_or_add_message(
            Message.create(
                message_type=MessageType.ASSISTANT,
                content={
                    "blocks": [
                        {
                            "type": "tool_use",
                            "id": "tool-1",
                            "name": "Read File",
                            "input": {"path": "README.md"},
                        }
                    ]
                },
            )
        )

        self.assertTrue(merged)
        self.assertEqual(0, index)
        self.assertEqual(1, len(session.messages))
        self.assertEqual({"path": "README.md"}, stored.content["blocks"][0]["input"])
        self.assertEqual("tool-2", stored.content["blocks"][1]["id"])

    def test_merge_or_add_message_patches_tool_use_output(self) -> None:
        session = Session.create(model="auto", provider="cursor")
        session.merge_or_add_message(
            Message.create(
                message_type=MessageType.ASSISTANT,
                content={
                    "blocks": [
                        {
                            "type": "tool_use",
                            "id": "tool-1",
                            "name": "Read File",
                            "input": {"path": "README.md"},
                        }
                    ]
                },
            )
        )

        stored, merged, index = session.merge_or_add_message(
            Message.create(
                message_type=MessageType.ASSISTANT,
                content={
                    "blocks": [
                        {
                            "type": "tool_use",
                            "id": "tool-1",
                            "name": "Read File",
                            "output": "# Velpos",
                        }
                    ]
                },
            )
        )

        self.assertTrue(merged)
        self.assertEqual(0, index)
        block = stored.content["blocks"][0]
        self.assertEqual({"path": "README.md"}, block["input"])
        self.assertEqual("# Velpos", block["output"])


if __name__ == "__main__":
    unittest.main()
