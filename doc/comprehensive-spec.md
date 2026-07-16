# frontend-next 补齐完整 Spec

> Vue 版本 3797 行 ChatPanelPage 的全面功能审计 vs frontend-next 现有功能

---

## 1. New Project 功能 (新增)

### 功能点
| # | 功能 | 状态 |
|---|------|------|
| 1.1 | 侧边栏底部「+ New Project」按钮 | ❌ 缺失 |
| 1.2 | New Project Dialog：填入 name + path | ❌ 缺失 |
| 1.3 | API: `/projects` POST (已有 `createProjectApi`) | ✅ 已有 |
| 1.4 | 创建后列表刷新、自动选中 | ❌ 缺失 |

### 事件
- `onCreateProject(name, path)` → `createProjectApi`
- `onProjectCreated(project)` → refetch projects list

---

## 2. 输入框上传 (MessageInput 增强)

### 功能点
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 2.1 | 文件上传按钮 (attach paperclip) | ✅ L227-263 | ❌ 缺失 |
| 2.2 | 拖拽上传 drag/drop | ✅ L243-254 | ❌ 缺失 |
| 2.3 | 粘贴图片上传 | ✅ L227-241 | ❌ 缺失 |
| 2.4 | 附件预览: 图片thumb | ✅ L358-375 | ❌ 缺失 |
| 2.5 | 附件预览: 文件chip | ✅ L358-375 | ❌ 缺失 |
| 2.6 | 附件删除按钮 | ✅ L292-294 | ❌ 缺失 |
| 2.7 | 斜杠命令提示 (type / for skills) | ✅ L339-356 | ❌ 缺失 |
| 2.8 | IME安全输入 (composingRef) | ✅ L149-161 | ✅ 部分(L43-47) |
| 2.9 | Auto-resize textarea | ✅ L75-80 | ✅ 已有 |
| 2.10 | Enter/Ctrl+Enter 模式切换 | ✅ L190-224 | ❌ 缺失 |
| 2.11 | 动态placeholder | ✅ L53-63 | ❌ 缺失 |
| 2.12 | 发送附件时携带 `attachments` payload | ✅ L127-136 | ❌ 缺失 |

### WebSocket 事件
- `send_prompt` with `attachments` array

---

## 3. 输入框顶部工具栏 (InputToolbar)

### 3.1 Debug 按钮
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 3.1.1 | Debug mode toggle | ✅ L1210-1231 | ❌ 缺失 |
| 3.1.2 | Debug active 时显示 tool_use/system 消息 | ✅ script | ❌ 缺失 |
| 3.1.3 | Debug icon (bug SVG) | ✅ L1218-1230 | ❌ 缺失 |

### 3.2 Runtime 按钮
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 3.2.1 | Runtime panel toggle | ✅ L1232-1247 | ❌ 缺失 |
| 3.2.2 | Runtime 下拉面板 (QueryRuntimeBar) | ✅ L1189-1205 | ❌ 缺失 |
| 3.2.3 | Runtime activity 显示 | ✅ L1195 | ❌ 缺失 |

### 3.3 Agent 按钮
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 3.3.1 | Agent dialog trigger | ✅ L1268-1282 | ❌ 缺失 |
| 3.3.2 | Current agent label | ✅ L1273 | ❌ 缺失 |
| 3.3.3 | AgentDialog 组件 | ✅ L1880-1887 | ❌ 缺失 |

### 3.4 Plugin 按钮
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 3.4.1 | Plugin dialog trigger | ✅ L1282-1301 | ❌ 缺失 |
| 3.4.2 | PluginManagerDialog | ✅ L1874-1878 | ❌ 缺失 |

### 3.5 Memory 按钮
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 3.5.1 | MemoryButton | ✅ L1302-1305 | ❌ 缺失(已有独立文件) |
| 3.5.2 | MemoryDialog | ✅ L1889-1895 | ❌ 缺失 |

### 3.6 Multi-session 按钮
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 3.6.1 | Multi-session trigger | ✅ L1306-1321 | ❌ 缺失 |
| 3.6.2 | Parallel branch count badge | ✅ L1320 | ❌ 缺失 |
| 3.6.3 | MultiSessionDialog | ✅ L1725-1834 | ❌ 缺失 |

### 3.7 Media 按钮 (Voice/Video)
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 3.7.1 | Media dropdown menu | ✅ L1325-1374 | ❌ 缺失 |
| 3.7.2 | Voice recording toggle | ✅ L1343-1350 | ❌ 缺失 |
| 3.7.3 | Video capture toggle | ✅ L1351-1373 | ❌ 缺失 |
| 3.7.4 | Video preview popup | ✅ L1360-1373 | ❌ 缺失 |

### 3.8 Command Palette 按钮
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 3.8.1 | CommandPaletteButton | ✅ L1375-1379 | ❌ 缺失 |

### 3.9 Clear Context 按钮
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 3.9.1 | ClearContextButton | ✅ L1380-1385 | ❌ 缺失 |
| 3.9.2 | Loading state while clearing | ✅ L1384 | ❌ 缺失 |

### 3.10 Usage 按钮 (Query History)
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 3.10.1 | Usage history trigger | ✅ L1386-1401 | ❌ 缺失 |
| 3.10.2 | History panel: query list | ✅ L1402-1443 | ❌ 缺失 |
| 3.10.3 | Token display (input/output/cache) | ✅ L1435-1439 | ❌ 缺失 |
| 3.10.4 | Duration + turns per query | ✅ L1431-1433 | ❌ 缺失 |
| 3.10.5 | Error tag on failed queries | ✅ L1433 | ❌ 缺失 |
| 3.10.6 | Running query indicator | ✅ L1413-1419 | ❌ 缺失 |

### 3.11 IM 按钮
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 3.11.1 | ImButton | ✅ L1445-1452 | ✅ 已有(独立文件但未接入) |
| 3.11.2 | IM dialog | ✅ L1906-1913 | ❌ 缺失 |

---

## 4. 输入框底部状态栏 (SessionDashboard)

### 4.1 Context 用量
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 4.1.1 | 全宽 context bar | ✅ L1489-1509 | ❌ 缺失 |
| 4.1.2 | 用量百分比 | ✅ L1508 | ❌ 缺失 |
| 4.1.3 | 颜色等级 (green/yellow/red) | ✅ L1491 | ❌ 缺失 |
| 4.1.4 | Click to compact | ✅ L1493 | ❌ 缺失 |
| 4.1.5 | Compacting state | ✅ L1505 | ❌ 缺失 |

### 4.2 项目目录 (Project Dir Chip)
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 4.2.1 | Project dir name chip | ✅ L1512-1523 | ❌ 缺失 |
| 4.2.2 | Right-click menu: Open with | ✅ L1525-1551 | ❌ 缺失 |
| 4.2.3 | Copy full path | ✅ L1554-1556 | ❌ 缺失 |
| 4.2.4 | Copy project name | ✅ L1557-1559 | ❌ 缺失 |

### 4.3 Session ID Chip
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 4.3.1 | Session ID display | ✅ L1563-1576 | ❌ 缺失 |
| 4.3.2 | Click to copy resume command | ✅ L1569 | ❌ 缺失 |
| 4.3.3 | Claude resume command | ✅ L1566 | ❌ 缺失 |

### 4.4 Session Elapsed
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 4.4.1 | Session duration display | ✅ L1577-1583 | ❌ 缺失 |

### 4.5 Agent Provider
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 4.5.1 | Provider label (Cursor) | ✅ L1584-1586 | ❌ 缺失 |

### 4.6 Model Selector
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 4.6.1 | Model chip + dropdown | ✅ L1587-1617 | ❌ 缺失 |
| 4.6.2 | Model list from API | ✅ L1601-1616 | ❌ 缺失 |
| 4.6.3 | Model selection | ✅ L1608 | ❌ 缺失 |

### 4.7 Git Branch
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 4.7.1 | Branch chip + dropdown | ✅ L1621-1653 | ❌ 缺失 |
| 4.7.2 | Branch list from API | ✅ L1637-1652 | ❌ 缺失 |
| 4.7.3 | Branch switch | ✅ L1646 | ❌ 缺失 |

### 4.8 Permission Mode
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 4.8.1 | Permission chip + dropdown | ✅ L1654-1680 | ❌ 缺失 |
| 4.8.2 | Color-coded by mode | ✅ L1657 | ❌ 缺失 |
| 4.8.3 | Mode selection via WS | ✅ L1674 | ❌ 缺失 |

### 4.9 Plan/Task Progress
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 4.9.1 | Plan chip with task count | ✅ L1681-1696 | ❌ 缺失 |
| 4.9.2 | TaskProgressPanel | ✅ L1697-1700 | ❌ 缺失 |

### 4.10 Budget Status
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 4.10.1 | Budget status chip | ✅ L1705-1707 | ❌ 缺失 |

### 4.11 Tool Usage Summary
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 4.11.1 | Tool stats display | ✅ L1708-1718 | ❌ 缺失 |

---

## 5. 消息展示丰富样式

### 5.1 消息类型
| # | 类型 | Vue | frontend-next |
|---|------|-----|---------------|
| 5.1.1 | Thinking block (animate) | ✅ | ✅ 已有 |
| 5.1.2 | Tool use block | ✅ | ✅ 已有 |
| 5.1.3 | Tool result block | ✅ 有详细样式 | ⚠️ 基础 |
| 5.1.4 | Human message | ✅ | ✅ 已有 |
| 5.1.5 | Assistant message | ✅ 富文本 | ⚠️ 基础 |
| 5.1.6 | System message | ✅ | ✅ 已有 |
| 5.1.7 | User choice block | ✅ 按钮组 | ❌ 缺失 |
| 5.1.8 | Todo write progress | ✅ 进度条 | ❌ 缺失 |
| 5.1.9 | Result block raw | ✅ diff样式| ❌ 缺失 |

### 5.2 展示增强
| # | 功能 | Vue | frontend-next |
|---|------|-----|---------------|
| 5.2.1 | 代码语法高亮 | ✅ | ❌ 缺失 |
| 5.2.2 | 工具详情折叠/展开 | ✅ | ❌ 缺失 |
| 5.2.3 | Diff view styling | ✅ | ❌ 缺失 |
| 5.2.4 | Timeline event badge | ✅ | ❌ 缺失 |
| 5.2.5 | Token count per message | ✅ | ❌ 缺失 |

---

## 6. 对话框层

| # | Dialog | Vue | frontend-next |
|---|--------|-----|---------------|
| 6.1 | RewindPicker (回退历史输入) | ✅ L1125-1175 | ❌ 缺失 |
| 6.2 | MultiSessionDialog (并行分支) | ✅ L1725-1834 | ❌ 缺失 |
| 6.3 | CompareDialog (会话对比) | ✅ L1838-1872 | ❌ 缺失 |
| 6.4 | PluginManagerDialog | ✅ L1874-1878 | ❌ 缺失 |
| 6.5 | AgentDialog | ✅ L1880-1887 | ❌ 缺失 |
| 6.6 | MemoryDialog | ✅ L1889-1895 | ❌ 缺失 |
| 6.7 | EvolutionDialog | ✅ L1897-1904 | ❌ 缺失 |
| 6.8 | ImDialog | ✅ L1906-1913 | ❌ 缺失 |
| 6.9 | TeamRuntimePanel | ✅ L1915-1922 | ❌ 缺失 |

---

## 7. 实现顺序

```
Phase 1 (Foundation):
  P1.1  New Project dialog + integration [新功能]
  P1.2  MessageInput 上传全部补齐 [关键缺漏]
  
Phase 2 (Toolbar):
  P2.1  ChatToolbar 组件 (所有按钮) [整合]
  P2.2  Debug mode toggle + filter logic
  P2.3  Clear context button + logic
  P2.4  Usage history panel
  P2.5  Agent/Plugin/Memory dialog stubs
  P2.6  IM button integration
  P2.7  Command palette button
  P2.8  Media button (voice/video stubs)
  
Phase 3 (Dashboard):
  P3.1  SessionDashboard 组件
  P3.2  Context usage bar
  P3.3  Project dir chip + model/branch/perm selectors
  P3.4  Plan/task progress
  
Phase 4 (Dialogs):
  P4.1  RewindPicker
  P4.2  MultiSessionDialog + CompareDialog
  P4.3  All remaining dialogs
  
Phase 5 (Messages):
  P5.1  Message 样式增强
  P5.2  Code syntax highlighting
  P5.3  Tool result detail fold/unfold
  
Phase 6 (Integration + Tests):
  P6.1  page.tsx 整合所有新组件
  P6.2  单元测试/组件测试
  P6.3  E2E 测试
  P6.4  Build 验证
```
