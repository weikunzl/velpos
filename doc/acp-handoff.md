# Velpos Cursor ACP 集成 — 项目切换与续作指南

> **用途**：从其他仓库（如 `cursor-gateway`）切回 Velpos 时，给 Agent 或自己的上下文恢复用。  
> **最后更新**：2026-07-06  
> **主仓库路径**：`/Users/kunwei/Documents/workspace/ai/velpos`  
> **远程**：`github.com/weikunzl/velpos`（本地 `master` 曾领先 origin 14 commits，切换后先 `git pull` / `git status`）

---

## 一、复制即用：Agent 续作提示语

将下面整段粘贴到新会话（**请先 `File → Open Folder` 打开 velpos 根目录**）：

```text
你在 Velpos 仓库继续 Cursor ACP 集成工作。

【项目路径】/Users/kunwei/Documents/workspace/ai/velpos
【不要改】cursor-gateway（/Users/kunwei/Documents/workspace/ai/cursor-gateway）— 那是独立 HTTP 聊天 API 代理，与 ACP 无关。

【目标】浏览器零安装；服务端跑 agent acp / Claude SDK；北向保持 Velpos 自有 WebSocket；南向用 Agent Client Protocol（stdio）。

【架构】
Vue 前端 → Velpos FastAPI + WS → RoutingAgentGateway → claude: ClaudeAgentGateway | cursor: AcpGateway → agent acp

【设计红线】
- 单一 NormalizedMessage dict 契约，不新增第二套消息格式
- 默认 provider=claude，不影响现有 Claude 路径
- sdk_session_id 复用存 ACP sessionId
- ACP = Zed 的 Agent Client Protocol（非 IBM 旧协议）

【已完成 Tasks 1–9】
- AgentGateway 端口 + RoutingAgentGateway
- ACP stdio 传输、provider 配置、message_mapper、AcpGateway 生命周期
- 权限/用户追问、会话级 provider 字段 + 迁移 0026
- 协议对齐：mcpServers[]、prompt text blocks、content.text
- 冒烟测试 PASS（VELPOS_RUN_CURSOR_ACP_TEST=1）
- 前端：创建会话可选 Claude/Cursor，侧边栏 provider 标识

【续作前必读】
- doc/acp-handoff.md（本文件）
- doc/acp-gateway-implementation-plan.md
- doc/acp-integration-research.md
- AGENTS.md（三角色协作 + 小步提交）

【验证命令】
cd backend
uv run python -m unittest discover -s tests/unit -p 'test_*.py' -v
VELPOS_RUN_CURSOR_ACP_TEST=1 uv run python -m unittest tests.integration.test_cursor_acp_smoke -v
VELPOS_RUN_CURSOR_ACP_E2E=1 uv run python -m unittest tests.integration.test_cursor_acp_e2e -v

【待办优先级】
1. ~~部署环境 alembic upgrade head（0026_session_provider）~~ ✅ 2026-07-06 已执行
2. ~~端到端：前端选 Cursor → 发消息 → WS 收到 assistant 回复~~ ✅ opt-in E2E 测试 PASS
3. ~~Phase 3：fs/*、terminal/* 代理；session/cancel 真实现~~ ✅ 已实现 + 单元测试
4. initialize 能力位与 Cursor 实测对齐（目前偏保守 false → 已改为 true）

【协作方式】需求/开发/测试三角色；每步小步提交（中文 commit）；行为变更加单元测试。
```

---

## 二、与 cursor-gateway 的关系（务必分清）

| 项目 | 路径 | 角色 | 本次 ACP 是否使用 |
|------|------|------|-------------------|
| **Velpos** | `/Users/kunwei/Documents/workspace/ai/velpos` | Web 控制台 + Agent 代理 | ✅ **全部 ACP 代码在此** |
| **cursor-gateway** | `/Users/kunwei/Documents/workspace/ai/cursor-gateway` | Cursor 聊天 API 的 OpenAI/Anthropic HTTP 代理（:8001） | ❌ **无 ACP 代码，不接入** |

Velpos 远程 Cursor Agent 路径：**浏览器 → Velpos → `agent acp`（stdio）**，不经过 cursor-gateway。

---

## 三、服务架构快照

```text
浏览器 (Vue 3, :3231)
    │  REST /api  +  WebSocket /ws/{session_id}
    ▼
Velpos 后端 (FastAPI, :8083)
    ├── Application（会话/项目/调度/IM…）
    ├── RoutingAgentGateway（按 session 路由）
    │     ├── claude → ClaudeAgentGateway → Claude Agent SDK
    │     └── cursor → AcpGateway → agent acp（stdio JSON-RPC）
    └── MySQL (:3307 dev)
```

**后端分层**：`ohs/` → `application/` → `domain/` → `infr/`

**开发启动**：

```bash
cd /Users/kunwei/Documents/workspace/ai/velpos
cp build/dev/.env.example build/dev/.env   # 首次
build/dev/start.sh start
# 前端 http://localhost:3231  后端 http://localhost:8083
```

---

## 四、关键代码地图

| 模块 | 路径 |
|------|------|
| 通用端口 | `backend/domain/session/acl/agent_gateway.py` |
| 路由网关 | `backend/infr/client/routing_agent_gateway.py` |
| ACP 网关 | `backend/infr/client/acp/acp_gateway.py` |
| Client 能力代理 | `backend/infr/client/acp/client_handlers.py` |
| stdio 传输 | `backend/infr/client/acp/transport.py` |
| 消息映射 | `backend/infr/client/acp/message_mapper.py` |
| Provider 配置 | `backend/infr/config/agent_providers.yaml` |
| DI 接线 | `backend/ohs/dependencies.py` |
| 会话 provider 绑定 | `backend/application/session/session_query_engine.py` |
| 创建校验 | `backend/application/session/session_application_service.py` |
| WS 入口 | `backend/ohs/ws/session_ws.py` |
| DB 迁移 | `backend/migrations/versions/20260706_120000_0026_session_provider.py` |
| 前端 API | `frontend/src/entities/session/api/sessionApi.js` |
| 创建对话框 | `frontend/src/features/session-list/ui/CreateSessionDialog.vue` |
| 冒烟测试 | `backend/tests/integration/test_cursor_acp_smoke.py` |
| E2E 测试 | `backend/tests/integration/test_cursor_acp_e2e.py` |

---

## 五、已完成提交（ACP 相关，从新到旧）

```text
4ee21d1 feat(frontend): 会话创建支持选择 Agent Provider
9dc9301 fix(acp): 对齐 Cursor 文档协议格式
1ac579d fix(acp): 修复 Provider 路由与认证兼容问题
0db5dba test(acp): 增加 Cursor ACP 冒烟验证
dfaa0ee feat(acp): 支持会话级 Agent Provider 选择
615115e feat(acp): 接入权限与用户追问流程
7bcf287 feat(acp): 实现 ACP 网关生命周期
d69bdb4 feat(acp): 映射 ACP 事件到 Velpos 消息
704ce68 feat(acp): 增加 stdio 传输层
24c28dc feat(acp): 增加 ACP Provider 配置加载
3491204 feat(acp): 增加 AgentGateway 路由网关
3838ce6 docs(acp): 增加 AcpGateway 实施计划
a7fb37e docs(workflow): 记录三角色协作与小步提交规则
e62cae9 feat(acp): 增加通用 AgentGateway 接缝
```

**测试状态（2026-07-06）**：单元测试 53 passed；opt-in 冒烟 PASS；opt-in E2E PASS（需本机 `agent` 已 login + 后端 :8083）。

---

## 六、后续任务 backlog

### P0 — 上线前

- [x] 目标环境执行 `alembic upgrade head`（`0026_session_provider`）
- [x] 端到端验证：`provider=cursor` 会话发消息 → WebSocket 流式回复（`test_cursor_acp_e2e.py`）
- [ ] 确认服务端 `agent` 在 PATH 且已 `agent login`（或配置 `CURSOR_API_KEY`）

### P1 — Phase 3 能力

- [x] `session/cancel` 真实现（发送 ACP notification + 中断 prompt 循环）
- [x] ACP `fs/*` 代理到 workspace 目录（服务端本地读写）
- [x] ACP `terminal/*` 代理到 subprocess 终端会话
- [ ] `initialize` clientCapabilities 与 Cursor 更多扩展方法实测对齐

### P2 — 增强

- [ ] `session/load` 行为实测与 WS 重连策略
- [ ] 多会话 ACP 进程 idle 回收 / 资源限制
- [ ] MCP 配置（`.cursor/mcp.json`）与 Cursor ACP 联调记录
- [ ] 自研 ACP Agent：在 `agent_providers.yaml` 加 provider + transport 即可扩展

### 明确不做（当前阶段）

- AG-UI 北向出口
- 多用户 Cursor 账号隔离
- 依赖 cursor-gateway :8001

---

## 七、验证与排错

```bash
# 单元测试（默认，无真实 agent）
cd /Users/kunwei/Documents/workspace/ai/velpos/backend
uv run python -m unittest discover -s tests/unit -p 'test_*.py' -v

# 真实 Cursor ACP 冒烟（opt-in）
VELPOS_RUN_CURSOR_ACP_TEST=1 uv run python -m unittest tests.integration.test_cursor_acp_smoke -v

# 检查 agent CLI
which agent && agent --version
```

| 现象 | 排查 |
|------|------|
| 创建会话报 unsupported provider | `agent_providers.yaml` 与 `RoutingAgentGateway.backends` 是否一致 |
| Cursor 会话无回复 | 服务端 `agent login`；看 backend 日志；跑冒烟测试 |
| 迁移报错 | 是否已执行 `0026_session_provider` |
| 误开 cursor-gateway | Velpos ACP **不需要** :8001 |

---

## 八、文档索引

| 文档 | 内容 |
|------|------|
| **本文件** `doc/acp-handoff.md` | 切换项目、续作提示语、backlog |
| `doc/acp-gateway-implementation-plan.md` | Task 1–9 实施计划与验收 |
| `doc/acp-integration-research.md` | 调研、选型、协议、风险、实测记录 |
| `AGENTS.md` | 开发命令、三角色工作流、小步提交规范 |
| `README.md` / `README_zh.md` | Velpos 产品总览 |

---

## 九、切换项目 Checklist

1. Cursor：**Open Folder** → `/Users/kunwei/Documents/workspace/ai/velpos`
2. `git status` / `git pull`（本地曾 ahead 14，确认与远程一致）
3. `build/dev/start.sh status` 或 `start`
4. 新 Agent 会话粘贴 **第一节提示语**
5. 续作前扫一眼 `doc/acp-gateway-implementation-plan.md` 第六节 backlog

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-07-06 | Phase 3：session/cancel、fs/terminal 代理、E2E 测试、迁移执行 |
| 2026-07-06 | 初版：Tasks 1–9 完成后的切换/续作归档 |
