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

        stored, merged = session.merge_or_add_message(first)
        self.assertFalse(merged)
        self.assertEqual("hel", stored.content["blocks"][0]["text"])

        stored, merged = session.merge_or_add_message(second)
        self.assertTrue(merged)
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


if __name__ == "__main__":
    unittest.main()
