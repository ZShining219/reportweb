import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

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
