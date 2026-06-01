# 项目管理入口设计

## 背景

ReportWebShow 当前已经具备单个汇报项目的播放、编辑、节点导航和 revision 保存能力。前端入口仍默认加载一个固定 `reportId`，这限制了多个已落盘汇报项目之间的切换。

本设计定义第一期项目管理入口。这里的“项目”指已经由 Codex 生产并写入 `data/reports/`、`data/sources/`、`data/patches/` 和 `assets/` 的汇报项目。项目产生绑定 Codex 执行流程，因此 Web 端第一期不提供新建项目入口。

## 目标

- 在不打断当前汇报工作台体验的前提下，提供进入项目管理画面的入口。
- 复用当前树状节点灵动岛的产品语言，在灵动岛中增加“项目”按钮。
- 项目管理画面展示已有 report 项目，并允许选择进入具体项目。
- 第一版保持轻量，只展示标题、`report_id` 和当前 revision。
- 保持现有 report 数据模型、patch/revision 机制和无框架 Demo 边界。

## 非目标

- 不提供 Web 端新建项目。
- 不提供删除、重命名、复制、归档项目。
- 不提供导入材料、触发 Codex 生成、项目内部任务编排。
- 不做搜索、筛选、排序和复杂状态管理。
- 不引入新的后端框架或前端构建链。

## 用户体验

### 灵动岛入口

当前树状节点灵动岛继续承担汇报内节点导航职责，并增加一个项目级入口按钮。按钮文案为“项目”，视觉上与当前节点按钮、下一节点提示保持同一组控件语言。

点击“项目”按钮后，应用进入项目管理视图。此时主画面不再呈现某个具体 report 的舞台内容，而是呈现项目管理画面。

### 项目管理画面

项目管理画面是工作台的一个视图状态，而不是单独的新应用。它显示当前本地可用 report 项目列表。每个列表项展示：

- 汇报标题；
- `report_id`；
- 当前 revision，若无 revision 则显示基础版本。

点击某个项目后，前端加载该项目并回到具体汇报画面。加载成功后当前节点重置到该 report 的根节点，组件选择、编辑草稿、编辑反馈和保存基线一并重置。

### URL 行为

第一期支持通过 URL 参数记住当前项目：

- 如果 URL 包含 `?report=<id>`，启动时优先加载该 report；
- 如果 URL 没有 report 参数，默认加载项目列表中的第一个 report；
- 选择项目后更新 URL 参数，刷新页面后仍进入该项目。

项目管理视图通过 `?view=projects` 表示。点击灵动岛“项目”按钮后更新该参数；刷新页面后仍回到项目管理画面。选择具体项目后移除 `view=projects` 并设置 `report=<id>`。

## 状态模型

前端新增工作区视图状态：

```js
workspaceView = 'report' | 'project-manager'
```

`report` 视图复用现有播放、编辑、节点导航、inspector 和 revision 面板逻辑。

`project-manager` 视图使用项目列表模型，不渲染当前 report 的具体页面内容。进入该视图时不应继续显示旧项目的舞台内容，避免用户误以为仍在编辑某个具体项目。

建议新增或调整的前端状态：

```js
{
  workspaceView,
  reportId,
  projectList,
  projectListStatus,
  payload,
  currentNodeId,
  mode,
  draftState,
  baseState,
  baseRevision,
  selectedIds,
  clipboard
}
```

切换到具体项目时需要重置：

- `currentNodeId`；
- `mode`；
- `draftState`；
- `baseState`；
- `baseRevision`；
- `selectedIds`；
- `clipboard`；
- 编辑反馈状态；
- 必要的节点展开状态。

## 数据与 API

第一期复用现有 API：

```text
GET /api/reports
GET /api/reports/:reportId
```

`GET /api/reports` 当前返回 report id 列表。前端可以逐个调用 `GET /api/reports/:reportId` 获取标题和当前 revision。

如后续项目数量增加，可再把 `GET /api/reports` 扩展为返回轻量摘要对象，例如：

```js
[
  {
    reportId,
    title,
    currentRevision
  }
]
```

第一期不新增项目元数据文件。项目标题优先读取 report 数据中的标题字段；当前 revision 读取 patch 文档中的 `current_revision`。

## 组件边界

建议新增项目列表模块：

```text
public/modules/projectManager.js
```

职责：

- 根据项目 payload 创建项目列表视图模型；
- 渲染项目管理画面；
- 通过回调通知主应用选择项目。

输入：

```js
{
  projects,
  activeReportId,
  status
}
```

输出回调：

```js
{
  onSelectProject(reportId)
}
```

主应用 `public/app.js` 负责：

- 加载项目列表；
- 管理 `workspaceView`；
- 处理 URL 参数；
- 在项目管理视图与具体 report 视图之间切换；
- 保持现有模块只接收必要输入，不直接读取全局状态。

灵动岛模块 `public/modules/narrativeIsland.js` 负责：

- 接收是否显示项目按钮的 view model 字段；
- 渲染项目按钮；
- 触发 `onOpenProjectManager` 回调。

灵动岛不直接加载项目数据，也不直接切换 report。

## 错误处理

- 项目列表加载失败时，项目管理画面显示错误状态，并保留重试入口。
- 单个项目摘要加载失败时，可以显示该 `report_id` 与错误提示，不阻塞其他项目展示。
- 选择项目后加载失败时，停留在项目管理视图并显示错误，不进入半加载的 report 视图。
- URL 指向不存在的 report 时，回退到项目管理视图并提示该 report 不可用。

## 测试

应增加或调整以下测试：

- 项目列表 view model 能从 payload 中提取标题、`report_id` 和 current revision。
- 项目管理渲染器能展示项目列表和基础版本状态。
- 灵动岛渲染项目按钮并触发打开项目管理回调。
- 主应用文本或结构测试覆盖不再硬编码单个 report 的设计意图。
- `npm test` 仍作为主要验证命令。

如实现涉及明显 UI 变化，还应启动本地服务并在浏览器中检查：

- 点击灵动岛“项目”按钮后主画面切换为项目管理画面；
- 选择项目后回到具体汇报；
- 原有播放模式、编辑模式、节点切换和保存 revision 仍可用。

## 后续扩展

后续可以在不改变第一期边界的基础上扩展：

- 项目摘要 API；
- 搜索、筛选和排序；
- 项目封面或最近更新时间；
- Codex 生产流程状态展示；
- patch 固化状态和最终展示状态。
