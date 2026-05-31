import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const indexHtml = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const stylesCss = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const appJs = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('page exposes left and right edge buttons for off-canvas drawers', () => {
  assert.match(indexHtml, /id="treeDrawerToggle"/);
  assert.match(indexHtml, /aria-controls="treePanel"/);
  assert.match(indexHtml, /id="inspectorDrawerToggle"/);
  assert.match(indexHtml, /aria-controls="inspector"/);
  assert.doesNotMatch(indexHtml, /id="drawerOverlay"/);
  assert.match(indexHtml, /id="treePanel" class="tree-panel side-drawer side-drawer--left"/);
  assert.match(indexHtml, /id="inspector" class="inspector side-drawer side-drawer--right"/);
});

test('styles keep side drawers off canvas without dimming the main board', () => {
  assert.match(stylesCss, /body\s*{[^}]*overflow-x:\s*hidden;/s);
  assert.match(stylesCss, /\.app-shell\s*{\s*display:\s*block;/);
  assert.match(stylesCss, /\.side-drawer--left\s*{[^}]*transform:\s*translateX\(-100%\);/s);
  assert.match(stylesCss, /\.side-drawer--right\s*{[^}]*transform:\s*translateX\(100%\);/s);
  assert.match(stylesCss, /\.app-shell\[data-left-drawer="open"\]\s+\.side-drawer--left\s*{[^}]*transform:\s*translateX\(0\);/s);
  assert.match(stylesCss, /\.app-shell\[data-right-drawer="open"\]\s+\.side-drawer--right\s*{[^}]*transform:\s*translateX\(0\);/s);
  assert.match(stylesCss, /\.app-shell\[data-left-drawer="open"\]\s+\.drawer-edge-button--left\s*{[^}]*transform:\s*translateX\(var\(--ui-drawer-width-left\)\);/s);
  assert.match(stylesCss, /\.app-shell\[data-right-drawer="open"\]\s+\.drawer-edge-button--right\s*{[^}]*transform:\s*translateX\(calc\(-1 \* var\(--ui-drawer-width-right\)\)\);/s);
  assert.match(stylesCss, /\.side-drawer h1,\s*\.side-drawer h2,\s*\.side-drawer h3\s*{[^}]*overflow-wrap:\s*anywhere;/s);
  assert.doesNotMatch(stylesCss, /\.drawer-overlay/);
});

test('app script keeps left and right drawer state independent', () => {
  assert.match(appJs, /openDrawers/);
  assert.match(appJs, /toggleDrawer\('left'\)/);
  assert.match(appJs, /toggleDrawer\('right'\)/);
  assert.match(appJs, /function setDrawerState\(side, isOpen\)/);
  assert.match(appJs, /openDrawers\.has\('left'\)/);
  assert.match(appJs, /openDrawers\.has\('right'\)/);
  assert.match(appJs, /data-left-drawer/);
  assert.match(appJs, /data-right-drawer/);
  assert.match(appJs, /treeDrawerToggle\.addEventListener\('click'/);
  assert.match(appJs, /inspectorDrawerToggle\.addEventListener\('click'/);
  assert.doesNotMatch(appJs, /drawerOverlay/);
  assert.match(appJs, /event\.key === 'Escape'/);
});
