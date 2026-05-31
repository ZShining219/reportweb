# ReportWebShow

ReportWebShow 是一个面向汇报演示的 Web Demo 项目，目标是建立一套“Codex 内容整理 + 标准数据文档 + Web 呈现端 + 前端可编辑 revision”的轻量工作流。

项目当前处于 Demo 基座阶段。重点不是先做一个完整 PPT 编辑器，而是先把数据模型、前端呈现、节点导航、用户微调和 revision 保存链路跑通，并保持结构清晰、可验证、可继续拆模块演进。

## 当前目标

本项目希望解决的问题：

- 用结构化数据描述一次汇报，而不是只生成静态 HTML 或 PPT 文件；
- 用 `sources` 记录内容来源，降低汇报内容失去出处的问题；
- 用 `reports` 保存 Codex 生成的基础汇报数据树；
- 用 `patches` 保存用户在 Web 前端微调后的 revision；
- 用 Web 前端提供类似 PPT 的播放、编辑和节点跳转体验；
- 后续支持将用户确认后的 patch 固化回基础数据，形成完整生产闭环。

核心工作流：

```text
原始材料 / 对话 / 文件
  -> Codex 整理
  -> data/sources 来源记录
  -> data/reports 基础汇报数据
  -> Web 前端播放与编辑
  -> data/patches 保存 revision
  -> 最终展示 = reports + 当前 revision 链
```

## 当前进度

已经具备：

- 本地 Node HTTP 服务，无后端框架；
- 静态前端 Demo 页面；
- YAML 汇报数据读取；
- `reports + patches` 合并生成当前展示状态；
- patch revision 父链计算；
- 保存冲突检测；
- 前端播放模式和编辑模式切换；
- 文字组件编辑；
- 组件拖动、缩放、删除；
- 编辑模式下的移动、缩放、文本编辑意图反馈；
- 组件复制、剪切、粘贴；
- 跨节点组件移动与复制的 patch 表达；
- 当前 revision 切换与回撤；
- 可折叠树形节点列表导航；
- 聚焦当前节点的亲属走廊节点图导航；
- 右侧 inspector 与 revision 面板模块化渲染；
- 全局 UI token、基础 UI class 和模块 demo 基座；
- Node 内置测试覆盖 report patch 合并、节点图、折叠树、diff、API、编辑反馈和面板逻辑。

仍在 Demo 阶段，尚未完成：

- 多汇报项目选择界面；
- 从空白新增文字、图片等组件的前端入口；
- 通用 `add_component` patch 操作；
- 前端 undo / redo；
- SVG 内部细节编辑；
- patch 固化回 `reports`；
- PPTX / PDF 导出；
- 更完整的数据 schema 校验；
- 完整的演讲者视图、全屏播放和键盘演示体验。

## 快速开始

安装依赖：

```shell
npm install
```

启动本地服务：

```shell
npm start
```

默认访问：

```text
http://localhost:5173
```

运行测试：

```shell
npm test
```

当前前端 Demo 默认加载的汇报 ID 写在 `public/app.js`：

```js
const reportId = '2026-05-17-weekly-progress';
```

## 项目结构

```text
.
├── server.js
├── src/
│   └── reportStore.js
├── public/
│   ├── index.html
│   ├── app.js
│   ├── modules/
│   ├── ui/
│   ├── demos/
│   ├── nodeContext.js
│   ├── nodeNavigator.js
│   └── styles.css
├── data/
│   ├── sources/
│   ├── reports/
│   ├── patches/
│   └── schemas/
├── assets/
│   └── svg/
├── docs/
│   └── design/
└── tests/
```

职责边界：

- `server.js`：本地 HTTP 服务，负责静态资源、汇报 API、revision 保存和当前 revision 切换。
- `src/reportStore.js`：汇报数据与 patch/revision 合并逻辑。
- `public/app.js`：前端装配层，负责全局状态、模块编排和主流程接线。
- `public/modules/`：前端业务模块，包括 API、diff、画布、组件渲染、编辑反馈、inspector、revision 和折叠树。
- `public/ui/`：全局 UI token、基础 class 和少量 DOM helper。
- `public/demos/`：模块级 demo 页面，用于独立调试编辑反馈和右侧面板。
- `public/nodeContext.js`、`public/nodeNavigator.js`：节点图亲属关系布局模型与底部节点导航渲染。
- `public/styles.css`：当前主样式入口，逐步迁移到 `public/ui/` token 和公共 class。
- `data/sources/`：来源记录。
- `data/reports/`：基础汇报数据。
- `data/patches/`：前端保存产生的 revision。
- `data/schemas/`：数据结构说明。
- `assets/`：汇报引用的 SVG 等静态资源。
- `docs/design/`：长期设计说明。
- `tests/`：核心数据合并和节点图测试。

## 数据模型

当前 Demo 使用 YAML 作为项目数据格式。

一个汇报项目由同一个 `report_id` 串联：

```text
data/sources/{report_id}.sources.yaml
data/reports/{report_id}.report.yaml
data/patches/{report_id}.patch.yaml
assets/svg/{report_id}/
```

基础规则：

- `reports` 是 Codex 生成的基础数据树；
- `patches` 是用户在 Web 前端保存后的差异层；
- 前端普通编辑不直接覆盖 `reports`；
- `current_revision` 决定当前展示版本；
- 回撤只切换 `current_revision`，不删除历史 revision；
- 最终展示由服务端读取 `reports` 和 `patches` 后合成。

更多细节见：

- `docs/design/data-and-presentation-model.md`
- `docs/design/frontend-module-boundaries.md`
- `docs/design/ui-style-guide.md`
- `data/schemas/report-schema.md`

## 本地 API

当前服务端提供以下 Demo API：

```text
GET  /api/reports
GET  /api/reports/:reportId
POST /api/reports/:reportId/revisions
POST /api/reports/:reportId/current-revision
```

说明：

- `GET /api/reports` 返回本地可用汇报 ID 列表；
- `GET /api/reports/:reportId` 返回基础 report、patch 和合成后的 state；
- `POST /api/reports/:reportId/revisions` 保存一次前端编辑，生成新 revision；
- `POST /api/reports/:reportId/current-revision` 切换当前展示 revision。

## 前端操作

播放模式：

- 点击左侧边缘“叙事树”按钮打开可折叠叙事树并切换节点；
- 点击右侧边缘“状态”按钮查看数据状态、组件选择和 revision；
- 点击左侧节点展开/折叠按钮管理节点栏目；
- 点击下方节点图切换节点；
- 使用方向键按树形导航移动。

编辑模式：

- 点击“编辑”进入编辑模式；
- 点击文字组件可直接修改文本；
- 拖动组件左上角移动手柄调整位置；
- 拖动右下角手柄调整尺寸；
- 操作反馈显示在底部状态栏区域，不遮挡汇报画布；
- `Shift + 点击` 多选组件；
- `Delete` 删除选中组件；
- `Ctrl/Cmd + C` 复制；
- `Ctrl/Cmd + X` 剪切；
- `Ctrl/Cmd + V` 粘贴；
- 点击“保存”写入 patch revision；
- 点击“放弃”丢弃未保存修改。

当前尚未提供“从空白新增组件”的完整前端入口。若要新增基础内容，当前稳定方式仍是修改 `data/reports/*.report.yaml` 中对应页面的 `components`；若要基于已有组件新增，前端可通过复制/粘贴生成 `copy_components` patch。后续需要补齐 `add_component` patch 语义、图片组件渲染和新增组件面板。

## 前端模块

当前已拆出的模块：

```text
public/modules/
├── reportApi.js
├── patchDiff.js
├── stageCanvas.js
├── componentRenderer.js
├── editFeedback.js
├── editFeedback.css
├── inspectorPanel.js
├── revisionPanel.js
└── treeList.js
```

说明：

- `reportApi.js`：封装前端 API 请求和错误处理。
- `patchDiff.js`：比较 `baseState` 与 `draftState`，生成 patch changes。
- `stageCanvas.js`：管理 16:9 汇报画布、背景和组件层挂载。
- `componentRenderer.js`：渲染 text/svg 组件，并提供移动/缩放/文本编辑入口。
- `editFeedback.js`、`editFeedback.css`：提供选择、文本编辑、移动、缩放、dirty 状态的操作意图反馈。
- `inspectorPanel.js`：渲染当前汇报、节点、组件选择和 dirty 状态。
- `revisionPanel.js`：渲染 base/revision 列表并发出 revision 切换回调。
- `treeList.js`：渲染左侧可折叠叙事树。

全局 UI 基座：

```text
public/ui/
├── tokens.css
├── primitives.css
├── layout.css
└── ui.js
```

模块 demo：

```text
public/demos/
├── edit-feedback-demo.html
└── inspector-demo.html
```

## 模块拆解方向

后续可以按以下模块逐个推进：

1. 数据模型与 schema：补齐 report、patch、source 的字段约束和校验。
2. 汇报项目管理：从硬编码 `reportId` 演进到汇报列表和切换入口。
3. 播放体验：补齐全屏、线性播放、演讲者备注和导出。
4. 新增组件：补齐文字、图片、图形等组件插入入口和 `add_component` patch。
5. 编辑体验：补齐对齐辅助线、吸附、撤销重做和组件层级。
6. SVG 编辑：从整体拖动缩放演进到局部文字、颜色和图形调整。
7. revision 管理：增强历史列表、分支提示、差异预览和固化流程。
8. 导出能力：研究 PDF / PPTX 输出，将 Web 调整结果转为可交付文件。

## 开发约定

- 默认使用中文维护沟通和文档；
- 保持 Demo 轻量，优先复用现有 Node + 原生前端结构；
- 前端模块应能独立呈现和调试，模块之间通过参数和回调通信；
- UI 样式遵循全局 token 先行原则，新增可复用视觉值应先进入 `public/ui/` 再被具体模块调用；
- 前端编辑只写入 `patches`，不直接覆盖基础 `reports`；
- 修改数据合并、revision、节点导航等核心逻辑后，应运行 `npm test`；
- 涉及 UI 和交互修改时，应启动本地服务并在浏览器检查关键路径；
- 不提交密钥、token、账号密码、`.env` 等敏感信息。
