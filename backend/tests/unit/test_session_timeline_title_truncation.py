from unittest.mock import AsyncMock

import pytest

from application.session.session_timeline_event_service import SessionTimelineEventService


@pytest.mark.asyncio
async def test_record_event_truncates_long_title_before_save():
    repository = AsyncMock()
    repository.next_seq.return_value = 1
    service = SessionTimelineEventService(repository=repository)

    long_title = "权限请求：" + ("x" * 400)
    await service.record_event(
        session_id="abc12345",
        run_id="external",
        event_type="permission_request",
        title=long_title,
        payload={"tool_name": "demo"},
        commit=False,
        emit=False,
    )

    saved_event = repository.save.await_args.args[0]
    assert len(saved_event.title) == 255
