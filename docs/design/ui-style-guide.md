# 全局 UI 风格与 Token 规范

本文用于约定 ReportWebShow 的全局 UI 风格、CSS token、基础 class 和后续扩展规则。所有前端呈现模块都应调用本规范，不在局部组件中直接写散落的视觉值。

## 1. 风格定调

ReportWebShow 的 UI 风格定位为：

```text
安静、清晰、偏设计工具感的汇报工作台。
```

关键词：

- 轻量；
- 干净；
- 可读；
- 数据感；
- 纸面质感；
- 内容优先；
- 工具区克制；
- 汇报画布突出。

不采用：

- 花哨营销页风格；
- 强烈单色科技风；
- PPT 模板站风格；
- 大面积装饰性渐变；
- 与汇报内容无关的视觉噪声。

当前基调：

- 暖纸色背景；
- 深墨色文字；
- 克制边框；
- 轻网格；
- 少量砖红、青绿、金色作为状态和重点色；
- 工具区安静，画布内容优先。

## 2. Token 先行原则

所有可复用视觉值必须先进入 token 或全局 class，再被具体模块调用。

如果后续有新 UI 需求，而 `public/ui/` 中没有对应 token 或 class，应按以下顺序处理：

1. 判断该视觉值是否具有复用价值。
2. 如果有复用价值，先新增或扩展 `public/ui/tokens.css`、`public/ui/primitives.css` 或 `public/ui/layout.css`。
3. 在具体模块中调用新增 token 或 class。
4. 如果只是单个业务模块的数据驱动尺寸或位置，可保留为内联动态样式。
5. 不允许为了赶进度在模块 CSS 中直接硬编码颜色、阴影、圆角、字号、间距等视觉值。

允许局部动态值：

- 画布组件的 `x`、`y`、`width`、`height`；
- 用户拖拽或缩放产生的组件尺寸；
- SVG 或图表内部由数据驱动的样式；
- 与业务数据绑定的 canvas 背景类型字段。

不允许局部硬编码：

```css
.local-button {
  background: #123456;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
```

推荐：

```html
<button class="ui-button ui-button-primary">保存</button>
```

或：

```js
createButton({ variant: 'primary', label: '保存' });
```

## 3. Token 分层

建议全局 UI 目录：

```text
public/ui/
├── tokens.css
├── primitives.css
├── layout.css
└── ui.js
```

职责：

- `tokens.css`：颜色、字体、字号、间距、阴影、边框、层级、动画时长等基础变量。
- `primitives.css`：按钮、输入框、面板、状态标签、列表项等基础 class。
- `layout.css`：工作区、侧栏、工具栏、画布外壳等布局 class。
- `ui.js`：可选的 DOM helper，如 `createButton`、`createPanel`、`createStatusTag`。

## 4. 基础 Token 建议

初始 token 可从当前 `public/styles.css` 中抽取：

```css
:root {
  --ui-color-ink: #25313a;
  --ui-color-muted: #65717b;
  --ui-color-paper: #f7f1e3;
  --ui-color-paper-2: #fffaf0;
  --ui-color-line: rgba(37, 49, 58, 0.16);
  --ui-color-accent: #c65f3d;
  --ui-color-teal: #1f6f78;
  --ui-color-gold: #d9a331;
  --ui-color-rose: #8f405d;

  --ui-font-body: "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif;
  --ui-font-display: Georgia, "Times New Roman", serif;
  --ui-font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;

  --ui-text-xs: 12px;
  --ui-text-sm: 14px;
  --ui-text-md: 16px;
  --ui-text-lg: 18px;
  --ui-text-xl: 24px;
  --ui-text-2xl: 34px;

  --ui-space-1: 4px;
  --ui-space-2: 8px;
  --ui-space-3: 12px;
  --ui-space-4: 16px;
  --ui-space-5: 20px;
  --ui-space-6: 24px;
  --ui-space-7: 28px;
  --ui-space-8: 32px;

  --ui-radius-none: 0;
  --ui-radius-sm: 4px;
  --ui-radius-md: 8px;

  --ui-border-subtle: 1px solid var(--ui-color-line);
  --ui-shadow-panel: 0 16px 42px rgba(37, 49, 58, 0.08);
  --ui-shadow-stage: 0 26px 80px rgba(37, 49, 58, 0.16);

  --ui-duration-fast: 120ms;
  --ui-duration-normal: 180ms;
  --ui-ease-standard: ease;
}
```

## 5. 基础 Class 建议

`primitives.css` 建议逐步提供：

```text
ui-button
ui-button-primary
ui-button-ghost
ui-panel
ui-toolbar
ui-section
ui-field
ui-label
ui-meta-grid
ui-status
ui-list
ui-list-item
ui-list-item-active
```

`layout.css` 建议逐步提供：

```text
ui-app-shell
ui-sidebar
ui-workbench
ui-inspector
ui-stage-shell
ui-stage
ui-status-line
```

命名规则：

- 全局 UI class 使用 `ui-` 前缀。
- 业务模块 class 可以使用模块名前缀，如 `stage-`、`inspector-`、`revision-`。
- 业务模块 class 只负责结构和状态，不直接定义新的视觉值。

## 6. 模块 CSS 规则

模块 CSS 可以写：

- 布局关系；
- 状态选择器；
- 响应式结构；
- 调用 token 的视觉规则；
- canvas 数据驱动的定位和尺寸。

模块 CSS 不可以写：

- 未进入 token 的颜色；
- 未进入 token 的字体；
- 未进入 token 的阴影；
- 未进入 token 的圆角；
- 未进入 token 的常用间距；
- 与全局按钮、面板、输入框重复的局部样式。

示例：

```css
.inspector-source-row {
  display: grid;
  gap: var(--ui-space-2);
  padding: var(--ui-space-3);
  border: var(--ui-border-subtle);
  background: var(--ui-color-paper-2);
}
```

如果需要一个新的警告状态，应先加 token：

```css
:root {
  --ui-color-warning: #b7791f;
  --ui-color-warning-bg: #fff3cf;
}
```

再在模块中调用：

```css
.revision-branch-warning {
  color: var(--ui-color-warning);
  background: var(--ui-color-warning-bg);
}
```

## 7. UI 变更流程

涉及样式变更时，按以下流程执行：

1. 先确认是否已有 token 或全局 class。
2. 已有则直接调用。
3. 没有且具有复用价值，则扩展 `public/ui/`。
4. 扩展后再修改具体模块。
5. 如果影响整体风格，应同步更新本文档。
6. 修改后检查至少一个对应 demo 页面或主页面。

## 8. 设计验收标准

一个前端模块完成时，应满足：

- 模块可以独立 demo；
- 模块没有散落硬编码视觉值；
- 模块使用 `ui-` token/class；
- 文本不溢出按钮、面板和卡片；
- 播放模式视觉干净；
- 编辑模式操作状态清晰；
- 与现有暖纸色、深墨色、克制边框和轻网格基调一致。
