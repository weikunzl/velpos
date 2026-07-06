# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Velpos is a web interface for controlling Codex via the Agent SDK. Python FastAPI backend + Vue 3 frontend, communicating over REST and WebSocket.

## Development Commands

### Quick Start (Dev)
```bash
# 1. Copy and configure environment
cp build/dev/.env.example build/dev/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Start everything (MySQL docker + backend + frontend)
build/dev/start.sh start
```

### Dev Service Management
```bash
build/dev/start.sh start     # Start MySQL + backend + frontend, tail logs
build/dev/start.sh stop      # Stop all (including MySQL)
build/dev/start.sh restart   # Restart all
build/dev/start.sh status    # Check running state
build/dev/start.sh logs      # Tail backend logs
```

### Production (Full Docker)
```bash
# 1. Configure
cp build/prod/.env.example build/prod/.env

# 2. Build and start
cd build/prod && docker compose up --build -d
```

### Run Services Individually
```bash
# Backend (from backend/)
uv run uvicorn main:app --host 0.0.0.0 --port 8083 --reload

# Frontend (from frontend/)
npm run dev
npm run build
```

### Build Directory Structure
```
build/
├── dev/                  # Dev: Docker MySQL + host backend/frontend
│   ├── docker-compose.yml
│   ├── .env.example
│   └── start.sh
├── prod/                 # Prod: Full Docker stack
│   ├── docker-compose.yml
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── nginx.conf
│   └── .env.example
└── docker/
    └── init-db/          # Shared MySQL init scripts
```

### Ports
- Backend: 8083 (API docs at http://localhost:8083/docs)
- Frontend: 3000 (dev) / 80 (prod, via nginx)
- MySQL: 3307 (dev host) / 3306 (prod internal)

### Database Migrations (Alembic)
```bash
# From backend/ directory
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
```
Migrations auto-run on backend startup. Fallback `create_all` if Alembic fails.

### Required Environment Variables
- `DATABASE_URL` — backend will not start without this (raises RuntimeError)
- `CLAUDE_CLI_PATH` — path to Codex CLI binary

## Backend Architecture — DDD Four-Layer

```
backend/
├── domain/           # Pure business logic, no framework deps
│   ├── session/      # Session aggregate: Session, Message, Usage, Status
│   ├── project/      # Project aggregate
│   ├── im_binding/   # IM channel binding, channel registry
│   ├── channel_profile/
│   └── shared/       # Cross-domain value objects
├── application/      # Use case orchestration (one service per aggregate)
│   ├── session/      # SessionApplicationService + commands
│   ├── project/      # ProjectApplicationService + commands
│   ├── im_binding/   # ImChannelApplicationService
│   ├── channel_profile/ claude_session/ command/ plugin/ settings/ terminal/
│   └── (each has command/ for input DTOs, some have port/ for ABC interfaces)
├── infr/             # Infrastructure implementations
│   ├── config/       # database.py (SQLAlchemy async), im_config.py, base.py
│   ├── repository/   # *RepositoryImpl + SQLAlchemy ORM models + Alembic migrations
│   ├── client/       # ClaudeAgentGateway, ConnectionManager, etc.
│   └── im/           # IM adapters: lark/, openim/, qq/, weixin/
└── ohs/              # Open Host Service — external-facing layer
    ├── dependencies.py  # DI assembly (FastAPI Depends), singleton wiring
    ├── http/            # REST routers, ApiResponse<T>, DTOs, assemblers
    └── ws/              # WebSocket router (/ws/{session_id})
```

### Key Patterns
- **DI wiring**: `ohs/dependencies.py` creates singletons at module level and provides `get_*` factory functions for FastAPI `Depends`.
- **Domain ACL**: Domain defines abstract interfaces (e.g., `domain/session/acl/claude_agent_gateway.py`), infr layer implements them.
- **Commands**: Application layer uses frozen Pydantic models as input DTOs (e.g., `CreateSessionCommand`).
- **Assemblers**: `ohs/assembler/` converts between domain models and HTTP DTOs.
- **API response**: Unified `ApiResponse(code, message, data)` — code 0 is success.
- **WebSocket protocol**: `/ws/{session_id}` with action-based messages (`send_prompt`, `cancel`, `get_status`, `set_model`, `set_permission_mode`, `user_response`) and event-based responses (`connected`, `message`, `status_change`, `error`, `info`).
- **IM integration**: Plugin-style adapters registered in `ImChannelRegistry` (Lark, OpenIM, QQ, WeChat). Outbound sync via callback hook on assistant responses.

## Frontend Architecture — Vue 3 + Feature-Sliced

```
frontend/src/
├── app/        # App shell (App.vue, main.js, router)
├── pages/      # Route-level pages (chat-panel/)
├── features/   # Self-contained UI features
│   ├── session-list/    send-message/    message-display/
│   ├── cancel-query/    clear-context/   compact-context/
│   ├── command-palette/  plugin-manager/  settings-manager/
│   ├── im-binding/      terminal/        notification-center/
├── entities/   # Core business data (session/, project/)
└── shared/     # Shared utilities (api/, components/, styles/)
```

### Key Patterns
- **State management**: Module-level singleton composables (`useSession.js`, `useProject.js`) — not Pinia/Vuex.
- **HTTP client**: `shared/api/httpClient.js` — treats `code === 0` as success.
- **WS client**: `shared/api/wsClient.js` — auto-reconnect on abnormal close.
- **Path aliases**: `@app`, `@pages`, `@features`, `@entities`, `@shared`, `@` (→ `src/`).
- **No component library** — custom CSS throughout.

## Tech Stack
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy (async), Alembic, Codex-agent-sdk, aiomysql
- **Frontend**: Vue 3 (Composition API), Vite 8, marked, highlight.js
- **Database**: MySQL 8
- **Package management**: uv (backend), npm (frontend)

## Related Documentation

- [ACP 集成续作指南](doc/acp-handoff.md) — 切换回 Velpos 时的 Agent 提示语、架构快照、backlog
- [ACP / Cursor Agent 集成调研](doc/acp-integration-research.md) — AcpGateway 设计、开发、测试参考（含 Zed 实现对照、事件映射、测试计划）
- [AcpGateway 实施计划](doc/acp-gateway-implementation-plan.md) — Task 1–9 路线图与验收
- [部署指南](doc/deploy-guide.md)

## Git Commit Workflow

- 开发过程中必须**小步提交**：完成一个独立功能、一个独立组件、一个清晰的重构步骤，或一个可验证的测试/文档阶段后，立即准备一次提交。
- 每次提交必须保持可验证边界：包含对应代码、能够通过的测试用例，以及与该步骤相关的 spec、plan 或调研文档更新；不要把多个无关功能混在同一提交中。
- 提交前必须运行与本次变更范围匹配的验证命令，并确认输出；若无法运行测试，需要在最终说明中明确原因与剩余风险。
- 提交信息应优先使用中文描述本次功能或组件目的，推荐格式：`<type>(<scope>): 中文描述`，例如 `feat(acp): 增加通用 AgentGateway 端口`。
- 不要提交明显包含密钥、令牌、本地凭据、`.env` 实例文件或与任务无关的改动；遇到用户已有未提交改动时，只提交本次任务相关文件。

## Agent Role Workflow

所有较大功能默认按三角色协作推进，角色可以由不同子 Agent 承担，也可以由当前 Agent 显式切换视角执行；无论执行方式如何，都必须保留角色职责边界。

### 需求角色（Requirement）

- 负责需求设计、关键需求确认、验收标准和用户体验闭环。
- 先判断哪些问题会影响产品方向、安全边界、部署拓扑或用户体验；这些问题必须向用户确认，其他细节可基于现有文档和代码自行学习后决定。
- 维护 spec / plan / 调研文档，确保每个开发任务都有明确输入、输出、验收口径和非目标。
- 参与最终验收测试，确认实现行为符合用户目标，而不是只看测试通过。

### 开发角色（Development）

- 负责服务架构、技术调研、方案落地和代码提交。
- 开发前必须先阅读现有架构、相关 spec / plan，以及可参考的开源项目；开源代码只能批判性吸取设计和边界处理，不照抄实现。
- 将需求转换为小步代码任务，遵循 TDD：先写能失败的测试，再写最小实现，再重构。
- 完成一个独立功能或组件后，连同测试和相关文档立即提交。

### 测试角色（Testing）

- 负责自动化测试设计、测试执行、失败反馈和代码质量评审。
- 测试用例必须覆盖完整 Happy Path、边界场景和异常场景；对协议/网关类功能优先使用 mock transport，避免真实网络依赖。
- 测试不通过时，先反馈开发角色排查；若失败根因是需求不清或验收口径冲突，反馈需求角色重新分析。
- 同步执行验收测试，评审开发角色的代码质量、测试充分性、错误处理和可维护性。

### 协作闭环

- 工作顺序：需求角色明确验收口径 → 开发角色调研并实现 → 测试角色自动化测试与代码评审 → 需求角色验收。
- 任一角色发现阻塞时必须说明阻塞类型：需求问题、技术问题、测试问题或环境问题。
- 不允许跳过测试角色直接声明完成；不允许在需求未闭环时扩大实现范围。
