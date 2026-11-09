import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { binOf, themeOf } from './stack.mts';

describe('themeOf', () => {
  it('reads ui.theme from stack.yml', () => {
    const stack = 'version: 1\nui:\n  theme: src/app/globals.css\n  storybook: false\n';
    assert.equal(themeOf(stack), 'src/app/globals.css');
  });

  it('stops without stack.yml, without a front end or without a theme', () => {
    assert.throws(() => themeOf(undefined), /\.specify\/stack\.yml introuvable/);
    for (const stack of ['version: 1\n', 'ui: null\n']) {
      assert.throws(() => themeOf(stack), /ui: null/);
    }
    assert.throws(() => themeOf('ui:\n  storybook: true\n'), /ui\.theme/);
  });

  it('refuses a stack.yml that is not valid YAML', () => {
    assert.throws(() => themeOf('ui: [\n'), /YAML invalide/);
  });
});

describe('binOf', () => {
  it('reads the bin of a package, given as a path or as a map', () => {
    assert.equal(binOf({ name: '@tailwindcss/cli', bin: './dist/index.mjs' }, 'tailwindcss'), './dist/index.mjs');
    assert.equal(binOf({ bin: { tailwindcss: 'dist/index.mjs' } }, 'tailwindcss'), 'dist/index.mjs');
  });

  it('returns undefined when the package has no such bin', () => {
    assert.equal(binOf({ bin: { other: 'x.js' } }, 'tailwindcss'), undefined);
    assert.equal(binOf({}, 'tailwindcss'), undefined);
  });
});
