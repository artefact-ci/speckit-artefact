import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_TEST_GLOBS, isTestFile, pathspecs, testGlobs } from './stack.mts';

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

  it('refuses a stack.yml that is not valid YAML', () => {
    assert.throws(() => testGlobs('tests: [\n'), /YAML invalide/);
  });
});

describe('isTestFile', () => {
  const globs = ['**/*.spec.ts', '**/*.spec.tsx'];

  it('matches the test files at any depth, the root included', () => {
    for (const path of ['order.spec.ts', 'libs/api/orders/order.spec.ts', 'apps/web/a.spec.tsx']) {
      assert.equal(isTestFile(path, globs), true, path);
    }
  });

  it('leaves out the other files', () => {
    for (const path of ['order.ts', 'tools/dev/spec-trace-core.test.mts', 'a.spec.ts.snap']) {
      assert.equal(isTestFile(path, globs), false, path);
    }
  });

  it('follows a directory given in the pattern', () => {
    assert.equal(isTestFile('src/a/b.test.ts', ['src/**/*.test.ts']), true);
    assert.equal(isTestFile('scripts/b.test.ts', ['src/**/*.test.ts']), false);
  });
});

describe('pathspecs', () => {
  it('turns the patterns into git glob pathspecs', () => {
    assert.deepEqual(pathspecs(['**/*.spec.ts', 'src/**/*.test.ts']), [
      ':(glob)**/*.spec.ts',
      ':(glob)src/**/*.test.ts',
    ]);
  });
});
