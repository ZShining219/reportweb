import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  beginStagePan,
  createStageViewportState,
  endStagePan,
  getStageViewportStyle,
  handleStageViewportKey,
  updateStagePan
} from '../public/modules/stageViewport.js';

test('stage viewport pans with Space and left pointer drag', () => {
  const viewport = createStageViewportState();

  assert.equal(handleStageViewportKey(viewport, { type: 'keydown', code: 'Space', target: plainTarget() }), true);
  assert.equal(viewport.spaceActive, true);
  assert.equal(beginStagePan(viewport, { button: 0, clientX: 100, clientY: 80, target: plainTarget() }), true);

  updateStagePan(viewport, { clientX: 135, clientY: 68 });

  assert.equal(viewport.x, 35);
  assert.equal(viewport.y, -12);
  assert.deepEqual(getStageViewportStyle(viewport), {
    transform: 'translate(35px, -12px)',
    cursor: 'grabbing'
  });

  endStagePan(viewport);
  assert.equal(viewport.drag, null);
  assert.equal(handleStageViewportKey(viewport, { type: 'keyup', code: 'Space', target: plainTarget() }), true);
  assert.equal(viewport.spaceActive, false);
});

test('stage viewport pans with middle pointer drag without keyboard state', () => {
  const viewport = createStageViewportState({ x: 10, y: 16 });

  assert.equal(beginStagePan(viewport, { button: 1, clientX: 42, clientY: 50, target: plainTarget() }), true);
  updateStagePan(viewport, { clientX: 32, clientY: 86 });

  assert.equal(viewport.x, 0);
  assert.equal(viewport.y, 52);
});

test('stage viewport does not capture Space while text is being edited', () => {
  const viewport = createStageViewportState();
  const textTarget = { isContentEditable: true, tagName: 'DIV' };
  textTarget.ownerDocument = { activeElement: textTarget };

  assert.equal(handleStageViewportKey(viewport, { type: 'keydown', code: 'Space', target: textTarget }), false);
  assert.equal(viewport.spaceActive, false);
  assert.equal(beginStagePan(viewport, { button: 0, clientX: 0, clientY: 0, target: textTarget }), false);
});

test('stage viewport still pans over editable text when text is not focused', () => {
  const viewport = createStageViewportState();
  const textTarget = { isContentEditable: true, tagName: 'DIV', ownerDocument: { activeElement: plainTarget() } };

  handleStageViewportKey(viewport, { type: 'keydown', code: 'Space', target: plainTarget() });

  assert.equal(beginStagePan(viewport, { button: 0, clientX: 0, clientY: 0, target: textTarget }), true);
});

function plainTarget() {
  return { isContentEditable: false, tagName: 'DIV' };
}
