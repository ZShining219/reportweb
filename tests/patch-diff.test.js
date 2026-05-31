import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diffStates } from '../public/modules/patchDiff.js';

test('diffStates emits stable patch changes for text, layout, delete, move, and copy edits', () => {
  const before = {
    pages: [
      {
        node_id: 'root',
        components: [
          { id: 'text-001', type: 'text', x: 100, y: 120, width: 400, height: 120, content: '旧文案' },
          { id: 'svg-001', type: 'svg', x: 620, y: 160, width: 320, height: 220, svg_asset_id: 'chart-001' },
          { id: 'text-delete', type: 'text', x: 80, y: 80, width: 200, height: 80, content: '删除我' }
        ]
      },
      {
        node_id: 'problem',
        components: []
      }
    ]
  };
  const after = {
    pages: [
      {
        node_id: 'root',
        components: [
          { id: 'text-001', type: 'text', x: 140, y: 170, width: 460, height: 150, content: '新文案' }
        ]
      },
      {
        node_id: 'problem',
        components: [
          { id: 'svg-001', type: 'svg', x: 260, y: 220, width: 320, height: 220, svg_asset_id: 'chart-001' },
          {
            id: 'text-copy',
            type: 'text',
            x: 294,
            y: 254,
            width: 400,
            height: 120,
            content: '旧文案',
            created_from: { source_component_id: 'text-001', from_node_id: 'root' }
          }
        ]
      }
    ]
  };

  assert.deepEqual(diffStates(before, after), [
    { op: 'update_text', node_id: 'root', component_id: 'text-001', field: 'content', value: '新文案', source_status: 'manual' },
    { op: 'move_component', node_id: 'root', component_id: 'text-001', x: 140, y: 170 },
    { op: 'resize_component', node_id: 'root', component_id: 'text-001', width: 460, height: 150 },
    { op: 'move_components', component_ids: ['svg-001'], from_node_id: 'root', to_node_id: 'problem', target_origin: { x: 260, y: 220 } },
    { op: 'move_component', node_id: 'problem', component_id: 'svg-001', x: 260, y: 220 },
    { op: 'delete_component', node_id: 'root', component_id: 'text-delete' },
    {
      op: 'copy_components',
      source_component_ids: ['text-001'],
      from_node_id: 'root',
      to_node_id: 'problem',
      new_components: [{ id: 'text-copy', type: 'text', x: 294, y: 254 }]
    }
  ]);
});
