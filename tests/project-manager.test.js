import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createProjectManagerViewModel,
  renderProjectBoard,
  renderProjectDetails,
  renderProjectList,
  renderProjectManager
} from '../public/modules/projectManager.js';

const weeklyPayload = {
  reportId: '2026-05-17-weekly-progress',
  state: {
    report: { title: '周进展汇报' },
    story_tree: { nodes: [{ id: 'root' }, { id: 'progress' }] },
    pages: [{ node_id: 'root' }, { node_id: 'progress' }]
  },
  patch: { current_revision: 'rev-003', revisions: [{ id: 'rev-001' }, { id: 'rev-003' }] }
};

const basePayload = {
  reportId: 'demo-base',
  state: {
    report: { title: '基础版本演示' },
    story_tree: { nodes: [{ id: 'root' }] },
    pages: [{ node_id: 'root' }]
  },
  patch: { current_revision: null, revisions: [] }
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

test('project manager view model tracks selected project and summary counts', () => {
  const model = createProjectManagerViewModel({
    projects: [weeklyPayload, basePayload],
    activeReportId: 'demo-base',
    selectedProjectId: '2026-05-17-weekly-progress',
    status: 'ready'
  });

  assert.equal(model.selectedProjectId, '2026-05-17-weekly-progress');
  assert.equal(model.selectedProject.reportId, '2026-05-17-weekly-progress');
  assert.equal(model.projects[0].selected, true);
  assert.equal(model.projects[0].active, false);
  assert.equal(model.projects[0].nodeCount, 2);
  assert.equal(model.projects[0].pageCount, 2);
  assert.equal(model.projects[0].revisionCount, 2);
  assert.equal(model.projects[1].selected, false);
  assert.equal(model.projects[1].active, true);
  assert.equal(model.projects[1].revisionLabel, '基础版本');
});

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
    assert.equal(root.attributes['aria-label'], '项目管理');
    assert.equal(root.textContent.includes('项目管理'), true);
    assert.equal(root.textContent.includes('周进展汇报'), true);
    assert.equal(root.textContent.includes('2026-05-17-weekly-progress'), true);
    assert.equal(root.textContent.includes('基础版本'), true);
    assert.equal(buttons.length, 2);
    assert.equal(buttons[0].attributes['data-report-id'], '2026-05-17-weekly-progress');
    assert.equal(buttons[0].attributes['aria-current'], 'false');
    assert.equal(buttons[0].classList.contains('project-card--active'), false);
    assert.equal(buttons[1].attributes['data-report-id'], 'demo-base');
    assert.equal(buttons[1].attributes['aria-current'], 'page');
    assert.equal(buttons[1].classList.contains('project-card--active'), true);

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

test('project manager renderer keeps projects visible with a non-blocking error', () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;

  try {
    const container = new FakeElement('div');
    const selected = [];

    renderProjectManager(
      container,
      createProjectManagerViewModel({
        projects: [weeklyPayload],
        status: 'ready',
        errorMessage: '项目载入失败'
      }),
      {
        onSelectProject: (reportId) => selected.push(reportId)
      }
    );

    const buttons = container.findAll((node) => node.tagName === 'button');
    assert.equal(container.textContent.includes('项目载入失败'), true);
    assert.equal(buttons.length, 1);
    assert.equal(buttons[0].attributes['data-report-id'], '2026-05-17-weekly-progress');

    buttons[0].dispatchEvent({ type: 'click' });
    assert.deepEqual(selected, ['2026-05-17-weekly-progress']);
  } finally {
    global.document = previousDocument;
  }
});

test('project board enters reports from card and explicit enter button', () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;

  try {
    const container = new FakeElement('div');
    const entered = [];
    const model = createProjectManagerViewModel({
      projects: [weeklyPayload, basePayload],
      selectedProjectId: 'demo-base',
      activeReportId: 'demo-base',
      status: 'ready'
    });

    renderProjectBoard(container, model, {
      onEnterProject: (reportId) => entered.push(reportId)
    });

    const root = container.children[0];
    const cards = root.findAll((node) => node.classList.contains('project-board-card'));
    const enterButtons = root.findAll((node) => node.classList.contains('project-board-card__enter'));

    assert.equal(root.classList.contains('project-board'), true);
    assert.equal(cards.length, 2);
    assert.equal(cards[0].attributes['aria-current'], 'false');
    assert.equal(cards[1].attributes['aria-current'], 'page');
    assert.equal(cards[1].attributes['aria-selected'], 'true');

    cards[0].dispatchEvent({ type: 'click' });
    assert.deepEqual(entered, ['2026-05-17-weekly-progress']);

    enterButtons[0].dispatchEvent({ type: 'click', stopPropagation() {} });
    assert.deepEqual(entered, ['2026-05-17-weekly-progress', '2026-05-17-weekly-progress']);
  } finally {
    global.document = previousDocument;
  }
});

test('project list and details render selected project state', () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;

  try {
    const listContainer = new FakeElement('div');
    const detailsContainer = new FakeElement('div');
    const selected = [];
    const entered = [];
    const model = createProjectManagerViewModel({
      projects: [weeklyPayload, basePayload],
      selectedProjectId: '2026-05-17-weekly-progress',
      activeReportId: 'demo-base',
      status: 'ready'
    });

    renderProjectList(listContainer, model, {
      onSelectProject: (reportId) => selected.push(reportId)
    });
    renderProjectDetails(detailsContainer, model, {
      onEnterProject: (reportId) => entered.push(reportId)
    });

    const listRoot = listContainer.children[0];
    const listButtons = listRoot.findAll((node) => node.tagName === 'button');
    const detailsRoot = detailsContainer.children[0];
    const enterButton = detailsRoot.findAll((node) => node.classList.contains('project-details__enter'))[0];

    assert.equal(listRoot.classList.contains('project-list-panel'), true);
    assert.equal(listButtons.length, 2);
    assert.equal(listButtons[0].attributes['aria-selected'], 'true');
    assert.equal(listButtons[1].attributes['aria-current'], 'page');
    assert.equal(detailsRoot.classList.contains('project-details'), true);
    assert.equal(detailsRoot.textContent.includes('周进展汇报'), true);
    assert.equal(detailsRoot.textContent.includes('节点数量'), true);
    assert.equal(detailsRoot.textContent.includes('2'), true);

    listButtons[1].dispatchEvent({ type: 'click' });
    enterButton.dispatchEvent({ type: 'click' });

    assert.deepEqual(selected, ['demo-base']);
    assert.deepEqual(entered, ['2026-05-17-weekly-progress']);
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
