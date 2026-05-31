export function createInspectorViewModel({
  reportId = '',
  reportTitle = '',
  currentRevision = null,
  currentNode = null,
  selectedComponents = [],
  dirty = false
} = {}) {
  const nodeStatus = currentNode?.status || {};

  return {
    reportId,
    reportTitle,
    currentRevision,
    currentRevisionLabel: currentRevision || 'base',
    currentNodeId: currentNode?.id || '',
    currentNodeTitle: currentNode?.title || '未选择节点',
    sourceStatus: nodeStatus.source || '',
    displayStatus: nodeStatus.display || '',
    selection: createSelectionModel(selectedComponents),
    dirtyLabel: dirty ? '待保存' : ''
  };
}

export function renderInspectorPanel(container, model, _callbacks = {}) {
  const doc = container.ownerDocument || document;
  const root = doc.createElement('section');
  root.className = 'inspector-panel ui-panel';

  const title = doc.createElement('h2');
  title.textContent = model.reportTitle || '未命名汇报';
  root.append(title);

  const reportMeta = doc.createElement('dl');
  reportMeta.className = 'ui-meta-grid';
  reportMeta.append(
    createDefinitionRow(doc, '报告 ID', model.reportId),
    createDefinitionRow(doc, '当前 revision', model.currentRevisionLabel),
    createDefinitionRow(doc, '当前节点', model.currentNodeTitle),
    createDefinitionRow(doc, '来源状态', model.sourceStatus),
    createDefinitionRow(doc, '显示状态', model.displayStatus)
  );
  root.append(reportMeta);

  if (model.dirtyLabel) {
    const dirty = doc.createElement('span');
    dirty.className = 'ui-status ui-status--edit';
    dirty.textContent = model.dirtyLabel;
    root.append(dirty);
  }

  const selectionSection = doc.createElement('section');
  selectionSection.className = 'inspector-panel__selection';

  const selectionTitle = doc.createElement('h3');
  selectionTitle.textContent = model.selection.label;
  selectionSection.append(selectionTitle);

  const selectionMeta = doc.createElement('dl');
  selectionMeta.className = 'ui-meta-grid';
  for (const [term, value] of selectionRows(model.selection)) {
    selectionMeta.append(createDefinitionRow(doc, term, value));
  }
  selectionSection.append(selectionMeta);

  root.append(selectionSection);
  container.replaceChildren(root);
}

function createSelectionModel(selectedComponents = []) {
  if (!selectedComponents.length) {
    return {
      kind: 'empty',
      count: 0,
      label: '未选择',
      meta: {}
    };
  }

  if (selectedComponents.length > 1) {
    return {
      kind: 'multiple',
      count: selectedComponents.length,
      label: `已选择 ${selectedComponents.length} 个组件`,
      meta: {}
    };
  }

  const component = selectedComponents[0];
  return {
    kind: 'single',
    count: 1,
    label: component.id || '未命名组件',
    meta: {
      id: component.id || '',
      type: component.type || '',
      position: formatPosition(component),
      size: formatSize(component),
      sourceStatus: component.source_status || component.sourceStatus || component.status?.source || ''
    }
  };
}

function selectionRows(selection) {
  if (selection.kind !== 'single') {
    return [];
  }

  return [
    ['组件 ID', selection.meta.id],
    ['类型', selection.meta.type],
    ['位置', selection.meta.position],
    ['尺寸', selection.meta.size],
    ['来源状态', selection.meta.sourceStatus]
  ];
}

function createDefinitionRow(doc, term, value) {
  const row = doc.createElement('div');
  const dt = doc.createElement('dt');
  const dd = doc.createElement('dd');
  dt.textContent = term;
  dd.textContent = value || '-';
  row.append(dt, dd);
  return row;
}

function formatPosition(component) {
  const x = component.x ?? component.position?.x ?? 0;
  const y = component.y ?? component.position?.y ?? 0;
  return `${x}, ${y}`;
}

function formatSize(component) {
  const width = component.width ?? component.size?.width ?? 0;
  const height = component.height ?? component.size?.height ?? 0;
  return `${width} x ${height}`;
}
