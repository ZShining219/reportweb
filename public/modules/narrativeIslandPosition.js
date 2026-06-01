const STORAGE_PREFIX = 'reportweb:narrativeIsland';
const STORAGE_VERSION = 'position:v1';

export function createNarrativeIslandPositionState(initial = {}) {
  return {
    x: initial.x ?? 0,
    y: initial.y ?? 0,
    dragging: false,
    drag: null
  };
}

export function beginNarrativeIslandDrag(position, event) {
  if (event.button !== 0) return false;

  position.dragging = true;
  position.drag = {
    startX: event.clientX,
    startY: event.clientY,
    originX: position.x,
    originY: position.y
  };
  return true;
}

export function updateNarrativeIslandDrag(position, event) {
  if (!position.drag) return false;

  position.x = position.drag.originX + event.clientX - position.drag.startX;
  position.y = position.drag.originY + event.clientY - position.drag.startY;
  return true;
}

export function endNarrativeIslandDrag(position) {
  position.dragging = false;
  position.drag = null;
}

export function loadNarrativeIslandPosition(storage, reportId) {
  if (!storage || !reportId) return null;

  try {
    const raw = storage.getItem(getNarrativeIslandStorageKey(reportId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isFiniteNumber(parsed?.x) || !isFiniteNumber(parsed?.y)) return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

export function saveNarrativeIslandPosition(storage, reportId, position) {
  if (!storage || !reportId || !position) return false;
  if (!isFiniteNumber(position.x) || !isFiniteNumber(position.y)) return false;

  try {
    storage.setItem(getNarrativeIslandStorageKey(reportId), JSON.stringify({
      x: Math.round(position.x),
      y: Math.round(position.y)
    }));
    return true;
  } catch {
    return false;
  }
}

export function getNarrativeIslandStorageKey(reportId) {
  return `${STORAGE_PREFIX}:${reportId}:${STORAGE_VERSION}`;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}
