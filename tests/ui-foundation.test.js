import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('styles import shared UI foundation files', async () => {
  const styles = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /@import\s+["']\.\/ui\/tokens\.css["'];/);
  assert.match(styles, /@import\s+["']\.\/ui\/primitives\.css["'];/);
  assert.match(styles, /@import\s+["']\.\/ui\/layout\.css["'];/);
});

test('UI tokens define geometry-safe primitives', async () => {
  const tokens = await readFile(new URL('../public/ui/tokens.css', import.meta.url), 'utf8');
  assert.match(tokens, /--ui-color-ink:/);
  assert.match(tokens, /--ui-space-3:/);
  assert.match(tokens, /--ui-radius-md:/);
  assert.match(tokens, /--ui-feedback-move:/);
  assert.match(tokens, /--ui-feedback-edit:/);
});
