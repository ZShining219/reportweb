# 前端呈现模块边界

本文用于约定 ReportWebShow 前端呈现侧的模块拆分方式。目标是让不同窗口可以并行开发不同模块，同时保持最终接入时的数据流、接口和 UI 风格一致。

## 1. 拆分目标

前端模块拆分应服务于三个目标：

- 独立呈现：每个模块可以用 mock 数据单独打开、渲染和调试。
- 独立开发：模块只依赖明确输入、回调和全局 UI 规范，不直接依赖整个 `app.js`。
- 组合接入：主应用负责状态编排，模块负责自己的呈现和局部交互。

当前树状节点导航已有并行开发任务，后续本文只约定导航适配边界，不直接约束或覆盖正在开发的导航实现。

## 2. 总体结构

建议前端逐步演进为以下结构：

```text
public/
├── app.js
├── index.html
├── styles.css
├── modules/
│   ├── appShell.js
│   ├── stageCanvas.js
│   ├── componentRenderer.js
│   ├── editLayer.js
│   ├── inspectorPanel.js
│   ├── revisionPanel.js
│   ├── presentationControls.js
│   ├── patchDiff.js
│   ├── reportApi.js
│   └── nodeNavigationAdapter.js
├── ui/
│   ├── tokens.css
│   ├── primitives.css
│   ├── layout.css
│   └── ui.js
└── demos/
    ├── stage-demo.html
    ├── component-demo.html
    ├── inspector-demo.html
    └── revision-demo.html
```

说明：

- `app.js` 逐步收敛为应用装配层。
- `modules/` 保存业务功能模块。
- `ui/` 保存全局视觉 token、基础组件 class 和 UI helper。
- `demos/` 保存模块级调试入口，方便并行开发和视觉回归检查。

## 3. 主应用状态

主应用维护全局状态，模块不直接拥有全局业务事实。

建议主状态结构：

```js
{
  reportId,
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

模块接收必要数据和回调，不直接读取或修改其他模块内部状态。

## 4. 模块列表

### 4.1 AppShell

职责：

- 页面三栏布局；
- 顶部工具栏位置；
- 左侧导航区域容器；
- 中央工作区；
- 右侧 inspector；
- 底部状态栏。

独立调试目标：

- 使用静态占位内容即可渲染完整工作台框架。

输入：

```js
{
  mode,
  reportTitle,
  currentNodeTitle,
  statusText
}
```

输出回调：

```js
{
  onEnterEdit,
  onDiscard,
  onSave
}
```

### 4.2 StageCanvas

职责：

- 渲染固定比例汇报画布；
- 根据 page canvas 设置背景和比例；
- 管理组件定位容器；
- 区分播放模式和编辑模式下的画布外观。

独立调试目标：

- 输入一个 page 对象即可渲染一页汇报画布。

输入：

```js
{
  page,
  svgAssets,
  mode,
  selectedIds
}
```

输出回调：

```js
{
  onSelectComponent,
  onMoveComponent,
  onResizeComponent,
  onTextChange
}
```

### 4.3 ComponentRenderer

职责：

- 渲染 `text`、`svg` 等组件；
- 后续扩展 `image`、`shape`、`chart`、`table`、`group`；
- 保证组件渲染逻辑不堆在 StageCanvas 内。

独立调试目标：

- 输入 components 和 canvas 尺寸即可渲染组件层。

输入：

```js
{
  components,
  svgAssets,
  canvas,
  mode,
  selectedIds
}
```

输出回调：

```js
{
  onSelect,
  onTextInput,
  onPointerDown,
  onResizeStart
}
```

### 4.4 EditLayer

职责：

- 选择；
- 多选；
- 拖拽；
- 缩放；
- 删除；
- 复制；
- 剪切；
- 粘贴；
- 键盘微调。

后续扩展：

- undo / redo；
- 对齐辅助线；
- 吸附；
- 框选；
- 操作历史。

独立调试目标：

- 用 mock components 验证编辑操作是否只产生受控变更。

输入：

```js
{
  mode,
  currentNodeId,
  state,
  selectedIds,
  clipboard
}
```

输出回调：

```js
{
  onStateChange,
  onSelectionChange,
  onClipboardChange,
  onStatusChange
}
```

### 4.5 InspectorPanel

职责：

- 展示当前汇报信息；
- 展示当前选中组件；
- 展示节点、组件、来源和 revision 的状态；
- 后续承载属性编辑。

独立调试目标：

- 输入 selection 和 report meta 即可渲染右侧面板。

输入：

```js
{
  reportId,
  reportTitle,
  currentRevision,
  selectedComponents,
  currentNode
}
```

输出回调：

```js
{
  onUpdateComponentField,
  onUpdateNodeField
}
```

### 4.6 RevisionPanel

职责：

- 展示 revision 列表；
- 高亮当前 revision；
- 切换当前 revision；
- 后续显示 revision summary、时间、父链和分支提示。

独立调试目标：

- 输入 patch 数据即可渲染 revision 时间线。

输入：

```js
{
  currentRevision,
  revisions
}
```

输出回调：

```js
{
  onSelectRevision
}
```

### 4.7 PresentationControls

职责：

- 播放/编辑模式按钮；
- 保存；
- 放弃；
- 后续全屏、上一页、下一页、演讲者视图和导出入口。

独立调试目标：

- 用不同 mode 和 dirty 状态验证按钮展示与禁用逻辑。

输入：

```js
{
  mode,
  dirty,
  canSave,
  canDiscard
}
```

输出回调：

```js
{
  onEnterEdit,
  onSave,
  onDiscard,
  onPresent
}
```

### 4.8 PatchDiff

职责：

- 对比 `baseState` 和 `draftState`；
- 输出 patch changes；
- 不处理 DOM；
- 不调用 API；
- 不写 UI。

独立调试目标：

- 输入 before/after state，输出稳定 changes。

输入：

```js
{
  before,
  after
}
```

输出：

```js
[
  { op: 'update_text' },
  { op: 'move_component' },
  { op: 'resize_component' }
]
```

### 4.9 ReportApi

职责：

- 封装 API 请求；
- 统一错误处理；
- 允许真实请求和 mock 请求切换。

独立调试目标：

- 在 demo 中用 mock API 验证模块数据流。

接口：

```js
{
  listReports,
  loadReport,
  saveRevision,
  setCurrentRevision
}
```

### 4.10 NodeNavigationAdapter

职责：

- 连接主应用和树状节点导航/节点图导航；
- 不拥有具体导航实现；
- 只约定输入输出。

独立调试目标：

- 用 mock navigation module 验证当前节点切换回调。

输入：

```js
{
  state,
  currentNodeId
}
```

输出回调：

```js
{
  onSelectNode
}
```

## 5. 并行开发约定

- 每个模块新增或修改时，应优先补一个 `public/demos/*.html` 调试入口。
- demo 页面可以使用 mock 数据，不需要连真实服务。
- 模块之间不得互相读取 DOM 内部结构。
- 模块之间通信只通过参数和回调。
- 业务模块不得定义局部视觉风格；视觉规则统一从 `public/ui/` 调用。
- 树状节点导航相关文件在并行开发期间不作为其他模块拆分的前置依赖。

## 6. 推荐拆分顺序

低风险优先：

1. `reportApi.js`
2. `patchDiff.js`
3. `componentRenderer.js`
4. `stageCanvas.js`
5. `inspectorPanel.js`
6. `revisionPanel.js`
7. `presentationControls.js`
8. `editLayer.js`
9. `nodeNavigationAdapter.js`

拆分完成前，`app.js` 可以继续保留旧逻辑；每拆出一个模块，应保证主流程仍能运行。
