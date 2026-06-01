import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createNarrativeIslandViewModel, renderNarrativeIsland } from '../public/modules/narrativeIsland.js';

const state = {
  story_tree: {
    root: 'root',
    nodes: [
      { id: 'root', title: '汇报入口', parent: null, children: ['progress', 'next-plan'] },
      { id: 'progress', title: '当前进展', parent: 'root', children: ['data-model'] },
      { id: 'data-model', title: '数据层结构', parent: 'progress', children: [] },
      { id: 'next-plan', title: '下一步计划', parent: 'root', children: [] }
    ]
  },
  navigation: {
    linear_route: ['root', 'progress', 'data-model', 'next-plan']
  }
};

test('narrative island model describes current node parent and next route item', () => {
  const model = createNarrativeIslandViewModel({ state, currentNodeId: 'progress', expanded: false });

  assert.equal(model.currentTitle, '当前进展');
  assert.equal(model.parentTitle, '汇报入口');
  assert.equal(model.nextTitle, '数据层结构');
  assert.equal(model.nextLabel, '下一步：数据层结构');
  assert.equal(model.childCount, 1);
  assert.equal(model.expanded, false);
});

test('narrative island model marks terminal nodes when route has no next item', () => {
  const model = createNarrativeIslandViewModel({ state, currentNodeId: 'next-plan', expanded: true });

  assert.equal(model.currentTitle, '下一步计划');
  assert.equal(model.parentTitle, '汇报入口');
  assert.equal(model.nextTitle, null);
  assert.equal(model.nextLabel, '末端节点');
  assert.equal(model.expanded, true);
});

test('narrative island renderer toggles from the current-node button and mounts expanded map slot', () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;

  try {
    const container = new FakeElement('div');
    const calls = [];
    const renderedSlots = [];
    const model = createNarrativeIslandViewModel({ state, currentNodeId: 'progress', expanded: true });

    renderNarrativeIsland(container, model, {
      onToggle: () => calls.push('toggle'),
      renderMap: (slot) => renderedSlots.push(slot)
    });

    const root = container.children[0];
    const currentButton = root.findAll((node) => node.classList.contains('narrative-island__current-button'))[0];
    const mapSlot = root.findAll((node) => node.classList.contains('narrative-island__map'))[0];

    assert.equal(root.classList.contains('narrative-island--expanded'), true);
    assert.equal(currentButton.attributes['aria-expanded'], 'true');
    assert.equal(mapSlot.classList.contains('node-navigator'), true);
    assert.equal(currentButton.textContent.includes('当前进展'), true);
    assert.equal(root.textContent.includes('汇报入口'), true);
    assert.equal(root.textContent.includes('下一步：数据层结构'), true);
    assert.equal(renderedSlots[0], mapSlot);

    currentButton.dispatchEvent({ type: 'click' });
    assert.deepEqual(calls, ['toggle']);
  } finally {
    global.document = previousDocument;
  }
});

test('narrative island renderer keeps the map mounted during closing animation', () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;

  try {
    const container = new FakeElement('div');
    const renderedSlots = [];
    const model = createNarrativeIslandViewModel({
      state,
      currentNodeId: 'progress',
      expanded: false,
      closing: true
    });

    renderNarrativeIsland(container, model, {
      renderMap: (slot) => renderedSlots.push(slot)
    });

    const root = container.children[0];
    const currentButton = root.findAll((node) => node.classList.contains('narrative-island__current-button'))[0];
    const mapSlot = root.findAll((node) => node.classList.contains('narrative-island__map'))[0];

    assert.equal(root.classList.contains('narrative-island--closing'), true);
    assert.equal(root.classList.contains('narrative-island--expanded'), false);
    assert.equal(currentButton.attributes['aria-expanded'], 'false');
    assert.equal(mapSlot.classList.contains('node-navigator'), true);
    assert.equal(renderedSlots[0], mapSlot);
  } finally {
    global.document = previousDocument;
  }
});

test('narrative island renderer exposes persistent position and drag callback', () => {
  const previousDocument = global.document;
  const document = createFakeDocument();
  global.document = document;

  try {
    const container = new FakeElement('div');
    const dragEvents = [];
    const model = createNarrativeIslandViewModel({
      state,
      currentNodeId: 'progress',
      position: { x: 18, y: -12 },
      dragging: true
    });

    renderNarrativeIsland(container, model, {
      onBeginDrag: (event) => dragEvents.push(event)
    });

    const root = container.children[0];
    const rail = root.findAll((node) => node.classList.contains('narrative-island__rail'))[0];

    assert.equal(root.classList.contains('narrative-island--dragging'), true);
    assert.equal(root.style.getPropertyValue('--narrative-island-x'), '18px');
    assert.equal(root.style.getPropertyValue('--narrative-island-y'), '-12px');

    const event = { type: 'pointerdown', button: 0 };
    rail.dispatchEvent(event);
    assert.deepEqual(dragEvents, [event]);
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
    this.styleValues = new Map();
    this.style = {
      setProperty: (name, value) => this.styleValues.set(name, String(value)),
      getPropertyValue: (name) => this.styleValues.get(name) || ''
    };
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
