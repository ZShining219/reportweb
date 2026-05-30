export class RevisionConflictError extends Error {
  constructor(message = 'Current revision changed before save') {
    super(message);
    this.name = 'RevisionConflictError';
  }
}

export function collectRevisionChain(patchDoc = {}, currentRevision = patchDoc.current_revision) {
  if (!currentRevision) {
    return [];
  }

  const revisionsById = new Map((patchDoc.revisions || []).map((revision) => [revision.id, revision]));
  const chain = [];
  const visited = new Set();
  let cursor = currentRevision;

  while (cursor) {
    if (visited.has(cursor)) {
      throw new Error(`Revision cycle detected at ${cursor}`);
    }

    const revision = revisionsById.get(cursor);
    if (!revision) {
      throw new Error(`Missing revision ${cursor}`);
    }

    visited.add(cursor);
    chain.unshift(revision);
    cursor = revision.parent_revision || null;
  }

  return chain;
}

export function applyReportPatches(baseReport, patchDoc = {}) {
  const report = clone(baseReport);
  const chain = collectRevisionChain(patchDoc);

  for (const revision of chain) {
    for (const change of revision.changes || []) {
      applyChange(report, change);
    }
  }

  return report;
}

export function appendRevision(patchDoc, { baseRevision, revisionId, createdAt, summary, changes }) {
  if ((patchDoc.current_revision || null) !== (baseRevision || null)) {
    throw new RevisionConflictError(
      `Expected base revision ${baseRevision || 'null'}, got ${patchDoc.current_revision || 'null'}`
    );
  }

  return {
    ...clone(patchDoc),
    current_revision: revisionId,
    revisions: [
      ...(patchDoc.revisions || []),
      {
        id: revisionId,
        parent_revision: baseRevision || null,
        created_at: createdAt,
        summary,
        changes: changes || []
      }
    ]
  };
}

function applyChange(report, change) {
  switch (change.op) {
    case 'update_text':
      updateComponent(report, change.node_id, change.component_id, (component) => {
        component[change.field || 'content'] = change.value;
        if (change.source_status) {
          component.source_status = change.source_status;
        }
      });
      break;
    case 'move_component':
      updateComponent(report, change.node_id, change.component_id, (component) => {
        component.x = change.x;
        component.y = change.y;
      });
      break;
    case 'resize_component':
      updateComponent(report, change.node_id, change.component_id, (component) => {
        component.width = change.width;
        component.height = change.height;
      });
      break;
    case 'move_components':
      moveComponents(report, change);
      break;
    case 'copy_components':
      copyComponents(report, change);
      break;
    case 'delete_component':
      removeComponent(findPage(report, change.node_id), change.component_id);
      break;
    case 'update_node_status':
      updateNodeStatus(report, change);
      break;
    case 'update_svg_asset':
      updateComponent(report, change.node_id, change.component_id, (component) => {
        component.svg_asset_id = change.new_svg_asset_id;
      });
      break;
    default:
      throw new Error(`Unsupported patch op: ${change.op}`);
  }
}

function moveComponents(report, change) {
  const fromPage = findPage(report, change.from_node_id);
  const toPage = findOrCreatePage(report, change.to_node_id);
  const selected = change.component_ids.map((id) => findComponent(fromPage, id));
  const minX = Math.min(...selected.map((component) => component.x || 0));
  const minY = Math.min(...selected.map((component) => component.y || 0));
  const target = change.target_origin || { x: minX, y: minY };

  for (const id of change.component_ids) {
    removeComponent(fromPage, id);
  }

  for (const component of selected) {
    toPage.components.push({
      ...component,
      x: target.x + ((component.x || 0) - minX),
      y: target.y + ((component.y || 0) - minY)
    });
  }
}

function copyComponents(report, change) {
  const fromPage = findPage(report, change.from_node_id);
  const toPage = findOrCreatePage(report, change.to_node_id);

  for (const [index, sourceId] of change.source_component_ids.entries()) {
    const source = findComponent(fromPage, sourceId);
    const override = change.new_components[index] || {};
    toPage.components.push({
      ...clone(source),
      ...override,
      id: override.id
    });
  }
}

function updateNodeStatus(report, change) {
  const node = (report.story_tree?.nodes || []).find((item) => item.id === change.node_id);
  if (!node) {
    throw new Error(`Missing node ${change.node_id}`);
  }

  node.status = node.status || {};
  node.status[change.field] = change.value;
}

function updateComponent(report, nodeId, componentId, updater) {
  updater(findComponent(findPage(report, nodeId), componentId));
}

function findPage(report, nodeId) {
  const page = (report.pages || []).find((item) => item.node_id === nodeId);
  if (!page) {
    throw new Error(`Missing page for node ${nodeId}`);
  }
  page.components = page.components || [];
  return page;
}

function findOrCreatePage(report, nodeId) {
  const existing = (report.pages || []).find((item) => item.node_id === nodeId);
  if (existing) {
    existing.components = existing.components || [];
    return existing;
  }

  report.pages = report.pages || [];
  const page = { node_id: nodeId, components: [] };
  report.pages.push(page);
  return page;
}

function findComponent(page, componentId) {
  const component = (page.components || []).find((item) => item.id === componentId);
  if (!component) {
    throw new Error(`Missing component ${componentId}`);
  }
  return component;
}

function removeComponent(page, componentId) {
  const index = (page.components || []).findIndex((item) => item.id === componentId);
  if (index === -1) {
    throw new Error(`Missing component ${componentId}`);
  }
  page.components.splice(index, 1);
}

function clone(value) {
  return structuredClone(value);
}
