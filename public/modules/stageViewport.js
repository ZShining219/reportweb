export function createStageViewportState(initial = {}) {
  return {
    x: initial.x ?? 0,
    y: initial.y ?? 0,
    spaceActive: false,
    drag: null
  };
}

export function handleStageViewportKey(viewport, event) {
  if (!isSpaceKey(event) || isEditableTarget(event.target)) return false;

  viewport.spaceActive = event.type === 'keydown';
  return true;
}

export function beginStagePan(viewport, event) {
  if (isEditableTarget(event.target)) return false;

  const isMiddleDrag = event.button === 1;
  const isSpaceLeftDrag = viewport.spaceActive && event.button === 0;
  if (!isMiddleDrag && !isSpaceLeftDrag) return false;

  viewport.drag = {
    startX: event.clientX,
    startY: event.clientY,
    originX: viewport.x,
    originY: viewport.y
  };
  return true;
}

export function updateStagePan(viewport, event) {
  if (!viewport.drag) return false;

  viewport.x = viewport.drag.originX + event.clientX - viewport.drag.startX;
  viewport.y = viewport.drag.originY + event.clientY - viewport.drag.startY;
  return true;
}

export function endStagePan(viewport) {
  viewport.drag = null;
}

export function applyStageViewport(container, viewport) {
  const style = getStageViewportStyle(viewport);
  container.style.transform = style.transform;
  container.style.cursor = style.cursor;
  container.classList.toggle('is-stage-pan-ready', viewport.spaceActive && !viewport.drag);
  container.classList.toggle('is-stage-panning', Boolean(viewport.drag));
}

export function getStageViewportStyle(viewport) {
  return {
    transform: `translate(${Math.round(viewport.x)}px, ${Math.round(viewport.y)}px)`,
    cursor: viewport.drag ? 'grabbing' : viewport.spaceActive ? 'grab' : ''
  };
}

function isSpaceKey(event) {
  return event.code === 'Space' || event.key === ' ';
}

function isEditableTarget(target) {
  if (!target) return false;
  const tagName = target.tagName?.toLowerCase();
  const activeElement = target.ownerDocument?.activeElement;
  return Boolean(
    (target.isContentEditable && activeElement === target) ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select'
  );
}
