# frontend-next 缺口分析文档

> 基于 frontend/src/pages/chat-panel/ui/ChatPanelPage.vue (1924行模板) 的逐行对比

---

## 1. ChatPanel 主页面 — 完全缺失

| 功能 | Vue 代码行 | frontend-next | 优先级 |
|------|-----------|---------------|--------|
| Session loading spinner | L1114-1116 | ❌ 缺失 | P2 |
| WorkerSessionBreadcrumb (Team worker视图) | L1105-1110 | ❌ 缺失 | P2 |
| ThinkingIndicator (运行时顶部指示器) | L1111-1113 | ❌ 缺失 | P1 |
| Rewind Picker (回退到历史输入) | L1125-1175 | ❌ 缺失 | P1 |
| Multi-session dialog (并行会话分支) | L1725-1834 | ❌ 缺失 | P1 |
| Compare sessions dialog (会话对比) | L1838-1872 | ❌ 缺失 | P1 |

---

## 2. Input Toolbar — 大部分缺失

当前 frontend-next 的 HeaderToolbar 仅有：NotificationBell, WorkingSessionsButton, Settings, Git, Workspace, Terminal, ThemeSwitcher

### Group 1: Debug / Runtime
| 按钮 | Vue 代码行 | frontend-next | 用途 |
|------|-----------|---------------|------|
| Debug toggle | L1210-1231 | ❌ 缺失 | 切换调试模式（显示tool_use/system消息）|
| Runtime panel | L1232-1247 | ❌ 缺失 | 显示运行时活动面板 |

### Group 2: Configuration (仅 Claude 模式)
| 按钮 | Vue 代码行 | frontend-next | 用途 |
|------|-----------|---------------|------|
| Agent | L1268-1282 | ❌ 缺失 | 加载/切换Agent |
| Plugin | L1283-1301 | ❌ 缺失 | 插件管理对话 |
| Memory | L1302-1305 | ❌ 缺失 (MemoryButton已有) | 记忆管理 |
| Multi-session | L1306-1321 | ❌ 缺失 | 并行会话分支 |

### Group 3: Actions
| 按钮 | Vue 代码行 | frontend-next | 用途 |
|------|-----------|---------------|------|
| Media input (voice/video) | L1325-1374 | ❌ 缺失 | 语音/视频输入菜单 |
| Command Palette | L1375-1379 | ❌ 缺失 | 命令面板 |
| Clear Context | L1380-1385 | ❌ 缺失 | 清除上下文 |
| Usage History | L1386-1444 | ❌ 缺失 | 查询历史面板 |
| IM binding | L1445-1453 | ❌ 缺失 (ImButton已有) | IM绑定 |

### RuntimeActionDock + QueryRuntimeBar
| 组件 | Vue 代码行 | frontend-next | 用途 |
|------|-----------|---------------|--------|
| RuntimeActionDock | L1455-1465 | ❌ 缺失 | 交互式响应dock |
| QueryRuntimeBar | L1191-1204, L1466-1475 | ❌ 缺失 | 运行状态栏 |
| Runtime Panel | L1190-1205 | ❌ 缺失 | 运行时活动显示 |

---

## 3. Session Dashboard (底部状态栏) — 完全缺失

| 元素 | Vue 代码行 | frontend-next | 用途 |
|------|-----------|---------------|------|
| Context usage bar | L1489-1509 | ❌ 缺失 | 全宽上下文用量进度条，点击compact |
| Project directory chip | L1512-1562 | ❌ 缺失 | 项目路径，右键菜单(Open with/Copy) |
| Session ID chip | L1563-1576 | ❌ 缺失 | 显示session ID，点击复制resume命令 |
| Session elapsed time | L1577-1583 | ❌ 缺失 | 会话持续时间 |
| Agent provider label | L1584-1586 | ❌ 缺失 | 显示Cursor等provider标签 |
| Model selector dropdown | L1587-1617 | ❌ 缺失 | 模型选择下拉菜单 |
| Git branch selector | L1621-1653 | ❌ 缺失 | 分支选择/切换 |
| Permission mode selector | L1654-1680 | ❌ 缺失 | 权限模式选择(bypass/plan等) |
| Plan/Task progress chip | L1681-1701 | ❌ 缺失 | 任务进度显示 |
| Budget status | L1704-1707 | ❌ 缺失 | 预算状态警告 |
| Tool usage summary | L1708-1718 | ❌ 缺失 | 工具调用统计 |

---

## 4. MessageInput — 功能缺失

| 功能 | Vue 代码行 | frontend-next | 用途 |
|------|-----------|---------------|------|
| 文件上传 (按钮/拖拽/粘贴) | L227-263, L396-412 | ❌ 缺失 | 文件附件 |
| 附件预览 (图片thumb/文件chip) | L358-375 | ❌ 缺失 | 已选择附件的预览 |
| 斜杠命令建议 | L339-356 | ❌ 缺失 | 输入/触发命令建议 |
| IME安全输入 | L149-161, L190-193 | ❌ 缺失 | 中文/日文输入法不误发送 |
| Auto-resize textarea | L75-80 | ❌ 缺失 | 输入框自动增高 |
| Enter/Ctrl+Enter发送模式 | L190-224 | ❌ 缺失 | 根据偏好切换发送方式 |
| 语音/视频帧附加 | L281-290 | ❌ 缺失 | 从视频捕获帧附加到输入 |

---

## 5. 对话框层面 — 事件连接缺失

| 对话框 | Vue 代码行 | frontend-next | 用途 |
|--------|-----------|---------------|------|
| PluginManagerDialog | L1874-1878 | ❌ 缺失 | 插件管理 |
| AgentDialog | L1880-1887 | ❌ 缺失 | Agent加载 |
| TeamRuntimePanel | L1915-1922 | ❌ 缺失 | 团队运行时面板 |
| 全局ESC关闭弹窗 | L406-449 | ❌ 缺失 | ESC关闭所有面板 |
| DialogManager注册 | L229-235 | ❌ 缺失 | 全局弹窗管理器 |

---

## 6. 消息展示 — 样式不足

| 元素 | Vue 代码行 | frontend-next | 用途 |
|------|-----------|---------------|------|
| Thinking block | ✅ 已存在 | — | 思考过程块 |
| Tool use block | ✅ 已存在 | — | 工具调用块 |
| Tool result block | ❌ 缺少详情样式 | — | 工具结果渲染 |
| Assistant block | ❌ 缺少丰富样式 | — | 助手消息渲染 |
| User choice block | ❌ 缺少样式 | — | 用户选择按钮 |
| Todo progress block | ❌ 缺少样式 | — | 任务进度渲染 |
| Code syntax highlighting | ❌ 缺失 | — | 代码高亮 |
| 折叠/展开 tool details | ❌ 缺失 | — | 工具详情折叠 |
| Diff view styling | ❌ 缺失 | — | 差异对比样式 |

---

## 实施优先级

**P0 — 核心功能不可用:**
- Session Dashboard (全部)
- Input Toolbar (全部)
- MessageInput 附件/斜杠命令
- Runtime panel + QueryRuntimeBar

**P1 — 主要场景体验受损:**
- Rewind picker
- Multi-session dialog
- Debug mode toggle
- Model/permission/branch selectors
- Usage history panel

**P2 — 边界/兼容性:**
- IME safe input
- Media input (voice/video)
- Team runtime panel
- Compare sessions dialog
- Budget status
