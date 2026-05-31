import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createEditFeedbackModel, renderEditFeedback } from '../public/modules/editFeedback.js';

test('edit feedback model distinguishes hover, text edit, move, resize, select, and dirty states', () => {
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

  assert.deepEqual(
    createEditFeedbackModel({
      mode: 'edit',
      intent: 'resize',
      component: { id: 'chart-001', type: 'chart', x: 40, y: 80, width: 360, height: 160 },
      size: { width: 420, height: 180 }
    }),
    {
      active: true,
      componentId: 'chart-001',
      intent: 'resize',
      label: '调整尺寸',
      className: 'edit-feedback edit-feedback--resize',
      detail: '尺寸 420 x 180'
    }
  );

  assert.equal(createEditFeedbackModel({ mode: 'edit', intent: 'hover', component: { id: 'shape-001' } }).label, '可选择组件');
  assert.equal(createEditFeedbackModel({ mode: 'edit', intent: 'select', component: { id: 'text-001', type: 'text' } }).label, '选择组件');
});

test('edit feedback model is inactive outside editable component intent', () => {
  assert.deepEqual(createEditFeedbackModel({ mode: 'play', intent: 'move', component: { id: 'x' } }), { active: false });
  assert.deepEqual(createEditFeedbackModel({ mode: 'edit', component: { id: 'x' } }), { active: false });
  assert.deepEqual(createEditFeedbackModel({ mode: 'edit', intent: 'move' }), { active: false });
});

test('render edit feedback mutates only the provided container', () => {
  const originalDocument = globalThis.document;
  globalThis.document = createDocumentStub();

  try {
    const container = createContainerStub([createElementStub('div', 'edit-feedback edit-feedback--hover')]);
    const outside = createContainerStub([createElementStub('div', 'edit-feedback edit-feedback--move')]);
    const model = createEditFeedbackModel({
      mode: 'edit',
      intent: 'move',
      component: { id: 'svg-001', type: 'svg', x: 260, y: 220 },
      delta: { x: 32, y: -8 }
    });

    renderEditFeedback(container, model);

    assert.equal(container.children.length, 1);
    assert.equal(container.children[0].className, 'edit-feedback edit-feedback--move');
    assert.equal(container.children[0].children[0].textContent, '移动组件');
    assert.equal(container.children[0].children[1].textContent, 'x: 292, y: 212, 位移 +32, -8');
    assert.equal(outside.children.length, 1);
    assert.equal(outside.children[0].className, 'edit-feedback edit-feedback--move');

    renderEditFeedback(container, { active: false });

    assert.equal(container.children.length, 0);
    assert.equal(outside.children.length, 1);
  } finally {
    globalThis.document = originalDocument;
  }
});

function createDocumentStub() {
  return {
    createElement(tagName) {
      return createElementStub(tagName);
    }
  };
}

function createContainerStub(children = []) {
  const container = createElementStub('section');
  children.forEach((child) => {
    child.parent = container;
    container.children.push(child);
  });
  return container;
}

function createElementStub(tagName, className = '') {
  return {
    tagName,
    className,
    dataset: {},
    textContent: '',
    children: [],
    parent: null,
    append(...nodes) {
      nodes.forEach((node) => {
        node.parent = this;
        this.children.push(node);
      });
    },
    querySelectorAll(selector) {
      if (selector !== '.edit-feedback') {
        return [];
      }
      return this.children.filter((child) => child.className.split(' ').includes('edit-feedback'));
    },
    remove() {
      if (!this.parent) {
        return;
      }
      this.parent.children = this.parent.children.filter((child) => child !== this);
      this.parent = null;
    }
  };
}
