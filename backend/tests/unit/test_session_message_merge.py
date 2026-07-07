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

    def test_merge_or_add_message_does_not_merge_tool_use(self) -> None:
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

        self.assertEqual(2, len(session.messages))

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
        self.assertEqual({"path": "README.md"}, stored.content["blocks"][0]["input"])
        self.assertEqual(2, len(session.messages))

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
