import { hierarchy, tree } from 'd3-hierarchy';

const MAP_BOUNDS = { width: 300, height: 180 };
const TREE_PADDING = { x: 20, y: 18 };

export function getNodeGraph(state, currentNodeId) {
  const nodes = state.story_tree?.nodes || [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const current = byId.get(currentNodeId);
  if (!current) return { nodes: [], links: [] };

  const root = buildVisibleTree(byId, state.story_tree?.root);
  if (!root) return { nodes: [], links: [] };

  const currentPath = nodePath(current, byId);
  const pathIds = new Set(currentPath.map((node) => node.id));
  const currentParentId = current.parent || null;
  const childIds = new Set(current.children || []);

  const layoutRoot = tree()
    .size([
      MAP_BOUNDS.height - TREE_PADDING.y * 2,
      MAP_BOUNDS.width - TREE_PADDING.x * 2
    ])(hierarchy(root));
  const layoutNodes = layoutRoot.descendants();
  const balancedYById = balanceLayerPositions(layoutNodes);
  const currentLayoutNode = layoutNodes.find((layoutNode) => layoutNode.data.id === current.id);
  const pan = currentLayoutNode
    ? {
        x: MAP_BOUNDS.width / 2 - (currentLayoutNode.y + TREE_PADDING.x),
        y: MAP_BOUNDS.height / 2 - balancedYById.get(currentLayoutNode.data.id)
      }
    : { x: 0, y: 0 };
  const descriptors = layoutNodes.map((layoutNode) => {
    const node = layoutNode.data;
    const isCurrent = node.id === current.id;
    const isPath = pathIds.has(node.id);
    const focus = nodeFocus(node, current, byId);

    return {
      id: node.id,
      title: node.title || node.id,
      depth: layoutNode.depth,
      kind: nodeKind(node, current, currentParentId, childIds, isCurrent, isPath),
      isCurrent,
      isPath,
      proximity: focus.proximity,
      region: `tree-depth-${layoutNode.depth}`,
      opacity: focus.proximity === 'distant' ? 0.5 : 1,
      x: round(layoutNode.y + TREE_PADDING.x + pan.x),
      y: round(balancedYById.get(node.id) + pan.y)
    };
  });

  return {
    bounds: MAP_BOUNDS,
    nodes: descriptors,
    links: layoutRoot
      .links()
      .map((link) => ({ from: link.source.data.id, to: link.target.data.id }))
  };
}

function buildVisibleTree(byId, nodeId, seen = new Set()) {
  const node = byId.get(nodeId);
  if (!node || seen.has(node.id) || node.status?.display === 'hidden') return null;

  seen.add(node.id);
  return {
    ...node,
    children: (node.children || [])
      .map((childId) => buildVisibleTree(byId, childId, seen))
      .filter(Boolean)
  };
}

function nodePath(node, byId) {
  const path = [];
  let cursor = node;
  const seen = new Set();

  while (cursor && !seen.has(cursor.id)) {
    path.unshift(cursor);
    seen.add(cursor.id);
    cursor = cursor.parent ? byId.get(cursor.parent) : null;
  }

  return path;
}

function nodeKind(node, current, currentParentId, childIds, isCurrent, isPath) {
  if (isCurrent) return 'current';
  if (isPath) return 'path';
  if (node.parent === current.id || childIds.has(node.id)) return 'child';
  if (node.parent && node.parent === currentParentId) return 'sibling';
  return 'default';
}

function nodeFocus(node, current, byId) {
  if (node.id === current.id) {
    return { proximity: 'primary', region: 'primary' };
  }

  const ancestorDistance = distanceFromAncestor(node, current, byId);
  if (ancestorDistance === 1) {
    return { proximity: 'secondary', region: 'secondary-before' };
  }
  if (ancestorDistance > 1) {
    return { proximity: 'distant', region: 'distant-before' };
  }

  const descendantDistance = distanceFromAncestor(current, node, byId);
  if (descendantDistance === 1) {
    return { proximity: 'secondary', region: 'secondary-after' };
  }
  if (descendantDistance > 1) {
    return { proximity: 'distant', region: 'distant-after' };
  }

  const sibling = siblingFocus(node, current, byId);
  if (sibling) return sibling;

  return { proximity: 'distant', region: 'distant-after' };
}

function distanceFromAncestor(ancestor, node, byId) {
  let distance = 0;
  let cursor = node;
  const seen = new Set();

  while (cursor && !seen.has(cursor.id)) {
    if (cursor.id === ancestor.id) return distance;
    seen.add(cursor.id);
    cursor = cursor.parent ? byId.get(cursor.parent) : null;
    distance += 1;
  }

  return 0;
}

function siblingFocus(node, current, byId) {
  if (!current.parent || node.parent !== current.parent) return null;

  const parent = byId.get(current.parent);
  const siblings = parent?.children || [];
  const currentIndex = siblings.indexOf(current.id);
  const nodeIndex = siblings.indexOf(node.id);
  if (currentIndex < 0 || nodeIndex < 0 || nodeIndex === currentIndex) return null;

  const isNearest = Math.abs(nodeIndex - currentIndex) === 1;
  const side = nodeIndex < currentIndex ? 'before' : 'after';
  return {
    proximity: isNearest ? 'secondary' : 'distant',
    region: `${isNearest ? 'secondary' : 'distant'}-${side}`
  };
}

function balanceLayerPositions(layoutNodes) {
  const byDepth = new Map();
  for (const layoutNode of layoutNodes) {
    byDepth.set(layoutNode.depth, [...(byDepth.get(layoutNode.depth) || []), layoutNode]);
  }

  const balanced = new Map();
  for (const layer of byDepth.values()) {
    const ordered = [...layer].sort((a, b) => a.x - b.x);
    const positions = verticalPositions(ordered);
    ordered.forEach((layoutNode, index) => {
      balanced.set(layoutNode.data.id, positions[index]);
    });
  }
  return balanced;
}

function verticalPositions(orderedLayoutNodes) {
  if (orderedLayoutNodes.length <= 1) {
    return orderedLayoutNodes.map((layoutNode) => round(layoutNode.x + TREE_PADDING.y));
  }

  const start = orderedLayoutNodes[0].x + TREE_PADDING.y;
  const end = orderedLayoutNodes[orderedLayoutNodes.length - 1].x + TREE_PADDING.y;
  const gap = (end - start) / (orderedLayoutNodes.length - 1);
  return orderedLayoutNodes.map((_layoutNode, index) => round(start + gap * index));
}

function round(value) {
  return Math.round(value * 100) / 100;
}
