# ACP / Cursor Agent 集成调研记录

> **状态**：调研完成，待设计实现  
> **日期**：2026-07-06  
> **用途**：Velpos `AcpGateway` 方案的设计、开发、测试参考  
> **相关项目**：Velpos（主）、cursor-gateway（独立，勿混用）

---

## 1. 调研结论摘要

| 问题 | 结论 |
|------|------|
| Web 前端能否直连 Cursor Agent？ | **不能**（ACP 默认 stdio，浏览器无法 spawn 子进程） |
| Velpos 能否对接 Cursor Agent？ | **能**，后端做 ACP Client，前端沿用 WebSocket |
| 是否应使用 cursor-gateway？ | **否**（聊天 API 代理 ≠ 完整 Agent） |
| 是否应使用 AG-UI？ | **非主路径**；南向必然 ACP，AG-UI 仅可选北向出口（详见 §14 决策） |
| 参考实现 | **Zed** `crates/agent_servers/src/acp.rs`（ACP Client 标杆） |
| Cursor 接法 | 优先 `agent acp` 直连，不用 community adapter |

**推荐架构**：

```
Vue 前端 ──WebSocket(/ws/{id})──► Velpos FastAPI ──ACP stdio──► agent acp / 其他 ACP Agent
                                      │
                                      └── AgentGateway（通用）+ Provider Registry
```

---

## 2. 概念辨析（必读）

### 2.1 三个「Gateway」不要混用

| 名称 | 项目/位置 | 角色 | 协议 | 能力 |
|------|-----------|------|------|------|
| **Cursor Gateway** | `cursor-gateway` 仓库 `main_cursor.py` | HTTP 代理 | OpenAI/Anthropic SSE | 聊天补全；工具写进 system prompt，非真执行 |
| **CursorAcpGateway** | Velpos 拟议模块 | ACP Client | stdio JSON-RPC → Velpos WS | 完整 Cursor Agent |
| **AcpGateway（通用）** | Velpos 拟议模块 | ACP Client + Provider 插件 | 同上 | 可接 Cursor 及任意 ACP Agent |

### 2.2 协议栈位置

```
Agent ↔ 用户界面     AG-UI（可选，CopilotKit）
Agent ↔ 工具/数据    MCP
Agent ↔ Agent        A2A

ACP = Agent Client Protocol：Client（Velpos/Zed）↔ Agent Server（agent acp）
```

### 2.3 Cursor「Auto」模型

- **Cursor Gateway**：无 `auto` 别名，透传 `model: "auto"` 给云端 API，不稳定
- **Cursor ACP**：不涉及 Auto 模型选择，走 Agent 运行时
- **Kiro Gateway**（另一项目）：有 `auto` → `claude-sonnet-4.5`，与本文无关

---

## 3. Cursor Gateway（cursor-gateway）要点

> 路径：`/Users/kunwei/Documents/workspace/ai/cursor-gateway`

- 逆向 Cursor IDE 的 ConnectRPC/Protobuf 聊天 API（`api2.cursor.sh`）
- 对外：`/v1/chat/completions`、`/v1/messages`
- 认证：`state.vscdb` 或 `CURSOR_ACCESS_TOKEN`；客户端用 `PROXY_API_KEY`
- `is_agentic=True` 仅在请求带 `tools` 时设置，**不等于** IDE 完整 Agent
- 工具：写入 system prompt 文本（`cursor/converters_core.py`），非原生 tool execution
- **不适用**于 Velpos 完整 Agent 场景

---

## 4. ACP（Agent Client Protocol）要点

### 4.1 官方规范

- 文档：https://agentclientprotocol.com  
- Cursor 文档：https://cursor.com/docs/cli/acp  
- 传输（当前 Cursor 实现）：**stdio**，newline-delimited JSON-RPC 2.0  
- 远程传输（RFD #721，草案）：`/acp` HTTP + SSE / WebSocket — **Cursor 尚未实现**

### 4.2 典型会话流程

```
1. initialize          （声明 clientCapabilities）
2. authenticate        （Cursor: methodId = "cursor_login"）
3. session/new         （cwd, mode, mcpServers...）
4. session/prompt      （用户消息）
5. session/update      （Agent → Client 流式通知）
6. session/request_permission （工具审批，Client 必须响应）
7. session/cancel      （可选）
```

### 4.3 Cursor 扩展方法

| 方法 | 类型 | Velpos 映射建议 |
|------|------|----------------|
| `cursor/ask_question` | Blocking | `user_choice_request` |
| `cursor/create_plan` | Blocking | 新增 `plan_request` |
| `cursor/update_todos` | Notification | 任务进度 UI |
| `cursor/task` | Notification | 子 Agent 状态 |
| `cursor/generate_image` | Notification | 附件/预览 |

### 4.4 Cursor ACP 已知限制（2026 初，测试时需关注）

| 问题 | 影响 |
|------|------|
| `session/new` 的 `mcpServers` 常被静默忽略 | Velpos 插件/MCP 管理需改用 `.cursor/mcp.json` |
| 静态 `~/.cursor/mcp.json` 在 `agent acp` 下也可能不生效 | 部署前需实测 |
| `session/load` 能力 advertised 但可能未完全实现 | 断线重连策略需谨慎 |
| MCP `tools/call` ~60s 硬超时 | 长任务需拆分或走 IDE 路径 |
| Team-level MCP（Dashboard）不支持 ACP | 仅 project/user 级 `.cursor/mcp.json` |

### 4.5 认证

```bash
agent login
# 或
export CURSOR_API_KEY=...
agent --api-key "$CURSOR_API_KEY" acp
```

---

## 5. AG-UI 调研结论（备选，非主路径）

- AG-UI：前端 ↔ Agent 的事件流标准（CopilotKit 推动）
- Cursor **不在** AG-UI 官方集成列表
- Cursor SDK 事件格式 ≠ AG-UI 事件，需 Middleware 转换
- `docs.ag-ui.com/tutorials/cursor` 指用 Cursor IDE **开发** AG-UI，非用 AG-UI 调 Cursor
- Velpos 若走 AG-UI：需 `AgentGateway` → AG-UI Middleware → Cursor SDK/ACP，复杂度高
- **建议**：Phase 1 不做 AG-UI；保留 Velpos WebSocket 北向协议

---

## 6. Velpos 现状与 ACP 对齐度

> 路径：`/Users/kunwei/Documents/workspace/ai/velpos`

### 6.1 已有能力（可复用）

| 模块 | 路径 | ACP 对应 |
|------|------|----------|
| Gateway 抽象 | `domain/session/acl/claude_agent_gateway.py` | 泛化为 `AgentGateway` |
| Claude 实现 | `infr/client/claude_agent_gateway.py` | 保留，与 ACP 并存 |
| WebSocket | `ohs/ws/session_ws.py` | 北向 API 不变 |
| 权限等待 | `can_use_tool` + Future + WS 广播 | `session/request_permission` |
| 用户选择 | `user_choice_request` | `cursor/ask_question` |
| 终端 | `/ws/terminal` | `handle_create_terminal` 等 |
| DI | `ohs/dependencies.py` | 注册 `AcpGateway` |

### 6.2 当前 WebSocket 协议（北向）

**Client → Server（action）**：

- `send_prompt`, `cancel`, `rewind_to`, `get_status`
- `set_model`, `set_permission_mode`, `user_response`

**Server → Client（event）**：

- `connected`, `message`, `status`, `status_change`
- `permission_request`, `user_choice_request`, `error`, `info`

### 6.3 不存在的能力

- ACP / AG-UI 集成
- Cursor CLI / cursor-gateway 依赖
- Provider 多 Agent 切换（仅 Claude SDK）

### 6.4 Claude Code 与 ACP 并存

Claude Code **不走 ACP**，需双轨：

```
AgentGateway
├── ClaudeAgentGateway  → claude-agent-sdk（现有）
└── AcpGateway          → agent acp / 其他 ACP Agent
```

会话创建时选择 `provider: "claude" | "cursor" | ...`。

---

## 7. Zed 实现参考（核心）

> 源码：`github.com/zed-industries/zed/crates/agent_servers/src/acp.rs`  
> 文档：`docs/src/ai/external-agents.md`

### 7.1 Zed 角色

- Zed = **ACP Client**
- External Agent = 子进程（`agent acp`、Claude Agent、Codex 等）
- UI = Agent Panel / Threads Sidebar（内置，非 HTTP）

### 7.2 应对齐的模式

1. **Provider 配置化**（≈ `agent_servers` JSON）
2. **官方 SDK**（Rust `agent_client_protocol`；Velpos 用 Python SDK）
3. **spawn + stdio 管道** + 后台 IO task 读 stdout
4. **完整 Agent→Client handler 集**
5. **配置边界**：External Agent 自管 auth/model/MCP

### 7.3 Zed 注册的 Handler（Velpos 需实现或声明不支持）

| Handler | 说明 | Velpos 映射 |
|---------|------|-------------|
| `handle_request_permission` | 工具审批 | `permission_request` + `user_response` |
| `handle_read_text_file` | Agent 借 Client 读文件 | workspace / 项目目录 |
| `handle_write_text_file` | Agent 借 Client 写文件 | workspace API |
| `handle_create_terminal` 等 | 终端生命周期 | `/ws/terminal` |
| `handle_session_notification` | 流式消息、tool call | WS `message` / `status_change` |

### 7.4 Zed vs Velpos 差异

| 维度 | Zed | Velpos |
|------|-----|--------|
| 客户端 | 桌面原生 Rust/GPUI | Web Vue + FastAPI |
| 北向 | 内置 UI | WebSocket（+ 可选未来 `/acp`） |
| fs/terminal | 直接本地 | 后端代理到浏览器 |
| 多 Thread | Agent Panel 并行 | 多 Session + 团队协调 |

### 7.5 Cursor 在 Zed 中的配置

```json
{
  "agent_servers": {
    "Cursor": {
      "type": "custom",
      "command": "agent",
      "args": ["acp"]
    }
  }
}
```

社区 adapter（`cursor-acp`）用于旧版 CLI 桥接；Velpos **优先直连 `agent acp`**。

---

## 8. 目标架构（AcpGateway）

### 8.1 分层

```
┌─────────────────────────────────────────────────────────┐
│  Northbound：Velpos WebSocket（Phase 1 不变）              │
├─────────────────────────────────────────────────────────┤
│  Control Plane：Session / Project / Permission / IM     │
├─────────────────────────────────────────────────────────┤
│  AgentGateway（抽象）                                     │
│    ├── ClaudeAgentGateway（现有）                         │
│    └── AcpGateway（新增）                                 │
│          └── AcpProviderRegistry                          │
│                ├── cursor: agent acp                      │
│                └── ... 其他 ACP Agent                     │
├─────────────────────────────────────────────────────────┤
│  Southbound：stdio ACP JSON-RPC                           │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Provider 配置示例

```yaml
# 建议：backend/infr/config/agent_providers.yaml
providers:
  cursor:
    transport: stdio
    command: agent
    args: [acp]
    auth_method: cursor_login
    env:
      CURSOR_API_KEY: ${CURSOR_API_KEY}
    default_mode: agent   # agent | plan | ask
```

### 8.3 事件映射（ACP → Velpos WS）

| ACP（南向） | Velpos WS（北向） |
|-------------|-------------------|
| `session/update` → `agent_message_chunk` | `event: message` |
| `session/update` → `tool_call` | `event: message`（tool 块） |
| `session/request_permission` | `event: permission_request` |
| `cursor/ask_question` | `event: user_choice_request` |
| `cursor/create_plan` | `event: plan_request`（待新增） |
| `cursor/update_todos` | 任务进度（待新增） |
| `session/cancel` 完成 | `event: status_change` |
| 连接/认证失败 | `event: error` |

### 8.4 `initialize` 能力声明建议

```json
{
  "protocolVersion": 1,
  "clientCapabilities": {
    "fs": { "readTextFile": true, "writeTextFile": true },
    "terminal": true
  },
  "clientInfo": { "name": "velpos", "version": "0.2.0" }
}
```

若暂不支持 fs/terminal 代理，应显式设为 `false`，避免 Agent 阻塞等待。

---

## 9. 实施路线图

### Phase 1 — Client 骨架（PoC）

- [ ] `domain/session/acl/agent_gateway.py` 抽象接口
- [ ] `infr/client/acp/acp_gateway.py` + `acp_connection.py`
- [ ] `infr/client/acp/providers/cursor.py`
- [ ] Provider Registry 配置加载
- [ ] 生命周期：`initialize` → `authenticate` → `session/new` → `session/prompt`
- [ ] `session/update` → WS `message`
- [ ] 环境变量：`AGENT_PROVIDER=cursor_acp`

### Phase 2 — 权限与 Cursor 扩展

- [ ] `session/request_permission` ↔ `permission_request` / `user_response`
- [ ] `cursor/ask_question` ↔ `user_choice_request`
- [ ] `session/cancel` ↔ `cancel` action
- [ ] ACP Debug Log（参考 Zed `OpenAcpLogs`）

### Phase 3 — Client 能力补全

- [ ] `fs/read_text_file` / `fs/write_text_file` → workspace
- [ ] `terminal/*` → 现有 xterm 集成
- [ ] 进程池 / 会话回收 / 超时策略

### Phase 4 — Velpos 差异化

- [ ] 多 Provider UI 选择（Session 级）
- [ ] Claude SDK 与 ACP 并存
- [ ] Agent 打包适配 Cursor（`.cursor/rules`、`mcp.json`）
- [ ] （可选）暴露 `/acp` 北向端点

---

## 10. 测试计划要点

### 10.1 前置条件

```bash
# 安装并认证 Cursor CLI
which agent
agent login
# 或 export CURSOR_API_KEY=...

# Velpos 开发环境
cd velpos && build/dev/start.sh start
```

### 10.2 单元测试

| 用例 | 验证点 |
|------|--------|
| ACP 消息解析 | newline JSON-RPC 拆包、request/notification 分流 |
| 事件映射 | `session/update` 各 `sessionUpdate` 类型 → Velpos 事件 |
| Provider Registry | 配置加载、env 注入 |
| Permission 超时 | 5min 无响应 → deny（对齐现有 Claude gateway） |

### 10.3 集成测试（需本机 `agent` CLI，可标记 `@pytest.mark.acp`）

| 用例 | 步骤 | 期望 |
|------|------|------|
| 连接建立 | spawn `agent acp` → initialize → authenticate | 无 error |
| 简单对话 | session/new → session/prompt "Say hello" | WS 收到流式 `message` |
| 权限审批 | 触发写文件工具 → permission_request → user_response allow-once | Agent 继续执行 |
| 取消 | send_prompt 中 cancel | session 停止，status_change |
| 进程清理 | disconnect session | 子进程退出，无 zombie |
| MCP（回归） | 配置 `.cursor/mcp.json` 后实测 | 记录当前 Cursor ACP MCP 是否可用 |

当前实现提供一个默认跳过的 opt-in 冒烟测试：

```bash
cd backend
VELPOS_RUN_CURSOR_ACP_TEST=1 uv run python -m unittest tests.integration.test_cursor_acp_smoke -v
```

默认单元测试不会启动真实 `agent acp`；只有设置 `VELPOS_RUN_CURSOR_ACP_TEST=1` 且本机 `agent` 已认证时才执行。

2026-07-06 实测记录：

- `agent --version`: `2026.07.01-41b2de7`
- `VELPOS_RUN_CURSOR_ACP_TEST=1 uv run python -m unittest tests.integration.test_cursor_acp_smoke -v`: PASS
- 修正点：`session/new.mcpServers` 使用数组；`session/prompt.prompt` 使用 text block 数组；`session/update.agent_message_chunk` 从 `content.text` 读取文本。

### 10.4 与 cursor-gateway 的隔离测试

- 确认 Velpos **不**依赖 `cursor-gateway` 的 8001 端口
- 确认未误用 OpenAI 格式调用 Cursor 聊天 API 替代 Agent

### 10.5 参考：Cursor 官方最小 Client

见 https://cursor.com/docs/cli/acp#minimal-nodejs-client（可移植为 Python asyncio PoC）

---

## 11. 风险登记

| ID | 风险 | 严重性 | 缓解 |
|----|------|--------|------|
| R1 | Cursor ACP MCP 不稳定 | 高 | 实测后文档化；静态 mcp.json；关注官方 issue |
| R2 | `session/load` 不可用 | 中 | WS 重连复用后端 ACP 会话，少依赖 load |
| R3 | 多会话进程资源 | 中 | 进程池、idle 回收、每用户限制 |
| R4 | fs/terminal 代理复杂 | 中 | Phase 1 声明 capability false，Phase 3 再开 |
| R5 | Claude / Cursor Agent 打包体系不同 | 中 | Provider 级配置分离，不做强行统一 |
| R6 | ACP 协议/SDK 版本漂移 | 低 | 锁定 SDK 版本；参考 Zed SDK 升级 commit |
| R7 | **ACP 命名混淆**（Agent Client Protocol vs 已归档的 IBM Agent Communication Protocol） | 中 | 内部统一称「Agent Client Protocol」；查资料时按「Zed/JSON-RPC/stdio」过滤 |
| R8 | 提前引入 AG-UI | 中 | 明确 Phase 5 才评估；北向坚持自有 WS，AG-UI 仅作可选 adapter |

---

## 12. 参考链接

| 资源 | URL |
|------|-----|
| ACP 规范 | https://agentclientprotocol.com |
| ACP Events | https://docs.ag-ui.com/concepts/events （AG-UI，备选） |
| ACP HTTP RFD | https://agentclientprotocol.com/rfds/streamable-http-websocket-transport |
| Cursor ACP | https://cursor.com/docs/cli/acp |
| Cursor JetBrains ACP | https://cursor.com/docs/integrations/jetbrains |
| Zed External Agents | https://github.com/zed-industries/zed/blob/main/docs/src/ai/external-agents.md |
| Zed ACP 实现 | https://github.com/zed-industries/zed/blob/main/crates/agent_servers/src/acp.rs |
| cursor-acp adapter（参考，非必须） | https://github.com/roshan-c/cursor-acp |
| cursor-gateway（独立项目） | `/Users/kunwei/Documents/workspace/ai/cursor-gateway` |
| Velpos AGENTS.md | `/Users/kunwei/Documents/workspace/ai/velpos/AGENTS.md` |

---

## 13. 术语表

| 术语 | 含义 |
|------|------|
| ACP Client | 发起 `initialize`/`session/prompt` 的一方（Velpos、Zed） |
| ACP Agent / Server | 被 spawn 的 `agent acp` 进程 |
| Northbound | Client → 前端（Velpos WebSocket） |
| Southbound | Client → Agent（stdio ACP） |
| External Agent | Zed 术语：独立进程、自管 auth 的 Agent |
| cursor-gateway | 逆向聊天 API 的 HTTP 代理，非 ACP |

---

## 14. 架构选型决策：AG-UI vs Web + AcpGateway + ACP

> **决策**：以 **Web + AcpGateway + ACP** 为主干；**AG-UI 作为 Phase 5 可选北向出口**。  
> **调研时点**：2026-07-06（GitHub star / 生态数据）

### 14.1 命名陷阱（务必先读，见 R7）

网上大量「ACP 对比」文章混用了**两个不同的 ACP**，混用会得出错误结论：

| 名称 | 全称 | 层级 | 状态 |
|------|------|------|------|
| **ACP（本项目采用）** | **Agent Client Protocol**（Zed） | Client ↔ Agent（JSON-RPC over stdio） | 活跃，Zed / JetBrains / Cursor |
| ACP（旧 / IBM） | Agent **Communication** Protocol | Agent ↔ Agent（REST，peer-to-peer） | 2025-08 并入 A2A，已归档 |

→ 凡把「ACP」描述为 REST / peer-to-peer / 与 AG-UI 互补的 survey（OSSA、getstream 等），**说的是已归档的 IBM ACP**，与 Velpos 无关。

### 14.2 热度与支持粒度（2026-07）

| 维度 | AG-UI | ACP（Agent Client Protocol） |
|------|-------|------------------------------|
| GitHub Stars | ~14.5k（2025-05 建） | ~3.5k（协议核心）+ `claude-agent-acp` ~2.2k |
| 治理 | CopilotKit 单公司主导，$27M A 轮（2026-05） | Zed 主导 + JetBrains 合作（编辑器厂商背书） |
| License | MIT | Apache 2.0 |
| SDK | 7+ 语言（TS/Py/Kotlin/Java/Go/Rust/.NET） | Rust/TS/Python/Kotlin/Java |
| **支持对象（粒度）** | **后端 Agent 框架**：LangGraph、CrewAI、MS Agent Framework、Google ADK、AWS Strands、Bedrock AgentCore、Pydantic AI… | **编辑器/客户端 ↔ 编码 Agent**：客户端 Zed/JetBrains/Neovim/Emacs/Xcode；Agent Claude Code/Codex/Gemini/OpenCode/**Cursor**/Kiro（Registry 60+） |
| 客户端 | CopilotKit（**React** 为主 / Angular） | 无前端绑定（自建 UI） |
| 里程碑 | 云厂商一方集成（分发护城河） | JetBrains 内置(25-12)、Registry(26-01)、**Zed 1.0 头牌**(26-04) |

**读数（批判视角）**：
- AG-UI star 多，但那是「Agent 框架 + React 前端」的**通用**热度，且很大程度由 CopilotKit 商业 + 云厂商分发推动；**与 Velpos（Vue + 已有 WS + 本地/自托管）不契合**。
- ACP star 少，但它是「从客户端驱动**编码 Agent**」的事实标准，被两家最可信独立编辑器厂商 + Cursor + Anthropic/OpenAI Agent 采用——**正是 Velpos 场景**。
- 两者**不在同一层**，star 数不可直接比较。

### 14.3 决定性事实：南向必然是 ACP

```
用户界面  ◄── AG-UI（Agent ↔ User："怎么把 Agent 活动画到前端"）
客户端    ◄── ACP  （Client ↔ Agent："怎么驱动一个编码 Agent"）
Agent     ◄── MCP  （Agent ↔ 工具/数据）
```

**Cursor Agent 只说 ACP（`agent acp`），不发 AG-UI。** 因此无论北向选什么，**南向都必须是 ACP**。真正的选择只发生在**北向**：

| 方案 | 北向（前端↔Velpos） | 南向（Velpos↔Agent） | 数据流 |
|------|--------------------|---------------------|--------|
| A | **AG-UI** | ACP（相同） | 3 段协议 + 2 次翻译 |
| B（选定） | **Velpos 自有 WebSocket** | ACP（相同） | 2 段协议 + 1 次翻译 |

### 14.4 批判性对比

**能力粒度**（编码 Agent 语义，AG-UI 需自定义）：

| 能力 | ACP | AG-UI |
|------|-----|-------|
| 文件读写 fs/* | ✅ 原生 | ⚠️ 自定义事件 |
| 终端 terminal/* | ✅ 原生 | ⚠️ 自定义 |
| 权限 request_permission | ✅ 原生 | ✅ interrupt（需语义映射） |
| Diff / 编辑评审 | ✅ 原生 | ⚠️ 自定义 |
| Slash / plan / todos | ✅（`cursor/*`） | ⚠️ CUSTOM 事件 |

**方案 A 的失配面**：三套会话 ID（AG-UI `threadId/runId` ↔ Velpos `session_id` ↔ ACP `sessionId`）、两次事件翻译、编码语义在 AG-UI 侧降级为 CUSTOM（CopilotKit 通用组件也渲染不了）。

**方案 B 的契合**：Velpos 现有 `permission_request/user_response` 与 ACP `request_permission` 天然对齐，翻译面最小；且**不动 Vue 前端栈**。

**治理/锁定**：AG-UI 单公司治理 + React 中心，云厂商分发护城河对「本地/自托管、Vue」的 Velpos 无收益；ACP 由编辑器厂商共治（Apache 2.0），且该层相对唯一。

### 14.5 结论矩阵

| 判据 | 胜方 |
|------|------|
| 架构简洁（层数/翻译） | **B** |
| 职责分工清晰 | **B** |
| 与 Velpos 现状契合（Vue + WS + 控制平面） | **B** |
| 编码 Agent 能力原生度 | **B** |
| 上线速度 | **B** |
| 生态绝对热度（star） | A（但层级不同，不可直接比） |
| Generative UI / 第三方前端接入 | A（**非当前目标**） |

**AG-UI 仅在以下需求出现时才划算（→ 归入 Phase 5）**：需要 Generative UI（Agent 动态渲染组件）、需要把 Velpos 作为 AG-UI 后端供第三方前端接入、或需要 CopilotKit 托管分析/RLiHF 等商业能力。

### 14.6 落地要点（对 §9 路线图的补充）

- 南向坚持 **`agent-client-protocol` Python SDK** spawn `agent acp`，Handler 集对齐 Zed（见 §7.3）。
- 北向 Phase 1–4 **保持 Velpos WebSocket 不变**（前端零改动）。
- AG-UI 出口延后到 **Phase 5**：新增 `/ag-ui` endpoint（参考 `acp-to-agui`）或个别页面做 Generative UI，**不推倒现有主干**。
- 相关参考项目：[python-sdk](https://github.com/agentclientprotocol/python-sdk)、[claude-agent-acp](https://github.com/agentclientprotocol/claude-agent-acp)、[acp-ui](https://github.com/formulahendry/acp-ui)、[acp-to-agui](https://github.com/namanrajpal/acp-to-agui)、[codex-acp-gateway](https://github.com/mmonad/codex-acp-gateway)。

**一句话**：热度上 AG-UI 领先，但那是**通用 Agent 前端层**的热度；Velpos 要的是**从客户端驱动编码 Agent**——这层的事实标准是 **Agent Client Protocol**，且 **Cursor 只认它**。故 `Web + AcpGateway + ACP` 全面更优，AG-UI 留作可选北向出口。

---

## 15. 目标与约束确认（范围基线）

> 由使用方确认，作为设计/开发/测试的范围基线。

### 15.1 确认的目标与约束

| 项 | 确认结论 | 影响 |
|----|----------|------|
| 部署拓扑 | **集中式远程服务端**（个人/自用），浏览器零安装访问 | 走 §14 方案 B；【S】承载 Cursor CLI/Node/账号/workspace |
| 离线可用性 | **不要求**（离线不可访问可接受） | 去除离线缓存约束，简化实现 |
| 账号/计费 | **自己的单一 Cursor 账号** | **单一共享凭据即可**（`agent login` 或 `CURSOR_API_KEY`）；多用户隔离延后 |
| 未来扩展 | 自研 ACP Agent 后，**本地 + 远端均可用** | 通用 AcpGateway + Provider Registry 已支持；需预留 transport 抽象 |

### 15.2 两个正交的「本地/远端」维度

1. **Velpos 部署拓扑**：localhost vs 远程服务器 —— 与协议无关，配置切换。
2. **Agent 传输方式**：
   - `stdio` 子进程：Agent 与 Velpos 同机 spawn（**Cursor 今天仅此**）。
   - 远程传输 HTTP/SSE/WebSocket（ACP RFD #721）：Agent 作为独立网络服务（**Cursor 未实现，自研 Agent 可率先支持**）。

### 15.3 设计预留：Transport 可插拔（关键）

Provider 配置声明 `transport: stdio | http`，AcpGateway 内部抽象传输层：

```yaml
providers:
  cursor:
    transport: stdio        # 现在：服务端 spawn agent acp
    command: agent
    args: [acp]
  my_agent:                 # 未来：自研 Agent
    transport: http         # 远程原生：Velpos 仅作网络 ACP Client
    endpoint: https://my-agent.example.com/acp
```

- 现在：Cursor 走 `stdio`（服务端 spawn）。
- 未来：自研 Agent 支持远程 transport → **无需寄生在 Velpos 主机**，真正「本地能连、远端也能连」。

### 15.4 自研 ACP Agent（Agent/Server 侧）最小要求

对齐 Velpos Client 能力（见 §7.3 / §8.4）：
- 必须：`initialize` / `session/new` / `session/prompt` / `session/update`
- 权限：`session/request_permission`
- `fs/*`、`terminal/*` 由 Client（Velpos）提供，Agent 按需调用
- 收益：同一 Agent 可被 **Velpos / Zed / JetBrains** 共同驱动（write once, run anywhere）

---

## 16. 基于现有架构的改造清单（开发任务基线）

> 基于 2026-07-06 通读 Velpos 后端源码得出。核心原则：**AcpGateway 实现同一 `AgentGateway` 端口、产出同一「归一化 dict 消息契约」，应用层 ~50 处调用与前端零改动。**

### 16.1 现有架构接缝（改造锚点）

| 接缝 | 位置 | 现状 | 意义 |
|------|------|------|------|
| 端口 Port | `domain/session/acl/claude_agent_gateway.py` | ABC，约 20 方法 | AcpGateway 实现它即复用上层 |
| 实现 | `infr/client/claude_agent_gateway.py` | 包 `ClaudeSDKClient` | AcpGateway 结构范本 |
| **归一化契约** | `_extract_message_info`（L969+） | yield `{message_type, content{blocks}}`；类型 ∈ {assistant, tool_result, result, system, _meta} | **真正的稳定接口**，ACP `session/update` 映射为同形状 |
| 权限/追问 | `_create_can_use_tool_callback`（L529+） | 广播 `permission_request`/`user_choice_request` → 等 Future → `resolve_user_response` | ACP `request_permission`、`cursor/ask_question` 套用 |
| 调用面 | `application/session/{session_query_engine,session_application_service,session_stream_consumer}.py`、`team_coordinator_service.py` | ~50 处 `self._claude_agent_gateway.*` | 走同端口即不动 |
| DI 单例 | `ohs/dependencies.py` L80、L129-131 | 单例 + broadcast/im/persist 回调 | 多 Provider 在此收敛 |
| WS 北向 | `ohs/ws/session_ws.py` L20/L37 | **直接 import 具体实现类**做类型 | 唯一"泄漏"点，需改依赖 Port |

> 注意：现端口**偏 Claude 形状**（`sdk_session_id`、`fork:`、`compact=/compact`、`delete_session_files` 删 JSONL、`get_models` 读 server_info、`rewind_files`）。ACP 无全部对应物 → 用**能力位 + 优雅降级**，不硬塞。

### 16.2 改造任务（分层）

| ID | 任务 | 层 | 工作量 | 风险 |
|----|------|----|--------|------|
| **B1** | 端口泛化为 `AgentGateway`（保留 `ClaudeAgentGateway` 别名）；固化归一化 dict 契约；新增 `capabilities() -> set[str]`（`compact/rewind/models/fork/load`） | domain | 低 | 低 |
| **B2** | `session_ws.py` L20/L37 依赖改为 Port；`get_pending_request_context` 上移到 Port 抽象 | ohs | 小 | 低 |
| **B3** | 新增 AcpGateway（见 16.3 目录）：生命周期 + `session/update`→dict 映射 + 权限复用 + Claude 专属方法降级 | infr | **主体** | 中 |
| **B4** | Provider Registry + 工厂 + `agent_providers.yaml`（`transport: stdio\|http`、command/args/env/auth）；env 注入 | infr/config | 中 | 低 |
| **B5** | 新增 `RoutingAgentGateway(AgentGateway)`：持 `{provider: gateway}` + `session→provider`，逐方法转发；DI 仍注入**单个** gateway，应用层不变 | infr+ohs | 中 | 低 |
| **B6** | Client 能力：`fs/*`→`WorkspaceApplicationService`；`terminal/*`→现有 `TerminalExecutor`（`/ws/terminal` L267+）；暂不支持则能力位 false | infr | 中 | 中（Phase 3 可后置） |
| **B7** | 认证（服务端 `agent login`/`CURSOR_API_KEY`）；DB 复用 `sdk_session_id` 存 ACP `sessionId` + 新增 `provider` 字段（Alembic）；前端会话创建加 provider 选择、plan/todos 事件渲染 | 全栈 | 中 | 低 |
| **B8** | 测试：mock stdio transport 单测（编解码/映射/权限超时）；`@pytest.mark.acp` 集成测试 | tests | 中 | 低 |

**优先级**：B1/B2/B5（接缝改造，小而关键）→ B3（主体）→ B4/B6/B7 配套 → B8 全程。

### 16.3 AcpGateway 目录建议

```
infr/client/acp/
├── transport.py          # Transport 抽象：StdioTransport（现在）/ HttpTransport（未来，见 §15.3）
├── acp_connection.py     # JSON-RPC 2.0 收发、请求/通知分流、id 关联
├── acp_gateway.py        # 实现 AgentGateway 端口（对齐 dict 契约）
├── message_mapper.py     # session/update → 归一化 dict（对应 _extract_message_info）
└── providers/
    ├── base.py           # Provider 接口：命令/传输/认证/能力
    └── cursor.py         # agent acp
```

### 16.4 RoutingAgentGateway 示意

```python
# dependencies.py（示意）
_claude = ClaudeAgentGateway()
_acp = AcpGateway(registry=_provider_registry)
_agent_gateway = RoutingAgentGateway(
    default="claude",
    backends={"claude": _claude, "cursor": _acp},
)
# broadcast/im/persist 回调注入到 Routing，再下发各 backend
```

### 16.5 参考开源项目（批判吸取，不照抄）

| 优先级 | 项目 | 借鉴 | 警惕/勿照抄 |
|--------|------|------|-------------|
| ★★★ | [python-sdk](https://github.com/agentclientprotocol/python-sdk) | **直接依赖**做 JSON-RPC 编解码/类型 | example 为 CLI 单会话；多会话+异步广播需自研 |
| ★★★ | [Zed `acp.rs`](https://github.com/zed-industries/zed/blob/main/crates/agent_servers/src/acp.rs) | **Handler 清单**、能力协商、spawn+stdio 模式 | 本地直读盘；Velpos 服务端代理到浏览器，fs/terminal **实现完全不同** |
| ★★ | [claude-agent-acp](https://github.com/agentclientprotocol/claude-agent-acp) | `session/update`/todos/plan/fs/terminal **字段语义** | 它是 **Agent/Server 侧**，方向相反，只取字段不取角色逻辑 |
| ★★ | [acp-ui](https://github.com/formulahendry/acp-ui) | 权限/多会话 **UI 交互形态**（Vue） | 以 Velpos 既有 `permission_request` 契约为准 |
| ★ | [acp-to-agui](https://github.com/namanrajpal/acp-to-agui) | stdio→SSE 桥工程写法 | 仅 Phase 5 AG-UI 出口时参考 |
| ★ | [codex-acp-gateway](https://github.com/mmonad/codex-acp-gateway) `acp-proxy` | stdio↔WS 传输封装 → 印证 Transport 抽象 | 目标不同，只取传输层思想 |

**红线**：不新增第二套消息/权限契约——上层 50 处调用与前端稳定，全靠"归一化 dict 契约"唯一化。协议编解码用官方 SDK（降低 R6）；Handler 抄 Zed 清单不抄其本地实现；字段映射借 claude-agent-acp 但只产出既有 dict。

---

## 17. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-07-06 | 初版：汇总 Auto 模型、AG-UI、Cursor Gateway、AcpGateway、Zed 参考调研 |
| 2026-07-06 | 新增 §14 架构选型决策（热度调研、命名陷阱、批判对比、结论矩阵）；风险登记补充 R7/R8 |
| 2026-07-06 | 新增 §15 目标与约束确认（远程集中式、离线不要求、单账号、transport 可插拔预留、自研 Agent 最小要求） |
| 2026-07-06 | 新增 §16 改造清单（现有架构接缝、B1–B8 任务、RoutingAgentGateway、参考项目批判表） |
