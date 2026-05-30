import { getNodeGraph } from './nodeContext.js';

const reportId = '2026-05-17-weekly-progress';

let payload = null;
let currentNodeId = 'root';
let mode = 'play';
let draftState = null;
let baseState = null;
let baseRevision = null;
let selectedIds = new Set();
let clipboard = null;

const elements = {
  tree: document.querySelector('#tree'),
  stage: document.querySelector('#stage'),
  nodeTitle: document.querySelector('#nodeTitle'),
  modeLabel: document.querySelector('#modeLabel'),
  editButton: document.querySelector('#editButton'),
  saveButton: document.querySelector('#saveButton'),
  discardButton: document.querySelector('#discardButton'),
  statusText: document.querySelector('#statusText'),
  reportTitle: document.querySelector('#reportTitle'),
  reportIdText: document.querySelector('#reportIdText'),
  revisionText: document.querySelector('#revisionText'),
  revisionList: document.querySelector('#revisionList'),
  selectionInfo: document.querySelector('#selectionInfo'),
  nodeMap: document.querySelector('#nodeMap')
};

elements.editButton.addEventListener('click', enterEditMode);
elements.discardButton.addEventListener('click', discardEditMode);
elements.saveButton.addEventListener('click', saveRevision);
window.addEventListener('keydown', handleKeydown);

await loadReport();

async function loadReport() {
  payload = await requestJson(`/api/reports/${reportId}`);
  currentNodeId = currentNodeId || payload.state.story_tree.root;
  if (!findNode(currentNodeId, payload.state)) {
    currentNodeId = payload.state.story_tree.root;
  }
  selectedIds.clear();
  render();
  setStatus('数据已载入');
}

function render() {
  const state = workingState();
  const node = findNode(currentNodeId, state);
  const page = findPage(currentNodeId, state);

  elements.modeLabel.textContent = mode === 'edit' ? '编辑模式' : '播放模式';
  elements.nodeTitle.textContent = node?.title || '未选择节点';
  elements.editButton.hidden = mode === 'edit';
  elements.saveButton.hidden = mode !== 'edit';
  elements.discardButton.hidden = mode !== 'edit';
  elements.reportTitle.textContent = payload.state.report.title;
  elements.reportIdText.textContent = payload.reportId;
  elements.revisionText.textContent = payload.patch.current_revision || 'base';

  renderTree(state);
  renderStage(state, page);
  renderNodeMap(state);
  renderInspector(state);
}

function renderTree(state) {
  const rootId = state.story_tree.root;
  const ordered = flattenTree(rootId, state);
  elements.tree.replaceChildren(
    ...ordered.map(({ node, depth }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `tree-node${node.id === currentNodeId ? ' active' : ''}`;
      button.innerHTML = `<span class="node-depth">${'·'.repeat(depth + 1)}</span>${node.title}`;
      button.addEventListener('click', () => {
        currentNodeId = node.id;
        selectedIds.clear();
        render();
      });
      return button;
    })
  );
}

function renderStage(state, page) {
  const canvas = page?.canvas || { width: 1920, height: 1080, background: 'paper' };
  const stageScale = elements.stage.clientWidth / canvas.width || 1;
  elements.stage.dataset.background = canvas.background || 'paper';
  elements.stage.replaceChildren();

  for (const component of page?.components || []) {
    const node = document.createElement('div');
    node.className = `component ${component.type}-component${selectedIds.has(component.id) ? ' selected' : ''}${mode === 'edit' ? ' editable' : ''}`;
    node.dataset.id = component.id;
    node.style.left = `${(component.x / canvas.width) * 100}%`;
    node.style.top = `${(component.y / canvas.height) * 100}%`;
    node.style.width = `${(component.width / canvas.width) * 100}%`;
    node.style.height = `${(component.height / canvas.height) * 100}%`;

    if (component.type === 'text') {
      const text = document.createElement('div');
      text.className = 'text-block';
      text.textContent = component.content;
      text.style.fontSize = `${(component.style?.size || 28) * stageScale}px`;
      text.style.fontWeight = component.style?.weight || 500;
      text.style.padding = `${18 * stageScale}px ${20 * stageScale}px`;
      text.contentEditable = mode === 'edit';
      text.addEventListener('input', () => {
        component.content = text.textContent;
      });
      node.append(text);
    }

    if (component.type === 'svg') {
      const block = document.createElement('div');
      block.className = 'svg-block';
      const asset = state.svg_assets.find((item) => item.id === component.svg_asset_id);
      block.innerHTML = `<img src="${asset?.path || ''}" alt="${asset?.title || component.id}">`;
      node.append(block);
    }

    if (mode === 'edit') {
      node.addEventListener('pointerdown', (event) => beginDrag(event, component, canvas));
      const resize = document.createElement('div');
      resize.className = 'resize-handle';
      resize.addEventListener('pointerdown', (event) => beginResize(event, component, canvas));
      node.append(resize);
    }

    node.addEventListener('click', (event) => {
      if (mode !== 'edit') return;
      event.stopPropagation();
      if (!event.shiftKey) selectedIds.clear();
      selectedIds.has(component.id) ? selectedIds.delete(component.id) : selectedIds.add(component.id);
      render();
    });

    elements.stage.append(node);
  }

  elements.stage.onclick = () => {
    if (mode === 'edit') {
      selectedIds.clear();
      render();
    }
  };
}

function renderNodeMap(state) {
  const graph = getNodeGraph(state, currentNodeId);
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const svg = createSvg('svg', {
    viewBox: '0 0 100 100',
    preserveAspectRatio: 'none',
    'aria-hidden': 'true'
  });
  const linkLayer = createSvg('g', { class: 'map-links' });
  const nodeLayer = createSvg('g', { class: 'map-nodes' });
  const hitLayer = document.createElement('div');
  hitLayer.className = 'map-hits';

  for (const link of graph.links) {
    const from = nodesById.get(link.from);
    const to = nodesById.get(link.to);
    if (!from || !to) continue;
    const line = createSvg('line', {
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y
    });
    line.style.opacity = String(Math.min(from.opacity, to.opacity));
    linkLayer.append(line);
  }

  for (const node of graph.nodes) {
    const radius = node.kind === 'current' ? 5.8 : node.kind === 'near' ? 4.5 : 3.4;
    const circle = createSvg('circle', {
      class: node.kind,
      cx: node.x,
      cy: node.y,
      r: radius
    });
    circle.style.opacity = String(node.opacity);
    nodeLayer.append(circle);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-hit';
    button.dataset.nodeId = node.id;
    button.setAttribute('aria-label', node.id);
    button.style.left = `${node.x}%`;
    button.style.top = `${node.y}%`;
    hitLayer.append(button);
  }

  svg.append(linkLayer, nodeLayer);
  elements.nodeMap.replaceChildren(svg, hitLayer);

  hitLayer.querySelectorAll('.map-hit').forEach((button) => {
    button.addEventListener('click', () => {
      currentNodeId = button.dataset.nodeId;
      selectedIds.clear();
      render();
    });
  });
}

function createSvg(tagName, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tagName);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function renderInspector(state) {
  if (!selectedIds.size) {
    elements.selectionInfo.textContent = '未选择';
  } else {
    elements.selectionInfo.innerHTML = [...selectedIds].map((id) => `<div>${id}</div>`).join('');
  }

  const revisions = payload.patch.revisions || [];
  const baseButton = revisionButton('base', null, payload.patch.current_revision === null);
  elements.revisionList.replaceChildren(baseButton, ...revisions.map((revision) => revisionButton(revision.id, revision.id, revision.id === payload.patch.current_revision)));
}

function revisionButton(label, revisionId, active) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `revision-item${active ? ' active' : ''}`;
  button.textContent = label;
  button.addEventListener('click', async () => {
    payload = await requestJson(`/api/reports/${reportId}/current-revision`, {
      method: 'POST',
      body: JSON.stringify({ revisionId })
    });
    mode = 'play';
    selectedIds.clear();
    render();
    setStatus(`已切换到 ${label}`);
  });
  return button;
}

function beginDrag(event, component, canvas) {
  if (event.target.classList.contains('resize-handle')) return;
  if (event.target.contentEditable === 'true') return;

  selectComponent(event, component.id);
  const start = pointerToCanvas(event, canvas);
  const originals = selectedComponents().map((item) => ({ id: item.id, x: item.x, y: item.y }));
  event.currentTarget.setPointerCapture(event.pointerId);

  const onMove = (moveEvent) => {
    const point = pointerToCanvas(moveEvent, canvas);
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    for (const original of originals) {
      const target = findComponent(original.id, workingState());
      target.x = Math.max(0, original.x + dx);
      target.y = Math.max(0, original.y + dy);
    }
    render();
  };

  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function beginResize(event, component, canvas) {
  event.stopPropagation();
  selectComponent(event, component.id);
  const start = pointerToCanvas(event, canvas);
  const original = { width: component.width, height: component.height };

  const onMove = (moveEvent) => {
    const point = pointerToCanvas(moveEvent, canvas);
    component.width = Math.max(120, original.width + point.x - start.x);
    component.height = Math.max(80, original.height + point.y - start.y);
    render();
  };

  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function selectComponent(event, id) {
  if (!event.shiftKey && !selectedIds.has(id)) selectedIds.clear();
  selectedIds.add(id);
}

function enterEditMode() {
  mode = 'edit';
  draftState = structuredClone(payload.state);
  baseState = structuredClone(payload.state);
  baseRevision = payload.patch.current_revision || null;
  selectedIds.clear();
  render();
  setStatus('编辑模式已开启');
}

function discardEditMode() {
  mode = 'play';
  draftState = null;
  baseState = null;
  baseRevision = null;
  selectedIds.clear();
  render();
  setStatus('已放弃未保存修改');
}

async function saveRevision() {
  const changes = diffStates(baseState, draftState);
  if (!changes.length) {
    discardEditMode();
    setStatus('没有需要保存的修改');
    return;
  }

  payload = await requestJson(`/api/reports/${reportId}/revisions`, {
    method: 'POST',
    body: JSON.stringify({
      baseRevision,
      summary: `保存 ${findNode(currentNodeId, draftState).title} 的前端修改`,
      changes
    })
  });

  mode = 'play';
  draftState = null;
  baseState = null;
  baseRevision = null;
  selectedIds.clear();
  render();
  setStatus(`已保存 ${changes.length} 项修改`);
}

function handleKeydown(event) {
  if (!payload) return;

  if ((event.metaKey || event.ctrlKey) && mode === 'edit') {
    if (event.key.toLowerCase() === 'c') {
      clipboard = { type: 'copy', nodeId: currentNodeId, ids: [...selectedIds] };
      setStatus('已复制组件');
      event.preventDefault();
    }
    if (event.key.toLowerCase() === 'x') {
      clipboard = { type: 'cut', nodeId: currentNodeId, ids: [...selectedIds] };
      removeSelectedFromDraft();
      render();
      setStatus('已剪切组件');
      event.preventDefault();
    }
    if (event.key.toLowerCase() === 'v') {
      pasteClipboard();
      event.preventDefault();
    }
  }

  if (mode === 'edit' && event.key === 'Delete' && selectedIds.size) {
    removeSelectedFromDraft();
    render();
    event.preventDefault();
  }

  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    if (mode === 'edit' && selectedIds.size) {
      nudgeSelected(event.key);
    } else {
      navigate(event.key);
    }
    event.preventDefault();
  }
}

function pasteClipboard() {
  if (!clipboard || !clipboard.ids.length) return;
  const state = workingState();
  const sourcePage = findPage(clipboard.nodeId, state);
  const targetPage = findPage(currentNodeId, state);
  const origin = { x: 260, y: 220 };

  clipboard.ids.forEach((id, index) => {
    const source = sourcePage.components.find((component) => component.id === id) || findComponent(id, payload.state);
    const component = structuredClone(source);
    if (clipboard.type === 'copy') {
      component.id = `${component.type}-${Date.now().toString(36)}-${index}`;
      component.created_from = { source_component_id: id, from_node_id: clipboard.nodeId };
    }
    component.x = origin.x + index * 34;
    component.y = origin.y + index * 34;
    targetPage.components.push(component);
    selectedIds.add(component.id);
  });

  if (clipboard.type === 'cut') clipboard = null;
  render();
  setStatus('已粘贴组件');
}

function removeSelectedFromDraft() {
  const state = workingState();
  for (const page of state.pages) {
    page.components = page.components.filter((component) => !selectedIds.has(component.id));
  }
}

function nudgeSelected(key) {
  const delta = {
    ArrowLeft: [-8, 0],
    ArrowRight: [8, 0],
    ArrowUp: [0, -8],
    ArrowDown: [0, 8]
  }[key];

  for (const id of selectedIds) {
    const component = findComponent(id, workingState());
    component.x = Math.max(0, component.x + delta[0]);
    component.y = Math.max(0, component.y + delta[1]);
  }
  render();
}

function navigate(key) {
  const state = workingState();
  const next = nextNodeId(currentNodeId, key, state);
  if (next && next !== currentNodeId) {
    currentNodeId = next;
    selectedIds.clear();
    render();
  }
}

function nextNodeId(nodeId, key, state) {
  const override = (state.navigation?.overrides || []).find((item) => item.node_id === nodeId);
  const direction = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[key];
  if (override?.[direction]) return override[direction];

  const node = findNode(nodeId, state);
  const siblings = node.parent ? findNode(node.parent, state).children : [node.id];
  const siblingIndex = siblings.indexOf(node.id);

  if (key === 'ArrowLeft') return node.parent || node.id;
  if (key === 'ArrowUp') return siblings[Math.max(0, siblingIndex - 1)] || node.id;
  if (key === 'ArrowDown') return siblings[Math.min(siblings.length - 1, siblingIndex + 1)] || node.id;
  if (key === 'ArrowRight') {
    if (node.children?.length) return node.children[0];
    const route = state.navigation?.linear_route || flattenTree(state.story_tree.root, state).map((item) => item.node.id);
    return route[Math.min(route.length - 1, route.indexOf(node.id) + 1)] || node.id;
  }
  return node.id;
}

function diffStates(before, after) {
  const changes = [];
  const beforeMap = componentMap(before);
  const afterMap = componentMap(after);

  for (const [id, beforeItem] of beforeMap) {
    const afterItem = afterMap.get(id);
    if (!afterItem) {
      changes.push({ op: 'delete_component', node_id: beforeItem.nodeId, component_id: id });
      continue;
    }
    if (beforeItem.nodeId !== afterItem.nodeId) {
      changes.push({
        op: 'move_components',
        component_ids: [id],
        from_node_id: beforeItem.nodeId,
        to_node_id: afterItem.nodeId,
        target_origin: { x: afterItem.component.x, y: afterItem.component.y }
      });
    }
    if (beforeItem.component.content !== afterItem.component.content) {
      changes.push({
        op: 'update_text',
        node_id: afterItem.nodeId,
        component_id: id,
        field: 'content',
        value: afterItem.component.content,
        source_status: 'manual'
      });
    }
    if (beforeItem.component.x !== afterItem.component.x || beforeItem.component.y !== afterItem.component.y) {
      changes.push({ op: 'move_component', node_id: afterItem.nodeId, component_id: id, x: afterItem.component.x, y: afterItem.component.y });
    }
    if (beforeItem.component.width !== afterItem.component.width || beforeItem.component.height !== afterItem.component.height) {
      changes.push({ op: 'resize_component', node_id: afterItem.nodeId, component_id: id, width: afterItem.component.width, height: afterItem.component.height });
    }
  }

  for (const [id, afterItem] of afterMap) {
    if (beforeMap.has(id) || !afterItem.component.created_from) continue;
    changes.push({
      op: 'copy_components',
      source_component_ids: [afterItem.component.created_from.source_component_id],
      from_node_id: afterItem.component.created_from.from_node_id,
      to_node_id: afterItem.nodeId,
      new_components: [{ id, type: afterItem.component.type, x: afterItem.component.x, y: afterItem.component.y }]
    });
  }

  return changes;
}

function componentMap(state) {
  const map = new Map();
  for (const page of state.pages || []) {
    for (const component of page.components || []) {
      map.set(component.id, { nodeId: page.node_id, component });
    }
  }
  return map;
}

function pointerToCanvas(event, canvas) {
  const rect = elements.stage.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

function selectedComponents() {
  return [...selectedIds].map((id) => findComponent(id, workingState()));
}

function workingState() {
  return mode === 'edit' ? draftState : payload.state;
}

function findNode(nodeId, state) {
  return state.story_tree.nodes.find((node) => node.id === nodeId);
}

function findPage(nodeId, state) {
  return state.pages.find((page) => page.node_id === nodeId);
}

function findComponent(componentId, state) {
  for (const page of state.pages || []) {
    const component = page.components.find((item) => item.id === componentId);
    if (component) return component;
  }
  return null;
}

function flattenTree(nodeId, state, depth = 0) {
  const node = findNode(nodeId, state);
  if (!node) return [];
  return [
    { node, depth },
    ...(node.children || []).flatMap((childId) => flattenTree(childId, state, depth + 1))
  ];
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

function setStatus(message) {
  elements.statusText.textContent = message;
}
