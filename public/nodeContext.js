const MAP_BOUNDS = { width: 300, height: 180 };
const CENTER = { x: MAP_BOUNDS.width / 2, y: MAP_BOUNDS.height / 2 };
const AXIS_GAP = 65;
const ANCESTOR_GAP = 50;
const CHILD_GAP = 32;
const TRACE_GAP = 23;
const MIN_X = 20;
const MAIN_COLUMN_LIMIT = 3;
const CONTEXT_SIDE_LIMIT = 1;
const EDGE_COLUMN_LIMIT = 5;

export function getNodeGraph(state, currentNodeId) {
  const nodes = state.story_tree?.nodes || [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const current = byId.get(currentNodeId);
  if (!current || isHidden(current)) return { nodes: [], links: [], omitted: [] };

  const currentPath = nodePath(current, byId);
  const pathIds = new Set(currentPath.map((node) => node.id));
  const positions = focusedPositions(current, currentPath, byId);
  const descriptors = [...positions.entries()]
    .map(([nodeId, position]) => {
      const node = byId.get(nodeId);
      const isCurrent = node.id === current.id;
      const isPath = pathIds.has(node.id);
      const focus = nodeFocus(node, current, byId);

      return {
        id: node.id,
        title: node.title || node.id,
        depth: nodeDepth(node, byId),
        kind: nodeKind(node, current, isCurrent, isPath),
        isCurrent,
        isPath,
        proximity: focus.proximity,
        region: nodeRegion(node, current, isCurrent, isPath, position),
        opacity: nodeOpacity(focus.proximity),
        x: position.x,
        y: position.y
      };
    })
    .sort((a, b) => a.x - b.x || a.y - b.y || a.id.localeCompare(b.id));

  return {
    bounds: MAP_BOUNDS,
    nodes: descriptors,
    links: focusedLinks(state.story_tree?.root, byId, new Set(positions.keys())),
    omitted: omittedMarkers(byId, positions)
  };
}

function focusedPositions(current, currentPath, byId) {
  const positions = new Map();
  const currentParent = current.parent ? visibleNode(byId, current.parent) : null;
  const grandparent = currentParent?.parent ? visibleNode(byId, currentParent.parent) : null;

  currentPath.forEach((node, index) => {
    const distance = currentPath.length - index - 1;
    positions.set(node.id, {
      x: ancestorX(distance),
      y: CENTER.y,
      role: distance === 0 ? 'current' : distance === 1 ? 'parent' : 'ancestor'
    });
  });

  placeCurrentSiblings(positions, current, currentParent, byId);
  placeParentSiblings(positions, currentParent, grandparent, byId);
  placeChildren(positions, current, byId);
  placeSiblingBranchChildren(positions, current, currentParent, byId);
  placeGrandchildren(positions, current, byId);
  normalizeColumnSpacing(positions);

  return positions;
}

function placeCurrentSiblings(positions, current, currentParent, byId) {
  if (!currentParent) return;

  const siblings = siblingWindow(visibleChildren(currentParent, byId), current.id, CONTEXT_SIDE_LIMIT);
  const before = [...siblings.before].reverse();
  const after = siblings.after;

  before.forEach((node, index) => {
    positions.set(node.id, {
      x: CENTER.x,
      y: round(CENTER.y - TRACE_GAP * (index + 1)),
      role: 'sibling'
    });
  });
  after.forEach((node, index) => {
    positions.set(node.id, {
      x: CENTER.x,
      y: round(CENTER.y + TRACE_GAP * (index + 1)),
      role: 'sibling'
    });
  });
}

function placeParentSiblings(positions, currentParent, grandparent, byId) {
  if (!currentParent || !grandparent) return;

  const parentX = positions.get(currentParent.id)?.x ?? ancestorX(1);
  const siblings = siblingWindow(visibleChildren(grandparent, byId), currentParent.id, CONTEXT_SIDE_LIMIT);
  const before = [...siblings.before].reverse();
  const after = siblings.after;

  before.forEach((node, index) => {
    positions.set(node.id, {
      x: parentX,
      y: round(CENTER.y - TRACE_GAP * (index + 1)),
      role: 'parent-sibling'
    });
  });
  after.forEach((node, index) => {
    positions.set(node.id, {
      x: parentX,
      y: round(CENTER.y + TRACE_GAP * (index + 1)),
      role: 'parent-sibling'
    });
  });
}

function placeChildren(positions, current, byId) {
  const children = centeredWindow(visibleChildren(current, byId), MAIN_COLUMN_LIMIT);
  const offsets = centeredOffsets(children.length, CHILD_GAP);

  children.forEach((node, index) => {
    positions.set(node.id, {
      x: round(CENTER.x + AXIS_GAP),
      y: round(CENTER.y + offsets[index]),
      role: 'child'
    });
  });
}

function placeSiblingBranchChildren(positions, current, currentParent, byId) {
  if (!currentParent) return;

  const siblings = visibleChildren(currentParent, byId).filter((node) => node.id !== current.id);
  for (const sibling of siblings) {
    const siblingPosition = positions.get(sibling.id);
    if (!siblingPosition) continue;

    const children = centeredWindow(visibleChildren(sibling, byId), MAIN_COLUMN_LIMIT);
    const offsets = centeredOffsets(children.length, TRACE_GAP);
    children.forEach((node, index) => {
      positions.set(node.id, {
        x: round(siblingPosition.x + AXIS_GAP),
        y: round(siblingPosition.y + offsets[index]),
        role: 'sibling-child'
      });
    });
  }
}

function placeGrandchildren(positions, current, byId) {
  const children = centeredWindow(visibleChildren(current, byId), MAIN_COLUMN_LIMIT);

  for (const child of children) {
    const childPosition = positions.get(child.id);
    if (!childPosition) continue;

    const grandchildren = visibleChildren(child, byId).slice(0, EDGE_COLUMN_LIMIT);
    const offsets = centeredOffsets(grandchildren.length, TRACE_GAP);
    grandchildren.forEach((node, index) => {
      positions.set(node.id, {
        x: round(childPosition.x + AXIS_GAP),
        y: round(childPosition.y + offsets[index]),
        role: 'edge-child'
      });
    });
  }
}

function normalizeColumnSpacing(positions) {
  const byX = new Map();
  for (const [nodeId, position] of positions.entries()) {
    byX.set(position.x, [...(byX.get(position.x) || []), { nodeId, position }]);
  }

  for (const column of byX.values()) {
    if (column.length < 2) continue;

    separateFlexibleColumnNodes(column);
  }
}

function separateFlexibleColumnNodes(column) {
  const fixed = column
    .filter(({ position }) => !isFlexibleColumnRole(position.role))
    .sort((a, b) => a.position.y - b.position.y);
  const flexible = column
    .filter(({ position }) => isFlexibleColumnRole(position.role))
    .sort((a, b) => a.position.y - b.position.y);

  for (const item of flexible) {
    moveAwayFromFixedNeighbors(item.position, fixed);
  }

  for (let pass = 0; pass < 3; pass += 1) {
    const ordered = [...fixed, ...flexible].sort((a, b) => a.position.y - b.position.y);
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      const gap = current.position.y - previous.position.y;
      if (gap >= TRACE_GAP || (!isFlexibleColumnRole(previous.position.role) && !isFlexibleColumnRole(current.position.role))) {
        continue;
      }

      if (isFlexibleColumnRole(current.position.role) && shouldMoveDown(current.position, fixed)) {
        current.position.y = round(previous.position.y + TRACE_GAP);
      } else if (isFlexibleColumnRole(previous.position.role)) {
        previous.position.y = round(current.position.y - TRACE_GAP);
      } else if (isFlexibleColumnRole(current.position.role)) {
        current.position.y = round(previous.position.y + TRACE_GAP);
      }
    }
  }
}

function moveAwayFromFixedNeighbors(position, fixed) {
  const before = [...fixed].reverse().find((item) => item.position.y <= position.y);
  const after = fixed.find((item) => item.position.y >= position.y);

  if (before && after && after.position.y - before.position.y < TRACE_GAP * 2) {
    const beforeDistance = Math.abs(position.y - before.position.y);
    const afterDistance = Math.abs(after.position.y - position.y);
    position.y = beforeDistance < afterDistance
      ? round(before.position.y - TRACE_GAP)
      : round(after.position.y + TRACE_GAP);
    return;
  }

  if (before && position.y - before.position.y < TRACE_GAP) {
    position.y = round(before.position.y + TRACE_GAP);
  }
  if (after && after.position.y - position.y < TRACE_GAP) {
    position.y = round(after.position.y - TRACE_GAP);
  }
}

function isFlexibleColumnRole(role) {
  return role === 'sibling-child';
}

function shouldMoveDown(position, fixed) {
  const nearest = nearestFixedPosition(position, fixed);
  return !nearest || position.y >= nearest.y;
}

function nearestFixedPosition(position, fixed) {
  return fixed
    .map((item) => item.position)
    .sort((a, b) => Math.abs(a.y - position.y) - Math.abs(b.y - position.y))[0];
}

function focusedLinks(rootId, byId, visibleIds) {
  const links = [];
  const parents = [...visibleIds]
    .map((nodeId) => byId.get(nodeId))
    .filter(Boolean)
    .sort((a, b) => nodeDepth(a, byId) - nodeDepth(b, byId));

  for (const parent of parents) {
    for (const childId of parent.children || []) {
      if (visibleIds.has(childId)) {
        links.push({ from: parent.id, to: childId });
      }
    }
  }

  const root = rootId ? byId.get(rootId) : null;
  if (!root || !visibleIds.has(root.id)) return links;
  return links;
}

function omittedMarkers(byId, positions) {
  const visibleIds = new Set(positions.keys());
  const markers = [];

  for (const [nodeId, position] of positions.entries()) {
    const node = byId.get(nodeId);
    const omitted = omittedChildren(node, byId, visibleIds);
    if (!omitted.length) continue;

    markers.push({
      id: `omitted-${node.id}`,
      from: node.id,
      count: omitted.length,
      nodes: omitted.map((item) => ({ id: item.id, title: item.title || item.id })),
      x: markerX(position),
      y: position.y
    });
  }

  return markers;
}

function omittedChildren(node, byId, visibleIds) {
  const omitted = [];
  for (const childId of node.children || []) {
    if (!visibleIds.has(childId)) {
      collectOmitted(childId, byId, visibleIds, omitted, new Set());
    }
  }
  return omitted;
}

function collectOmitted(nodeId, byId, visibleIds, omitted, seen) {
  const node = byId.get(nodeId);
  if (!node || seen.has(node.id) || isHidden(node)) return;

  seen.add(node.id);
  if (!visibleIds.has(node.id)) {
    omitted.push(node);
  }

  for (const childId of node.children || []) {
    collectOmitted(childId, byId, visibleIds, omitted, seen);
  }
}

function markerX(position) {
  const markerPadding = 14;
  if (position.role === 'sibling') {
    return clamp(round(position.x + AXIS_GAP), markerPadding, MAP_BOUNDS.width - markerPadding);
  }

  const rawX = (position.role === 'ancestor' || position.role === 'parent' || position.role === 'parent-sibling')
    ? position.x - TRACE_GAP
    : position.x + TRACE_GAP;
  return clamp(round(rawX), markerPadding, MAP_BOUNDS.width - markerPadding);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function visibleNode(byId, nodeId) {
  const node = byId.get(nodeId);
  return node && !isHidden(node) ? node : null;
}

function visibleChildren(node, byId) {
  return (node.children || [])
    .map((childId) => byId.get(childId))
    .filter((child) => child && !isHidden(child));
}

function isHidden(node) {
  return node.status?.display === 'hidden';
}

function ancestorX(distance) {
  if (distance <= 0) return CENTER.x;
  if (distance === 1) return round(CENTER.x - AXIS_GAP);
  return Math.max(MIN_X, round(CENTER.x - AXIS_GAP - ANCESTOR_GAP * (distance - 1)));
}

function centeredOffsets(count, gap) {
  if (count <= 0) return [];
  const centerIndex = (count - 1) / 2;
  return Array.from({ length: count }, (_item, index) => round((index - centerIndex) * gap));
}

function centeredWindow(items, limit) {
  if (items.length <= limit) return items;

  const centerIndex = Math.floor(items.length / 2);
  const start = clamp(centerIndex - Math.floor(limit / 2), 0, items.length - limit);
  return items.slice(start, start + limit);
}

function siblingWindow(siblings, currentId, sideLimit) {
  const currentIndex = siblings.findIndex((node) => node.id === currentId);
  if (currentIndex < 0) return { before: [], after: [] };

  return {
    before: siblings.slice(Math.max(0, currentIndex - sideLimit), currentIndex),
    after: siblings.slice(currentIndex + 1, currentIndex + sideLimit + 1)
  };
}

function nodeDepth(node, byId) {
  return nodePath(node, byId).length - 1;
}

function nodeRegion(node, current, isCurrent, isPath, position) {
  if (isCurrent) return 'current-axis';
  if (position.role === 'parent') return 'parent-axis';
  if (position.role === 'child' && position.y === CENTER.y) return 'child-axis';
  if (position.role === 'child') return 'child-branch';
  if (position.role === 'sibling-child') return 'sibling-child-branch';
  if (position.role === 'edge-child') return 'edge-column';
  if (isPath) return 'ancestor-trace';
  if (position.role === 'sibling') return 'sibling-trace';
  if (position.role === 'parent-sibling') return 'parent-sibling-trace';
  return node.parent === current.id ? 'child-branch' : 'context-trace';
}

function nodeKind(node, current, isCurrent, isPath) {
  if (isCurrent) return 'current';
  if (isPath) return 'path';
  if (node.parent === current.id) return 'child';
  if (node.parent && node.parent === current.parent) return 'sibling';
  return 'default';
}

function nodeFocus(node, current, byId) {
  if (node.id === current.id) {
    return { proximity: 'primary' };
  }

  if (node.parent === current.id) {
    return { proximity: nodeRegionFromParent(node, current, byId) === 'child-axis' ? 'axis' : 'context' };
  }

  if (current.parent && node.id === current.parent) {
    return { proximity: 'axis' };
  }

  const sibling = siblingFocus(node, current, byId);
  if (sibling) return sibling;

  if (isVisiblePathNode(node, current, byId)) {
    return { proximity: 'axis' };
  }

  if (isVisibleEdgeNode(node, current, byId)) {
    return { proximity: 'context' };
  }

  if (isSiblingChild(node, current, byId)) {
    return { proximity: 'context' };
  }

  return { proximity: 'distant' };
}

function siblingFocus(node, current, byId) {
  if (!current.parent || node.parent !== current.parent) return null;

  const parent = byId.get(current.parent);
  const siblings = parent?.children || [];
  const currentIndex = siblings.indexOf(current.id);
  const nodeIndex = siblings.indexOf(node.id);
  if (currentIndex < 0 || nodeIndex < 0 || nodeIndex === currentIndex) return null;

  return {
    proximity: Math.abs(nodeIndex - currentIndex) === 1 ? 'context' : 'distant'
  };
}

function nodeRegionFromParent(node, current, byId) {
  const siblings = visibleChildren(current, byId);
  const index = siblings.findIndex((item) => item.id === node.id);
  return index === Math.floor(siblings.length / 2) ? 'child-axis' : 'child-branch';
}

function isVisiblePathNode(node, current, byId) {
  return nodePath(current, byId).some((pathNode) => pathNode.id === node.id);
}

function isVisibleEdgeNode(node, current, byId) {
  const parent = node.parent ? byId.get(node.parent) : null;
  return Boolean(parent?.parent === current.id);
}

function isSiblingChild(node, current, byId) {
  const parent = node.parent ? byId.get(node.parent) : null;
  return Boolean(parent && current.parent && parent.parent === current.parent && parent.id !== current.id);
}

function nodeOpacity(proximity) {
  if (proximity === 'primary' || proximity === 'axis') return 1;
  if (proximity === 'context') return 0.76;
  return 0.5;
}

function nodePath(node, byId) {
  const path = [];
  let cursor = node;
  const seen = new Set();

  while (cursor && !seen.has(cursor.id)) {
    if (!isHidden(cursor)) path.unshift(cursor);
    seen.add(cursor.id);
    cursor = cursor.parent ? byId.get(cursor.parent) : null;
  }

  return path;
}
