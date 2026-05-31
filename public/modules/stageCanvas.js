import { renderComponents } from './componentRenderer.js';

const DEFAULT_CANVAS = { width: 1920, height: 1080, background: 'paper' };

export function renderStage(container, options) {
  const { page, state, mode, selectedIds, onClearSelection } = options;
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

  container.onclick = () => {
    if (mode === 'edit') {
      onClearSelection?.();
    }
  };
}
