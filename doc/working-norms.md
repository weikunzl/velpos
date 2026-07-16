# frontend-next 补齐工作规范

## 1. 总体原则

- **增量补齐**：按 gap-analysis.md 逐模块实现，不重写已有功能
- **保持模式一致**：遵循现有 frontend-next 的 file-sliced 结构、React Query、module-level store
- **CSS 体系**：使用 `globals.css` 中的 CSS 变量 + inline Tailwind 风格 className
- **组件粒度**：一个文件不超过 400 行，超长拆子组件

## 2. 文件目录规范

```
features/<feature-name>/
├── index.ts          # public exports
├── ui/               # React components (.tsx)
│   └── <Component>.tsx
├── model/            # hooks / logic (.ts)
│   └── use<Hook>.ts
└── api/              # API calls (.ts)
```

现有 feature: `send-message`, `runtime-dock`, `cancel-query`, `clear-context`, `compact-context`, `session-list`, `message-display`, `header-toolbar`, `settings`, `terminal`, `workspace`, `git-manager`, `notification-center`, `working-sessions`, `im-binding`, `media-input`, `memory-manager`, `agent-manager`, `agent-teams`, `plugin-manager`, `command-palette`, `evolution`, `scheduler`, `task-progress`

**新增 feature:**
```
features/
├── session-dashboard/    # 底部状态栏
├── rewind-picker/        # 历史输入回退
├── multi-session/        # 并行会话 + 对比
├── usage-panel/          # 用量面板
├── input-toolbar/        # 输入区上方工具栏（含debug/runtime/agent等）
```

## 3. 状态管理模式

- **Server state** → React Query (`@tanstack/react-query`)
- **Client UI state** → `useState` / `useRef` within component
- **Shared cross-component state** → module-level singleton store (like `sessionStore`)

### sessionStore 现有接口
```typescript
sessionStore.getWsConnection(sessionId)  // WS 连接
sessionStore.removeState(sessionId)      // 移除状态
sessionStore.forceCloseConnection(sessionId)
sessionStore.setSessions(sessions)       // 设置会话列表
sessionStore.initGlobalEvents()          // 初始化全局事件
sessionStore.destroyGlobalEvents()       // 销毁全局事件
```

### 新 dialog 管理
用 `DialogManager` 单例注册所有 dialog：
```typescript
// shared/ui/DialogManager.ts  (新建)
const dialogManager = new DialogManager()
dialogManager.register('plugin', ref)
dialogManager.register('agent', ref)
dialogManager.closeAll()  // ESC 关闭所有
```

## 4. CSS 规范

- 在 `app/styles/` 或 `app/globals.css` 中添加新样式
- 使用现有 CSS 变量：`var(--bg-primary)`, `var(--text-primary)`, `var(--border)`, `var(--accent)` 等
- 组件类名使用 kebab-case: `.session-dashboard`, `.context-usage-bar`

Tailwind 风格 className 模式：
```
className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-hover"
```

## 5. 组件签名规范

每个新组件必须：
1. 显式 `'use client'`
2. 完善的 TypeScript interface Props
3. 缺省值/空状态处理
4. 导出 named function

```typescript
'use client'
import { ... } from '...'

interface ComponentNameProps {
  sessionId: string
  // ...
}

export function ComponentName({ sessionId }: ComponentNameProps) {
  // ...
}
```

## 6. 实施顺序（依赖驱动）

```
Step 1: MessageInput 增强 (IME, attachment, slash commands)
Step 2: QueryRuntimeBar 增强 (状态细化 + 耗时)
Step 3: InputToolbar (debug/runtime/agent/plugin/memory/clear/usage/im)
Step 4: SessionDashboard (context bar, project dir, session ID, model, branch, mode)
Step 5: RuntimeActionDock 增强 (interactive 完善)
Step 6: RewindPicker
Step 7: UsagePanel
Step 8: MultiSessionDialog + CompareDialog
Step 9: page.tsx 整合
Step 10: DebugMode 消息过滤
```

## 7. 协作规范

### 角色分工

| 角色 | 职责 |
|------|------|
| **Requirement** | 验收标准确认、用户体验闭环、spec 维护 |
| **Development** | 代码实现、架构落地、单元测试 |
| **Testing** | 自动化测试、代码评审、缺陷分级 |

### 代码评审门禁

每次实现一个完整组件后自动执行 review-cycle：
1. 检查组件是否符合本规范
2. 检查缺少的状态/边界处理
3. 确认无 TypeScript 错误
4. 确认无回归

### 缺陷分级

| 级别 | 定义 | 处理 |
|------|------|------|
| P0 | 核心功能不可用 | 必须修复 |
| P1 | 主要场景体验受损 | 必须修复 |
| P2 | 边界/兼容性 | 尽量修复 |
| P3 | 样式/文案 | 可延后 |

### 提交流程

1. 每完成一个组件 → `git add` 该组件所有文件
2. 运行 `npm run build` 确认无 TS 错误
3. 运行相关测试
4. 提交格式：`feat(frontend-next): 功能名 - 描述`
