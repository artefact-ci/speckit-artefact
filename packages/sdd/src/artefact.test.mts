import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { ARTEFACT_JSON, compareVersions, readInstalled, writeInstalled } from './artefact.mts';
import { SetupError } from './errors.mts';

const tmp = (): string => mkdtempSync(join(tmpdir(), 'sdd-artefact-'));

describe('artefact.json', () => {
  it('reads back what was written, and a second identical write changes nothing', () => {
    const root = tmp();
    assert.equal(readInstalled(root), null);
    assert.equal(writeInstalled(root, { version: '0.2.0', source: 'release' }), true);
    assert.deepEqual(readInstalled(root), { version: '0.2.0', source: 'release' });
    assert.equal(writeInstalled(root, { version: '0.2.0', source: 'release' }), false);
  });

  for (const [name, content] of [
    ['a non-string version', '{"version":1}'],
    ['an empty version', '{"version":"","source":"dev"}'],
    ['an unknown source', '{"version":"0.2.0","source":"npm"}'],
    ['invalid JSON', '{nope'],
  ] as const) {
    it(`rejects ${name} naming the file`, () => {
      const root = tmp();
      mkdirSync(join(root, '.specify'));
      writeFileSync(join(root, ARTEFACT_JSON), content);
      assert.throws(
        () => readInstalled(root),
        (e: Error) => e instanceof SetupError && e.message.includes('.specify/artefact.json'),
      );
    });
  }

  it('compares versions numerically', () => {
    assert.ok(compareVersions('0.10.0', '0.9.0') > 0);
    assert.ok(compareVersions('0.1.9', '0.2.0') < 0);
    assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
  });
});
