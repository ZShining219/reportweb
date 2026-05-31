import { createServer } from 'node:http';
import { readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import { appendRevision, applyReportPatches } from './src/reportStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');
const dataDir = path.join(rootDir, 'data');
const assetsDir = path.join(rootDir, 'assets');
const d3HierarchyDir = path.join(rootDir, 'node_modules', 'd3-hierarchy');
const port = Number(process.env.PORT || 5173);

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === 'GET' && url.pathname === '/api/reports') {
      return sendJson(response, await listReports());
    }

    const reportMatch = url.pathname.match(/^\/api\/reports\/([^/]+)$/);
    if (request.method === 'GET' && reportMatch) {
      return sendJson(response, await loadReportPayload(safeReportId(reportMatch[1])));
    }

    const revisionMatch = url.pathname.match(/^\/api\/reports\/([^/]+)\/revisions$/);
    if (request.method === 'POST' && revisionMatch) {
      return sendJson(response, await createRevision(safeReportId(revisionMatch[1]), await readJsonBody(request)));
    }

    const currentRevisionMatch = url.pathname.match(/^\/api\/reports\/([^/]+)\/current-revision$/);
    if (request.method === 'POST' && currentRevisionMatch) {
      return sendJson(response, await setCurrentRevision(safeReportId(currentRevisionMatch[1]), await readJsonBody(request)));
    }

    if (request.method === 'GET' && url.pathname.startsWith('/assets/')) {
      return serveStatic(response, assetsDir, url.pathname.replace('/assets/', ''));
    }

    if (request.method === 'GET' && url.pathname.startsWith('/vendor/d3-hierarchy/')) {
      return serveStatic(response, d3HierarchyDir, url.pathname.replace('/vendor/d3-hierarchy/', ''));
    }

    if (request.method === 'GET') {
      const filePath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      return serveStatic(response, publicDir, filePath);
    }

    sendJson(response, { error: 'Not found' }, 404);
  } catch (error) {
    const status = error.statusCode || (error.name === 'RevisionConflictError' ? 409 : 500);
    sendJson(response, { error: error.message }, status);
  }
}).listen(port, () => {
  console.log(`ReportWebShow demo running at http://localhost:${port}`);
});

async function listReports() {
  const reportsDir = path.join(dataDir, 'reports');
  const files = await readdir(reportsDir);
  return files
    .filter((file) => file.endsWith('.report.yaml'))
    .map((file) => file.replace('.report.yaml', ''));
}

async function loadReportPayload(reportId) {
  const report = await readYaml(reportPath(reportId));
  const patch = await readPatch(reportId);
  const state = applyReportPatches(report, patch);
  return { reportId, report, patch, state };
}

async function createRevision(reportId, body) {
  const patch = await readPatch(reportId);
  const revisionId = nextRevisionId(patch);
  const nextPatch = appendRevision(patch, {
    baseRevision: body.baseRevision || null,
    revisionId,
    createdAt: new Date().toISOString(),
    summary: body.summary || '保存前端编辑',
    changes: body.changes || []
  });

  await writeYamlAtomic(patchPath(reportId), nextPatch);
  return loadReportPayload(reportId);
}

async function setCurrentRevision(reportId, body) {
  const patch = await readPatch(reportId);
  const revisionId = body.revisionId || null;

  if (revisionId && !(patch.revisions || []).some((revision) => revision.id === revisionId)) {
    const error = new Error(`Unknown revision ${revisionId}`);
    error.statusCode = 400;
    throw error;
  }

  patch.current_revision = revisionId;
  await writeYamlAtomic(patchPath(reportId), patch);
  return loadReportPayload(reportId);
}

async function readPatch(reportId) {
  const filePath = patchPath(reportId);
  try {
    return await readYaml(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    return {
      report_id: reportId,
      base_report: path.relative(rootDir, reportPath(reportId)),
      current_revision: null,
      revisions: []
    };
  }
}

async function readYaml(filePath) {
  return YAML.parse(await readFile(filePath, 'utf8'));
}

async function writeYamlAtomic(filePath, value) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, YAML.stringify(value), 'utf8');
  await rename(tmpPath, filePath);
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

async function serveStatic(response, baseDir, requestedPath) {
  const absolutePath = path.normalize(path.join(baseDir, requestedPath));
  if (!absolutePath.startsWith(baseDir)) {
    return sendJson(response, { error: 'Invalid path' }, 403);
  }

  const info = await stat(absolutePath).catch(() => null);
  if (!info || !info.isFile()) {
    return sendJson(response, { error: 'Not found' }, 404);
  }

  response.writeHead(200, { 'Content-Type': contentType(absolutePath) });
  createReadStream(absolutePath).pipe(response);
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function safeReportId(reportId) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(reportId)) {
    const error = new Error('Invalid report id');
    error.statusCode = 400;
    throw error;
  }
  return reportId;
}

function nextRevisionId(patch) {
  let index = (patch.revisions || []).length + 1;
  const existing = new Set((patch.revisions || []).map((revision) => revision.id));
  let id = `rev-${String(index).padStart(3, '0')}`;
  while (existing.has(id)) {
    index += 1;
    id = `rev-${String(index).padStart(3, '0')}`;
  }
  return id;
}

function reportPath(reportId) {
  return path.join(dataDir, 'reports', `${reportId}.report.yaml`);
}

function patchPath(reportId) {
  return path.join(dataDir, 'patches', `${reportId}.patch.yaml`);
}

function contentType(filePath) {
  const ext = path.extname(filePath);
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  }[ext] || 'application/octet-stream';
}
