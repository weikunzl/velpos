from domain.shared.utils import (
    DB_TITLE_MAX_LEN,
    is_transient_agent_error,
    summarize_tool_name,
    truncate_text,
)


def test_truncate_text_keeps_short_values():
    assert truncate_text("hello", max_len=10) == "hello"


def test_truncate_text_adds_suffix_for_long_values():
    value = "x" * 300
    result = truncate_text(value, max_len=DB_TITLE_MAX_LEN)
    assert len(result) == DB_TITLE_MAX_LEN
    assert result.endswith("…")


def test_summarize_tool_name_truncates_shell_command():
    command = "`tmux list-sessions; tail -200 /tmp/log`"
    result = summarize_tool_name(command, max_len=80)
    assert len(result) <= 80
    assert result.startswith("`tmux")


def test_is_transient_agent_error_detects_cursor_connectivity_errors():
    assert is_transient_agent_error("RetriableError: [unavailable] PING timed out")
    assert is_transient_agent_error("RetriableError: Connection stalled")
    assert not is_transient_agent_error("permission denied")
