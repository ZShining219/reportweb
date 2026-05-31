import { renderNodeNavigator } from './nodeNavigator.js';
import { createReportApi } from './modules/reportApi.js';
import { diffStates } from './modules/patchDiff.js';
import { renderStage as renderStageCanvas } from './modules/stageCanvas.js';
import {
  applyStageViewport,
  beginStagePan,
  createStageViewportState,
  endStagePan,
  handleStageViewportKey,
  updateStagePan
} from './modules/stageViewport.js';
import { createEditFeedbackModel, renderEditFeedback } from './modules/editFeedback.js';
import { createInspectorViewModel, renderInspectorPanel } from './modules/inspectorPanel.js';
import { createRevisionViewModel, renderRevisionPanel } from './modules/revisionPanel.js';
import { createTreeListModel, renderTreeList } from './modules/treeList.js';

const reportId = '2026-05-17-weekly-progress';
const reportApi = createReportApi();

let payload = null;
let currentNodeId = 'root';
let mode = 'play';
let draftState = null;
let baseState = null;
let baseRevision = null;
let selectedIds = new Set();
let clipboard = null;
let editFeedback = { active: false };
let collapsedNodeIds = new Set();
let openDrawers = new Set();
let stageViewport = createStageViewportState();

const elements = {
  app: document.querySelector('#app'),
  treePanel: document.querySelector('#treePanel'),
  treeDrawerToggle: document.querySelector('#treeDrawerToggle'),
  inspectorDrawerToggle: document.querySelector('#inspectorDrawerToggle'),
  tree: document.querySelector('#tree'),
  stage: document.querySelector('#stage'),
  nodeTitle: document.querySelector('#nodeTitle'),
  modeLabel: document.querySelector('#modeLabel'),
  editButton: document.querySelector('#editButton'),
  saveButton: document.querySelector('#saveButton'),
  discardButton: document.querySelector('#discardButton'),
  statusText: document.querySelector('#statusText'),
  editFeedbackDock: document.querySelector('#editFeedbackDock'),
  reportTitle: document.querySelector('#reportTitle'),
  reportIdText: document.querySelector('#reportIdText'),
  revisionText: document.querySelector('#revisionText'),
  revisionList: document.querySelector('#revisionList'),
  selectionInfo: document.querySelector('#selectionInfo'),
  nodeMap: document.querySelector('#nodeMap'),
  inspector: document.querySelector('#inspector')
};

elements.editButton.addEventListener('click', enterEditMode);
elements.discardButton.addEventListener('click', discardEditMode);
elements.saveButton.addEventListener('click', saveRevision);
elements.treeDrawerToggle.addEventListener('click', () => toggleDrawer('left'));
elements.inspectorDrawerToggle.addEventListener('click', () => toggleDrawer('right'));
window.addEventListener('keydown', handleKeydown);
window.addEventListener('keyup', handleKeyup);
syncDrawerState();

await loadReport();

async function loadReport() {
  payload = await reportApi.loadReport(reportId);
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
  renderTree(state);
  renderStageCanvas(elements.stage, {
    state,
    page,
    mode,
    selectedIds,
    stageViewport,
    onBeginStagePan(event) {
      return beginStagePan(stageViewport, event);
    },
    onStagePanMove(event) {
      return updateStagePan(stageViewport, event);
    },
    onEndStagePan() {
      endStagePan(stageViewport);
    },
    onBeginDrag: beginDrag,
    onBeginResize: beginResize,
    onSelectComponent(event, id) {
      toggleComponentSelection(event, id);
      render();
    },
    onTextInput(component, value) {
      component.content = value;
      showEditFeedback('text', component, { dirty: true });
    },
    onTextIntent(component) {
      showEditFeedback('text', component);
    },
    onMoveIntent(component) {
      showEditFeedback('move', component, { delta: { x: 0, y: 0 } });
    },
    onResizeIntent(component) {
      showEditFeedback('resize', component, { size: { width: Math.round(component.width), height: Math.round(component.height) } });
    },
    onClearSelection() {
      selectedIds.clear();
      clearEditFeedback();
      render();
    }
  });
  renderEditFeedback(elements.editFeedbackDock, editFeedback);
  renderNodeMap(state);
  renderInspector(state);
}

function renderTree(state) {
  renderTreeList(elements.tree, createTreeListModel(state, currentNodeId, collapsedNodeIds), {
    onSelectNode(nodeId) {
      currentNodeId = nodeId;
      selectedIds.clear();
      clearEditFeedback();
      render();
    },
    onToggleNode(nodeId, expanded) {
      if (expanded) {
        collapsedNodeIds.delete(nodeId);
      } else {
        collapsedNodeIds.add(nodeId);
      }
      render();
    }
  });
}

function renderNodeMap(state) {
  renderNodeNavigator(elements.nodeMap, {
    state,
    currentNodeId,
    onSelect(nodeId) {
      currentNodeId = nodeId;
      selectedIds.clear();
      render();
    }
  });
}

function renderInspector(state) {
  const selected = selectedComponents().filter(Boolean);
  const inspectorModel = createInspectorViewModel({
    reportId: payload.reportId,
    reportTitle: payload.state.report.title,
    currentRevision: payload.patch.current_revision || null,
    currentNode: findNode(currentNodeId, state),
    selectedComponents: selected,
    dirty: isDirty()
  });
  const revisions = payload.patch.revisions || [];
  const revisionModel = createRevisionViewModel({
    currentRevision: payload.patch.current_revision || null,
    revisions
  });
  const wrapper = document.createElement('div');
  const inspectorContainer = document.createElement('section');
  const revisionContainer = document.createElement('section');
  renderInspectorPanel(inspectorContainer, inspectorModel);
  renderRevisionPanel(revisionContainer, revisionModel, {
    onSelectRevision: async (revisionId) => {
      payload = await reportApi.setCurrentRevision(reportId, revisionId);
      mode = 'play';
      draftState = null;
      baseState = null;
      baseRevision = null;
      selectedIds.clear();
      clearEditFeedback();
      render();
      setStatus(`已切换到 ${revisionId || 'base'}`);
    }
  });
  wrapper.append(inspectorContainer, revisionContainer);
  elements.inspector.replaceChildren(wrapper);
}

function toggleDrawer(side) {
  setDrawerState(side, !openDrawers.has(side));
}

function setDrawerState(side, isOpen) {
  if (isOpen) {
    openDrawers.add(side);
  } else {
    openDrawers.delete(side);
  }
  syncDrawerState();
}

function closeDrawers() {
  openDrawers = new Set();
  syncDrawerState();
}

function syncDrawerState() {
  const leftOpen = openDrawers.has('left');
  const rightOpen = openDrawers.has('right');
  elements.app.setAttribute('data-left-drawer', leftOpen ? 'open' : 'closed');
  elements.app.setAttribute('data-right-drawer', rightOpen ? 'open' : 'closed');
  elements.treePanel.setAttribute('aria-hidden', leftOpen ? 'false' : 'true');
  elements.inspector.setAttribute('aria-hidden', rightOpen ? 'false' : 'true');
  elements.treeDrawerToggle.setAttribute('aria-expanded', leftOpen ? 'true' : 'false');
  elements.inspectorDrawerToggle.setAttribute('aria-expanded', rightOpen ? 'true' : 'false');
}

function beginDrag(event, component, canvas) {
  if (event.target.classList.contains('resize-handle')) return;
  if (event.target.contentEditable === 'true') return;

  selectComponent(event, component.id);
  const start = pointerToCanvas(event, canvas);
  const originals = selectedComponents().map((item) => ({ id: item.id, x: item.x, y: item.y }));
  showEditFeedback('move', component, { delta: { x: 0, y: 0 } });
  event.currentTarget.setPointerCapture(event.pointerId);

  const onMove = (moveEvent) => {
    const point = pointerToCanvas(moveEvent, canvas);
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    showEditFeedback('move', component, { delta: { x: Math.round(dx), y: Math.round(dy) } });
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
  showEditFeedback('resize', component, { size: original });

  const onMove = (moveEvent) => {
    const point = pointerToCanvas(moveEvent, canvas);
    component.width = Math.max(120, original.width + point.x - start.x);
    component.height = Math.max(80, original.height + point.y - start.y);
    showEditFeedback('resize', component, {
      size: { width: Math.round(component.width), height: Math.round(component.height) }
    });
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
  const component = findComponent(id, workingState());
  showEditFeedback('select', component);
}

function toggleComponentSelection(event, id) {
  if (!event.shiftKey) selectedIds.clear();
  selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
  const component = findComponent(id, workingState());
  showEditFeedback('select', component);
}

function enterEditMode() {
  mode = 'edit';
  draftState = structuredClone(payload.state);
  baseState = structuredClone(payload.state);
  baseRevision = payload.patch.current_revision || null;
  selectedIds.clear();
  clearEditFeedback();
  render();
  setStatus('编辑模式已开启');
}

function discardEditMode() {
  mode = 'play';
  draftState = null;
  baseState = null;
  baseRevision = null;
  selectedIds.clear();
  clearEditFeedback();
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

  payload = await reportApi.saveRevision(reportId, {
    baseRevision,
    summary: `保存 ${findNode(currentNodeId, draftState).title} 的前端修改`,
    changes
  });

  mode = 'play';
  draftState = null;
  baseState = null;
  baseRevision = null;
  selectedIds.clear();
  clearEditFeedback();
  render();
  setStatus(`已保存 ${changes.length} 项修改`);
}

function handleKeydown(event) {
  if (handleStageViewportKey(stageViewport, event)) {
    applyStageViewport(elements.stage, stageViewport);
    event.preventDefault();
    return;
  }

  if (event.key === 'Escape' && openDrawers.size) {
    closeDrawers();
    event.preventDefault();
    return;
  }

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
      showEditFeedback('select', { id: `${selectedIds.size} selected`, type: 'components' }, { dirty: true });
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
    clearEditFeedback();
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

function handleKeyup(event) {
  if (handleStageViewportKey(stageViewport, event)) {
    applyStageViewport(elements.stage, stageViewport);
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
    showEditFeedback('select', component, { dirty: true });
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
    const original = { ...component };
    component.x = Math.max(0, component.x + delta[0]);
    component.y = Math.max(0, component.y + delta[1]);
    showEditFeedback('move', original, { delta: { x: component.x - original.x, y: component.y - original.y } });
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

function pointerToCanvas(event, canvas) {
  const rect = elements.stage.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

function selectedComponents() {
  return [...selectedIds].map((id) => findComponent(id, workingState())).filter(Boolean);
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

function isDirty() {
  return mode === 'edit' && baseState && draftState && diffStates(baseState, draftState).length > 0;
}

function showEditFeedback(intent, component, options = {}) {
  editFeedback = createEditFeedbackModel({
    mode,
    intent,
    component,
    delta: options.delta,
    size: options.size,
    dirty: options.dirty ?? isDirty()
  });
  renderEditFeedback(elements.editFeedbackDock, editFeedback);
}

function clearEditFeedback() {
  editFeedback = { active: false };
  renderEditFeedback(elements.editFeedbackDock, editFeedback);
}

function setStatus(message) {
  elements.statusText.textContent = message;
}
