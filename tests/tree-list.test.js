import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTreeListModel } from '../public/modules/treeList.js';

const state = {
  story_tree: {
    root: 'root',
    nodes: [
      { id: 'root', title: '汇报入口', parent: null, children: ['a', 'b'], status: { display: 'visible' } },
      { id: 'a', title: '第一部分', parent: 'root', children: ['a1'], status: { display: 'visible' } },
      { id: 'a1', title: '细节页', parent: 'a', children: [], status: { display: 'visible' } },
      { id: 'b', title: '第二部分', parent: 'root', children: [], status: { display: 'visible' } },
      { id: 'hidden', title: '隐藏页', parent: 'root', children: [], status: { display: 'hidden' } }
    ]
  }
};

test('tree list model nests visible nodes and keeps the current path expanded', () => {
  const model = createTreeListModel(state, 'a1', new Set(['a']));

  assert.equal(model.id, 'root');
  assert.equal(model.expanded, true);
  assert.deepEqual(model.children.map((node) => node.id), ['a', 'b']);
  assert.equal(model.children[0].expanded, true);
  assert.equal(model.children[0].children[0].active, true);
  assert.equal(model.children.some((node) => node.id === 'hidden'), false);
});

test('tree list model collapses branches outside the current path', () => {
  const model = createTreeListModel(state, 'b', new Set(['a']));

  assert.equal(model.children[0].id, 'a');
  assert.equal(model.children[0].expanded, false);
  assert.deepEqual(model.children[0].children, []);
  assert.equal(model.children[1].active, true);
});
