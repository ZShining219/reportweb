import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createReportApi } from '../public/modules/reportApi.js';

test('report api wraps report endpoints with JSON requests', async () => {
  const calls = [];
  const api = createReportApi({
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      return {
        ok: true,
        async json() {
          return { ok: true, url };
        }
      };
    }
  });

  assert.deepEqual(await api.listReports(), { ok: true, url: '/api/reports' });
  assert.deepEqual(await api.loadReport('demo-report'), { ok: true, url: '/api/reports/demo-report' });
  assert.deepEqual(
    await api.saveRevision('demo-report', { baseRevision: null, changes: [{ op: 'move_component' }] }),
    { ok: true, url: '/api/reports/demo-report/revisions' }
  );
  assert.deepEqual(await api.setCurrentRevision('demo-report', 'rev-001'), {
    ok: true,
    url: '/api/reports/demo-report/current-revision'
  });

  assert.equal(calls[2].options.method, 'POST');
  assert.equal(calls[2].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[2].options.body, JSON.stringify({ baseRevision: null, changes: [{ op: 'move_component' }] }));
  assert.equal(calls[3].options.body, JSON.stringify({ revisionId: 'rev-001' }));
});

test('report api throws response error messages', async () => {
  const api = createReportApi({
    fetchImpl: async () => ({
      ok: false,
      async json() {
        return { error: 'Revision conflict' };
      }
    })
  });

  await assert.rejects(() => api.loadReport('demo-report'), /Revision conflict/);
});
