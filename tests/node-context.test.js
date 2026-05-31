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

const fiveColumnState = {
  story_tree: {
    root: 'root',
    nodes: [
      { id: 'root', title: '入口', parent: null, children: ['parent'] },
      { id: 'parent', title: '父节点', parent: 'root', children: ['current'] },
      { id: 'current', title: '当前节点', parent: 'parent', children: ['child-a', 'child-b', 'child-c'] },
      { id: 'child-a', title: '子节点 A', parent: 'current', children: ['a1', 'a2'] },
      { id: 'child-b', title: '子节点 B', parent: 'current', children: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'] },
      { id: 'child-c', title: '子节点 C', parent: 'current', children: ['c1'] },
      { id: 'a1', title: 'A1', parent: 'child-a', children: [] },
      { id: 'a2', title: 'A2', parent: 'child-a', children: [] },
      { id: 'b1', title: 'B1', parent: 'child-b', children: [] },
      { id: 'b2', title: 'B2', parent: 'child-b', children: [] },
      { id: 'b3', title: 'B3', parent: 'child-b', children: [] },
      { id: 'b4', title: 'B4', parent: 'child-b', children: [] },
      { id: 'b5', title: 'B5', parent: 'child-b', children: [] },
      { id: 'b6', title: 'B6', parent: 'child-b', children: [] },
      { id: 'c1', title: 'C1', parent: 'child-c', children: [] }
    ]
  }
};

const siblingOmittedState = {
  story_tree: {
    root: 'root',
    nodes: [
      { id: 'root', title: '入口', parent: null, children: ['progress', 'workflow-validation', 'next-plan'] },
      { id: 'progress', title: '当前进展', parent: 'root', children: ['data-model', 'presentation-model', 'node-effects'] },
      { id: 'data-model', title: '数据层结构', parent: 'progress', children: ['revision-chain', 'schema-validation'] },
      { id: 'revision-chain', title: 'Revision 链路', parent: 'data-model', children: ['patch-solidify'] },
      { id: 'patch-solidify', title: 'Patch 固化', parent: 'revision-chain', children: [] },
      { id: 'schema-validation', title: 'Schema 校验', parent: 'data-model', children: [] },
      { id: 'presentation-model', title: '呈现侧结构', parent: 'progress', children: ['node-navigator'] },
      { id: 'node-navigator', title: '节点导航呈现', parent: 'presentation-model', children: [] },
      { id: 'node-effects', title: '节点效果规则', parent: 'progress', children: [] },
      { id: 'workflow-validation', title: '流程验证', parent: 'root', children: [] },
      { id: 'next-plan', title: '下一步计划', parent: 'root', children: [] }
    ]
  }
};

test('node graph returns a focused kinship corridor around the current node', () => {
  const graph = getNodeGraph(state, 'progress');
  const byId = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));

  assert.equal(graph.nodes.length, 7);
  assert.equal(graph.links.length, 6);
  assert.equal(graph.omitted.length, 0);
  assert.equal(byId.progress.kind, 'current');
  assert.equal(byId.root.kind, 'path');
  assert.equal(byId['data-model'].kind, 'child');
  assert.equal(byId['presentation-model'].kind, 'child');
  assert.equal(byId['extra-child'].kind, 'child');
  assert.equal(byId['next-plan'].kind, 'sibling');
  assert.equal(byId.archive.kind, 'default');
  assert.equal(byId.archive.proximity, 'context');
  assert.equal(byId.progress.isCurrent, true);
  assert.equal(byId.root.isPath, true);
  assert.equal(byId.progress.proximity, 'primary');
  assert.equal(byId.root.proximity, 'axis');
  assert.equal(byId['presentation-model'].proximity, 'axis');
  assert.equal(byId['data-model'].proximity, 'context');
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
  assert.equal(byId.progress.y, graph.bounds.height / 2);
  assert.equal(byId.root.y, byId.progress.y);
  assert.equal(byId['presentation-model'].y, byId.progress.y);
  assert.equal(byId['data-model'].y < byId.progress.y, true);
  assert.equal(byId['extra-child'].y > byId.progress.y, true);
  assert.equal(byId['data-model'].x, byId['presentation-model'].x);
  assert.equal(byId['presentation-model'].x, byId['extra-child'].x);
  assert.equal(byId.root.region, 'parent-axis');
  assert.equal(byId.progress.region, 'current-axis');
  assert.equal(byId['presentation-model'].region, 'child-axis');
});

test('node graph exposes clean render metadata for labels and hit targets', () => {
  const graph = getNodeGraph(state, 'presentation-model');
  const current = graph.nodes.find((node) => node.id === 'presentation-model');

  assert.deepEqual(Object.keys(current).sort(), ['depth', 'id', 'isCurrent', 'isPath', 'kind', 'opacity', 'proximity', 'region', 'title', 'x', 'y'].sort());
  assert.equal(current.isCurrent, true);
  assert.equal(current.isPath, true);
  assert.equal(graph.links.length, 5);
  assert.equal(graph.links.some((link) => link.from === 'progress' && link.to === 'presentation-model'), true);
  assert.equal(graph.nodes.find((node) => node.id === 'progress').kind, 'path');
  assert.equal(graph.nodes.find((node) => node.id === 'data-model').kind, 'sibling');
  assert.equal(graph.omitted.length, 1);
  assert.equal(graph.omitted.every((marker) => marker.count >= 1), true);
  assert.equal(graph.omitted.some((marker) => marker.nodes.some((node) => node.id === 'archive')), true);
});

test('node graph keeps only nearest siblings visible in the current column', () => {
  const graph = getNodeGraph(state, 'data-model');
  const byId = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));

  assert.equal(byId['data-model'].proximity, 'primary');
  assert.equal(byId.progress.proximity, 'axis');
  assert.equal(byId['presentation-model'].proximity, 'context');
  assert.equal(byId.root.proximity, 'axis');
  assert.equal(byId['extra-child'], undefined);
  assert.equal(byId.root.region, 'ancestor-trace');
  assert.equal(graph.omitted.some((marker) => marker.nodes.some((node) => node.id === 'extra-child')), true);
});

test('node graph keeps the current node centered and aligns parents with the current axis', () => {
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
  assert.equal(archiveParent.y, archive.y);
  assert.equal(archiveRoot.x < archiveParent.x, true);
  assert.equal(archiveParent.x < archive.x, true);
});

test('node graph balances related nodes above and below the current axis', () => {
  const graph = getNodeGraph(state, 'progress');
  const childNodes = graph.nodes
    .filter((node) => node.kind === 'child')
    .sort((a, b) => a.y - b.y);
  const gaps = childNodes.slice(1).map((node, index) => round(node.y - childNodes[index].y));

  assert.deepEqual(childNodes.map((node) => node.id), ['data-model', 'presentation-model', 'extra-child']);
  assert.deepEqual(gaps, [gaps[0], gaps[0]]);
});

test('node graph expands the fifth column around each fourth-column axis', () => {
  const graph = getNodeGraph(fiveColumnState, 'current');
  const byId = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));

  assert.equal(byId.current.x, graph.bounds.width / 2);
  assert.equal(byId.parent.y, byId.current.y);
  assert.equal(byId['child-b'].y, byId.current.y);

  const childBLeaves = ['b1', 'b2', 'b3', 'b4', 'b5'].map((id) => byId[id]);
  assert.equal(childBLeaves.every(Boolean), true);
  assert.equal(childBLeaves.every((node) => node.proximity === 'context'), true);
  assert.equal(byId.b6, undefined);
  assert.equal(new Set(childBLeaves.map((node) => node.x)).size, 1);
  assert.equal(childBLeaves[0].x > byId['child-b'].x, true);
  assert.deepEqual(childBLeaves.map((node) => round(node.y - byId['child-b'].y)), [-46, -23, 0, 23, 46]);
  assert.equal(graph.omitted.some((marker) => marker.from === 'child-b' && marker.nodes.some((node) => node.id === 'b6')), true);

  const childALeaves = ['a1', 'a2'].map((id) => byId[id]);
  assert.equal(childALeaves.every(Boolean), true);
  assert.deepEqual(childALeaves.map((node) => round(node.y - byId['child-a'].y)), [-11.5, 11.5]);

  const childCLeaves = ['c1'].map((id) => byId[id]);
  assert.equal(childCLeaves[0].y, byId['child-c'].y);
});

test('node graph skips nodes marked hidden from the navigator', () => {
  const hiddenState = structuredClone(state);
  hiddenState.story_tree.nodes.find((node) => node.id === 'archive').status = { display: 'hidden' };

  const graph = getNodeGraph(hiddenState, 'next-plan');

  assert.equal(graph.nodes.some((node) => node.id === 'archive'), false);
  assert.equal(graph.links.some((link) => link.to === 'archive'), false);
});

test('node graph expands current-column sibling branches into the fourth column', () => {
  const graph = getNodeGraph(siblingOmittedState, 'workflow-validation');
  const current = graph.nodes.find((node) => node.id === 'workflow-validation');
  const progress = graph.nodes.find((node) => node.id === 'progress');
  const branchChildren = ['data-model', 'presentation-model', 'node-effects'].map((id) => graph.nodes.find((node) => node.id === id));

  assert.equal(progress.proximity, 'context');
  assert.equal(branchChildren.every(Boolean), true);
  assert.equal(new Set(branchChildren.map((node) => node.x)).size, 1);
  assert.equal(branchChildren.every((node) => node.x > current.x), true);
  assert.deepEqual(branchChildren.map((node) => round(node.y - progress.y)), [-23, 0, 23]);
  assert.equal(graph.links.some((link) => link.from === 'progress' && link.to === 'data-model'), true);
  assert.equal(graph.omitted.some((item) => item.from === 'progress'), false);
  assert.equal(graph.omitted.some((item) => item.from === 'data-model'), true);
});

test('node graph keeps nodes in the same column evenly spaced', () => {
  const graph = getNodeGraph(siblingOmittedState, 'presentation-model');
  const byId = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));
  const columnNodes = ['revision-chain', 'schema-validation', 'node-navigator'].map((id) => byId[id]);
  const sorted = [...columnNodes].sort((a, b) => a.y - b.y);
  const gaps = sorted.slice(1).map((node, index) => round(node.y - sorted[index].y));

  assert.equal(columnNodes.every(Boolean), true);
  assert.equal(new Set(columnNodes.map((node) => node.x)).size, 1);
  assert.equal(byId['node-navigator'].y, byId['presentation-model'].y);
  assert.deepEqual(gaps, [23, 23]);
});

test('node graph keeps high-fanout kinship windows inside the navigator bounds', () => {
  const highFanoutState = makeHighFanoutState();
  const targetIds = [
    'root',
    'branch-0',
    'branch-4-child-5',
    'branch-7-child-9',
    'branch-2-child-0-leaf-0',
    'branch-6-child-9-leaf-11'
  ];

  for (const targetId of targetIds) {
    const graph = getNodeGraph(highFanoutState, targetId);
    const current = graph.nodes.find((node) => node.id === targetId);

    assert.equal(current.x, graph.bounds.width / 2);
    assert.equal(current.y, graph.bounds.height / 2);
    assert.equal(graph.omitted.length > 0, true);

    for (const node of graph.nodes) {
      assert.equal(Number.isFinite(node.x), true);
      assert.equal(Number.isFinite(node.y), true);
      assert.equal(node.x >= 0 && node.x <= graph.bounds.width, true, `${targetId}:${node.id} x=${node.x}`);
      assert.equal(node.y >= 0 && node.y <= graph.bounds.height, true, `${targetId}:${node.id} y=${node.y}`);
    }
  }
});

function round(value) {
  return Math.round(value * 100) / 100;
}

function makeHighFanoutState() {
  const nodes = [{ id: 'root', title: '入口', parent: null, children: [] }];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const addNode = (id, parent, title) => {
    const node = { id, title, parent, children: [] };
    nodes.push(node);
    byId.set(id, node);
    byId.get(parent).children.push(id);
    return node;
  };

  for (let branch = 0; branch < 8; branch += 1) {
    const parent = addNode(`branch-${branch}`, 'root', `分支 ${branch}`);
    for (let child = 0; child < 10; child += 1) {
      const childNode = addNode(`branch-${branch}-child-${child}`, parent.id, `子项 ${branch}-${child}`);
      for (let leaf = 0; leaf < 12; leaf += 1) {
        addNode(`branch-${branch}-child-${child}-leaf-${leaf}`, childNode.id, `叶子 ${branch}-${child}-${leaf}`);
      }
    }
  }

  return { story_tree: { root: 'root', nodes } };
}
