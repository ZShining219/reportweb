import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  beginNarrativeIslandDrag,
  createNarrativeIslandPositionState,
  endNarrativeIslandDrag,
  getNarrativeIslandStorageKey,
  loadNarrativeIslandPosition,
  saveNarrativeIslandPosition,
  updateNarrativeIslandDrag
} from '../public/modules/narrativeIslandPosition.js';

test('narrative island position updates from pointer drag deltas', () => {
  const position = createNarrativeIslandPositionState({ x: 12, y: -8 });

  assert.equal(beginNarrativeIslandDrag(position, { button: 0, clientX: 100, clientY: 70 }), true);
  updateNarrativeIslandDrag(position, { clientX: 136, clientY: 54 });

  assert.equal(position.x, 48);
  assert.equal(position.y, -24);
  assert.equal(position.dragging, true);

  endNarrativeIslandDrag(position);
  assert.equal(position.drag, null);
  assert.equal(position.dragging, false);
});

test('narrative island position persists per report id', () => {
  const storage = createMemoryStorage();
  const reportId = 'weekly-progress';
  const position = createNarrativeIslandPositionState({ x: 44, y: 18 });

  saveNarrativeIslandPosition(storage, reportId, position);

  assert.equal(getNarrativeIslandStorageKey(reportId), 'reportweb:narrativeIsland:weekly-progress:position:v1');
  assert.deepEqual(loadNarrativeIslandPosition(storage, reportId), { x: 44, y: 18 });
  assert.equal(loadNarrativeIslandPosition(storage, 'other-report'), null);
});

test('narrative island position ignores malformed stored values', () => {
  const storage = createMemoryStorage();
  storage.setItem(getNarrativeIslandStorageKey('broken'), JSON.stringify({ x: 'left', y: 10 }));
  storage.setItem(getNarrativeIslandStorageKey('invalid-json'), '{');

  assert.equal(loadNarrativeIslandPosition(storage, 'broken'), null);
  assert.equal(loadNarrativeIslandPosition(storage, 'invalid-json'), null);
});

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}
