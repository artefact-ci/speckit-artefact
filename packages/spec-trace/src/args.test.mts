import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { traceArgs } from './args.mts';

describe('traceArgs', () => {
  const none = { help: false, base: undefined, tests: [], featureDirs: [] };

  it('reads the features, --base and every --tests, in both forms', () => {
    assert.deepEqual(traceArgs([]), none);
    assert.deepEqual(
      traceArgs(['specs/001-a', '--base=origin/dev', '--tests', 'a/**', '--tests=b/**', 'specs/002-b']),
      { ...none, base: 'origin/dev', tests: ['a/**', 'b/**'], featureDirs: ['specs/001-a', 'specs/002-b'] },
    );
    assert.deepEqual(traceArgs(['-h']), { ...none, help: true });
  });

  it('asks for a git ref after --base', () => {
    for (const args of [['--base'], ['--base', '--tests', 'a/**'], ['--base=']]) {
      assert.throws(() => traceArgs(args), /^Error: --base attend une référence git \(ex\. origin\/dev\)\.$/);
    }
  });

  it('asks for a pattern after --tests', () => {
    for (const args of [['--tests'], ['--tests', '--base', 'HEAD'], ['--tests=']]) {
      assert.throws(() => traceArgs(args), /^Error: --tests attend un motif de fichiers de tests/);
    }
  });

  it('refuses an unknown option, long or short, and shows the usage', () => {
    assert.throws(() => traceArgs(['--nope']), /^Error: Option inconnue : --nope\nUsage : spec-trace/);
    assert.throws(() => traceArgs(['-x']), /^Error: Option inconnue : -x\nUsage : spec-trace/);
    assert.throws(() => traceArgs(['--help=yes']), /^Error: --help ne prend pas de valeur\.$/);
  });
});
