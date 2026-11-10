import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { VERSION_FILES, changelogSection, checkVersions, readVersions, setVersions } from './version.mts';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
let tmp = '';

before(() => {
  tmp = mkdtempSync(join(tmpdir(), 'version-'));
  for (const file of VERSION_FILES) {
    mkdirSync(dirname(join(tmp, file)), { recursive: true });
    cpSync(join(repo, file), join(tmp, file));
  }
});
after(() => rmSync(tmp, { recursive: true, force: true }));

describe('versions', () => {
  it('lists the five files', () => {
    assert.equal(readVersions(tmp).length, 5);
  });

  it('set then check gives no error and keeps the YAML header comments', () => {
    const before = readFileSync(join(tmp, 'preset/preset.yml'), 'utf8');
    setVersions(tmp, '0.2.0');
    assert.deepEqual(checkVersions(tmp, '0.2.0'), []);
    const after = readFileSync(join(tmp, 'preset/preset.yml'), 'utf8');
    const head = (t: string) => t.slice(0, t.indexOf('preset:'));
    assert.equal(head(after), head(before));
    assert.match(after, /^ {2}version: '0\.2\.0'$/m);
  });

  it('names a forgotten file and its found version', () => {
    const file = join(tmp, 'packages/prototype/package.json');
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    pkg.version = '0.1.1';
    writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
    assert.deepEqual(checkVersions(tmp, '0.2.0'), ['packages/prototype/package.json : 0.1.1, attendu 0.2.0']);
  });
});

describe('changelogSection', () => {
  const text = '# Changelog\n\n## [0.2.0] - 2026-11-10\n\n- a\n\n## [0.1.0]\n\n- b\n';
  it('returns the body of a version', () => {
    assert.equal(changelogSection(text, '0.2.0'), '- a');
    assert.equal(changelogSection(text, '0.1.0'), '- b');
  });
  it('accepts a heading without brackets', () => {
    assert.equal(changelogSection('## 0.3.0\n\n- c\n', '0.3.0'), '- c');
  });
  it('returns null when absent', () => {
    assert.equal(changelogSection(text, '0.3.0'), null);
  });
});

describe('cli', () => {
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [join(repo, 'scripts/version.mts'), ...args], { encoding: 'utf8' });

  it('check accepts the v prefix', () => {
    const r = run('check', 'v0.0.0-none');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /attendu 0\.0\.0-none/);
  });

  it('notes fails without a section', () => {
    const r = run('notes', 'v9.9.9');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /CHANGELOG\.md : pas de section pour 9\.9\.9/);
  });
});
