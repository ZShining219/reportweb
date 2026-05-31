import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createRevisionViewModel, renderRevisionPanel } from '../public/modules/revisionPanel.js';

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
  assert.equal(model.items[2].summary, '调整布局');
});

test('revision view model marks base active when current revision is null', () => {
  const model = createRevisionViewModel({
    currentRevision: null,
    revisions: [{ id: 'rev-001', summary: '第一次保存' }]
  });

  assert.equal(model.items[0].id, 'base');
  assert.equal(model.items[0].active, true);
  assert.equal(model.items[1].active, false);
});

test('revision panel emits null for base and revision id for revision items', () => {
  const calls = [];
  const buttons = [];
  const container = createContainer(buttons);
  const model = createRevisionViewModel({
    currentRevision: null,
    revisions: [{ id: 'rev-001', summary: '第一次保存' }]
  });

  renderRevisionPanel(container, model, {
    onSelectRevision: (revisionId) => calls.push(revisionId)
  });

  buttons[0].click();
  buttons[1].click();

  assert.deepEqual(calls, [null, 'rev-001']);
  assert.equal(container.children.length, 1);
});

function createContainer(buttons) {
  return {
    children: [],
    replaceChildren(...nodes) {
      this.children = nodes;
    },
    ownerDocument: {
      createElement(tagName) {
        const node = createNode(tagName);
        if (tagName === 'button') {
          buttons.push(node);
        }
        return node;
      }
    }
  };
}

function createNode(tagName) {
  return {
    tagName,
    children: [],
    className: '',
    dataset: {},
    textContent: '',
    type: '',
    addEventListener(_eventName, handler) {
      this.click = handler;
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
    click() {}
  };
}
