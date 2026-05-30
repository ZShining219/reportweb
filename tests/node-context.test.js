import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getNodeGraph } from '../public/nodeContext.js';

const state = {
  story_tree: {
    root: 'root',
    nodes: [
      { id: 'root', title: '汇报入口', parent: null, children: ['progress', 'next-plan'] },
      { id: 'progress', title: '当前进展', parent: 'root', children: ['data-model', 'presentation-model', 'extra-child'] },
      { id: 'data-model', title: '数据层结构', parent: 'progress', children: [] },
      { id: 'presentation-model', title: '呈现侧结构', parent: 'progress', children: [] },
      { id: 'extra-child', title: '备用子节点', parent: 'progress', children: [] },
      { id: 'next-plan', title: '下一步计划', parent: 'root', children: ['archive'] },
      { id: 'archive', title: '归档节点', parent: 'next-plan', children: [] }
    ]
  }
};

test('node graph returns a centered local map with simple nodes and links', () => {
  const graph = getNodeGraph(state, 'progress');
  const byId = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));

  assert.equal(graph.nodes.length, 5);
  assert.equal(graph.links.length, 4);
  assert.equal(byId.progress.kind, 'current');
  assert.equal(byId.root.kind, 'near');
  assert.equal(byId['next-plan'].kind, 'near');
  assert.equal(byId['data-model'].kind, 'near');
  assert.equal(byId['presentation-model'].kind, 'near');
  assert.equal(byId['extra-child'], undefined);
  assert.equal(byId.archive, undefined);
  assert.deepEqual({ x: byId.progress.x, y: byId.progress.y }, { x: 50, y: 50 });
  assert.equal(graph.links.every((link) => link.from === 'progress'), true);
});

test('node graph keeps only graph data and no label-specific context groups', () => {
  const graph = getNodeGraph(state, 'presentation-model');
  const current = graph.nodes.find((node) => node.id === 'presentation-model');

  assert.deepEqual(Object.keys(current).sort(), ['id', 'kind', 'opacity', 'x', 'y'].sort());
  assert.equal(graph.links.some((link) => link.from === 'presentation-model' && link.to === 'progress'), true);
  assert.equal(graph.nodes.find((node) => node.id === 'progress').kind, 'near');
  assert.equal(graph.nodes.find((node) => node.id === 'data-model').kind, 'near');
});
