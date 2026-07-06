from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, MagicMock

from application.session.session_stream_consumer import SessionStreamConsumer
from domain.session.model.session import Session


class TestSessionStreamConsumer(unittest.IsolatedAsyncioTestCase):
    async def test_consume_merges_consecutive_assistant_text_chunks(self) -> None:
        session = Session.create(model="auto", provider="cursor")
        recorder = MagicMock()
        recorder.start_run_step = AsyncMock(return_value="step-1")
        recorder.complete_run_step = AsyncMock()
        recorder.progress_run_step = AsyncMock()
        recorder.timeline_events_for_message = MagicMock(return_value=[])
        connection_manager = MagicMock()
        connection_manager.broadcast = AsyncMock()

        consumer = SessionStreamConsumer(
            recorder=recorder,
            claude_agent_gateway=MagicMock(is_process_alive=MagicMock(return_value=True)),
            connection_manager=connection_manager,
            save_session_fn=AsyncMock(),
            accept_sdk_session_id_fn=AsyncMock(return_value=True),
            cancelled_sessions=set(),
        )

        async def stream():
            for chunk in ("hel", "lo"):
                yield {
                    "message_type": "assistant",
                    "content": {"blocks": [{"type": "text", "text": chunk}]},
                }

        got_result = await consumer.consume(session, stream(), "run-1")

        self.assertFalse(got_result)
        self.assertEqual(1, len(session.messages))
        self.assertEqual("hello", session.messages[0].content["blocks"][0]["text"])
        self.assertEqual(2, connection_manager.broadcast.await_count)
        first_payload = connection_manager.broadcast.await_args_list[0].args[1]
        second_payload = connection_manager.broadcast.await_args_list[1].args[1]
        self.assertNotIn("update_last", first_payload["data"])
        self.assertTrue(second_payload["data"]["update_last"])


if __name__ == "__main__":
    unittest.main()
