export function renderComponents(container, options) {
  const fragment = document.createDocumentFragment();
  for (const component of options.components || []) {
    fragment.append(createComponentElement(component, options));
  }
  container.append(fragment);
}

function createComponentElement(component, options) {
  const {
    canvas,
    mode,
    selectedIds,
    stageScale,
    svgAssets,
    onBeginDrag,
    onBeginResize,
    onSelectComponent,
    onTextInput,
    onMoveIntent,
    onResizeIntent,
    onTextIntent
  } = options;
  const node = document.createElement('div');
  node.className = `component ${component.type}-component${selectedIds.has(component.id) ? ' selected' : ''}${mode === 'edit' ? ' editable' : ''}`;
  node.dataset.id = component.id;
  node.style.left = `${(component.x / canvas.width) * 100}%`;
  node.style.top = `${(component.y / canvas.height) * 100}%`;
  node.style.width = `${(component.width / canvas.width) * 100}%`;
  node.style.height = `${(component.height / canvas.height) * 100}%`;

  if (component.type === 'text') {
    node.append(createTextBlock(component, mode, stageScale, onTextInput, onTextIntent));
  }

  if (component.type === 'svg') {
    node.append(createSvgBlock(component, svgAssets));
  }

  if (mode === 'edit') {
    node.addEventListener('pointerdown', (event) => onBeginDrag?.(event, component, canvas));
    const move = document.createElement('div');
    move.className = 'move-handle';
    move.title = '拖动移动组件';
    move.setAttribute('aria-label', '拖动移动组件');
    move.addEventListener('pointerenter', () => onMoveIntent?.(component));
    move.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      onBeginDrag?.(event, component, canvas);
    });
    move.addEventListener('click', (event) => event.stopPropagation());
    const resize = document.createElement('div');
    resize.className = 'resize-handle';
    resize.title = '拖动调整尺寸';
    resize.setAttribute('aria-label', '拖动调整尺寸');
    resize.addEventListener('pointerenter', () => onResizeIntent?.(component));
    resize.addEventListener('pointerdown', (event) => onBeginResize?.(event, component, canvas));
    resize.addEventListener('click', (event) => event.stopPropagation());
    node.append(move, resize);
  }

  node.addEventListener('click', (event) => {
    if (mode !== 'edit') return;
    event.stopPropagation();
    onSelectComponent?.(event, component.id);
  });

  return node;
}

function createTextBlock(component, mode, stageScale, onTextInput, onTextIntent) {
  const text = document.createElement('div');
  text.className = 'text-block';
  text.textContent = component.content;
  text.style.fontSize = `${(component.style?.size || 28) * stageScale}px`;
  text.style.fontWeight = component.style?.weight || 500;
  text.style.padding = `${18 * stageScale}px ${20 * stageScale}px`;
  text.contentEditable = mode === 'edit';
  text.addEventListener('focus', () => onTextIntent?.(component));
  text.addEventListener('input', () => onTextInput?.(component, text.textContent));
  return text;
}

function createSvgBlock(component, svgAssets) {
  const block = document.createElement('div');
  block.className = 'svg-block';
  const asset = svgAssets.find((item) => item.id === component.svg_asset_id);
  const image = document.createElement('img');
  image.src = asset?.path || '';
  image.alt = asset?.title || component.id;
  block.append(image);
  return block;
}
