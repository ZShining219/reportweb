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

test('node graph returns a full hierarchy layout with current path context', () => {
  const graph = getNodeGraph(state, 'progress');
  const byId = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));

  assert.equal(graph.nodes.length, 7);
  assert.equal(graph.links.length, 6);
  assert.equal(byId.progress.kind, 'current');
  assert.equal(byId.root.kind, 'path');
  assert.equal(byId['data-model'].kind, 'child');
  assert.equal(byId['presentation-model'].kind, 'child');
  assert.equal(byId['extra-child'].kind, 'child');
  assert.equal(byId['next-plan'].kind, 'sibling');
  assert.equal(byId.archive.kind, 'default');
  assert.equal(byId.progress.isCurrent, true);
  assert.equal(byId.root.isPath, true);
  assert.equal(byId.progress.proximity, 'primary');
  assert.equal(byId.root.proximity, 'secondary');
  assert.equal(byId['data-model'].proximity, 'secondary');
  assert.equal(byId.archive.proximity, 'distant');
  assert.equal(byId.progress.title, '当前进展');
  assert.equal(byId.progress.depth, 1);
  assert.deepEqual(graph.links, [
    { from: 'root', to: 'progress' },
    { from: 'root', to: 'next-plan' },
    { from: 'progress', to: 'data-model' },
    { from: 'progress', to: 'presentation-model' },
    { from: 'progress', to: 'extra-child' },
    { from: 'next-plan', to: 'archive' }
  ]);
  assert.equal(graph.bounds.width, 300);
  assert.equal(graph.bounds.height, 180);
  assert.equal(byId.root.x < byId.progress.x, true);
  assert.equal(byId.progress.x < byId['data-model'].x, true);
  assert.equal(byId.progress.x < byId['presentation-model'].x, true);
  assert.equal(byId['next-plan'].x < byId.archive.x, true);
  assert.equal(byId['data-model'].x, byId['presentation-model'].x);
  assert.equal(byId['presentation-model'].x, byId['extra-child'].x);
  assert.equal(byId.root.region, 'tree-depth-0');
  assert.equal(byId.progress.region, 'tree-depth-1');
  assert.equal(byId['data-model'].region, 'tree-depth-2');
  assert.equal(byId.archive.region, 'tree-depth-2');
  assert.equal(byId.archive.opacity, 0.5);
});

test('node graph exposes clean render metadata for labels and hit targets', () => {
  const graph = getNodeGraph(state, 'presentation-model');
  const current = graph.nodes.find((node) => node.id === 'presentation-model');

  assert.deepEqual(Object.keys(current).sort(), ['depth', 'id', 'isCurrent', 'isPath', 'kind', 'opacity', 'proximity', 'region', 'title', 'x', 'y'].sort());
  assert.equal(current.isCurrent, true);
  assert.equal(current.isPath, true);
  assert.equal(graph.links.length, 6);
  assert.equal(graph.links.some((link) => link.from === 'progress' && link.to === 'presentation-model'), true);
  assert.equal(graph.nodes.find((node) => node.id === 'progress').kind, 'path');
  assert.equal(graph.nodes.find((node) => node.id === 'data-model').kind, 'sibling');
});

test('node graph treats grandparent and non-nearest siblings as distant', () => {
  const graph = getNodeGraph(state, 'data-model');
  const byId = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));

  assert.equal(byId['data-model'].proximity, 'primary');
  assert.equal(byId.progress.proximity, 'secondary');
  assert.equal(byId['presentation-model'].proximity, 'secondary');
  assert.equal(byId.root.proximity, 'distant');
  assert.equal(byId['extra-child'].proximity, 'distant');
  assert.equal(byId.root.region, 'tree-depth-0');
  assert.equal(byId['extra-child'].region, 'tree-depth-2');
});

test('node graph pans the tree so the current node stays centered', () => {
  const progressGraph = getNodeGraph(state, 'progress');
  const archiveGraph = getNodeGraph(state, 'archive');
  const progress = progressGraph.nodes.find((node) => node.id === 'progress');
  const archive = archiveGraph.nodes.find((node) => node.id === 'archive');

  assert.equal(progress.x, progressGraph.bounds.width / 2);
  assert.equal(progress.y, progressGraph.bounds.height / 2);
  assert.equal(archive.x, archiveGraph.bounds.width / 2);
  assert.equal(archive.y, archiveGraph.bounds.height / 2);

  const archiveRoot = archiveGraph.nodes.find((node) => node.id === 'root');
  const archiveParent = archiveGraph.nodes.find((node) => node.id === 'next-plan');
  assert.equal(archiveRoot.x < archiveParent.x, true);
  assert.equal(archiveParent.x < archive.x, true);
});

test('node graph balances vertical spacing within each visible depth', () => {
  const graph = getNodeGraph(state, 'progress');
  const depthTwoNodes = graph.nodes
    .filter((node) => node.depth === 2)
    .sort((a, b) => a.y - b.y);
  const gaps = depthTwoNodes.slice(1).map((node, index) => round(node.y - depthTwoNodes[index].y));

  assert.deepEqual(depthTwoNodes.map((node) => node.id), ['data-model', 'presentation-model', 'extra-child', 'archive']);
  assert.deepEqual(gaps, [gaps[0], gaps[0], gaps[0]]);
});

test('node graph skips nodes marked hidden from the navigator', () => {
  const hiddenState = structuredClone(state);
  hiddenState.story_tree.nodes.find((node) => node.id === 'archive').status = { display: 'hidden' };

  const graph = getNodeGraph(hiddenState, 'next-plan');

  assert.equal(graph.nodes.some((node) => node.id === 'archive'), false);
  assert.equal(graph.links.some((link) => link.to === 'archive'), false);
});

function round(value) {
  return Math.round(value * 100) / 100;
}
