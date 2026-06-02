import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resetStageSurface } from '../public/modules/stageCanvas.js';

test('reset stage surface clears report canvas state before project board rendering', () => {
  const pointerHandler = () => {};
  const stage = new FakeStageElement();
  stage.dataset.background = 'slate';
  stage.style.transform = 'translate(42px, -8px)';
  stage.style.cursor = 'grabbing';
  stage.classList.add('is-stage-pan-ready', 'is-stage-panning', 'stage--project-board');
  stage.onclick = () => {};
  stage.__stagePanPointerDown = pointerHandler;
  stage.addEventListener('pointerdown', pointerHandler, true);

  resetStageSurface(stage);

  assert.equal(stage.dataset.background, undefined);
  assert.equal(stage.style.transform, '');
  assert.equal(stage.style.cursor, '');
  assert.equal(stage.classList.contains('is-stage-pan-ready'), false);
  assert.equal(stage.classList.contains('is-stage-panning'), false);
  assert.equal(stage.classList.contains('stage--project-board'), true);
  assert.equal(stage.onclick, null);
  assert.equal(stage.__stagePanPointerDown, null);
  assert.deepEqual(stage.removedListeners, [
    { type: 'pointerdown', handler: pointerHandler, options: true }
  ]);
});

class FakeStageElement {
  constructor() {
    this.dataset = {};
    this.style = {
      transform: '',
      cursor: ''
    };
    this.onclick = null;
    this.listeners = [];
    this.removedListeners = [];
    this.classTokens = new Set();
    this.classList = {
      add: (...tokens) => tokens.forEach((token) => this.classTokens.add(token)),
      remove: (...tokens) => tokens.forEach((token) => this.classTokens.delete(token)),
      contains: (token) => this.classTokens.has(token)
    };
  }

  addEventListener(type, handler, options) {
    this.listeners.push({ type, handler, options });
  }

  removeEventListener(type, handler, options) {
    this.removedListeners.push({ type, handler, options });
  }
}
