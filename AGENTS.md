# AGENTS.md

This file provides guidance to AI coding agents (Cursor, Claude Code, etc.) when working with code in this repository.

## Development Environment

### Shell and Tooling

- Default shell is typically **bash** or **zsh**, depending on the host.
- Prefer **`mise`** for project dev dependencies and runtime management. Check and use repo-local `mise.toml` first when available.
- Prefer project scripts from `package.json`, `Makefile`, `justfile`, `mise.toml`, `pyproject.toml`, `Cargo.toml`, etc.
- Prefer repo-local tools over global installs.
- Use `rg` / `rg --files` for search.
- Keep changes scoped to the requested task.
- Run focused checks/tests when practical, and report what was run.

### Workspace Layout

- All repos and working files are under `~/Workspace`.
- GitHub repos are usually under `~/Workspace/github.com/<owner>/<repo>`.
- My own GitHub repos are under `~/Workspace/github.com/Aysnine/`.
- Temporary demos and throwaway projects belong in `~/Workspace/temp-projects`.
- Treat every repo as git-managed. Check git status before edits, and do not overwrite or revert my unrelated changes.

### Browser

- Chrome has a profile named **`local`** for agent/dev use.
- If you need Chrome, use only the `local` profile. Do not use or modify other Chrome profiles.

### Secrets

- For AI/agent integration development, use my shared env file only when needed:
  `~/.config/my-api-keys-for-dev/secrets.env`
- It contains exports such as `DEEPSEEK_API_KEY`, `DASHSCOPE_API_KEY`, and `OPENROUTER_API_KEY`.
- Source it in the current command or shell when required.
- Never print, log, commit, or copy secret values into code, docs, terminal output, or git history.

### Terminal and Long-Running Processes

- Prefer **tmux** for persistent dev workflows (optionally via iTerm2 on macOS).
- Prefer reusing existing tmux sessions/panes for long-running commands such as dev servers, watchers, workers, test watchers, REPLs, and local services.
- Before starting a duplicate long-running process in your own agent terminal, inspect tmux first:
  - `tmux list-sessions`
  - `tmux list-windows -a`
  - `tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index} #{pane_current_path} #{pane_current_command} #{pane_title}'`
- Read tmux output with:
  - `tmux capture-pane -t <target> -p -S -200`
  - Use more lines when debugging startup or build failures.
- Send commands to an existing pane with:
  - `tmux send-keys -t <target> '<command>' C-m`
- Interrupt a process only when clearly appropriate:
  - `tmux send-keys -t <target> C-c`
- If no suitable tmux session exists, create one with a stable project-oriented name:
  - `tmux new-session -d -s <repo-or-project-name> -c <project-root>`
- Use clear tmux window names such as `web`, `api`, `worker`, `test`, `db`, `logs`, or `scratch`.
- If iTerm2 is relevant, assume I may be viewing the same tmux sessions through iTerm2. Do not rely on iTerm2 GUI automation unless tmux is insufficient.

## Project Overview

Velpos is a web interface for controlling Claude Code and other agent backends (including Cursor via ACP) via the Agent SDK. Python FastAPI backend + Vue 3 frontend, communicating over REST and WebSocket.

## Development Commands

### Quick Start (One Command)
```bash
./setup.sh          # Interactive — asks dev or prod
./setup.sh dev      # Development mode
./setup.sh prod     # Production mode
./setup.sh stop     # Stop services
./setup.sh status   # Show status
```

For the full machine-readable deploy guide, see [doc/deploy-guide.md](./doc/deploy-guide.md).

### Quick Start (Dev, Manual)
```bash
# 1. Copy and configure environment (backend/frontend read build/dev/.env via start.sh)
cp build/dev/.env.example build/dev/.env

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
# Manual alternative (setup.sh handles this automatically):
cp build/prod/.env.example build/prod/.env
# Edit build/prod/.env — set ANTHROPIC_API_KEY and MYSQL_ROOT_PASSWORD
docker compose -f build/prod/docker-compose.yml up --build -d
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
```

### Ports
- Backend: 8083 (API docs at http://localhost:8083/docs)
- Frontend: 8911 (dev, from `build/dev/.env` / `vite.config.js`) / 80 (prod, via nginx)
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
- `CLAUDE_CLI_PATH` — path to claude CLI binary (auto-detected when in PATH)

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
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy (async), Alembic, claude-agent-sdk, agent-client-protocol, aiomysql
- **Frontend**: Vue 3 (Composition API), Vite 8, marked, highlight.js
- **Database**: MySQL 8
- **Package management**: uv (backend), npm (frontend)

## Related Documentation

- [ACP 集成续作指南](doc/acp-handoff.md) — 切换回 Velpos 时的 Agent 提示语、架构快照、backlog
- [ACP / Cursor Agent 集成调研](doc/acp-integration-research.md) — AcpGateway 设计、开发、测试参考（含 Zed 实现对照、事件映射、测试计划）
- [AcpGateway 实施计划](doc/acp-gateway-implementation-plan.md) — Task 1–9 路线图与验收
- [部署指南](doc/deploy-guide.md)

## Git Commit Workflow

### Git Workflow Rules

- **Repo check**: Always verify if the current directory is a Git repository. Check subdirectories as well to support multi-repo workflows.
- **Commit style**: Mimic the repository's existing style by analyzing the last 3 commit messages (pay attention to multi-line formats).
- **Default preference**: If no clear style exists, default to concise and efficient **Conventional Commits**.

### Velpos Commit Conventions

- 开发过程中必须**小步提交**：完成一个独立功能、一个独立组件、一个清晰的重构步骤，或一个可验证的测试/文档阶段后，立即准备一次提交。
- 每次提交必须保持可验证边界：包含对应代码、能够通过的测试用例，以及与该步骤相关的 spec、plan 或调研文档更新；不要把多个无关功能混在同一提交中。
- 提交前必须运行与本次变更范围匹配的验证命令，并确认输出；若无法运行测试，需要在最终说明中明确原因与剩余风险。
- 提交信息应优先使用中文描述本次功能或组件目的，推荐格式：`<type>(<scope>): 中文描述`，例如 `feat(acp): 增加通用 AgentGateway 端口`。
- 不要提交明显包含密钥、令牌、本地凭据、`.env` 实例文件或与任务无关的改动；遇到用户已有未提交改动时，只提交本次任务相关文件。

## Agent Workflow Preferences

- Do not use Git worktrees by default, and do not create or switch to a new branch by default. Work in the current checkout and current branch unless I explicitly ask for a worktree or branch.
- When I mention **"handoff"**, interpret it as a request to create or use a new agent thread, not as a Git worktree, branch, or manual task transfer unless I explicitly say otherwise.
- When I ask for a **"review cycle"**, run the workflow as: modify → review by subagent(s) → fix any findings → review again until the required clean-review threshold is reached.
- The review-cycle count means the number of consecutive review rounds that must complete with no findings. If any review round reports a finding, stop further reviews for that round, fix the finding(s), reset the clean-review count, and start reviewing again.
- The default review-cycle count is **1**. If I write a form such as **"review cycle 3x3"**, interpret it as 3 subagents reviewing from 3 distinct perspectives, with 3 consecutive no-finding review rounds required before the cycle is complete.

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

### 测试评价与缺陷分级（必须执行）

所有较大功能、协议集成、UI 调试类改动，测试角色必须按**至少三个视角**设计与执行用例：

1. **需求/验收视角**：Happy Path、用户可见行为、验收标准是否闭环。
2. **协议/数据视角**：南向 payload 映射、归一化契约、持久化与 WS 增量更新是否一致。
3. **前端/交互视角**：Debug 模式展示、展开/折叠、流式 patch 后的响应式刷新、边界与异常提示。

测试场景应尽量多样，至少覆盖：正常路径、空/缺字段、延迟 patch、嵌套 payload、权限/取消、重连后回放。

发现的问题必须从**三个维度**记录分析结论：

| 维度 | 关注点 |
|------|--------|
| **功能正确性** | 数据是否丢失、映射是否正确、合并/持久化是否一致 |
| **用户体验** | Debug/Runtime 是否可读、错误是否可理解、交互是否跟手 |
| **可维护性** | 协议兼容层是否清晰、测试是否可重复、回归风险是否可控 |

每个问题必须给出 **P0–P3** 优先级，并默认**优先修复 P0–P2**：

| 级别 | 定义 | 处理策略 |
|------|------|----------|
| **P0** | 核心功能不可用、数据丢失、安全/权限绕过 | 必须在本轮修复并补回归测试 |
| **P1** | 主要场景体验严重受损（如 Debug 看不到关键 tool 详情） | 必须在本轮修复或给出明确阻塞说明 |
| **P2** | 边界场景、兼容性、可维护性缺陷 | 本轮尽量修复；来不及则写入 backlog 并说明风险 |
| **P3** | 文案、样式、非阻塞优化 | 可延后，但需在测试报告中登记 |

测试报告至少包含：场景列表、三维度分析、P0–P3 问题清单、已修复项、剩余风险与建议验证命令。
