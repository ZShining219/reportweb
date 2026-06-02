import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

function cssRule(styles, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(`${escapedSelector}\\s*{(?<body>[^}]*)}`, 's'));

  assert.ok(match, `Expected CSS rule for ${selector}`);

  return match.groups.body;
}

test('styles define a restrained glass narrative island', async () => {
  const styles = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.narrative-island-shell\s*{/);
  assert.match(styles, /\.narrative-island\s*{/);
  assert.match(styles, /\.narrative-island__surface\s*{/);
  assert.match(styles, /\.narrative-island__current-button\s*{/);
  assert.match(styles, /\.narrative-island--expanded\s+\.narrative-island__panel\s*{/);
  assert.match(styles, /\.narrative-island__map\.node-navigator\s*{/);
  assert.match(styles, /\.narrative-island__map\.node-navigator\s*{[^}]*aspect-ratio:\s*5\s*\/\s*3/s);
  assert.match(styles, /\.narrative-island--opening\s+\.narrative-island__surface\s*{[^}]*animation:\s*narrative-island-expand\s+620ms/s);
  assert.match(styles, /\.narrative-island--closing\s+\.narrative-island__surface\s*{[^}]*animation:\s*narrative-island-collapse\s+620ms/s);
  assert.match(styles, /\.narrative-island--opening\s+\.narrative-island__panel\s*{[^}]*animation:\s*narrative-island-content-fade\s+380ms/s);
  assert.match(styles, /\.narrative-island--closing\s+\.narrative-island__panel\s*{[^}]*animation:\s*narrative-island-content-fade-out\s+180ms/s);
  assert.match(styles, /@keyframes narrative-island-expand/);
  assert.match(styles, /@keyframes narrative-island-collapse/);
  assert.match(styles, /@keyframes narrative-island-content-fade/);
  assert.match(styles, /@keyframes narrative-island-content-fade-out/);
  assert.match(styles, /48%\s*{[^}]*max-height:\s*50px/s);
  assert.match(styles, /backdrop-filter:\s*blur/);
  assert.match(styles, /background:\s*color-mix\(in srgb, var\(--paper-2\)/);
  assert.match(styles, /box-shadow:\s*var\(--shadow\)/);
});

test('styles define project manager and narrative island project button rules', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const narrativeRail = cssRule(css, '.narrative-island__rail');
  const projectBoardStage = cssRule(css, '.stage--project-board');
  const projectBoardCard = cssRule(css, '.project-board-card');
  const projectDetails = cssRule(css, '.project-details');

  assert.match(
    narrativeRail,
    /grid-template-columns:\s*minmax\(0,\s*0\.75fr\)\s+minmax\(120px,\s*1fr\)\s+minmax\(0,\s*0\.9fr\)\s+auto/,
  );
  assert.match(projectBoardStage, /overflow-y:\s*auto/);
  assert.match(projectBoardCard, /min-height:\s*150px/);
  assert.match(projectDetails, /display:\s*grid/);
  assert.doesNotMatch(css, /\.project-manager-shell/);
  assert.doesNotMatch(css, /\.project-card/);
  assert.match(css, /\.project-board\s*{/);
  assert.match(css, /\.project-list-panel\s*{/);
  assert.match(css, /\.project-details\s*{/);
  assert.match(css, /\.project-manager__/);
  assert.match(css, /\.narrative-island__project-button/);
  assert.match(css, /\.narrative-island--project-manager/);
  assert.match(css, /\.narrative-island__enter-project/);
});
