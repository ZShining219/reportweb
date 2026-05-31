import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createInspectorViewModel } from '../public/modules/inspectorPanel.js';

test('inspector view model describes node and selected components', () => {
  const model = createInspectorViewModel({
    reportId: 'demo-report',
    reportTitle: 'Demo 汇报',
    currentRevision: 'rev-002',
    currentNode: { id: 'root', title: '汇报总览', status: { source: 'sourced', display: 'visible' } },
    selectedComponents: [
      { id: 'text-001', type: 'text', x: 120, y: 160, width: 420, height: 120, source_status: 'manual' }
    ],
    dirty: true
  });

  assert.equal(model.reportTitle, 'Demo 汇报');
  assert.equal(model.currentNodeTitle, '汇报总览');
  assert.equal(model.selection.label, 'text-001');
  assert.equal(model.selection.meta.type, 'text');
  assert.equal(model.selection.meta.position, '120, 160');
  assert.equal(model.selection.meta.size, '420 x 120');
  assert.equal(model.selection.meta.sourceStatus, 'manual');
  assert.equal(model.dirtyLabel, '待保存');
});

test('inspector view model labels empty and multiple selections', () => {
  const empty = createInspectorViewModel({
    reportId: 'demo-report',
    reportTitle: 'Demo 汇报',
    currentRevision: null,
    currentNode: null,
    selectedComponents: [],
    dirty: false
  });

  assert.equal(empty.selection.label, '未选择');
  assert.deepEqual(empty.selection.meta, {});
  assert.equal(empty.currentRevisionLabel, 'base');
  assert.equal(empty.dirtyLabel, '');

  const multiple = createInspectorViewModel({
    reportId: 'demo-report',
    reportTitle: 'Demo 汇报',
    selectedComponents: [
      { id: 'text-001', type: 'text' },
      { id: 'chart-001', type: 'chart' },
      { id: 'svg-001', type: 'svg' }
    ]
  });

  assert.equal(multiple.selection.label, '已选择 3 个组件');
  assert.equal(multiple.selection.count, 3);
});
