export function diffStates(before, after) {
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
      changes.push({
        op: 'move_component',
        node_id: afterItem.nodeId,
        component_id: id,
        x: afterItem.component.x,
        y: afterItem.component.y
      });
    }
    if (beforeItem.component.width !== afterItem.component.width || beforeItem.component.height !== afterItem.component.height) {
      changes.push({
        op: 'resize_component',
        node_id: afterItem.nodeId,
        component_id: id,
        width: afterItem.component.width,
        height: afterItem.component.height
      });
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
