import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('page exposes narrative island shell instead of a bare node map shell', async () => {
  const indexHtml = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.match(indexHtml, /id="narrativeIsland"/);
  assert.match(indexHtml, /class="narrative-island-shell"/);
  assert.doesNotMatch(indexHtml, /class="node-navigator-shell"/);
});

test('app renders node navigator through narrative island expanded slot', async () => {
  const appJs = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

  assert.match(appJs, /createNarrativeIslandViewModel/);
  assert.match(appJs, /renderNarrativeIsland/);
  assert.match(appJs, /narrativeIslandExpanded/);
  assert.match(appJs, /renderMap/);
});

test('app keeps the island expanded when selecting nodes inside the map', async () => {
  const appJs = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

  assert.match(appJs, /onSelect\(nodeId\) \{[\s\S]*?narrativeIslandExpanded = true;[\s\S]*?narrativeIslandOpening = false;[\s\S]*?clearNarrativeIslandOpenTimer\(\);[\s\S]*?clearNarrativeIslandCloseTimer\(\);[\s\S]*?currentNodeId = nodeId;[\s\S]*?selectedIds\.clear\(\);[\s\S]*?render\(\);/);
  assert.doesNotMatch(appJs, /onSelect\(nodeId\) \{\s+currentNodeId = nodeId;\s+narrativeIslandExpanded = false;/);
});

test('app keeps a closing phase before unmounting the narrative island map', async () => {
  const appJs = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

  assert.match(appJs, /let narrativeIslandClosing = false;/);
  assert.match(appJs, /let narrativeIslandOpening = false;/);
  assert.match(appJs, /narrativeIslandClosing = true;/);
  assert.match(appJs, /narrativeIslandOpening = true;/);
  assert.match(appJs, /setTimeout\(\(\) => \{/);
  assert.match(appJs, /opening: narrativeIslandOpening/);
  assert.match(appJs, /closing: narrativeIslandClosing/);
});
