export function createTreeListModel(state, currentNodeId, collapsedNodeIds = new Set()) {
  const nodes = state.story_tree?.nodes || [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const pathIds = new Set(nodePath(currentNodeId, byId).map((node) => node.id));
  return treeNodeModel(byId, state.story_tree?.root, currentNodeId, collapsedNodeIds, pathIds, 0);
}

export function renderTreeList(container, model, { onSelectNode, onToggleNode } = {}) {
  container.replaceChildren();
  if (!model) return;

  const list = document.createElement('ul');
  list.className = 'tree-branches';
  list.append(renderTreeNode(model, { onSelectNode, onToggleNode }));
  container.append(list);
}

function renderTreeNode(node, callbacks) {
  const item = document.createElement('li');
  item.className = `tree-branch${node.active ? ' active' : ''}${node.expanded ? ' expanded' : ''}`;
  item.style.setProperty('--tree-depth', String(node.depth));

  const row = document.createElement('div');
  row.className = 'tree-branch-row';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'tree-toggle';
  toggle.textContent = node.hasChildren ? (node.expanded ? '▾' : '▸') : '';
  toggle.disabled = !node.hasChildren;
  toggle.setAttribute('aria-label', node.expanded ? `折叠${node.title}` : `展开${node.title}`);
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    callbacks.onToggleNode?.(node.id, !node.expanded);
  });

  const select = document.createElement('button');
  select.type = 'button';
  select.className = 'tree-node';
  select.textContent = node.title;
  select.setAttribute('aria-current', node.active ? 'page' : 'false');
  select.addEventListener('click', () => callbacks.onSelectNode?.(node.id));

  row.append(toggle, select);
  item.append(row);

  if (node.expanded && node.children.length) {
    const children = document.createElement('ul');
    children.className = 'tree-branches';
    children.append(...node.children.map((child) => renderTreeNode(child, callbacks)));
    item.append(children);
  }

  return item;
}

function treeNodeModel(byId, nodeId, currentNodeId, collapsedNodeIds, pathIds, depth) {
  const node = byId.get(nodeId);
  if (!node || node.status?.display === 'hidden') return null;

  const childIds = node.children || [];
  const hasChildren = childIds.some((childId) => {
    const child = byId.get(childId);
    return child && child.status?.display !== 'hidden';
  });
  const active = node.id === currentNodeId;
  const expanded = hasChildren && (!collapsedNodeIds.has(node.id) || pathIds.has(node.id));
  const children = expanded
    ? childIds
        .map((childId) => treeNodeModel(byId, childId, currentNodeId, collapsedNodeIds, pathIds, depth + 1))
        .filter(Boolean)
    : [];

  return {
    id: node.id,
    title: node.title || node.id,
    depth,
    active,
    hasChildren,
    expanded,
    children
  };
}

function nodePath(nodeId, byId) {
  const path = [];
  const seen = new Set();
  let cursor = byId.get(nodeId);

  while (cursor && !seen.has(cursor.id)) {
    path.unshift(cursor);
    seen.add(cursor.id);
    cursor = cursor.parent ? byId.get(cursor.parent) : null;
  }

  return path;
}
