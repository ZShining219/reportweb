export function createNarrativeIslandViewModel({ state, currentNodeId, expanded = false, opening = false, closing = false } = {}) {
  const nodes = state?.story_tree?.nodes || [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const current = byId.get(currentNodeId) || byId.get(state?.story_tree?.root) || null;
  const parent = current?.parent ? byId.get(current.parent) : null;
  const next = current ? nextRouteNode(state, current.id, byId) : null;
  const children = (current?.children || []).map((childId) => byId.get(childId)).filter(Boolean);

  return {
    currentId: current?.id || null,
    currentTitle: current?.title || '未选择节点',
    parentTitle: parent?.title || '根节点',
    nextId: next?.id || null,
    nextTitle: next?.title || null,
    nextLabel: next ? `下一步：${next.title || next.id}` : '末端节点',
    childCount: children.length,
    expanded,
    opening,
    closing
  };
}

export function renderNarrativeIsland(container, model, { onToggle, renderMap } = {}) {
  const root = document.createElement('section');
  const rootClasses = ['narrative-island'];
  if (model.expanded) rootClasses.push('narrative-island--expanded');
  if (model.opening) rootClasses.push('narrative-island--opening');
  if (model.closing) rootClasses.push('narrative-island--closing');
  root.className = rootClasses.join(' ');
  root.setAttribute('aria-label', '叙事岛');

  const surface = document.createElement('div');
  surface.className = 'narrative-island__surface';

  const rail = document.createElement('div');
  rail.className = 'narrative-island__rail';
  rail.append(
    capsuleText('narrative-island__meta', model.parentTitle),
    currentButton(model, onToggle),
    capsuleText('narrative-island__next', model.nextLabel)
  );
  surface.append(rail);

  if (model.expanded || model.closing) {
    const panel = document.createElement('div');
    panel.className = 'narrative-island__panel';

    const mapSlot = document.createElement('div');
    mapSlot.className = 'narrative-island__map node-navigator';
    panel.append(mapSlot);
    surface.append(panel);
    renderMap?.(mapSlot);
  }

  root.append(surface);
  container.replaceChildren(root);
}

function currentButton(model, onToggle) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'narrative-island__current-button';
  button.setAttribute('aria-expanded', model.expanded ? 'true' : 'false');
  button.setAttribute('aria-label', model.expanded ? '收起叙事地图' : '展开叙事地图');
  button.addEventListener('click', () => onToggle?.());

  const label = document.createElement('span');
  label.className = 'narrative-island__current';
  label.textContent = model.currentTitle;

  button.append(label);
  return button;
}

function capsuleText(className, text) {
  const node = document.createElement('span');
  node.className = className;
  node.textContent = text;
  return node;
}

function nextRouteNode(state, currentNodeId, byId) {
  const route = state?.navigation?.linear_route || flattenTree(state?.story_tree?.root, byId);
  const index = route.indexOf(currentNodeId);
  if (index < 0 || index >= route.length - 1) return null;
  return byId.get(route[index + 1]) || null;
}

function flattenTree(rootId, byId) {
  const root = byId.get(rootId);
  if (!root) return [];

  return [
    root.id,
    ...(root.children || []).flatMap((childId) => flattenTree(childId, byId))
  ];
}
