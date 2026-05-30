export function getNodeGraph(state, currentNodeId) {
  const nodes = state.story_tree?.nodes || [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const current = byId.get(currentNodeId);
  if (!current) return { nodes: [], links: [] };

  const graphNodes = new Map();
  addGraphNode(graphNodes, current, { x: 50, y: 50, kind: 'current' });

  const parent = current.parent ? byId.get(current.parent) : null;
  if (parent) addGraphNode(graphNodes, parent, { x: 22, y: 50, kind: 'near' });

  const siblings = nearestSiblings(current, byId, 2);
  const siblingSlots = [{ x: 50, y: 22 }, { x: 50, y: 78 }];
  siblings.forEach(({ node }, index) => {
    addGraphNode(graphNodes, node, { ...siblingSlots[index], kind: 'near' });
  });

  const childIds = (current.children || []).slice(0, 2);
  const childSlots = childIds.length === 1 ? [{ x: 78, y: 50 }] : [{ x: 78, y: 30 }, { x: 78, y: 70 }];
  childIds.forEach((childId, index) => {
    const child = byId.get(childId);
    if (child) addGraphNode(graphNodes, child, { ...childSlots[index], kind: 'near' });
  });

  const visibleNodes = [...graphNodes.values()];
  return {
    nodes: visibleNodes,
    links: visibleNodes
      .filter((node) => node.id !== current.id)
      .map((node) => ({ from: current.id, to: node.id }))
  };
}

function addGraphNode(graphNodes, node, position) {
  if (!node || graphNodes.has(node.id)) return;
  graphNodes.set(node.id, {
    id: node.id,
    x: position.x,
    y: position.y,
    kind: position.kind,
    opacity: 1
  });
}

function nearestSiblings(node, byId, limit) {
  if (!node.parent) return [];
  const parent = byId.get(node.parent);
  const siblings = parent?.children || [];
  const currentIndex = siblings.indexOf(node.id);
  return siblings
    .map((id, index) => ({ node: byId.get(id), distance: index - currentIndex }))
    .filter((item) => item.node && item.node.id !== node.id)
    .sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance))
    .slice(0, limit);
}
