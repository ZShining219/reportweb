import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createNodeNavigatorModel, renderNodeNavigator } from '../public/nodeNavigator.js';

test('node navigator model converts graph data into minimalist render primitives', () => {
  const model = createNodeNavigatorModel({
    bounds: { width: 300, height: 180 },
    nodes: [
      { id: 'root', title: '汇报入口', x: 10, y: 50, kind: 'path', isPath: true, opacity: 0.92 },
      { id: 'progress', title: '当前进展', x: 100, y: 40, kind: 'current', proximity: 'primary', region: 'tree-depth-1', isPath: true, opacity: 1, depth: 1 },
      { id: 'data', title: '数据层结构', x: 190, y: 30, kind: 'child', proximity: 'secondary', region: 'tree-depth-2', isPath: false, opacity: 1 },
      { id: 'archive', title: '归档节点', x: 280, y: 70, kind: 'default', proximity: 'distant', region: 'tree-depth-3', isPath: false, opacity: 0.5 }
    ],
    links: [
      { from: 'root', to: 'progress' },
      { from: 'progress', to: 'data' },
      { from: 'data', to: 'archive' }
    ]
  });

  assert.deepEqual(model.bounds, { width: 300, height: 180 });
  assert.equal(model.links[0].className, 'node-navigator__link node-navigator__link--path');
  assert.equal(model.links[0].d, 'M 10 50 C 59.5 50, 59.5 40, 100 40');
  assert.equal(model.links[1].className, 'node-navigator__link');
  assert.equal(model.nodes.find((node) => node.id === 'progress').radius, 4.68);
  assert.equal(model.nodes.find((node) => node.id === 'data').radius, 3.6);
  assert.equal(model.nodes.find((node) => node.id === 'archive').radius, 1.8);
  assert.equal(model.nodes.find((node) => node.id === 'progress').className, 'node-navigator__node node-navigator__node--primary');
  assert.equal(model.nodes.find((node) => node.id === 'data').className, 'node-navigator__node node-navigator__node--secondary');
  assert.equal(model.nodes.find((node) => node.id === 'archive').className, 'node-navigator__node node-navigator__node--distant');
  assert.equal(model.nodes.find((node) => node.id === 'data').hitClassName, 'node-navigator__hit node-navigator__hit--secondary node-navigator__hit--label-left');
  assert.equal(model.nodes.find((node) => node.id === 'archive').opacity, 0.5);
  assert.equal(model.nodes.find((node) => node.id === 'archive').style.left, '93.33%');
  assert.equal(model.nodes.find((node) => node.id === 'data').style.left, '63.33%');
  assert.equal(model.nodes.find((node) => node.id === 'archive').style.top, '38.89%');
  assert.equal(model.nodes.find((node) => node.id === 'progress').tooltip, '当前进展');
  assert.equal(model.nodes.find((node) => node.id === 'progress').data.region, 'tree-depth-1');
  assert.deepEqual(model.nodes.find((node) => node.id === 'progress').data, {
    id: 'progress',
    title: '当前进展',
    x: 100,
    y: 40,
    kind: 'current',
    proximity: 'primary',
    region: 'tree-depth-1',
    isPath: true,
    opacity: 1,
    depth: 1
  });
});

test('node navigator binds every rendered node to hoverable hit targets and tooltips', () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;

  try {
    const container = new FakeElement('div');

    renderNodeNavigator(container, {
      currentNodeId: 'progress',
      state: {
        story_tree: {
          root: 'root',
          nodes: [
            { id: 'root', title: '汇报入口', parent: null, children: ['progress', 'next-plan'] },
            { id: 'progress', title: '当前进展', parent: 'root', children: ['data-model'] },
            { id: 'data-model', title: '数据层结构', parent: 'progress', children: [] },
            { id: 'next-plan', title: '下一步计划', parent: 'root', children: [] }
          ]
        }
      }
    });

    const renderedNodes = container.findAll((node) => node.classList.contains('node-navigator__node'));
    const hitTargets = container.findAll((node) => node.tagName === 'button');

    assert.equal(hitTargets.length, renderedNodes.length);
    assert.equal(hitTargets.every((hit) => hit.dataset.nodeId && hit.dataset.nodeTitle), true);
    assert.equal(hitTargets.every((hit) => hit.attributes.title === hit.dataset.nodeTitle), true);
    assert.equal(hitTargets.every((hit) => hit.nodeData?.id === hit.dataset.nodeId), true);

    const progressNode = renderedNodes.find((node) => node.dataset.nodeId === 'progress');
    const progressHit = hitTargets.find((node) => node.dataset.nodeId === 'progress');

    progressHit.dispatchEvent({ type: 'mouseenter' });
    assert.equal(progressNode.classList.contains('is-hovered'), true);

    progressHit.dispatchEvent({ type: 'mouseleave' });
    assert.equal(progressNode.classList.contains('is-hovered'), false);

    progressHit.dispatchEvent({ type: 'focus' });
    assert.equal(progressNode.classList.contains('is-hovered'), true);
  } finally {
    global.document = previousDocument;
  }
});

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = {};
    this.children = [];
    this.dataset = {};
    this.eventListeners = new Map();
    this.style = {};
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

  set title(value) {
    this.setAttribute('title', value);
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
    },
    createElementNS(_namespace, tagName) {
      return new FakeElement(tagName);
    }
  };
}
