import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { componentArgs, devSource, releaseSource, zipUrl, type Source } from './source.mts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const release = releaseSource('0.2.0', { SDD_RELEASE_BASE_URL: 'http://localhost:1/' }) as Source & { kind: 'release' };

describe('source', () => {
  it('releaseSource defaults to the GitHub release of the version', () => {
    const s = releaseSource('0.2.0', {});
    assert.deepEqual(s, {
      kind: 'release',
      version: '0.2.0',
      baseUrl: 'https://github.com/artefact-ci/speckit-artefact/releases/download/v0.2.0',
    });
  });

  it('releaseSource honours SDD_RELEASE_BASE_URL without a trailing slash', () => {
    assert.equal((release as { baseUrl: string }).baseUrl, 'http://localhost:1');
    assert.equal(zipUrl(release, 'artefact-sdd'), 'http://localhost:1/artefact-sdd-0.2.0.zip');
  });

  it('componentArgs for a release source', () => {
    const sdd = 'http://localhost:1/artefact-sdd-0.2.0.zip';
    const product = 'http://localhost:1/artefact-product-0.2.0.zip';
    assert.deepEqual(componentArgs(release, 'artefact-product', false), {
      args: ['extension', 'add', '--from', product],
      input: 'y\n',
    });
    assert.deepEqual(componentArgs(release, 'artefact-product', true), {
      args: ['extension', 'add', '--from', product, '--force'],
      input: 'y\n',
    });
    assert.deepEqual(componentArgs(release, 'artefact-sdd', false), { args: ['preset', 'add', '--from', sdd] });
    assert.deepEqual(componentArgs(release, 'artefact-sdd', true), {
      args: ['preset', 'update', 'artefact-sdd', '--from', sdd],
    });
  });

  it('devSource reads preset.version from the clone', () => {
    const expected = (parse(readFileSync(`${root}preset/preset.yml`, 'utf8')) as { preset: { version: string } }).preset.version;
    assert.deepEqual(devSource(root), { kind: 'dev', version: expected, dir: root });
  });

  it('devSource rejects a directory that is not a clone', () => {
    assert.throws(() => devSource('/nonexistent-dir'), { name: 'SetupError', message: /n'est pas un clone de speckit-artefact/ });
  });
});
