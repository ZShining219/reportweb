# Project Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight project management view opened from the narrative island, showing Codex-produced report projects and letting the user enter a specific report.

**Architecture:** Keep the current no-framework frontend. Add a focused `projectManager` module for list view model and rendering, extend `narrativeIsland` with a project button callback, and let `app.js` own workspace view state, URL parameters, project loading, and report switching.

**Tech Stack:** Node HTTP server, browser ES modules, plain DOM rendering, CSS tokens in `public/styles.css` / `public/ui`, Node built-in test runner.

---

## File Map

- Create `public/modules/projectManager.js`: project manager view model and DOM renderer.
- Create `tests/project-manager.test.js`: model and renderer tests using a fake DOM matching existing test style.
- Modify `public/modules/narrativeIsland.js`: add project button fields and `onOpenProjectManager` callback.
- Modify `tests/narrative-island.test.js`: verify project button rendering and callback.
- Modify `public/index.html`: add a `#projectManager` container inside the workbench.
- Modify `public/app.js`: replace hard-coded const `reportId` with mutable state; add `workspaceView`, project list loading, URL parsing, report switching, project manager rendering.
- Modify `public/styles.css`: add project manager layout and hide/show rules that match current UI tokens.
- Modify `README.md`: update current progress and front-end operation notes.

## Scope Notes

- Project creation remains outside Web UI because project production is bound to Codex execution.
- No delete, rename, import, search, filter, sort, or backend framework changes.
- The current narrative island drag-position implementation is part of the local baseline and must be preserved.

---

### Task 1: Add Project Manager Module

**Files:**
- Create: `public/modules/projectManager.js`
- Create: `tests/project-manager.test.js`

- [ ] **Step 1: Write failing model tests**

Create `tests/project-manager.test.js` with the model tests first:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createProjectManagerViewModel, renderProjectManager } from '../public/modules/projectManager.js';

const weeklyPayload = {
  reportId: '2026-05-17-weekly-progress',
  state: { report: { title: '周进展汇报' } },
  patch: { current_revision: 'rev-003' }
};

const basePayload = {
  reportId: 'demo-base',
  state: { report: { title: '基础版本演示' } },
  patch: { current_revision: null }
};

test('project manager view model normalizes title, report id, and revision label', () => {
  const model = createProjectManagerViewModel({
    projects: [weeklyPayload, basePayload],
    activeReportId: '2026-05-17-weekly-progress',
    status: 'ready'
  });

  assert.equal(model.status, 'ready');
  assert.equal(model.empty, false);
  assert.deepEqual(model.projects.map((project) => ({
    reportId: project.reportId,
    title: project.title,
    currentRevision: project.currentRevision,
    revisionLabel: project.revisionLabel,
    active: project.active
  })), [
    {
      reportId: '2026-05-17-weekly-progress',
      title: '周进展汇报',
      currentRevision: 'rev-003',
      revisionLabel: 'rev-003',
      active: true
    },
    {
      reportId: 'demo-base',
      title: '基础版本演示',
      currentRevision: null,
      revisionLabel: '基础版本',
      active: false
    }
  ]);
});

test('project manager view model describes loading, error, and empty states', () => {
  assert.equal(createProjectManagerViewModel({ status: 'loading' }).status, 'loading');
  assert.equal(createProjectManagerViewModel({ status: 'error', errorMessage: '加载失败' }).errorMessage, '加载失败');
  assert.equal(createProjectManagerViewModel({ projects: [], status: 'ready' }).empty, true);
});
```

- [ ] **Step 2: Run model tests to verify they fail**

Run:

```bash
npm test -- tests/project-manager.test.js
```

Expected: FAIL with a module-not-found error for `public/modules/projectManager.js`.

- [ ] **Step 3: Implement the view model**

Create `public/modules/projectManager.js`:

```js
export function createProjectManagerViewModel({
  projects = [],
  activeReportId = '',
  status = 'ready',
  errorMessage = ''
} = {}) {
  const normalizedProjects = projects.map((payload) => {
    const reportId = payload.reportId || payload.report?.id || '';
    const currentRevision = payload.patch?.current_revision || null;

    return {
      reportId,
      title: payload.state?.report?.title || payload.report?.title || reportId || '未命名汇报',
      currentRevision,
      revisionLabel: currentRevision || '基础版本',
      active: Boolean(activeReportId && reportId === activeReportId)
    };
  });

  return {
    status,
    errorMessage,
    activeReportId,
    empty: status === 'ready' && normalizedProjects.length === 0,
    projects: normalizedProjects
  };
}
```

- [ ] **Step 4: Run model tests to verify they pass**

Run:

```bash
npm test -- tests/project-manager.test.js
```

Expected: PASS for the two model tests; renderer import is unused at this point.

- [ ] **Step 5: Write failing renderer tests**

Append these tests and fake DOM helpers to `tests/project-manager.test.js`:

```js
test('project manager renderer shows projects and emits selected report id', () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;

  try {
    const container = new FakeElement('div');
    const selected = [];
    const model = createProjectManagerViewModel({
      projects: [weeklyPayload, basePayload],
      activeReportId: 'demo-base',
      status: 'ready'
    });

    renderProjectManager(container, model, {
      onSelectProject: (reportId) => selected.push(reportId)
    });

    const root = container.children[0];
    const buttons = root.findAll((node) => node.tagName === 'button');

    assert.equal(root.classList.contains('project-manager'), true);
    assert.equal(root.textContent.includes('项目管理'), true);
    assert.equal(root.textContent.includes('周进展汇报'), true);
    assert.equal(root.textContent.includes('2026-05-17-weekly-progress'), true);
    assert.equal(root.textContent.includes('基础版本'), true);
    assert.equal(buttons.length, 2);

    buttons[0].dispatchEvent({ type: 'click' });
    assert.deepEqual(selected, ['2026-05-17-weekly-progress']);
  } finally {
    global.document = previousDocument;
  }
});

test('project manager renderer shows loading, empty, and error states', () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;

  try {
    const container = new FakeElement('div');

    renderProjectManager(container, createProjectManagerViewModel({ status: 'loading' }));
    assert.equal(container.textContent.includes('正在载入项目'), true);

    renderProjectManager(container, createProjectManagerViewModel({ status: 'ready', projects: [] }));
    assert.equal(container.textContent.includes('暂无可用项目'), true);

    renderProjectManager(container, createProjectManagerViewModel({ status: 'error', errorMessage: '读取失败' }));
    assert.equal(container.textContent.includes('读取失败'), true);
  } finally {
    global.document = previousDocument;
  }
});

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = {};
    this.children = [];
    this.eventListeners = new Map();
    this._textContent = '';
    this.classList = {
      add: (...tokens) => this.setClassTokens([...this.classTokens(), ...tokens]),
      remove: (...tokens) => this.setClassTokens(this.classTokens().filter((token) => !tokens.includes(token))),
      contains: (token) => this.classTokens().includes(token)
    };
  }

  set className(value) {
    this.setAttribute('class', value);
  }

  get className() {
    return this.attributes.class || '';
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get textContent() {
    return `${this._textContent}${this.children.map((child) => child.textContent).join('')}`;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  addEventListener(type, handler) {
    this.eventListeners.set(type, [...(this.eventListeners.get(type) || []), handler]);
  }

  dispatchEvent(event) {
    for (const handler of this.eventListeners.get(event.type) || []) {
      handler(event);
    }
  }

  findAll(predicate) {
    return [
      ...(predicate(this) ? [this] : []),
      ...this.children.flatMap((child) => child.findAll(predicate))
    ];
  }

  classTokens() {
    return (this.attributes.class || '').split(/\s+/).filter(Boolean);
  }

  setClassTokens(tokens) {
    this.attributes.class = [...new Set(tokens)].join(' ');
  }
}

function createFakeDocument() {
  return {
    createElement(tagName) {
      return new FakeElement(tagName);
    }
  };
}
```

- [ ] **Step 6: Run renderer tests to verify they fail**

Run:

```bash
npm test -- tests/project-manager.test.js
```

Expected: FAIL because `renderProjectManager` is not implemented.

- [ ] **Step 7: Implement the renderer**

Append to `public/modules/projectManager.js`:

```js
export function renderProjectManager(container, model, { onSelectProject } = {}) {
  const root = document.createElement('section');
  root.className = 'project-manager';
  root.setAttribute('aria-label', '项目管理');

  const header = document.createElement('header');
  header.className = 'project-manager__header';
  header.append(
    textNode('p', 'project-manager__eyebrow eyebrow', 'ReportWebShow'),
    textNode('h2', 'project-manager__title', '项目管理')
  );
  root.append(header);

  if (model.status === 'loading') {
    root.append(textNode('p', 'project-manager__state', '正在载入项目'));
    container.replaceChildren(root);
    return;
  }

  if (model.status === 'error') {
    root.append(textNode('p', 'project-manager__state project-manager__state--error', model.errorMessage || '项目列表载入失败'));
    container.replaceChildren(root);
    return;
  }

  if (model.empty) {
    root.append(textNode('p', 'project-manager__state', '暂无可用项目'));
    container.replaceChildren(root);
    return;
  }

  const list = document.createElement('div');
  list.className = 'project-manager__list';

  for (const project of model.projects) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = project.active ? 'project-card project-card--active' : 'project-card';
    button.setAttribute('data-report-id', project.reportId);
    button.addEventListener('click', () => onSelectProject?.(project.reportId));

    const title = textNode('span', 'project-card__title', project.title);
    const reportId = textNode('span', 'project-card__id', project.reportId);
    const revision = textNode('span', 'project-card__revision', project.revisionLabel);
    button.append(title, reportId, revision);
    list.append(button);
  }

  root.append(list);
  container.replaceChildren(root);
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}
```

- [ ] **Step 8: Run project manager tests**

Run:

```bash
npm test -- tests/project-manager.test.js
```

Expected: PASS for all four project manager tests.

- [ ] **Step 9: Commit task 1**

Run:

```bash
git add public/modules/projectManager.js tests/project-manager.test.js
git commit -m "feat: add project manager module"
```

Expected: commit succeeds and the existing narrative island drag-position behavior remains intact.

---

### Task 2: Add Project Button To Narrative Island

**Files:**
- Modify: `public/modules/narrativeIsland.js`
- Modify: `tests/narrative-island.test.js`

- [ ] **Step 1: Write failing narrative island test**

Add this test before the `FakeElement` class in `tests/narrative-island.test.js`:

```js
test('narrative island renderer exposes a project manager button', () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;

  try {
    const container = new FakeElement('div');
    const calls = [];
    const model = createNarrativeIslandViewModel({
      state,
      currentNodeId: 'progress',
      showProjectButton: true,
      workspaceView: 'report'
    });

    renderNarrativeIsland(container, model, {
      onOpenProjectManager: () => calls.push('projects')
    });

    const root = container.children[0];
    const projectButton = root.findAll((node) => node.classList.contains('narrative-island__project-button'))[0];

    assert.equal(projectButton.textContent, '项目');
    assert.equal(projectButton.attributes['aria-pressed'], 'false');

    projectButton.dispatchEvent({ type: 'click' });
    assert.deepEqual(calls, ['projects']);
  } finally {
    global.document = previousDocument;
  }
});
```

- [ ] **Step 2: Run narrative island tests to verify failure**

Run:

```bash
npm test -- tests/narrative-island.test.js
```

Expected: FAIL because `showProjectButton`, `workspaceView`, and `onOpenProjectManager` are not wired.

- [ ] **Step 3: Extend narrative island view model**

In `public/modules/narrativeIsland.js`, update the exported model function signature and return object:

```js
export function createNarrativeIslandViewModel({
  state,
  currentNodeId,
  expanded = false,
  opening = false,
  closing = false,
  position = { x: 0, y: 0 },
  dragging = false,
  showProjectButton = false,
  workspaceView = 'report'
} = {}) {
  const nodes = state?.story_tree?.nodes || [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const current = byId.get(currentNodeId) || byId.get(state?.story_tree?.root) || null;
  const parent = current?.parent ? byId.get(current.parent) : null;
  const next = current ? nextRouteNode(state, current.id, byId) : null;
  const children = (current?.children || []).map((childId) => byId.get(childId)).filter(Boolean);

  return {
    currentId: current?.id || null,
    currentTitle: current?.title || '未选择节点',
    parentTitle: parent?.title || '根节点',
    nextId: next?.id || null,
    nextTitle: next?.title || null,
    nextLabel: next ? `下一步：${next.title || next.id}` : '末端节点',
    childCount: children.length,
    expanded,
    opening,
    closing,
    position: {
      x: position.x ?? 0,
      y: position.y ?? 0
    },
    dragging,
    showProjectButton,
    projectButtonActive: workspaceView === 'project-manager'
  };
}
```

- [ ] **Step 4: Extend narrative island renderer**

In `public/modules/narrativeIsland.js`, update `renderNarrativeIsland` and add `projectButton`:

```js
export function renderNarrativeIsland(container, model, { onToggle, onBeginDrag, onOpenProjectManager, renderMap } = {}) {
  const root = document.createElement('section');
  const rootClasses = ['narrative-island'];
  if (model.expanded) rootClasses.push('narrative-island--expanded');
  if (model.opening) rootClasses.push('narrative-island--opening');
  if (model.closing) rootClasses.push('narrative-island--closing');
  if (model.dragging) rootClasses.push('narrative-island--dragging');
  root.className = rootClasses.join(' ');
  root.setAttribute('aria-label', '叙事岛');
  root.style.setProperty('--narrative-island-x', `${Math.round(model.position?.x ?? 0)}px`);
  root.style.setProperty('--narrative-island-y', `${Math.round(model.position?.y ?? 0)}px`);

  const surface = document.createElement('div');
  surface.className = 'narrative-island__surface';

  const rail = document.createElement('div');
  rail.className = 'narrative-island__rail';
  rail.addEventListener('pointerdown', (event) => {
    if (isNarrativeIslandDragBlocked(event.target)) return;
    onBeginDrag?.(event);
  });

  const railItems = [
    capsuleText('narrative-island__meta', model.parentTitle),
    currentButton(model, onToggle),
    capsuleText('narrative-island__next', model.nextLabel)
  ];
  if (model.showProjectButton) {
    railItems.push(projectButton(model, onOpenProjectManager));
  }
  rail.append(...railItems);
  surface.append(rail);

  if (model.expanded || model.closing) {
    const panel = document.createElement('div');
    panel.className = 'narrative-island__panel';

    const mapSlot = document.createElement('div');
    mapSlot.className = 'narrative-island__map node-navigator';
    panel.append(mapSlot);
    surface.append(panel);
    renderMap?.(mapSlot);
  }

  root.append(surface);
  container.replaceChildren(root);
}

function projectButton(model, onOpenProjectManager) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'narrative-island__project-button';
  button.setAttribute('aria-label', '打开项目管理');
  button.setAttribute('aria-pressed', model.projectButtonActive ? 'true' : 'false');
  button.textContent = '项目';
  button.addEventListener('click', () => onOpenProjectManager?.());
  return button;
}
```

- [ ] **Step 5: Run narrative island tests**

Run:

```bash
npm test -- tests/narrative-island.test.js
```

Expected: PASS for existing and new narrative island tests.

- [ ] **Step 6: Commit task 2**

Run:

```bash
git add public/modules/narrativeIsland.js tests/narrative-island.test.js
git commit -m "feat: add project entry to narrative island"
```

Expected: commit succeeds.

---

### Task 3: Wire Workspace View And URL State In App

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`

- [ ] **Step 1: Add project manager container to HTML**

In `public/index.html`, place this section after the `stage-shell` and before `narrativeIsland`:

```html
        <section id="projectManager" class="project-manager-shell" aria-label="项目管理" hidden>
        </section>
```

- [ ] **Step 2: Update imports and top-level state in app**

In `public/app.js`, import the module and replace the hard-coded report constant with mutable state:

```js
import { createProjectManagerViewModel, renderProjectManager } from './modules/projectManager.js';
```

Use this state near `const reportApi = createReportApi();`:

```js
const reportApi = createReportApi();
const localPreferenceStorage = getLocalPreferenceStorage();

let reportId = readInitialReportId();
let workspaceView = readInitialWorkspaceView();
let projectPayloads = [];
let projectListStatus = 'loading';
let projectListError = '';
```

- [ ] **Step 3: Add DOM element reference**

Add the project manager container to `elements`:

```js
  projectManager: document.querySelector('#projectManager'),
```

- [ ] **Step 4: Replace startup loading**

Replace `await loadReport();` with:

```js
await initializeWorkspace();
```

Add these functions above `loadReport`:

```js
async function initializeWorkspace() {
  await loadProjectList();
  if (workspaceView === 'project-manager') {
    render();
    setStatus('项目管理已打开');
    return;
  }

  const defaultReportId = reportId || projectPayloads[0]?.reportId || null;
  if (!defaultReportId) {
    workspaceView = 'project-manager';
    render();
    setStatus('暂无可用项目');
    return;
  }

  await loadReport(defaultReportId);
}

async function loadProjectList() {
  projectListStatus = 'loading';
  projectListError = '';

  try {
    const reportIds = await reportApi.listReports();
    const payloads = [];
    for (const id of reportIds) {
      payloads.push(await reportApi.loadReport(id));
    }
    projectPayloads = payloads;
    projectListStatus = 'ready';
  } catch (error) {
    projectPayloads = [];
    projectListStatus = 'error';
    projectListError = error.message;
  }
}
```

- [ ] **Step 5: Make report loading accept report id**

Replace `loadReport` with:

```js
async function loadReport(nextReportId = reportId) {
  if (!nextReportId) {
    workspaceView = 'project-manager';
    render();
    setStatus('暂无可用项目');
    return;
  }

  reportId = nextReportId;
  payload = await reportApi.loadReport(reportId);
  workspaceView = 'report';
  narrativeIslandPosition = createNarrativeIslandPositionState(loadNarrativeIslandPosition(localPreferenceStorage, reportId) || {});
  resetReportSession(payload.state.story_tree.root);
  updateUrlState({ report: reportId, view: null });
  render();
  setStatus('数据已载入');
}

function resetReportSession(nodeId) {
  currentNodeId = nodeId;
  mode = 'play';
  draftState = null;
  baseState = null;
  baseRevision = null;
  selectedIds.clear();
  clipboard = null;
  collapsedNodeIds = new Set();
  stageViewport = createStageViewportState();
  clearEditFeedback();
}
```

- [ ] **Step 6: Guard report-only render work**

At the start of `render`, branch by view:

```js
function render() {
  if (workspaceView === 'project-manager') {
    renderProjectManagerView();
    return;
  }

  const state = workingState();
  const node = findNode(currentNodeId, state);
  const page = findPage(currentNodeId, state);
  // keep the existing report render body after this line
}
```

Add:

```js
function renderProjectManagerView() {
  elements.stage.parentElement.hidden = true;
  elements.projectManager.hidden = false;
  elements.modeLabel.textContent = '项目管理';
  elements.nodeTitle.textContent = '项目管理';
  elements.editButton.hidden = true;
  elements.saveButton.hidden = true;
  elements.discardButton.hidden = true;
  elements.treePanel.setAttribute('aria-hidden', 'true');
  renderTreeList(elements.tree, createTreeListModel(payload?.state || { story_tree: { root: '', nodes: [] } }, '', collapsedNodeIds), {});
  renderProjectManager(elements.projectManager, createProjectManagerViewModel({
    projects: projectPayloads,
    activeReportId: reportId,
    status: projectListStatus,
    errorMessage: projectListError
  }), {
    onSelectProject: async (selectedReportId) => {
      await loadReport(selectedReportId);
    }
  });
  renderNarrativeIslandView(payload?.state || { story_tree: { root: '', nodes: [] }, navigation: { linear_route: [] } });
  elements.inspector.replaceChildren();
}
```

In the report branch of `render`, add before rendering the stage:

```js
  elements.stage.parentElement.hidden = false;
  elements.projectManager.hidden = true;
```

- [ ] **Step 7: Wire narrative island project callback**

In `renderNarrativeIslandView`, pass project state to the model:

```js
    showProjectButton: true,
    workspaceView
```

And pass this callback to `renderNarrativeIsland`:

```js
    onOpenProjectManager() {
      openProjectManager();
    },
```

Add:

```js
function openProjectManager() {
  workspaceView = 'project-manager';
  mode = 'play';
  draftState = null;
  baseState = null;
  baseRevision = null;
  selectedIds.clear();
  clipboard = null;
  clearEditFeedback();
  updateUrlState({ report: reportId, view: 'projects' });
  render();
  setStatus('项目管理已打开');
}
```

- [ ] **Step 8: Add URL helpers**

Add these helpers near `getLocalPreferenceStorage`:

```js
function readInitialReportId() {
  return new URL(window.location.href).searchParams.get('report') || '';
}

function readInitialWorkspaceView() {
  return new URL(window.location.href).searchParams.get('view') === 'projects'
    ? 'project-manager'
    : 'report';
}

function updateUrlState({ report, view }) {
  const url = new URL(window.location.href);
  if (report) {
    url.searchParams.set('report', report);
  } else {
    url.searchParams.delete('report');
  }
  if (view) {
    url.searchParams.set('view', view);
  } else {
    url.searchParams.delete('view');
  }
  window.history.replaceState({}, '', url);
}
```

- [ ] **Step 9: Replace report API calls using mutable report id**

Search `public/app.js` for `reportId` and verify every API call uses the mutable `let reportId`. The existing calls in save revision, set current revision, and position persistence should remain:

```js
payload = await reportApi.setCurrentRevision(reportId, revisionId);
payload = await reportApi.saveRevision(reportId, {
saveNarrativeIslandPosition(localPreferenceStorage, reportId, narrativeIslandPosition);
```

- [ ] **Step 10: Run fast syntax and unit checks**

Run:

```bash
npm test -- tests/project-manager.test.js tests/narrative-island.test.js tests/report-api.test.js
```

Expected: PASS for selected module tests.

- [ ] **Step 11: Commit task 3**

Run:

```bash
git add public/index.html public/app.js
git commit -m "feat: wire project manager workspace"
```

Expected: commit succeeds.

---

### Task 4: Style Project Manager And Narrative Island Button

**Files:**
- Modify: `public/styles.css`
- Test: `tests/narrative-island-style.test.js`

- [ ] **Step 1: Write failing style test**

Add this test to `tests/narrative-island-style.test.js`:

```js
test('styles define project manager and narrative island project button rules', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.project-manager-shell/);
  assert.match(css, /\.project-manager__/);
  assert.match(css, /\.project-card/);
  assert.match(css, /\.narrative-island__project-button/);
});
```

If the file does not already import `readFile`, use:

```js
import { readFile } from 'node:fs/promises';
```

- [ ] **Step 2: Run style test to verify failure**

Run:

```bash
npm test -- tests/narrative-island-style.test.js
```

Expected: FAIL because the project manager classes are not yet present.

- [ ] **Step 3: Add CSS rules**

Append these rules near the narrative island styles in `public/styles.css`:

```css
.project-manager-shell {
  display: grid;
  min-height: min(62vh, 620px);
  place-items: center;
  padding: 28px;
}

.project-manager-shell[hidden] {
  display: none;
}

.project-manager {
  display: grid;
  width: min(100%, 860px);
  gap: 18px;
}

.project-manager__header {
  display: grid;
  gap: 4px;
}

.project-manager__title {
  margin: 0;
  color: var(--ink);
}

.project-manager__state {
  margin: 0;
  color: var(--muted);
}

.project-manager__state--error {
  color: var(--danger, #a33b2f);
}

.project-manager__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.project-card {
  display: grid;
  gap: 8px;
  min-height: 128px;
  padding: 16px;
  text-align: left;
  border-color: color-mix(in srgb, var(--paper-2) 72%, var(--ink) 20%);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--paper-2) 84%, transparent);
  box-shadow: var(--shadow-soft);
}

.project-card:hover {
  transform: translateY(-1px);
}

.project-card--active {
  border-color: color-mix(in srgb, var(--accent) 70%, var(--ink) 14%);
}

.project-card__title {
  color: var(--ink);
  font-weight: 800;
}

.project-card__id,
.project-card__revision {
  overflow-wrap: anywhere;
  color: var(--muted);
  font-size: 12px;
}

.narrative-island__project-button {
  min-width: 58px;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-weight: 800;
}

.narrative-island__project-button[aria-pressed="true"] {
  border-color: color-mix(in srgb, var(--accent) 70%, var(--ink) 12%);
  background: color-mix(in srgb, var(--accent) 16%, var(--paper-2));
}
```

Update `.narrative-island__rail` to fit the extra button:

```css
.narrative-island__rail {
  display: grid;
  grid-template-columns: minmax(0, 0.75fr) minmax(120px, 1fr) minmax(0, 0.9fr) auto;
  gap: 6px;
  align-items: center;
  min-height: 38px;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
```

- [ ] **Step 4: Run style test**

Run:

```bash
npm test -- tests/narrative-island-style.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit task 4**

Run:

```bash
git add public/styles.css tests/narrative-island-style.test.js
git commit -m "style: add project manager view"
```

Expected: commit succeeds.

---

### Task 5: Update Docs And Full Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README current progress**

In `README.md`, add this bullet under “已经具备”:

```markdown
- 灵动岛项目入口与轻量项目管理画面，可在已有汇报项目之间切换；
```

Remove or adjust this bullet under “尚未完成”:

```markdown
- 多汇报项目选择界面；
```

Replace it with:

```markdown
- 项目搜索、筛选、排序和 Codex 生产流程状态展示；
```

- [ ] **Step 2: Update README front-end operation notes**

Under “前端操作”, add:

```markdown
项目管理：

- 点击底部灵动岛中的“项目”按钮进入项目管理画面；
- 项目管理画面只展示已经由 Codex 生成并落盘的汇报项目；
- 点击项目卡片进入具体汇报；
- Web 端第一期不提供新建项目入口。
```

- [ ] **Step 3: Run full unit test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Start local server**

Run:

```bash
npm start
```

Expected: server logs `ReportWebShow demo running at http://localhost:5173`.

- [ ] **Step 5: Browser verification**

Open `http://localhost:5173/?view=projects` in the in-app Browser and verify:

```text
项目管理画面可见
项目卡片显示标题、report_id、revision
点击项目卡片进入具体汇报
灵动岛“项目”按钮可再次打开项目管理
播放模式节点切换仍可用
编辑模式仍可进入和退出
```

- [ ] **Step 6: Stop local server**

Stop the `npm start` process from the running terminal session.

- [ ] **Step 7: Final git status check**

Run:

```bash
git status --short --branch
```

Expected: only pre-existing unrelated changes remain, or the worktree is clean if those changes were part of the implementation branch.

- [ ] **Step 8: Commit docs**

Run:

```bash
git add README.md
git commit -m "docs: update project manager status"
```

Expected: commit succeeds.

---

## Self-Review

- Spec coverage: the plan covers the灵动岛项目按钮, project manager view, existing report-only project source, no Web-side create action, URL `report` and `view=projects`, state reset on project selection, API reuse, error states, module boundaries, CSS, README, unit tests, and browser verification.
- Placeholder scan: no placeholder markers or vague test instructions are intentionally left in the plan.
- Type consistency: `workspaceView`, `projectPayloads`, `projectListStatus`, `projectListError`, `createProjectManagerViewModel`, `renderProjectManager`, and `onOpenProjectManager` are named consistently across tasks.
