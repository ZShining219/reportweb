# 数据与呈现模型设计

## 1. 设计目标

ReportWebShow 的核心不是单纯生成一个 HTML 页面，而是建立一套“Codex 内容整理 + 标准数据文档 + Web 呈现端”的工作流。

本设计用于约定项目的数据结构、操作方式、存储层级、编辑规则和版本回撤逻辑。

核心目标：

- Codex 能根据原始材料和对话生成可追溯的基础数据；
- 前端能根据基础数据快速生成多节点汇报页面；
- 用户能在 Web 呈现端直接修改文字、布局和组件位置；
- 用户修改不直接覆盖 Codex 生成的基础数据；
- 汇报内容能支持树形叙事和线性播放；
- 每次 Web 端保存都形成可回撤的 revision。

## 2. 整体工作流

```text
原始材料 / 对话 / 文件
  ↓ Codex 提炼
sources 来源记录
  ↓
reports 基础数据树
  ↓
presentation 前端呈现
  ↓ 用户编辑保存
patches 修改补丁与 revision
  ↓
最终展示 = reports + patches
```

核心规则：

- Codex 负责生成基础数据；
- 用户负责在 Web 端做直观微调；
- `reports` 不直接被前端编辑覆盖；
- `patches` 记录用户修改；
- 需要时再执行“固化”，将 `patches` 合并回 `reports`。

## 3. 存储层级

建议项目数据层采用以下结构：

```text
data/
├── sources/
├── reports/
├── patches/
└── schemas/
```

### 3.1 sources

`sources` 用于记录原始材料、对话、文件、实验记录、图片来源等信息，避免 Codex 在总结时产生不可追溯内容。

每个关键内容节点应尽量绑定来源。

### 3.2 reports

`reports` 保存 Codex 生成的基础汇报数据树，包括：

- 汇报元信息；
- 叙事树；
- 节点状态；
- 页面结构；
- 页面组件；
- SVG 资源引用；
- 默认导航关系。

`reports` 是基础数据，不应被 Web 端普通编辑直接覆盖。

### 3.3 patches

`patches` 保存用户在 Web 端点击保存后产生的修改，包括：

- 文字修改；
- 组件位置调整；
- 组件尺寸调整；
- 组件复制、剪切、粘贴；
- 跨节点组件移动；
- 节点展示状态调整；
- SVG 细节调整记录。

每次点击保存生成一个 revision。

### 3.4 schemas

`schemas` 保存数据结构约定。第一版可以使用 Markdown 说明，后续可演进为 YAML Schema、JSON Schema 或 TypeScript 类型定义。

## 4. 核心数据模型

第一版核心模型可以理解为：

```text
Report
├── sources
├── story_tree
├── pages
├── svg_assets
├── navigation
└── patches
```

关键关系：

```text
一个 story_tree 节点 = 一个呈现页 = 一个固定画布状态
```

也就是：

```text
node_id → page → components → text/svg block
```

## 5. 节点与页面

节点负责叙事结构，页面负责呈现结构。

### 5.1 叙事节点

```yaml
node:
  id: progress-summary
  title: 本周进展概览
  parent: root
  children:
    - experiment-result
    - current-problem
  sources:
    - source_id: exp-log-001
  status:
    content: draft
    source: sourced
    display: visible
```

节点应表达：

- 当前讲什么；
- 父节点是什么；
- 子节点有哪些；
- 内容来源是什么；
- 内容和展示状态是什么。

### 5.2 呈现页面

```yaml
page:
  node_id: progress-summary
  canvas:
    width: 1920
    height: 1080
  components:
    - id: text-001
      type: text
      x: 120
      y: 160
      width: 640
      height: 240

    - id: svg-001
      type: svg
      x: 860
      y: 160
      width: 760
      height: 520
      svg_asset_id: chart-001
```

页面应表达：

- 当前节点对应的画布；
- 画布尺寸；
- 页面上的组件列表；
- 每个组件的位置、尺寸、类型和内容引用。

## 6. 来源可信规则

每个关键节点应带来源状态：

```text
sourced：有明确来源
inferred：Codex 基于来源推断
manual：用户手动补充
needs_source：需要补充来源
```

该规则用于区分内容可信程度，避免 Codex 生成的内容在后续展示中失去来源边界。

## 7. 前端呈现模块

前端呈现侧由以下基础模块组成：

```text
CanvasStage：固定呈现板，类似 PPT 幕布
TextBlock：文字组件，可快速编辑
SvgBlock：图片/图示组件，页面中作为整体拖动缩放
SvgEditor：SVG 内部细节编辑，作为子功能
TreeNavigator：树形播放导航
PatchManager：保存用户修改
```

第一版重点应放在：

- 固定画布；
- 文字组件编辑；
- SVG 组件整体拖动和缩放；
- 树形节点切换；
- 用户修改保存到 `patches`。

## 8. 播放模式与编辑模式

播放和编辑不是两个环境，而是同一页面的两个模式。

### 8.1 播放模式

播放模式用于正式展示：

- 只展示内容；
- 响应树形导航；
- 不显示编辑框、拖拽手柄和组件选中状态；
- 不允许修改组件。

### 8.2 编辑模式

编辑模式用于前端直改：

- 支持拖动组件；
- 支持缩放组件；
- 支持修改文字；
- 支持复制、剪切、粘贴组件；
- 支持节点内和跨节点组件移动；
- 支持会话内撤销和重做；
- 点击保存后写入 `patches`，并返回播放模式。

## 9. 组件操作规则

节点内应支持：

- 单选组件；
- 多选组件；
- 拖动组件；
- 缩放组件；
- 修改文字；
- 删除组件；
- 复制、剪切、粘贴组件。

跨节点应支持：

```text
在 A 节点选择组件
Ctrl/Cmd + C 或 X
跳转到 D 节点
Ctrl/Cmd + V
组件进入 D 节点
```

跨节点移动不直接改 `reports`，而是记录 patch：

```yaml
op: move_components
component_ids:
  - text-001
from_node_id: node-a
to_node_id: node-d
```

复制操作应生成新的组件 id，避免多个页面共享同一个可编辑组件实例。

## 10. 版本与回撤

版本管理分为三层：

```text
编辑会话层：undo / redo，未保存前有效
patch revision 层：每次点击保存生成一个 revision
Git 层：项目级版本管理，由 Codex 操作
```

规则：

- 点击保存 = 生成 patch revision；
- patch revision 不等于 Git commit；
- 前端不直接执行 Git 操作；
- Git commit 由 Codex 根据协作规则处理；
- 每次点击保存生成一个 revision；
- 用户可以回撤到某个保存点。

推荐流程：

```text
进入编辑模式
  ↓
进行拖动、文本修改、组件迁移
  ↓
可用 Ctrl/Cmd + Z 撤销未保存操作
  ↓
点击保存
  ↓
生成 patch revision
  ↓
返回播放模式
  ↓
如需要，由 Codex 检查 Git 状态并询问是否 commit
```

## 11. patch revision 示例

```yaml
patches:
  report_id: report-001
  current_revision: rev-002
  revisions:
    - id: rev-001
      parent_revision: null
      created_at: 2026-05-17T10:00:00+08:00
      summary: 调整进展概览页布局
      changes:
        - op: move_component
        - op: update_text

    - id: rev-002
      parent_revision: rev-001
      created_at: 2026-05-17T10:08:00+08:00
      summary: 将实验结果图移动到问题分析节点
      changes:
        - op: move_components
```

## 12. 导航规则

内部存储是树，展示时从树生成线性汇报体验。

默认键盘逻辑：

```text
左：父节点
右：子节点或下一叙事段
上：上一个兄弟节点
下：下一个兄弟节点
鼠标点击：跳转任意节点
```

复杂跳转允许显式覆盖：

```yaml
navigation:
  overrides:
    - node_id: current-leaf
      right: next-module-start
```

播放模式和编辑模式的键盘语义不同：

- 播放模式下，方向键用于树形导航；
- 编辑模式下，选中组件时方向键用于移动组件；
- 编辑模式下未选中组件时，可保留树形导航或禁用方向键导航。

## 13. 已确定结论

- `reports` 是基础数据树；
- `patches` 是用户修改差异层；
- 最终展示 = `reports + patches`；
- 一个树节点默认对应一个呈现页；
- 编辑模式点击保存生成 revision；
- 播放模式和编辑模式在同一页面切换；
- 跨节点组件移动通过复制、剪切、粘贴实现；
- SVG 是图片内容组件的基础表达方式；
- Git commit 不等于前端保存；
- 前端不直接执行 Git 操作。

## 14. 本地保存体系规范

本节用于明确不同汇报项目之间的区分规则，以及同一个汇报项目内不同版本的保存规则。

### 14.1 report_id

每一次独立汇报使用一个 `report_id` 作为主键。

推荐命名规则：

```text
YYYY-MM-DD-短主题
```

示例：

```text
2026-05-17-weekly-progress
2026-05-24-literature-report
2026-06-02-thesis-update
```

同一个 `report_id` 应贯穿该汇报的来源记录、基础数据、用户补丁和资源文件。

### 14.2 本地文件组织

一个汇报项目对应的本地文件建议按以下方式组织：

```text
data/
├── sources/
│   └── 2026-05-17-weekly-progress.sources.yaml
├── reports/
│   └── 2026-05-17-weekly-progress.report.yaml
├── patches/
│   └── 2026-05-17-weekly-progress.patch.yaml
└── schemas/

assets/
└── svg/
    └── 2026-05-17-weekly-progress/
        ├── chart-001.svg
        └── flow-001.svg
```

其中：

- `sources/*.sources.yaml` 保存来源记录；
- `reports/*.report.yaml` 保存 Codex 生成的基础数据树；
- `patches/*.patch.yaml` 保存用户在 Web 端点击保存产生的 revision；
- `assets/svg/{report_id}/` 保存该汇报项目引用的 SVG 资源。

### 14.3 基础数据保存规则

`reports/*.report.yaml` 是当前汇报项目的基础数据文件。

它应保存：

- 汇报元信息；
- 叙事树；
- 节点状态；
- 页面结构；
- 组件列表；
- 资源引用；
- 默认导航关系。

规则：

- Web 端普通编辑不直接覆盖 `report.yaml`；
- `report.yaml` 作为基础版本保留；
- 需要固化时，再由 Codex 或专门流程将 `patches` 合并回 `reports`。

### 14.4 patch 保存规则

`patches/*.patch.yaml` 保存用户每次点击保存产生的 revision。

每次点击保存时：

```text
生成一个 revision_id
记录 parent_revision
追加到 revisions
更新 current_revision
```

推荐结构：

```yaml
report_id: 2026-05-17-weekly-progress
base_report: data/reports/2026-05-17-weekly-progress.report.yaml
current_revision: rev-003

revisions:
  - id: rev-001
    parent_revision: null
    created_at: 2026-05-17T10:00:00+08:00
    summary: 调整首页标题和布局
    changes:
      - op: update_text
        node_id: root
        component_id: text-001
        field: content
        value: 本周进展汇报

  - id: rev-002
    parent_revision: rev-001
    created_at: 2026-05-17T10:20:00+08:00
    summary: 将实验结果图移动到问题分析节点
    changes:
      - op: move_components
        component_ids:
          - svg-001
        from_node_id: progress-summary
        to_node_id: current-problem

  - id: rev-003
    parent_revision: rev-002
    created_at: 2026-05-17T10:40:00+08:00
    summary: 修改下一步计划表述
    changes:
      - op: update_text
        node_id: next-plan
        component_id: text-004
        field: content
        value: 下一阶段优先完成实验复核与结果整理
```

### 14.5 当前展示计算规则

前端展示一个汇报项目时，应按以下顺序读取：

```text
读取 data/reports/{report_id}.report.yaml
读取 data/patches/{report_id}.patch.yaml
从 current_revision 沿 parent_revision 回溯 revision 链
按从旧到新的顺序应用 revision 链上的 changes
生成最终展示状态
```

规则：

```text
最终展示 = reports + patches[ancestor_chain(current_revision)]
```

如果 patch 文件不存在，则只使用基础 `report.yaml` 展示。

### 14.6 回撤规则

回撤不删除历史 revision，只修改 `current_revision`。

示例：

```yaml
current_revision: rev-002
```

表示当前展示只应用：

```text
rev-001
rev-002
```

`rev-003` 仍保留在历史记录中，用户后续可以重新切回。

如果用户回撤到 `rev-002` 后再次保存，应生成一个新的 revision，并将新 revision 的 `parent_revision` 设置为 `rev-002`。旧的 `rev-003` 不删除，但不会出现在新 revision 的展示链上。

### 14.7 资源保存规则

SVG 等资源默认归属于 `report_id`：

```text
assets/svg/{report_id}/
```

基础资源示例：

```text
assets/svg/2026-05-17-weekly-progress/chart-001.svg
```

如果用户修改 SVG，不直接覆盖旧文件，而是生成新的资源文件：

```text
assets/svg/2026-05-17-weekly-progress/chart-001.rev-002.svg
```

patch 中记录资源引用切换：

```yaml
op: update_svg_asset
node_id: experiment-result
component_id: svg-001
old_svg_asset_id: chart-001
new_svg_asset_id: chart-001.rev-002
```

这样可以保证资源修改也能随 revision 回撤。

### 14.8 固化规则

固化是可选动作，用于将当前展示状态合并回基础数据：

```text
reports + patches → 新的 report.yaml
```

Demo 阶段先不实现固化，只采用以下规则：

- `reports` 保持不动；
- `patches` 累积 revision；
- `current_revision` 控制当前展示版本；
- Git commit 仍由 Codex 根据协作规则处理。

## 15. Demo 保存实现约定

浏览器页面本身不应被假定为可以稳定直接写入本地 YAML 文件。Demo 阶段采用本地开发服务提供保存能力，由前端调用 API，服务端负责读写 `data/` 和 `assets/`。

### 15.1 读取流程

Demo 前端打开汇报时：

```text
请求 report_id
读取基础 report
读取 patch 文件
计算 current_revision 对应的最终展示状态
将 current_revision 作为编辑会话的 base_revision
```

### 15.2 保存流程

用户进入编辑模式后，修改先保存在前端内存中，并支持会话内 undo / redo。

点击保存时：

```text
前端提交 report_id、base_revision、summary、changes
服务端重新读取 patch 文件
服务端检查当前 current_revision 是否等于 base_revision
校验通过后生成新 revision_id
新 revision 的 parent_revision = base_revision
追加 revision
更新 current_revision
原子写回 patch 文件
返回播放模式
```

如果服务端发现当前 `current_revision` 已经不同于前端提交的 `base_revision`，说明存在并行编辑冲突，应拒绝保存并提示用户刷新或重新合并修改。

### 15.3 建议 API

Demo 可采用以下最小 API：

```text
GET  /api/reports/{report_id}
POST /api/reports/{report_id}/revisions
POST /api/reports/{report_id}/current-revision
```

其中：

- `GET` 返回基础数据、patch 信息和合并后的当前展示状态；
- `POST /revisions` 用于点击保存并生成新 revision；
- `POST /current-revision` 用于回撤或切换保存点。

### 15.4 原子写入规则

patch 文件写入应采用临时文件再重命名的方式，避免中途失败导致文件损坏。

当一次保存同时包含 SVG 资源修改时，应按以下顺序执行：

```text
写入新 SVG 临时文件
校验新 SVG 文件可读取
重命名为正式 SVG 文件
生成并写入 patch revision 临时文件
重命名为正式 patch 文件
```

如果 SVG 写入失败，不应写入 patch revision。若 patch 写入失败，应保留旧 `current_revision`，并将新 SVG 视为未引用资源，后续可由清理流程处理。

## 16. Patch 操作规范

Demo 阶段先固定一组最小 patch 操作，避免前端保存和读取规则分散。

### 16.1 通用字段

每个 change 至少应包含：

```yaml
op:
node_id:
```

涉及组件时应包含：

```yaml
component_id:
```

涉及多个组件时使用：

```yaml
component_ids:
```

### 16.2 update_text

用于修改文字组件内容。

```yaml
op: update_text
node_id: next-plan
component_id: text-004
field: content
value: 下一阶段优先完成实验复核与结果整理
source_status: manual
```

用户在 Web 端直接改写文字时，默认将相关内容标记为 `manual`。如果该内容需要补来源，可标记为 `needs_source`。

### 16.3 move_component

用于移动单个组件。

```yaml
op: move_component
node_id: progress-summary
component_id: text-001
x: 120
y: 180
```

### 16.4 resize_component

用于调整组件尺寸。

```yaml
op: resize_component
node_id: progress-summary
component_id: svg-001
width: 760
height: 520
```

### 16.5 move_components

用于跨节点移动多个组件。

```yaml
op: move_components
component_ids:
  - text-001
  - svg-001
from_node_id: progress-summary
to_node_id: current-problem
target_origin:
  x: 240
  y: 180
```

跨节点移动应保留组件之间的相对布局。

### 16.6 copy_components

用于复制组件到另一个节点。

```yaml
op: copy_components
source_component_ids:
  - text-001
from_node_id: progress-summary
to_node_id: current-problem
new_components:
  - id: text-009
    type: text
    x: 240
    y: 180
```

复制操作必须生成新的组件 id，避免不同页面共享同一个可编辑组件实例。

### 16.7 delete_component

用于删除组件。

```yaml
op: delete_component
node_id: progress-summary
component_id: text-001
```

删除操作不删除历史 revision 中的记录。回撤到删除前的 revision 时，该组件仍应恢复显示。

### 16.8 update_node_status

用于调整节点展示状态。

```yaml
op: update_node_status
node_id: experiment-detail
field: display
value: backup
```

### 16.9 update_svg_asset

用于切换 SVG 资源引用。

```yaml
op: update_svg_asset
node_id: experiment-result
component_id: svg-001
old_svg_asset_id: chart-001
new_svg_asset_id: chart-001.rev-002
```

该操作必须与资源保存规则配合使用，确保 `new_svg_asset_id` 对应的文件已经存在。

## 17. Demo 导航与冲突规则

### 17.1 导航优先级

Demo 阶段采用以下导航优先级：

```text
显式 overrides 优先
其次使用树结构默认导航
最后使用 linear_route 兜底
```

### 17.2 默认方向键规则

默认规则：

- 左键：跳到父节点；没有父节点时保持当前节点；
- 上键：跳到上一个兄弟节点；没有上一个兄弟节点时保持当前节点；
- 下键：跳到下一个兄弟节点；没有下一个兄弟节点时保持当前节点；
- 右键：若当前节点有子节点，跳到第一个子节点；若没有子节点，跳到 `linear_route` 中的下一个节点；若没有下一个节点，保持当前节点。

`linear_route` 可以显式写入数据文档；如果未提供，则由树的先序遍历生成。

### 17.3 鼠标跳转

播放模式下，用户可通过树形导航视图点击任意节点跳转。鼠标跳转只改变当前节点，不修改 `current_revision`。

### 17.4 编辑模式键盘语义

编辑模式下：

- 选中组件时，方向键用于微调组件位置；
- 未选中组件时，方向键可继续用于节点导航；
- 复制、剪切、粘贴组件只在编辑模式下生效。

### 17.5 并行编辑冲突

进入编辑模式时，前端应记录当时的 `current_revision`，作为本次编辑会话的 `base_revision`。

保存时，服务端必须检查：

```text
patch 文件中的 current_revision == 前端提交的 base_revision
```

如果不相等，说明另一个窗口或进程已经保存过新 revision。此时必须拒绝保存，避免静默覆盖。

Demo 阶段不做自动合并。用户需要刷新当前汇报，基于最新 revision 重新编辑。
