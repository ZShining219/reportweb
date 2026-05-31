# Module Feedback And Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved module discussion into a first implementable batch: UI foundation, edit-intent feedback, and right-side status panels, while leaving the tuned node navigation visuals untouched.

**Architecture:** Keep `public/app.js` as the app orchestration layer and move user-facing UI responsibilities into focused modules. Shared visual rules live in `public/ui/`; edit feedback lives in a dedicated module that reports hover, text-edit, move, resize, selection, and dirty intent; inspector and revision rendering move into panel modules with callback-only communication.

**Tech Stack:** Existing Node HTTP server, browser ES modules, plain DOM APIs, CSS, Node built-in test runner.

---

## Scope And Guardrails

- Do not change `public/nodeNavigator.js` or `public/nodeContext.js` visual behavior in this batch. Navigation can be wired through stable callbacks only if a later integration task needs it.
- Do not modify report content in `data/reports/` unless a test fixture specifically requires it. Preserve user/local edits already present.
- Do not introduce a build system, framework, or major dependency.
- Keep Demo behavior working at `http://127.0.0.1:5173/`.
- Every user-facing module must keep communication through explicit input objects and callbacks.
- Styling must use shared tokens or module-local class names that reference shared tokens; avoid hard-coded one-off colors and shadows in module CSS.

## Parallel Work Batches

These tasks are designed so subagents can work mostly independently:

- **Task 1: UI Foundation** owns `public/ui/*`, stylesheet import structure, and shared primitive classes.
- **Task 2: Edit Feedback** owns `public/modules/editFeedback.js`, `public/modules/editFeedback.css`, and edit feedback tests/demo.
- **Task 3: Inspector And Revision Panels** owns `public/modules/inspectorPanel.js`, `public/modules/revisionPanel.js`, and panel tests/demo.
- **Task 4: App Integration** runs after Tasks 1-3 and is the only task that should modify `public/app.js` and `public/index.html` for wiring.

## File Structure

- Create: `public/ui/tokens.css`
  Shared color, spacing, typography, border, shadow, motion, and z-index variables.
- Create: `public/ui/primitives.css`
  Reusable button, panel, list item, status, tooltip, and meta-grid classes.
- Create: `public/ui/layout.css`
  Workbench, sidebar, inspector, toolbar, stage shell, and status line layout classes.
- Create: `public/ui/ui.js`
  Small DOM helpers for buttons, status tags, and definition rows.
- Modify: `public/styles.css`
  Import shared UI CSS and keep current business-specific styles compatible.
- Create: `public/modules/editFeedback.js`
  Pure edit intent model plus DOM rendering helpers for hover labels, intent hints, drag/resize readouts, and dirty feedback.
- Create: `public/modules/editFeedback.css`
  Feedback-specific classes using `public/ui/tokens.css` variables.
- Create: `tests/edit-feedback.test.js`
  Node tests for the pure edit feedback model.
- Create: `public/demos/edit-feedback-demo.html`
  Local mock page showing hover, text-edit, move, resize, selected, and dirty states.
- Create: `public/modules/inspectorPanel.js`
  Render selected component and current node status into the right panel.
- Create: `public/modules/revisionPanel.js`
  Render base/current revision list and emit `onSelectRevision`.
- Create: `tests/inspector-panel.test.js`
  Pure model tests for panel view data.
- Create: `tests/revision-panel.test.js`
  Pure model tests for revision list view data.
- Create: `public/demos/inspector-demo.html`
  Local mock page for right panel states.
- Modify after Tasks 1-3: `public/app.js`
  Wire `editFeedback`, `inspectorPanel`, and `revisionPanel` into current state.
- Modify after Tasks 1-3: `public/index.html`
  Keep current DOM ids stable; only add containers if needed.

---

## Task 1: UI Foundation

**Files:**
- Create: `public/ui/tokens.css`
- Create: `public/ui/primitives.css`
- Create: `public/ui/layout.css`
- Create: `public/ui/ui.js`
- Modify: `public/styles.css`

- [ ] **Step 1: Write the failing structure check**

Create `tests/ui-foundation.test.js`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('styles import shared UI foundation files', async () => {
  const styles = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /@import\s+["']\.\/ui\/tokens\.css["'];/);
  assert.match(styles, /@import\s+["']\.\/ui\/primitives\.css["'];/);
  assert.match(styles, /@import\s+["']\.\/ui\/layout\.css["'];/);
});

test('UI tokens define geometry-safe primitives', async () => {
  const tokens = await readFile(new URL('../public/ui/tokens.css', import.meta.url), 'utf8');
  assert.match(tokens, /--ui-color-ink:/);
  assert.match(tokens, /--ui-space-3:/);
  assert.match(tokens, /--ui-radius-md:/);
  assert.match(tokens, /--ui-feedback-move:/);
  assert.match(tokens, /--ui-feedback-edit:/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui-foundation.test.js`

Expected: FAIL because `public/ui/tokens.css` and imports do not exist yet.

- [ ] **Step 3: Add shared UI CSS files**

Create `public/ui/tokens.css` with at least:

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
  --ui-feedback-move: #1f6f78;
  --ui-feedback-edit: #8f405d;
  --ui-feedback-resize: #d9a331;
  --ui-feedback-select: #c65f3d;
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
  --ui-z-feedback: 20;
}
```

Create primitive/layout CSS using those tokens. Keep class names prefixed with `ui-`, for example `ui-button`, `ui-panel`, `ui-status`, `ui-list-item`, `ui-app-shell`, `ui-stage`, and `ui-inspector`.

- [ ] **Step 4: Import UI files from `public/styles.css`**

At the top of `public/styles.css`, add:

```css
@import "./ui/tokens.css";
@import "./ui/primitives.css";
@import "./ui/layout.css";
```

Keep existing selectors working. If replacing variables, map old variables to new tokens rather than deleting large style blocks:

```css
:root {
  --ink: var(--ui-color-ink);
  --muted: var(--ui-color-muted);
  --paper: var(--ui-color-paper);
  --paper-2: var(--ui-color-paper-2);
  --line: var(--ui-color-line);
  --accent: var(--ui-color-accent);
  --teal: var(--ui-color-teal);
  --gold: var(--ui-color-gold);
  --rose: var(--ui-color-rose);
  --shadow: var(--ui-shadow-stage);
}
```

- [ ] **Step 5: Add `public/ui/ui.js` helpers**

Export small helpers only:

```js
export function createStatusTag(label, variant = 'neutral') {
  const node = document.createElement('span');
  node.className = `ui-status ui-status--${variant}`;
  node.textContent = label;
  return node;
}

export function createDefinitionRow(term, value) {
  const row = document.createElement('div');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = term;
  dd.textContent = value || '-';
  row.append(dt, dd);
  return row;
}
```

- [ ] **Step 6: Run tests**

Run: `node --test tests/ui-foundation.test.js`

Expected: PASS.

- [ ] **Step 7: Run full tests**

Run: `npm test`

Expected: all tests pass.

---

## Task 2: Edit Interaction Feedback

**Files:**
- Create: `public/modules/editFeedback.js`
- Create: `public/modules/editFeedback.css`
- Create: `tests/edit-feedback.test.js`
- Create: `public/demos/edit-feedback-demo.html`

- [ ] **Step 1: Write the failing edit feedback model test**

Create `tests/edit-feedback.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createEditFeedbackModel } from '../public/modules/editFeedback.js';

test('edit feedback model distinguishes hover, text edit, move, resize, and dirty states', () => {
  assert.deepEqual(
    createEditFeedbackModel({
      mode: 'edit',
      intent: 'text',
      component: { id: 'text-001', type: 'text', x: 120, y: 160, width: 420, height: 120 },
      dirty: true
    }),
    {
      active: true,
      componentId: 'text-001',
      intent: 'text',
      label: '编辑文本',
      className: 'edit-feedback edit-feedback--text edit-feedback--dirty',
      detail: '修改后将保存为 patch revision'
    }
  );

  assert.deepEqual(
    createEditFeedbackModel({
      mode: 'edit',
      intent: 'move',
      component: { id: 'svg-001', type: 'svg', x: 260, y: 220, width: 300, height: 180 },
      delta: { x: 32, y: -8 }
    }),
    {
      active: true,
      componentId: 'svg-001',
      intent: 'move',
      label: '移动组件',
      className: 'edit-feedback edit-feedback--move',
      detail: 'x: 292, y: 212, 位移 +32, -8'
    }
  );

  assert.equal(createEditFeedbackModel({ mode: 'play', intent: 'move', component: { id: 'x' } }).active, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/edit-feedback.test.js`

Expected: FAIL because `editFeedback.js` does not exist.

- [ ] **Step 3: Implement pure feedback model**

Create `public/modules/editFeedback.js` with:

```js
export function createEditFeedbackModel({ mode, intent, component, delta, size, dirty = false } = {}) {
  if (mode !== 'edit' || !component || !intent) {
    return { active: false };
  }

  const className = ['edit-feedback', `edit-feedback--${intent}`];
  if (dirty) className.push('edit-feedback--dirty');

  return {
    active: true,
    componentId: component.id,
    intent,
    label: intentLabel(intent),
    className: className.join(' '),
    detail: feedbackDetail({ intent, component, delta, size, dirty })
  };
}

export function renderEditFeedback(container, model) {
  container.querySelector('.edit-feedback')?.remove();
  if (!model?.active) return;

  const node = document.createElement('div');
  node.className = model.className;
  const label = document.createElement('strong');
  const detail = document.createElement('span');
  label.textContent = model.label;
  detail.textContent = model.detail;
  node.append(label, detail);
  container.append(node);
}

function intentLabel(intent) {
  return {
    hover: '可选择组件',
    text: '编辑文本',
    move: '移动组件',
    resize: '调整尺寸',
    select: '选择组件'
  }[intent] || '编辑组件';
}

function feedbackDetail({ intent, component, delta, size, dirty }) {
  if (intent === 'text') {
    return dirty ? '修改后将保存为 patch revision' : '点击后直接修改文字内容';
  }
  if (intent === 'move') {
    const dx = delta?.x || 0;
    const dy = delta?.y || 0;
    return `x: ${component.x + dx}, y: ${component.y + dy}, 位移 ${signed(dx)}, ${signed(dy)}`;
  }
  if (intent === 'resize') {
    const width = size?.width || component.width;
    const height = size?.height || component.height;
    return `尺寸 ${width} x ${height}`;
  }
  if (intent === 'select') {
    return `${component.type || 'component'} #${component.id}`;
  }
  return '松手后应用当前操作结果';
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}
```

- [ ] **Step 4: Add feedback CSS**

Create `public/modules/editFeedback.css`:

```css
.edit-feedback {
  position: absolute;
  z-index: var(--ui-z-feedback);
  left: var(--ui-space-3);
  top: var(--ui-space-3);
  display: inline-grid;
  gap: var(--ui-space-1);
  max-width: 260px;
  padding: var(--ui-space-2) var(--ui-space-3);
  border: var(--ui-border-subtle);
  background: var(--ui-color-paper-2);
  color: var(--ui-color-ink);
  font-size: var(--ui-text-xs);
  line-height: 1.35;
  pointer-events: none;
  box-shadow: var(--ui-shadow-panel);
}

.edit-feedback strong {
  font-size: var(--ui-text-xs);
}

.edit-feedback--move {
  border-color: var(--ui-feedback-move);
}

.edit-feedback--text {
  border-color: var(--ui-feedback-edit);
}

.edit-feedback--resize {
  border-color: var(--ui-feedback-resize);
}

.edit-feedback--dirty {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ui-feedback-select), transparent 72%);
}
```

- [ ] **Step 5: Add demo page**

Create `public/demos/edit-feedback-demo.html` with a static mock stage and controls that call `renderEditFeedback()` for `hover`, `text`, `move`, and `resize`. Link `/styles.css` and `/modules/editFeedback.css`; import `/modules/editFeedback.js`.

- [ ] **Step 6: Run targeted and full tests**

Run:

```shell
node --test tests/edit-feedback.test.js
npm test
```

Expected: all tests pass.

---

## Task 3: Inspector And Revision Panels

**Files:**
- Create: `public/modules/inspectorPanel.js`
- Create: `public/modules/revisionPanel.js`
- Create: `tests/inspector-panel.test.js`
- Create: `tests/revision-panel.test.js`
- Create: `public/demos/inspector-demo.html`

- [ ] **Step 1: Write failing inspector model test**

Create `tests/inspector-panel.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createInspectorViewModel } from '../public/modules/inspectorPanel.js';

test('inspector view model describes node and selected components', () => {
  const model = createInspectorViewModel({
    reportId: 'demo-report',
    reportTitle: 'Demo 汇报',
    currentRevision: 'rev-002',
    currentNode: { id: 'root', title: '汇报总览', status: { source: 'sourced', display: 'visible' } },
    selectedComponents: [
      { id: 'text-001', type: 'text', x: 120, y: 160, width: 420, height: 120, source_status: 'manual' }
    ],
    dirty: true
  });

  assert.equal(model.reportTitle, 'Demo 汇报');
  assert.equal(model.currentNodeTitle, '汇报总览');
  assert.equal(model.selection.label, 'text-001');
  assert.equal(model.selection.meta.position, '120, 160');
  assert.equal(model.selection.meta.size, '420 x 120');
  assert.equal(model.dirtyLabel, '待保存');
});
```

- [ ] **Step 2: Write failing revision model test**

Create `tests/revision-panel.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createRevisionViewModel } from '../public/modules/revisionPanel.js';

test('revision view model includes base and highlights current revision', () => {
  const model = createRevisionViewModel({
    currentRevision: 'rev-002',
    revisions: [
      { id: 'rev-001', parent_revision: null, summary: '第一次保存', created_at: '2026-05-30T10:00:00+08:00' },
      { id: 'rev-002', parent_revision: 'rev-001', summary: '调整布局', created_at: '2026-05-30T10:05:00+08:00' }
    ]
  });

  assert.deepEqual(model.items.map((item) => item.id), ['base', 'rev-001', 'rev-002']);
  assert.equal(model.items[0].active, false);
  assert.equal(model.items[2].active, true);
  assert.equal(model.items[2].label, 'rev-002');
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```shell
node --test tests/inspector-panel.test.js tests/revision-panel.test.js
```

Expected: FAIL because panel modules do not exist.

- [ ] **Step 4: Implement inspector panel module**

Create `public/modules/inspectorPanel.js` with `createInspectorViewModel(input)` and `renderInspectorPanel(container, model, callbacks)`. The renderer should:

- show report title, report id, current revision, node title, source/display status;
- show `未选择` when there is no selected component;
- show one selected component's type, id, x/y, width/height, and source status;
- show `已选择 N 个组件` for multi-select;
- show dirty label `待保存` when `dirty` is true.

- [ ] **Step 5: Implement revision panel module**

Create `public/modules/revisionPanel.js` with `createRevisionViewModel(input)` and `renderRevisionPanel(container, model, callbacks)`. The renderer should:

- always include `base`;
- highlight current revision;
- call `callbacks.onSelectRevision(revisionId)` with `null` for base;
- show revision summary if present.

- [ ] **Step 6: Add inspector demo**

Create `public/demos/inspector-demo.html` with mock node/component/revision states and visible sections for:

- no selection;
- single component selection;
- multi-selection;
- current revision timeline.

- [ ] **Step 7: Run targeted and full tests**

Run:

```shell
node --test tests/inspector-panel.test.js tests/revision-panel.test.js
npm test
```

Expected: all tests pass.

---

## Task 4: App Integration

**Files:**
- Modify: `public/app.js`
- Modify: `public/index.html` only if new containers are required
- Modify: `public/styles.css` only to import module CSS files

**Depends on:** Tasks 1-3 complete and passing.

- [ ] **Step 1: Add CSS imports**

At the top of `public/styles.css`, after UI imports, add:

```css
@import "./modules/editFeedback.css";
```

Do not import or modify navigation CSS in this task.

- [ ] **Step 2: Wire panel modules**

In `public/app.js`, import:

```js
import { createInspectorViewModel, renderInspectorPanel } from './modules/inspectorPanel.js';
import { createRevisionViewModel, renderRevisionPanel } from './modules/revisionPanel.js';
```

Replace the current `renderInspector(state)` body with view-model creation and renderer calls. Keep existing element ids stable: `reportTitle`, `reportIdText`, `revisionText`, `selectionInfo`, and `revisionList`.

- [ ] **Step 3: Wire edit feedback model conservatively**

In `public/app.js`, import:

```js
import { createEditFeedbackModel, renderEditFeedback } from './modules/editFeedback.js';
```

Add local state:

```js
let editIntent = null;
```

Use the existing drag/resize/text callbacks to render:

- `intent: 'text'` when text input occurs;
- `intent: 'move'` while dragging;
- `intent: 'resize'` while resizing;
- `intent: 'select'` after selection changes.

Do not rewrite drag/resize mechanics in this batch; only add feedback that explains the result.

- [ ] **Step 4: Preserve discard/save behavior**

Verify that:

- entering edit mode clones `payload.state`;
- discard clears draft state and feedback;
- save computes `diffStates(baseState, draftState)` and clears feedback after success.

- [ ] **Step 5: Run full automated tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Browser verify main app**

With the local server already running or by running `npm start`, open `http://127.0.0.1:5173/` and verify:

- page loads without console errors;
- play mode shows no edit feedback;
- clicking `编辑` enters edit mode;
- hovering/selecting a component shows an intent label;
- dragging shows position/delta feedback;
- resizing shows size feedback;
- text input shows text-edit dirty feedback;
- discard removes feedback and restores play mode;
- revision list still switches current revision.

- [ ] **Step 7: Final git status**

Run: `git status --short --branch`

Report current branch, changed files, and whether commit was performed.

---

## Completion Criteria

- UI foundation files exist and are imported by `public/styles.css`.
- Edit feedback provides explicit visual intent for hover/select/text/move/resize/dirty states.
- Inspector and revision panels are rendered by modules, not inline logic in `app.js`.
- Navigation visual files are not changed by this batch.
- `npm test` passes.
- Browser verification confirms no console errors and the feedback tells the user what operation result to expect.
