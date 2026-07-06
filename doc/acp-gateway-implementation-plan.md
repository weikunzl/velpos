# AcpGateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the three-role workflow in `AGENTS.md`: Requirement → Development → Testing. Execute task-by-task, keep commits small, and include code + passing tests + related spec/plan updates in each commit.

**Goal:** Add a provider-agnostic AcpGateway so Velpos can remotely drive Cursor `agent acp` today and future self-developed ACP agents later.

**Architecture:** Velpos keeps its existing WebSocket northbound contract. The backend uses `AgentGateway` as the stable application port, routes sessions to a concrete backend, and implements Cursor ACP as a southbound provider using `agent-client-protocol` over stdio. Future HTTP/SSE/WebSocket ACP transport is isolated behind the same transport interface.

**Tech Stack:** Python 3.11, FastAPI, uv, `agent-client-protocol`, standard-library `unittest` for current lightweight backend tests, existing Velpos WebSocket/session services.

---

## Requirement Role Baseline

### Accepted Scope

- Remote personal use of the user's own Cursor ACP service.
- Browser client remains zero-install; `agent acp`, Node/Cursor CLI auth, workspace, and MCP configuration live on the Velpos server.
- Offline mode is not required.
- Future custom ACP agents must be supported through provider + transport configuration without rewriting application/session logic.

### Acceptance Criteria

- A session can be configured to use `provider=cursor`.
- Cursor provider spawns `agent acp` via stdio and performs the minimal lifecycle: initialize → authenticate when required → session/new → session/prompt.
- Native ACP updates are mapped into the existing normalized Velpos message dict contract.
- Permission/choice requests reuse existing `permission_request`, `user_choice_request`, and `user_response` WebSocket flow.
- Tests cover happy path, malformed/unknown updates, permission allow/deny/timeout, and process cleanup without using real network calls.

### Non-Goals For First Working Service

- AG-UI northbound endpoint.
- Multi-user Cursor account isolation.
- Full fs/terminal ACP client handlers if Cursor can operate with capabilities disabled in Phase 1.
- Reliable `session/load` until Cursor ACP behavior is verified.

---

## File Map

- `backend/domain/session/acl/agent_gateway.py`: stable provider-agnostic port and normalized message contract. Already introduced.
- `backend/infr/client/routing_agent_gateway.py`: new routing gateway that keeps upper layers injecting one `AgentGateway`.
- `backend/infr/client/acp/transport.py`: transport protocol plus `StdioTransport`.
- `backend/infr/client/acp/provider.py`: provider configuration model and loader.
- `backend/infr/client/acp/message_mapper.py`: ACP event/update to normalized Velpos dict mapping.
- `backend/infr/client/acp/acp_gateway.py`: `AgentGateway` implementation for ACP providers.
- `backend/infr/config/agent_providers.yaml`: provider definitions for `cursor` and later custom agents.
- `backend/ohs/dependencies.py`: wire `RoutingAgentGateway` with existing Claude gateway and new AcpGateway.
- `backend/tests/unit/`: unit tests for routing, provider config, transport, mapper, lifecycle, and permission flow.

---

## Task 1: Provider Config And Routing Gateway

**Files:**
- Create: `backend/infr/client/routing_agent_gateway.py`
- Create: `backend/tests/unit/test_routing_agent_gateway.py`
- Modify: `backend/ohs/dependencies.py`

- [x] **Step 1: Write failing routing tests**

Create tests with two fake `AgentGateway` implementations:

```python
def test_routes_existing_session_to_selected_backend():
    gateway = RoutingAgentGateway(default_provider="claude", backends={
        "claude": FakeGateway("claude"),
        "cursor": FakeGateway("cursor"),
    })
    gateway.bind_session_provider("s1", "cursor")

    assert gateway.get_session_provider("s1") == "cursor"
    assert gateway.is_connected("s1") is False
```

Also cover:
- unknown provider raises a clear `ValueError`
- sessions without explicit provider use `default_provider`
- `capabilities()` returns current session backend capabilities when a session is bound

- [x] **Step 2: Run RED**

Run:

```bash
cd backend
uv run python -m unittest tests.unit.test_routing_agent_gateway -v
```

Expected: import failure for `routing_agent_gateway`.

- [x] **Step 3: Implement minimal routing gateway**

Implement:
- `bind_session_provider(session_id, provider)`
- `get_session_provider(session_id)`
- `_backend_for(session_id)`
- pass-through methods used by current application layer

Do not implement provider selection UI yet.

- [x] **Step 4: Run GREEN and compile**

Run:

```bash
cd backend
uv run python -m unittest tests.unit.test_routing_agent_gateway -v
uv run python -m py_compile infr/client/routing_agent_gateway.py
```

- [x] **Step 5: Commit**

```bash
git add backend/infr/client/routing_agent_gateway.py backend/tests/unit/test_routing_agent_gateway.py backend/ohs/dependencies.py doc/acp-gateway-implementation-plan.md
git commit -m "feat(acp): 增加 AgentGateway 路由网关"
```

---

## Task 2: ACP Provider Configuration

**Files:**
- Create: `backend/infr/client/acp/provider.py`
- Create: `backend/infr/config/agent_providers.yaml`
- Create: `backend/tests/unit/test_acp_provider_config.py`
- Modify: `backend/pyproject.toml`

- [x] **Step 1: Write failing provider config tests**

Cover:
- load `cursor` provider with `transport=stdio`, `command=agent`, `args=["acp"]`
- env values can reference environment variables like `${CURSOR_API_KEY}`
- unsupported transport raises clear error
- missing command for stdio raises clear error

- [x] **Step 2: Run RED**

```bash
cd backend
uv run python -m unittest tests.unit.test_acp_provider_config -v
```

Expected: import failure for provider config module.

- [x] **Step 3: Add dependency and implementation**

Add:

```toml
"agent-client-protocol>=0.11.0",
"pyyaml>=6.0.3",
```

Implement a small config loader using Pydantic or standard dataclasses. Keep it independent from FastAPI and database state.

- [x] **Step 4: Run GREEN**

```bash
cd backend
uv run python -m unittest tests.unit.test_acp_provider_config -v
uv run python -m py_compile infr/client/acp/provider.py
```

- [x] **Step 5: Commit**

```bash
git add backend/pyproject.toml backend/uv.lock backend/infr/client/acp/provider.py backend/infr/config/agent_providers.yaml backend/tests/unit/test_acp_provider_config.py doc/acp-gateway-implementation-plan.md
git commit -m "feat(acp): 增加 ACP Provider 配置加载"
```

---

## Task 3: Stdio Transport

**Files:**
- Create: `backend/infr/client/acp/transport.py`
- Create: `backend/tests/unit/test_acp_transport.py`

- [x] **Step 1: Write failing transport tests**

Use a fake subprocess or in-memory stream pair to cover:
- command/args/env passed to subprocess creation
- newline-delimited JSON messages can be sent and read
- process cleanup terminates a still-running process
- stderr lines are captured for diagnostics without leaking secrets

- [x] **Step 2: Run RED**

```bash
cd backend
uv run python -m unittest tests.unit.test_acp_transport -v
```

- [x] **Step 3: Implement `StdioTransport`**

Keep the public surface small:

```python
class AcpTransport(Protocol):
    async def start(self) -> None: ...
    async def send_json(self, payload: dict[str, Any]) -> None: ...
    async def receive_json(self) -> dict[str, Any]: ...
    async def close(self) -> None: ...
```

- [x] **Step 4: Run GREEN**

```bash
cd backend
uv run python -m unittest tests.unit.test_acp_transport -v
uv run python -m py_compile infr/client/acp/transport.py
```

- [x] **Step 5: Commit**

```bash
git add backend/infr/client/acp/transport.py backend/tests/unit/test_acp_transport.py doc/acp-gateway-implementation-plan.md
git commit -m "feat(acp): 增加 stdio 传输层"
```

---

## Task 4: ACP Message Mapper

**Files:**
- Create: `backend/infr/client/acp/message_mapper.py`
- Create: `backend/tests/unit/test_acp_message_mapper.py`

- [x] **Step 1: Write mapper tests**

Cover:
- happy path: text delta/update becomes `{"message_type": "assistant", "content": {"blocks": [{"type": "text", "text": "..."}]}}`
- tool call update becomes `tool_use` block
- terminal/system progress becomes `message_type="system"`
- unknown update becomes safe `system` diagnostic or `None` according to chosen behavior
- malformed payload raises a mapper-specific `ValueError` with provider/update context

- [x] **Step 2: Run RED**

```bash
cd backend
uv run python -m unittest tests.unit.test_acp_message_mapper -v
```

- [x] **Step 3: Implement mapper**

Use `agent-client-protocol` schema models when practical. If Cursor emits extension fields, parse conservatively and preserve raw subtype in `content`.

- [x] **Step 4: Run GREEN**

```bash
cd backend
uv run python -m unittest tests.unit.test_acp_message_mapper -v
uv run python -m py_compile infr/client/acp/message_mapper.py
```

- [x] **Step 5: Commit**

```bash
git add backend/infr/client/acp/message_mapper.py backend/tests/unit/test_acp_message_mapper.py doc/acp-gateway-implementation-plan.md
git commit -m "feat(acp): 映射 ACP 事件到 Velpos 消息"
```

---

## Task 5: AcpGateway Lifecycle

**Files:**
- Create: `backend/infr/client/acp/acp_gateway.py`
- Create: `backend/tests/unit/test_acp_gateway_lifecycle.py`

- [ ] **Step 1: Write lifecycle tests with fake transport**

Cover:
- `connect()` starts transport, sends initialize/session/new/session/prompt, yields mapped messages
- `send_query()` reuses existing session and sends another `session/prompt`
- `disconnect()` closes transport and clears state
- `is_connected()`, `get_state()`, `mark_active()`/`mark_idle()` behave like Claude gateway expectations
- process error or invalid JSON yields user-friendly error message

- [ ] **Step 2: Run RED**

```bash
cd backend
uv run python -m unittest tests.unit.test_acp_gateway_lifecycle -v
```

- [ ] **Step 3: Implement lifecycle**

Keep initial capabilities conservative:

```python
def capabilities(self) -> set[AgentCapability]:
    return set()
```

Return static model list from provider config until Cursor model enumeration is verified.

- [ ] **Step 4: Run GREEN**

```bash
cd backend
uv run python -m unittest tests.unit.test_acp_gateway_lifecycle -v
uv run python -m py_compile infr/client/acp/acp_gateway.py
```

- [ ] **Step 5: Commit**

```bash
git add backend/infr/client/acp/acp_gateway.py backend/tests/unit/test_acp_gateway_lifecycle.py doc/acp-gateway-implementation-plan.md
git commit -m "feat(acp): 实现 ACP 网关生命周期"
```

---

## Task 6: Permission And Choice Flow

**Files:**
- Modify: `backend/infr/client/acp/acp_gateway.py`
- Create: `backend/tests/unit/test_acp_gateway_permission.py`

- [ ] **Step 1: Write permission tests**

Cover:
- ACP permission request broadcasts existing `permission_request`
- allow response resolves and sends allow result to ACP side
- deny response sends deny result with message
- timeout denies request with clear message
- Cursor `cursor/ask_question` maps to `user_choice_request`

- [ ] **Step 2: Run RED**

```bash
cd backend
uv run python -m unittest tests.unit.test_acp_gateway_permission -v
```

- [ ] **Step 3: Implement permission broker**

Reuse the same pending future pattern as Claude gateway. Extract shared helper only if duplication becomes meaningful; do not refactor unrelated Claude code.

- [ ] **Step 4: Run GREEN**

```bash
cd backend
uv run python -m unittest tests.unit.test_acp_gateway_permission -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/infr/client/acp/acp_gateway.py backend/tests/unit/test_acp_gateway_permission.py doc/acp-gateway-implementation-plan.md
git commit -m "feat(acp): 接入权限与用户追问流程"
```

---

## Task 7: Dependency Wiring And Provider Selection

**Files:**
- Modify: `backend/ohs/dependencies.py`
- Modify: session creation DTO/service files after locating current provider/model fields
- Create or modify Alembic migration if a persisted `provider` field is required
- Create: `backend/tests/unit/test_agent_provider_selection.py`

- [ ] **Step 1: Investigate session model and creation flow**

Read:
- `backend/domain/session/model/session.py`
- `backend/application/session/session_application_service.py`
- `backend/ohs/http/dto/session_dto.py`
- `backend/infr/repository/session_model.py`

Document the exact selected field name in this plan before coding. Preferred field: `provider`.

- [ ] **Step 2: Write failing provider selection tests**

Cover:
- new session defaults to `claude`
- session with `provider=cursor` binds routing gateway to cursor backend before first prompt
- missing/unsupported provider fails with clear API error

- [ ] **Step 3: Implement wiring**

Wire:
- `_claude_agent_gateway`
- `_acp_gateway`
- `_agent_gateway = RoutingAgentGateway(...)`

Existing services should receive `_agent_gateway`, not Claude concrete implementation.

- [ ] **Step 4: Run GREEN**

```bash
cd backend
uv run python -m unittest discover -s tests/unit -p 'test_*.py' -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/ohs/dependencies.py backend/tests/unit/test_agent_provider_selection.py backend/application backend/domain backend/infr/repository doc/acp-gateway-implementation-plan.md
git commit -m "feat(acp): 支持会话级 Agent Provider 选择"
```

---

## Task 8: Cursor ACP Smoke Test

**Files:**
- Create: `backend/tests/integration/test_cursor_acp_smoke.py`
- Modify: `doc/acp-integration-research.md` with observed Cursor ACP behavior

- [ ] **Step 1: Add opt-in integration test**

Skip unless `VELPOS_RUN_CURSOR_ACP_TEST=1` and `agent` is available.

Cover:
- spawn `agent acp`
- initialize/session/new/session/prompt simple message
- disconnect process cleanup

- [ ] **Step 2: Run unit tests**

```bash
cd backend
uv run python -m unittest discover -s tests/unit -p 'test_*.py' -v
```

- [ ] **Step 3: Run optional smoke test locally**

```bash
cd backend
VELPOS_RUN_CURSOR_ACP_TEST=1 uv run python -m unittest tests.integration.test_cursor_acp_smoke -v
```

If Cursor auth is unavailable, record it as environment blocker, not a code failure.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/integration/test_cursor_acp_smoke.py doc/acp-integration-research.md doc/acp-gateway-implementation-plan.md
git commit -m "test(acp): 增加 Cursor ACP 冒烟验证"
```

---

## Testing Role Checklist

- Happy path: provider config → routing → transport → lifecycle → prompt streaming.
- Boundary: unknown provider, missing command, disconnected send_query, empty update, duplicate session binding.
- Exception: malformed JSON, transport process exit, permission timeout, denied permission.
- Code quality: no real network in unit tests, no secrets in logs, no broad unrelated refactor, no second message contract.
- Acceptance: Cursor smoke test either passes or records environment blocker with exact command and output.

---

## Self-Review

- Spec coverage: §15 remote personal use and §16 B1-B8 are covered by Tasks 1-8.
- Placeholder scan: no TBD/TODO placeholders; each task has exact files and commands.
- Type consistency: `AgentGateway`, `AgentCapability`, `NormalizedMessage`, `RoutingAgentGateway`, `AcpGateway`, and `StdioTransport` names are consistent across tasks.
- Scope: AG-UI and multi-user account isolation are explicitly non-goals for this plan.
