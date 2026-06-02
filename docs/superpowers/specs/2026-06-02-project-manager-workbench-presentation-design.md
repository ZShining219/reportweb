# 项目管理工作台呈现改造设计

## 背景

当前项目管理入口已经接入 `workspaceView = 'project-manager'`，并可通过灵动岛“项目”按钮进入项目管理画面。现有实现的问题在于项目管理视图被渲染到独立的 `#projectManager` 容器中，同时隐藏 `stage-shell` 并清空左右侧栏。这让项目管理看起来像跳到另一个页面区域，而不是 ReportWebShow 工作台中的一种业务状态。

本设计用于改造项目管理的呈现方式：保持工作台布局不变，让中间画布、左右侧栏和灵动岛根据当前业务状态切换内容。

## 目标

- 项目管理态与汇报态共用同一工作台布局。
- 中间 `stage` 在项目管理态呈现项目看板。
- 左侧栏在项目管理态呈现项目列表或分组。
- 右侧栏在项目管理态呈现当前选中项目详情。
- 灵动岛始终作为悬浮控件存在，并根据当前状态切换内容。
- 保持无框架 Demo 边界，不引入新的构建链或主要依赖。
- 通过清晰模块封装避免把项目管理 DOM 和状态逻辑继续堆入 `app.js`。

## 非目标

- 不在本轮实现 Web 端新建项目。
- 不实现项目删除、重命名、复制或归档。
- 不实现复杂搜索、筛选、排序。
- 不改变 `reports + patches` 的数据合并机制。
- 不引入新的项目元数据文件。
- 不重构汇报态的画布编辑、revision 保存和节点导航逻辑。

## 用户体验

### 工作台布局

进入项目管理后，页面的主要布局保持不变：

- 顶部 toolbar 仍在原位置；
- 中间仍是 `stage-shell` 和 `stage`；
- 左右边缘按钮仍控制左右侧栏；
- 底部状态栏仍显示状态反馈；
- 灵动岛仍悬浮在工作台中。

变化只发生在各区域的业务内容：

- 汇报态显示汇报页面、叙事树、inspector 和 revision；
- 项目管理态显示项目看板、项目列表和项目详情。

### 中间画布

项目管理态的中间 `stage` 呈现项目看板。项目卡片至少展示：

- 汇报标题；
- `report_id`；
- 当前 revision，若无 revision 则显示基础版本；
- 是否为当前 active report；
- 是否为当前选中项目。

项目卡片的主点击行为是选中项目，而不是直接进入汇报。选中后右侧栏展示该项目详情。

进入汇报使用明确命令：

- 项目卡片内的“进入汇报”按钮；
- 右侧项目详情中的“进入汇报”按钮；
- 项目管理态灵动岛中的返回/进入当前项目按钮。

这样可以保留项目管理画面的浏览和对比能力，避免点击项目卡片后用户还没查看详情就被跳转。

### 左侧栏

项目管理态下，左侧栏从叙事树切换为项目列表或简单分组。第一期只做轻量列表：

- 显示本地可用项目；
- 标记当前 active report；
- 标记当前选中项目；
- 点击项目项只更新 `selectedProjectId`，不直接进入汇报。

左侧边缘按钮文案可随状态从“叙事树”切换为“项目”，但抽屉位置、展开方式和遮罩策略不变。

### 右侧栏

项目管理态下，右侧栏从汇报 inspector 切换为当前选中项目详情。详情至少展示：

- 项目标题；
- `report_id`；
- 当前 revision；
- revision 数量；
- 节点数量；
- 页面数量；
- 是否处于基础版本；
- “进入汇报”命令。

如果没有可用项目，右侧栏显示空状态。如果项目列表载入失败，右侧栏显示错误状态和当前可保留的信息。

### 灵动岛

灵动岛应是页面级悬浮控件，而不是具体页面内容的一部分。它在不同工作台状态下呈现不同内容。

汇报态：

- 显示父节点、当前节点、下一步；
- 可展开叙事地图；
- 保留项目入口按钮。

项目管理态：

- 显示“项目管理”状态；
- 显示当前选中项目标题或“未选择项目”；
- 提供返回/进入当前项目的明确按钮；
- 不渲染空 story tree；
- 不显示“未选择节点”“末端节点”等汇报态文案。

项目管理态的灵动岛第一期作为状态切换器，不承担项目列表、搜索、筛选或复杂操作中心职责。

## 状态模型

保留当前工作台状态：

```js
workspaceView = 'report' | 'project-manager'
```

继续使用 `reportId` 表示当前 active report。新增：

```js
selectedProjectId
```

含义：

- `reportId`：当前汇报态实际打开或最近打开的项目；
- `selectedProjectId`：项目管理态当前被选中并在右侧栏展示详情的项目。

进入项目管理时：

- 若 `selectedProjectId` 仍存在于项目列表中，则保持；
- 否则优先使用 `reportId`；
- 若 `reportId` 不存在，则使用第一个可用项目；
- 若没有可用项目，则为 `''`。

点击项目卡片或左侧项目项：

- 只更新 `selectedProjectId`；
- 更新右侧详情；
- 不修改 `reportId`；
- 不切换 `workspaceView`。

点击“进入汇报”：

- 使用目标项目加载 report；
- 成功后设置 `reportId`；
- 设置 `workspaceView = 'report'`；
- 重置汇报态 session，包括节点、编辑草稿、选中组件、剪贴板、画布视口和编辑反馈。

## URL 行为

继续支持：

```text
?report=<id>
?view=projects
```

规则：

- `?view=projects` 进入项目管理态；
- `?report=<id>` 表示 active report；
- 如果同时存在，则项目管理态默认选中该 report；
- 选中项目不必立即更新 `report` 参数；
- 进入汇报后更新 `report=<id>` 并移除 `view=projects`；
- 打开项目管理后保留当前 `report` 并设置 `view=projects`。

## 模块边界

### `public/app.js`

`app.js` 只负责工作台编排：

- 加载项目列表；
- 管理 `workspaceView`、`reportId`、`selectedProjectId`；
- 处理 URL 参数；
- 在汇报态和项目管理态之间切换；
- 调用各模块的 view model 和 renderer；
- 处理进入汇报、选中项目、切换 revision 等高层回调。

不应在 `app.js` 中直接拼接项目卡片、项目列表或项目详情 DOM。

### `public/modules/projectManager.js`

扩展为项目管理呈现模块。建议导出：

```js
createProjectManagerViewModel(...)
renderProjectBoard(container, model, callbacks)
renderProjectList(container, model, callbacks)
renderProjectDetails(container, model, callbacks)
```

职责：

- 归一化项目 payload；
- 计算 active、selected、revisionLabel、节点数量、页面数量、revision 数量；
- 渲染中间项目看板；
- 渲染左侧项目列表；
- 渲染右侧项目详情；
- 通过回调通知 `app.js` 选中项目或进入汇报。

### `public/modules/narrativeIsland.js`

灵动岛模块需要支持模式化 view model：

```js
kind = 'report' | 'project-manager'
```

汇报态继续渲染当前节点胶囊和展开地图。项目管理态渲染状态切换器。renderer 根据 model 渲染，不直接读取全局状态。

### 样式

项目管理态应使用 `stage--project-board` 或同类状态 class 限定样式。项目看板、项目列表、项目详情使用全局 UI token 和公共样式变量，不在局部硬编码可复用颜色、间距、字号、圆角和阴影。

废弃独立 `project-manager-shell` 后，应删除或收敛相关样式，避免留下不可达 CSS。

## 错误处理

- 项目列表加载失败且无缓存项目时，中间画布、左侧栏和右侧栏都显示错误状态。
- 项目列表加载失败但已有项目缓存时，中间画布继续显示已有项目，并显示非阻塞错误提示。
- 选择不存在的项目时，回退到当前 active report 或第一个可用项目。
- 进入汇报失败时，留在项目管理态，保留 `selectedProjectId`，右侧显示错误。
- 无项目时，中间画布显示空状态，灵动岛显示项目管理态但禁用进入汇报命令。

## 测试计划

应增加或调整以下测试：

- 项目管理 view model 计算 `selected`、`active`、节点数量、页面数量和 revision 数量。
- 项目看板 renderer 渲染到 `stage`，点击卡片只触发选中项目。
- 项目看板“进入汇报”按钮触发进入汇报回调。
- 项目列表 renderer 标记 active 和 selected 项目。
- 项目详情 renderer 展示当前选中项目详情和进入汇报命令。
- 灵动岛项目管理态不显示汇报节点文案，并触发进入当前项目回调。
- `app.js` 文本结构测试覆盖项目管理态不再隐藏 `stage-shell`。
- 样式测试覆盖 `stage--project-board`、项目看板、项目列表、项目详情和项目管理态灵动岛规则。

涉及 UI 后，应启动本地服务并检查：

- `/?view=projects` 直接进入项目管理态；
- 中间画布显示项目看板；
- 点击项目卡片只更新右侧详情；
- 点击进入汇报后回到汇报态；
- 左右侧栏在两种状态下内容正确切换；
- 灵动岛在项目管理态显示状态切换器，汇报态仍显示节点导航。

## 后续扩展

本设计为项目管理呈现基座。后续可以在不改变工作台边界的基础上扩展：

- 搜索、筛选、排序；
- 项目封面；
- 最近更新时间；
- Codex 生产流程状态；
- patch 固化状态；
- 项目摘要 API。
