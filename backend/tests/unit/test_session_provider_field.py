from __future__ import annotations

import os
import unittest

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

from application.session.command.create_session_command import CreateSessionCommand
from domain.session.model.session import Session
from domain.session.model.session_status import SessionStatus
from domain.session.model.usage import Usage
from infr.repository.session_model import SessionModel
from infr.repository.session_repository_impl import SessionRepositoryImpl
from ohs.assembler.session_assembler import SessionAssembler
from ohs.http.dto.session_dto import CreateSessionRequest, SessionResponse


class TestSessionProviderField(unittest.TestCase):
    def test_new_session_defaults_to_claude_provider(self) -> None:
        session = Session.create(model="claude-opus-4-6")

        self.assertEqual("claude", session.provider)
        self.assertEqual("claude", SessionAssembler.to_summary(session)["provider"])

    def test_new_session_can_use_cursor_provider(self) -> None:
        session = Session.create(model="auto", provider="cursor")

        self.assertEqual("cursor", session.provider)

    def test_create_request_and_command_carry_provider(self) -> None:
        request = CreateSessionRequest(model="auto", provider="cursor")
        command = CreateSessionCommand(
            model=request.model,
            project_id=request.project_id,
            project_dir=request.project_dir,
            name=request.name,
            provider=request.provider,
        )

        self.assertEqual("cursor", command.provider)

    def test_response_contains_provider(self) -> None:
        session = Session.create(model="auto", provider="cursor")

        response = SessionResponse.from_domain(session)

        self.assertEqual("cursor", response.provider)

    def test_repository_round_trips_provider(self) -> None:
        session = Session.reconstitute(
            session_id="abc12345",
            model="auto",
            provider="cursor",
            status=SessionStatus.IDLE,
            messages=[],
            usage=Usage.zero(),
            continue_conversation=False,
        )

        model = SessionRepositoryImpl._to_model(session)
        restored = SessionRepositoryImpl._to_domain(
            SessionModel(
                session_id=model.session_id,
                project_id=model.project_id,
                provider=model.provider,
                model=model.model,
                status=model.status,
                messages=model.messages,
                input_tokens=model.input_tokens,
                output_tokens=model.output_tokens,
                continue_conversation=model.continue_conversation,
                project_dir=model.project_dir,
                name=model.name,
                sdk_session_id=model.sdk_session_id,
                last_input_tokens=model.last_input_tokens,
                pending_request_context_json=model.pending_request_context_json,
                queued_command_json=model.queued_command_json,
                cancel_requested=model.cancel_requested,
                team_task_id=model.team_task_id,
                trace_id=model.trace_id,
            )
        )

        self.assertEqual("cursor", restored.provider)


if __name__ == "__main__":
    unittest.main()
