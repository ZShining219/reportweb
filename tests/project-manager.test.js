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
