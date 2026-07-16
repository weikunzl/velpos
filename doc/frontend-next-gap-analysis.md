# frontend-next 差异分析 & 修改方案

> 目标：修复 e2e 测试选择器 + 补齐 Vue 已有但 Next.js 尚未接入的功能

---

## 一、现有组件状态总览

### ✅ 已实现且正常工作

| 组件 | 路径 | 说明 |
|------|------|------|
| SessionSidebar | `features/session-list/ui/SessionSidebar.tsx` | 分组会话列表，大部分选择器匹配 |
| SessionListItem | `features/session-list/ui/SessionListItem.tsx` | 已构建但**未在 SessionSidebar 中使用**（后者使用 inline render） |
| HeaderToolbar | `features/header-toolbar/ui/HeaderToolbar.tsx` | 含所有按钮 + ThemeSwitcher |
| ChatToolbar | `features/input-toolbar/ui/ChatToolbar.tsx` | 含 Debug/Runtime/Agent/Plugin/Memory/Multi/Branch/Commands/Clear/Usage/IM |
| MessageList | `features/message-display/ui/MessageList.tsx` | 消息列表 |
| MessageInput | `features/send-message/ui/MessageInput.tsx` | 输入框 + 附件 + 发送 |
| RuntimeActionDock | `features/runtime-dock/ui/RuntimeActionDock.tsx` | 渲染 `.runtime-dock` |
| NotificationBell | `features/notification-center/ui/NotificationBell.tsx` | 渲染 `.glass-btn.glass-btn--icon.notification-bell` |
| NotificationPanel | `features/notification-center/ui/NotificationPanel.tsx` | 渲染 `.notification-panel` |
| WorkingSessionsButton | `features/working-sessions/ui/WorkingSessionsButton.tsx` | 渲染 `.header-toolbar-btn.working-sessions-btn` |
| WorkingSessionsPanel | `features/working-sessions/ui/WorkingSessionsPanel.tsx` | 渲染 `.working-panel` |
| ThemeSwitcher | `shared/ui/ThemeSwitcher.tsx` | 3 主题支持（dark/light/sepia），UI 显示单图标 |
| Modal | `shared/ui/Modal.tsx` | `.modal-overlay > .modal-dialog > .modal-header > .modal-title + .modal-close-btn` |
| SettingsDialog | `features/settings/ui/SettingsDialog.tsx` | 使用 Modal，正确 CSS 类名 |
| NewProjectDialog | `features/session-list/ui/NewProjectDialog.tsx` | `.dialog-overlay > .new-project-dialog` |
| WorkspacePanel | `features/workspace/ui/WorkspacePanel.tsx` | 已渲染，类名 `workspace-drawer` |
| GitManagerDialog | `features/git-manager/` | 已存在 |
| TerminalDrawer | `features/terminal/` | 已存在 |
| ImButton | `features/im-binding/ui/ImButton.tsx` | 已构建，ChatToolbar 中受 `hasChannels` 控制 |
| SessionDashboard | `features/session-dashboard/ui/SessionDashboard.tsx` | 已构建 + 有单元测试，但**未接入 page.tsx ChatPanel** |
| UsagePanel | `features/usage-panel/` | 已接入 ChatPanel |
| RewindPicker | `features/rewind-picker/` | 已接入 ChatPanel |
| MultiSessionDialog | `features/multi-session-dialog/` | 已接入 ChatPanel |
| MobileHeader | `features/mobile-nav/ui/MobileHeader.tsx` | 已构建但**未接入 page.tsx** |
| MobileNavStack | `features/mobile-nav/ui/MobileNavStack.tsx` | 已构建但**未接入 page.tsx** |

---

## 二、E2E 测试选择器 vs 实际 DOM 逐项审计

### 2.1 app-shell.spec.ts

| 行 | 选择器 | 实际 DOM | 状态 |
|----|--------|----------|------|
| 6 | `getByText('Velpos')` | AppLogo 渲染 "Velpos" | ✅ |
| 13 | `[title="Notifications"]` | NotificationBell `title="Notifications"` | ✅ |
| 14 | `[title="Working Sessions"]` | WorkingSessionsButton `title="Working Sessions"` | ✅ |
| 15 | `[title="Git Manager"]` | HeaderToolbar `title="Git Manager"` | ✅ |
| 16 | `[title="Settings"]` | HeaderToolbar `title="Settings"` | ✅ |
| 17 | `[title="Workspace"]` | HeaderToolbar `title="Workspace"` | ✅ |
| 18 | `[title="Terminal"]` | HeaderToolbar `title="Terminal"` | ✅ |
| 23 | `aside` | SessionSidebar `<aside className="main-sidebar">` | ✅ |
| 30 | `[title="Memory"]` | MemoryButton 存在但 ChatToolbar 始终渲染 | ❌ **toHaveCount(0) → 实际上是 1** |
| 31 | `[title="IM Binding"]` | ImButton title="IM Integration"，但 hasChannels=false 不渲染 | ✅ |
| 32 | `[title="Evolution"]` | 不存在 | ✅ |
| 36-44 | pageerror 监听 | — | ✅ |
| 50 | `.theme-switcher` | ThemeSwitcher 渲染 `.theme-switcher` | ✅ |

### 2.2 session-management.spec.ts

所有选择器均匹配。特别验证：
- `.project-header .project-name` → SessionSidebar 正确渲染 ✅
- `.session-item-active` → SessionSidebar 使用此 class ✅
- `.sidebar-header-btn[title="New session"]` → 正确渲染 ✅
- `.sidebar-batch-bar` / `.batch-count` / `.batch-action-danger` → 正确渲染 ✅
- `.sidebar-collapse-btn-side` / `.sidebar-expand-btn` → 正确渲染 ✅
- `.sidebar-empty` / `.sidebar-empty-btn` / `.sidebar-loading` → 正确渲染 ✅

### 2.3 chat-panel.spec.ts

| 行 | 选择器 | 实际 DOM | 状态 |
|----|--------|----------|------|
| 21 | `.send-message-area` | ChatPanel 渲染 `.send-message-area` | ✅ |
| 35 | `.empty-state, .empty-text` | page.tsx 渲染 `.empty-state > .empty-text` | ✅ |
| 44 | `.header-toolbar-btn` | HeaderToolbar 正确渲染 | ✅ |
| 55 | `.chat-toolbar-btn, [title*="Debug"]` | `.toolbar-btn` 但 `[title*="Debug"]` 匹配 | ✅ |
| 72 | `.message-list` | MessageList 渲染 `.message-list` | ✅ |
| 83 | `.header-session-name` | page.tsx 渲染此 span | ✅ |
| 96 | `.session-status-dot` | SessionSidebar 渲染此 class | ✅ |
| 106 | `textarea` | MessageInput 渲染 textarea | ✅ |

### 2.4 chat-advanced.spec.ts

| 行 | 选择器 | 实际 DOM | 状态 |
|----|--------|----------|------|
| 17 | `.input-toolbar .toolbar-btn` | ChatToolbar 正确渲染 | ✅ |
| 30 | `.input-toolbar button[aria-label]` | ToolbarBtn 渲染 aria-label | ✅ |
| 41 | `.toolbar-btn[title*="Debug"]` | Debug 按钮 title 包含 "Debug" | ✅ |
| 50 | `.toolbar-btn[title*="Usage"]` | Usage 按钮 title="Usage and query history" | ✅ |
| 87 | `.session-status-dot` | SessionSidebar 正确渲染 | ✅ |
| 119 | `.runtime-dock` | RuntimeActionDock 渲染 `.runtime-dock` | ✅ |
| 139 | `.toolbar-btn[title*="Multi-session"]` | Multi-session 按钮 title="Multi-session: ..." | ✅ |
| 145 | `.modal-overlay` | Modal 渲染 `.modal-overlay` | ✅ |

### 2.5 notifications.spec.ts

| 行 | 选择器 | 实际 DOM | 状态 |
|----|--------|----------|------|
| 13 | `.notification-bell, [class*="notification"]` | NotificationBell `.glass-btn.glass-btn--icon.notification-bell` | ✅ |
| 21 | `.header-toolbar-btn` | HeaderToolbar 渲染 | ✅ |
| 34 | `.theme-switcher, [class*="theme"]` | ThemeSwitcher `.theme-switcher` | ✅ |
| 42 | `.working-sessions-btn, button:has-text("Working")` | WorkingSessionsButton `.header-toolbar-btn.working-sessions-btn` | ✅ |
| 50 | `.working-sessions-btn` 点击 | 可使用 | ✅ |

### 2.6 dialogs.spec.ts

| 行 | 选择器 | 实际 DOM | 状态 |
|----|--------|----------|------|
| 18 | `.modal-overlay` | Modal 渲染 `.modal-overlay` | ✅ |
| 20 | `.modal-title` | Modal 渲染 "Settings" | ✅ |
| 23 | `.modal-close-btn` | Modal 渲染 | ✅ |
| 47 | `.settings-select` | SettingsDialog 渲染 | ✅ |
| 51 | `.settings-toggle-row` | SettingsDialog 渲染 | ✅ |
| 60 | `.settings-tab` | SettingsDialog 渲染 | ✅ |
| 65 | `.settings-profile-card` | SettingsDialog 渲染 | ✅ |
| 79 | `.settings-save-btn` | SettingsDialog 渲染 | ✅ |
| 100 | `.settings-add-btn` | SettingsDialog 渲染 `.settings-btn.settings-btn-primary.settings-add-btn` | ✅ |
| 105 | `.settings-profile-form .settings-input` | SettingsDialog 渲染 `.settings-profile-form > .profile-form-fields` 含 input | ✅ |
| 111 | `.settings-btn-primary` | SettingsDialog 渲染 | ✅ |
| 145 | `.modal-overlay` | GitManagerDialog 使用 Modal | ✅ |
| **161** | **`.workspace-panel, [class*="workspace"]`** | **WorkspacePanel 渲染 `workspace-drawer` 不是 `workspace-panel`** | ❌ **FAIL** |
| **179** | **`.terminal-drawer, [class*="terminal"]`** | **需确认 TerminalDrawer 渲染的类名** | ⚠️ 待确认 |
| 193 | `.new-project-dialog` | NewProjectDialog 渲染 | ✅ |
| 203 | `.dialog-overlay` | NewProjectDialog 渲染 | ✅ |

### 2.7 session.spec.ts

| 行 | 问题 | 状态 |
|----|------|------|
| 5-7 | **未使用 mockApiRoutes**，依赖真实后端 | ❌ **无后端时全部失败** |
| 28 | `.sidebar-title` → `toHaveText('Sessions')` | ✅ |
| 29 | `.sidebar-count` → 解析数字 | ✅ |
| 36 | `.sidebar-header-btn[title="New session"]` | ✅ |
| 45-47 | `[title="Rename"]`, `[title="Copy"]`, `[title="Delete"]` | ✅ |

### 2.8 project-management.spec.ts

所有选择器匹配 ✅

### 2.9 missing-features.spec.ts

所有测试体为空（仅有注释），无实际断言。

---

## 三、E2E 需要修复的问题

### P0 — 必须修（测试会失败）

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| E1 | `session.spec.ts` | 未使用 `mockApiRoutes`，依赖真实后端 | 添加 `test.beforeEach` 调用 `mockApiRoutes` |
| E2 | `dialogs.spec.ts:161` | `.workspace-panel` → WorkspacePanel 实际渲染 `workspace-drawer` | 将选择器改为 `.workspace-drawer` |

### P1 — 建议修（测试结果不准确）

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| E3 | `app-shell.spec.ts:30` | `[title="Memory"]` 检查 count=0，但 MemoryButton 始终渲染 | 在 page.tsx ChatToolbar 中 `showClaudeControls` 控制时准确判断 |
| E4 | `dialogs.spec.ts:179` | `.terminal-drawer` 需确认 TerminalDrawer 实际类名 | 确认后修正 |
| E5 | `missing-features.spec.ts` | 所有测试体为空 | 填充真实断言或移除 |

### P2 — 可延后

| # | 文件 | 问题 |
|---|------|------|
| E6 | `session-management.spec.ts:77` | 删除测试有 `.catch()` 吞异常 |
| E7 | 多个文件 | `waitForTimeout` 替代 `waitForSelector` 的不稳定写法 |

---

## 四、功能差异分析 — Vue 有但 Next.js 需要补齐

### GAP 1: SessionDashboard 未接入 ChatPanel

**状态**: SessionDashboard 组件已构建 + 有完整单元测试，但 **page.tsx 的 ChatPanel 未渲染它**

**Vue 位置**: `frontend/src/pages/chat-panel/ui/ChatPanelPage.vue` — SessionDashboard 在 input-section 下方

**Next.js 位置**: `frontend-next/src/app/page.tsx` — ChatPanel 函数中未引用 SessionDashboard

**需要的改动**:
1. 在 ChatPanel 中导入 SessionDashboard
2. 从 session state 提取所需 props: projectDir, modelLabel, gitBranch, permMode, contextUsage 等
3. 渲染 `<SessionDashboard .../>` 在 RuntimeActionDock 下方

**依赖的数据源**:
- `state?.session?.project_dir` → projectDir
- `state?.session?.model` → modelLabel
- `state?.session?.git_branch` → gitBranch
- `state?.session?.permission_mode` → permModeLabel
- `state?.contextUsage` → context bar
- `state?.queryHistory` → tool stats

---

### GAP 2: MobileNav 未接入

**状态**: MobileHeader / MobileNavStack 已构建但 page.tsx 未渲染

**Vue 位置**: `frontend/src/App.vue` — MobileNavStack + MobileHeader 在 app-layout 内

**需要的改动**:
1. 在 page.tsx 中导入 MobileNavStack / MobileHeader
2. 添加 `mobileMenuOpen` state
3. 在 app-shell 中按需渲染

---

### GAP 3: ThemeSwitcher UI 只有单图标

**状态**: 支持 3 主题（dark/light/sepia）但 UI 只有太阳图标

**Vue**: 3 个 radio button 分别显示对应图标

**建议**: 将 ThemeSwitcher 改为显示当前主题图标（太阳/月亮/护眼），或显示 3 个按钮组

---

### GAP 4: Sidebar 缺少高级功能

**状态**: SessionSidebar 使用 inline render，SessionListItem 组件已构建但未使用

**缺少的功能（Vue 有 → Next.js 无）**:

| 功能 | SessionSidebar (inline) | SessionListItem |
|------|------------------------|-----------------|
| Pin 会话 | ❌ | ✅ |
| Provider badge | ❌ | ✅ |
| IM badge | ❌ | ✅ |
| Session time | ❌ | ✅ |
| 两步删除确认 | ✅ (内联) | ✅ (含过期 timer) |
| 项目 pin | ❌ | ❌ (未在 SessionListItem) |
| 项目拖拽排序 | ❌ | ❌ |
| Agents/Teams 模式切换 | ❌ | ❌ |

---

### GAP 5: Input 区域缺少 IM 按钮展示条件

**状态**: ChatToolbar 中 ImButton 被 `hasChannels` prop 控制。page.tsx 硬编码 `hasChannels={false}`

**建议**: 从 session state 或 API 动态获取 channel 状态

---

### GAP 6: 侧栏缺少项目 pin 和拖拽

**状态**: SessionSidebar 缺少项目 pin 按钮、拖拽排序支持

---

## 五、修改方案 Checklist

### Phase 1: E2E 测试修复（Task 1）

- [x] **E1**: session.spec.ts — 添加 `test.beforeEach` 调用 `mockApiRoutes(page)`
- [x] **E2**: dialogs.spec.ts:161 — `.workspace-panel` → `.workspace-drawer`
- [x] **E4**: 确认 TerminalDrawer 类名，修正 dialogs.spec.ts:179
- [x] **E5**: missing-features.spec.ts — 填充有效断言或标记为待移除
- [x] **E3**: 评估 app-shell.spec.ts:30 Memory 按钮可见性测试的准确性

### Phase 2: 功能补齐（Task 2）

#### P2a: SessionDashboard 接入 ChatPanel
- [x] 在 ChatPanel 中导入 SessionDashboard
- [x] 从 session state 提取 dashboard props
- [x] 在 RuntimeActionDock 下方渲染 SessionDashboard
- [x] 验证所有 chip 正确显示

#### P2b: MobileNav 接入
- [x] 在 page.tsx 导入 MobileNavStack / MobileHeader
- [x] 添加移动端菜单 state
- [x] 在 app-shell 中按需渲染

#### P2c: ThemeSwitcher UI 增强
- [x] 改为显示当前主题对应的图标
- [ ] 或改为 3 按钮 radio group（与 Vue 一致）

#### P2d: Sidebar 功能补齐
- [x] 评估是否将 SessionSidebar inline render 替换为 SessionListItem
- [x] 添加 provider badge、IM badge、时间显示
- [x] 添加 agents/teams 模式切换 tabs
- [x] 添加项目 pin 功能
- [x] 添加项目拖拽排序

#### P2e: IM Button 动态条件
- [x] 从 API 获取 channel 状态
- [x] 动态设置 hasChannels

#### P2f: ChatToolbar 对话框接线
- [x] Memory / IM / Evolution / Plugin / Agent / Command Palette / Clear
- [x] QueryRuntimeBar + 模型选择菜单
- [x] 选中会话时从列表摘要 hydrate SessionState（无 WS 也可显示名称）

---

## 六、附件 — SessionDashboard 接入数据映射

```
SessionDashboard Props               来源
────────────────────────────────────────────────────────
sessionId             →  state?.session?.session_id
projectDir            →  state?.session?.project_dir
projectDirName        →  extract dir basename
modelLabel            →  state?.session?.model
gitBranch             →  state?.session?.git_branch
permModeLabel         →  formatPermission(state?.session?.permission_mode)
permModeColorClass    →  mapPermColor(state?.session?.permission_mode)
sessionElapsed        →  formatDuration(now - createdAt)
agentProviderLabel    →  state?.session?.provider
contextUsage          →  computeContextUsage(state)
contextColorClass     →  mapContextColor(percent)
compacting            →  state?.compacting || false
isRunning             →  status === 'running'
showClaudeControls    →  true (or check provider)
hasPlanTasks          →  state?.planTasks?.length > 0
planTaskCounts        →  countPlanTasks(state)
totalToolCalls        →  sum queryHistory tool calls
topTools              →  top N tools by count
toolStats             →  all tool stats
budgetStatus          →  state?.budget
claudeResumeCommand   →  buildResumeCommand(state)
onCompact             →  handleCompact callback
onModelClick          →  open model selector
onBranchClick         →  open branch panel
onPermClick           →  cycle permission mode
onTaskPanelToggle     →  toggle task panel
showTaskPanel         →  taskPanelVisible state
```
