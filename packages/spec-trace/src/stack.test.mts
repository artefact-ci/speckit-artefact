import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_TEST_GLOBS, expandBraces, pathspecs, testGlobs } from './stack.mts';

describe('testGlobs', () => {
  it('reads tests.globs from stack.yml', () => {
    const stack = "version: 1\ntests:\n  globs: ['src/**/*.test.ts', 'e2e/**/*.spec.ts']\n";
    assert.deepEqual(testGlobs(stack), ['src/**/*.test.ts', 'e2e/**/*.spec.ts']);
  });

  it('falls back to the spec files of the boilerplate without stack.yml or tests.globs', () => {
    for (const stack of [undefined, 'version: 1\n', 'tests:\n  needs: [docker]\n', 'tests: null\n']) {
      assert.deepEqual(testGlobs(stack), DEFAULT_TEST_GLOBS);
    }
    assert.deepEqual(DEFAULT_TEST_GLOBS, ['**/*.spec.ts', '**/*.spec.tsx']);
  });

  it('refuses tests.globs when it is not a non-empty list of patterns', () => {
    for (const stack of ['tests:\n  globs: src/**\n', 'tests:\n  globs: []\n', 'tests:\n  globs: [1]\n']) {
      assert.throws(() => testGlobs(stack), /tests\.globs/);
    }
  });

  it('refuses tests written as a list instead of an object', () => {
    assert.throws(() => testGlobs("tests: ['src/**/*.test.ts']\n"), /tests doit être un objet/);
  });

  it('refuses a stack.yml that is not valid YAML', () => {
    assert.throws(() => testGlobs('tests: [\n'), /YAML invalide/);
  });
});

describe('expandBraces', () => {
  it('expands each alternative, nested ones included', () => {
    assert.deepEqual(expandBraces('src/**/*.{test,spec}.ts'), [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
    ]);
    assert.deepEqual(expandBraces('{a,b{c,d}}/*.ts'), ['a/*.ts', 'bc/*.ts', 'bd/*.ts']);
    assert.deepEqual(expandBraces('**/*.spec.{ts,tsx}'), ['**/*.spec.ts', '**/*.spec.tsx']);
  });

  it('leaves a pattern without braces as it is', () => {
    assert.deepEqual(expandBraces('**/*.spec.ts'), ['**/*.spec.ts']);
  });

  it('refuses an unclosed brace', () => {
    assert.throws(() => expandBraces('src/*.{test,spec.ts'), /Accolade non fermée/);
  });
});

describe('pathspecs', () => {
  it('turns the patterns into git glob pathspecs, braces expanded and ./ dropped', () => {
    assert.deepEqual(pathspecs(['**/*.spec.ts', './src/**/*.{test,spec}.ts']), [
      ':(glob)**/*.spec.ts',
      ':(glob)src/**/*.test.ts',
      ':(glob)src/**/*.spec.ts',
    ]);
  });
});
