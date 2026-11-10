import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { buildZip, trackedFiles } from './zip.mts';

let tmp = '';

function git(...args: string[]): void {
  execFileSync('git', args, { cwd: tmp, stdio: 'ignore' });
}

before(() => {
  tmp = mkdtempSync(join(tmpdir(), 'zip-'));
  const files: Record<string, string> = {
    'preset/preset.yml': 'preset:\n  version: 0.1.2\n',
    'preset/templates/a.md': '# Modèle é\n'.repeat(50),
    'preset/.DS_Store': 'junk',
  };
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(tmp, file)), { recursive: true });
    writeFileSync(join(tmp, file), content);
  }
  git('init', '-q');
  git('add', 'preset/preset.yml', 'preset/templates/a.md');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'init');
});
after(() => rmSync(tmp, { recursive: true, force: true }));

describe('zip', () => {
  it('lists only tracked files, relative to the directory, sorted', () => {
    assert.deepEqual(trackedFiles(tmp, 'preset'), ['preset.yml', 'templates/a.md']);
  });

  it('is byte for byte reproducible', () => {
    buildZip(tmp, 'preset', join(tmp, 'one.zip'));
    buildZip(tmp, 'preset', join(tmp, 'two.zip'));
    assert.ok(readFileSync(join(tmp, 'one.zip')).equals(readFileSync(join(tmp, 'two.zip'))));
  });

  it('contains exactly the tracked files, never an untracked one', () => {
    buildZip(tmp, 'preset', join(tmp, 'out.zip'));
    const names = execFileSync('unzip', ['-Z1', join(tmp, 'out.zip')], { encoding: 'utf8' }).trim().split('\n');
    assert.deepEqual(names, ['preset.yml', 'templates/a.md']);
    assert.ok(!names.includes('.DS_Store'));
  });

  it('restores the original content and passes unzip -t', () => {
    buildZip(tmp, 'preset', join(tmp, 'out.zip'));
    const content = execFileSync('unzip', ['-p', join(tmp, 'out.zip'), 'templates/a.md'], { encoding: 'utf8' });
    assert.equal(content, readFileSync(join(tmp, 'preset/templates/a.md'), 'utf8'));
    assert.equal(spawnSync('unzip', ['-t', join(tmp, 'out.zip')]).status, 0);
  });
});
