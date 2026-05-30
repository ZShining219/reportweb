import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  RevisionConflictError,
  appendRevision,
  applyReportPatches,
  collectRevisionChain
} from '../src/reportStore.js';

const baseReport = {
  report: {
    id: '2026-05-17-weekly-progress',
    title: '研究进度汇报'
  },
  story_tree: {
    root: 'root',
    nodes: [
      { id: 'root', title: '汇报总览', parent: null, children: ['progress'], status: { display: 'visible' } },
      { id: 'progress', title: '本周进展', parent: 'root', children: ['problem'], status: { display: 'visible' } },
      { id: 'problem', title: '当前问题', parent: 'progress', children: [], status: { display: 'visible' } }
    ]
  },
  pages: [
    {
      node_id: 'root',
      components: [
        { id: 'text-001', type: 'text', x: 100, y: 100, width: 400, height: 100, content: '原始标题' },
        { id: 'svg-001', type: 'svg', x: 600, y: 120, width: 300, height: 200, svg_asset_id: 'chart-001' }
      ]
    },
    {
      node_id: 'problem',
      components: []
    }
  ],
  svg_assets: [
    { id: 'chart-001', path: 'assets/svg/2026-05-17-weekly-progress/chart-001.svg' }
  ]
};

test('collectRevisionChain follows parent_revision and ignores abandoned branches', () => {
  const patchDoc = {
    current_revision: 'rev-004',
    revisions: [
      { id: 'rev-001', parent_revision: null, changes: [{ op: 'update_text', node_id: 'root', component_id: 'text-001', field: 'content', value: '一' }] },
      { id: 'rev-002', parent_revision: 'rev-001', changes: [{ op: 'update_text', node_id: 'root', component_id: 'text-001', field: 'content', value: '二' }] },
      { id: 'rev-003', parent_revision: 'rev-002', changes: [{ op: 'update_text', node_id: 'root', component_id: 'text-001', field: 'content', value: '废弃分支' }] },
      { id: 'rev-004', parent_revision: 'rev-002', changes: [{ op: 'update_text', node_id: 'root', component_id: 'text-001', field: 'content', value: '新分支' }] }
    ]
  };

  const chain = collectRevisionChain(patchDoc, 'rev-004');

  assert.deepEqual(chain.map((revision) => revision.id), ['rev-001', 'rev-002', 'rev-004']);
});

test('applyReportPatches merges text, layout, cross-node moves, and source status', () => {
  const patchDoc = {
    current_revision: 'rev-002',
    revisions: [
      {
        id: 'rev-001',
        parent_revision: null,
        changes: [
          { op: 'update_text', node_id: 'root', component_id: 'text-001', field: 'content', value: '本周进展汇报', source_status: 'manual' },
          { op: 'move_component', node_id: 'root', component_id: 'text-001', x: 160, y: 180 },
          { op: 'resize_component', node_id: 'root', component_id: 'svg-001', width: 360, height: 240 }
        ]
      },
      {
        id: 'rev-002',
        parent_revision: 'rev-001',
        changes: [
          { op: 'move_components', component_ids: ['svg-001'], from_node_id: 'root', to_node_id: 'problem', target_origin: { x: 240, y: 220 } },
          { op: 'update_node_status', node_id: 'problem', field: 'display', value: 'backup' },
          { op: 'update_svg_asset', node_id: 'problem', component_id: 'svg-001', old_svg_asset_id: 'chart-001', new_svg_asset_id: 'chart-001.rev-002' }
        ]
      }
    ]
  };

  const result = applyReportPatches(baseReport, patchDoc);
  const rootText = result.pages.find((page) => page.node_id === 'root').components.find((component) => component.id === 'text-001');
  const rootSvg = result.pages.find((page) => page.node_id === 'root').components.find((component) => component.id === 'svg-001');
  const problemSvg = result.pages.find((page) => page.node_id === 'problem').components.find((component) => component.id === 'svg-001');
  const problemNode = result.story_tree.nodes.find((node) => node.id === 'problem');

  assert.equal(rootText.content, '本周进展汇报');
  assert.equal(rootText.source_status, 'manual');
  assert.equal(rootText.x, 160);
  assert.equal(rootText.y, 180);
  assert.equal(rootSvg, undefined);
  assert.equal(problemSvg.x, 240);
  assert.equal(problemSvg.y, 220);
  assert.equal(problemSvg.width, 360);
  assert.equal(problemSvg.height, 240);
  assert.equal(problemSvg.svg_asset_id, 'chart-001.rev-002');
  assert.equal(problemNode.status.display, 'backup');
});

test('appendRevision records parent_revision and rejects stale base_revision', () => {
  const patchDoc = {
    report_id: '2026-05-17-weekly-progress',
    current_revision: 'rev-002',
    revisions: [
      { id: 'rev-001', parent_revision: null, changes: [] },
      { id: 'rev-002', parent_revision: 'rev-001', changes: [] }
    ]
  };

  const nextDoc = appendRevision(patchDoc, {
    baseRevision: 'rev-002',
    revisionId: 'rev-003',
    createdAt: '2026-05-17T12:00:00+08:00',
    summary: '保存布局调整',
    changes: [{ op: 'move_component', node_id: 'root', component_id: 'text-001', x: 200, y: 160 }]
  });

  assert.equal(nextDoc.current_revision, 'rev-003');
  assert.equal(nextDoc.revisions.at(-1).parent_revision, 'rev-002');
  assert.equal(nextDoc.revisions.at(-1).summary, '保存布局调整');
  assert.throws(
    () => appendRevision(nextDoc, { baseRevision: 'rev-002', revisionId: 'rev-004', createdAt: '2026-05-17T12:05:00+08:00', summary: '过期保存', changes: [] }),
    RevisionConflictError
  );
});
