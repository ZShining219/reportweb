import { renderComponents } from './componentRenderer.js';
import { applyStageViewport } from './stageViewport.js';

const DEFAULT_CANVAS = { width: 1920, height: 1080, background: 'paper' };
const PAN_POINTER_DOWN_KEY = '__stagePanPointerDown';

export function renderStage(container, options) {
  const {
    page,
    state,
    mode,
    selectedIds,
    stageViewport,
    onBeginStagePan,
    onStagePanMove,
    onEndStagePan,
    onClearSelection
  } = options;
  const canvas = page?.canvas || DEFAULT_CANVAS;
  const stageScale = container.clientWidth / canvas.width || 1;

  container.dataset.background = canvas.background || 'paper';
  container.replaceChildren();
  renderComponents(container, {
    ...options,
    components: page?.components || [],
    canvas,
    stageScale,
    svgAssets: state.svg_assets || []
  });
  bindStagePan(container, { stageViewport, onBeginStagePan, onStagePanMove, onEndStagePan });
  if (stageViewport) {
    applyStageViewport(container, stageViewport);
  }

  container.onclick = () => {
    if (mode === 'edit') {
      onClearSelection?.();
    }
  };
}

function bindStagePan(container, options) {
  const previous = container[PAN_POINTER_DOWN_KEY];
  if (previous) {
    container.removeEventListener('pointerdown', previous, true);
  }

  const { stageViewport, onBeginStagePan, onStagePanMove, onEndStagePan } = options;
  if (!stageViewport || !onBeginStagePan || !onStagePanMove) return;

  const onPointerDown = (event) => {
    if (!onBeginStagePan(event)) return;

    event.preventDefault();
    event.stopPropagation();
    container.setPointerCapture?.(event.pointerId);
    applyStageViewport(container, stageViewport);

    const onPointerMove = (moveEvent) => {
      onStagePanMove(moveEvent);
      applyStageViewport(container, stageViewport);
    };
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      onEndStagePan?.();
      applyStageViewport(container, stageViewport);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  container[PAN_POINTER_DOWN_KEY] = onPointerDown;
  container.addEventListener('pointerdown', onPointerDown, true);
}
