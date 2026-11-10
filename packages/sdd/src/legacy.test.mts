import assert from 'node:assert/strict';
import { appendFileSync, chmodSync, copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { legacyAgents } from './legacy.mts';

const fixture = (n: string) => fileURLToPath(new URL(`../test/fixture/legacy/${n}`, import.meta.url));
const tempRoot = () => mkdtempSync(join(tmpdir(), 'sdd-legacy-'));

describe('legacy', () => {
  it('boilerplate file is unchanged, edited one is modified', () => {
    const root = tempRoot();
    mkdirSync(join(root, 'docs/agents'), { recursive: true });
    copyFileSync(fixture('relecteur.md'), join(root, 'docs/agents/relecteur.md'));
    copyFileSync(fixture('po.md'), join(root, 'docs/agents/po.md'));
    appendFileSync(join(root, 'docs/agents/po.md'), '\nlocal edit\n');
    writeFileSync(join(root, 'docs/agents/custom.md'), 'mine');
    writeFileSync(join(root, 'docs/agents/notes.txt'), 'ignored');
    assert.deepEqual(legacyAgents(root).files, [
      { path: 'docs/agents/custom.md', state: 'unknown' },
      { path: 'docs/agents/po.md', state: 'modified' },
      { path: 'docs/agents/relecteur.md', state: 'unchanged' },
    ]);
  });

  it('legacy: no docs/agents gives nothing', () => {
    assert.deepEqual(legacyAgents(tempRoot()), { files: [], mentions: [] });
  });

  it('legacy: AGENTS.md citing docs/agents/ is a mention', () => {
    const root = tempRoot();
    mkdirSync(join(root, 'docs/agents'), { recursive: true });
    mkdirSync(join(root, 'sub'), { recursive: true });
    mkdirSync(join(root, '.claude/agents'), { recursive: true });
    mkdirSync(join(root, 'node_modules/x'), { recursive: true });
    writeFileSync(join(root, 'AGENTS.md'), 'See docs/agents/po.md');
    writeFileSync(join(root, 'sub/README.md'), 'see docs/agents/');
    writeFileSync(join(root, 'other.md'), 'nothing');
    writeFileSync(join(root, 'docs/agents/po.md'), 'docs/agents/self');
    writeFileSync(join(root, '.claude/agents/po.md'), 'docs/agents/po.md');
    writeFileSync(join(root, 'node_modules/x/a.md'), 'docs/agents/');
    assert.deepEqual(legacyAgents(root).mentions, ['AGENTS.md', 'sub/README.md']);
  });

  it('legacy: the constitution in .specify/memory/ is scanned, the installed .specify/ folders are not', () => {
    const root = tempRoot();
    for (const d of ['memory', 'extensions/x', 'presets/x', 'templates', 'scripts', 'integrations', 'workflows']) {
      mkdirSync(join(root, '.specify', d), { recursive: true });
    }
    writeFileSync(join(root, '.specify/memory/constitution.md'), 'Voir docs/agents/relecteur.md');
    for (const d of ['extensions/x', 'presets/x', 'templates', 'scripts', 'integrations', 'workflows']) {
      writeFileSync(join(root, '.specify', d, 'a.md'), 'docs/agents/relecteur.md');
    }
    assert.deepEqual(legacyAgents(root).mentions, ['.specify/memory/constitution.md']);
  });

  it('legacy: build and cache folders are skipped', () => {
    const root = tempRoot();
    for (const d of ['.next', '.nx', 'coverage', '.turbo', 'build', 'vendor', 'dist']) {
      mkdirSync(join(root, d), { recursive: true });
      writeFileSync(join(root, d, 'a.md'), 'docs/agents/');
    }
    assert.deepEqual(legacyAgents(root).mentions, []);
  });

  it('legacy: an unreadable folder is skipped, not fatal', { skip: process.getuid?.() === 0 }, () => {
    const root = tempRoot();
    mkdirSync(join(root, 'locked'));
    writeFileSync(join(root, 'locked/a.md'), 'docs/agents/');
    writeFileSync(join(root, 'AGENTS.md'), 'docs/agents/po.md');
    chmodSync(join(root, 'locked'), 0o000);
    try {
      assert.deepEqual(legacyAgents(root).mentions, ['AGENTS.md']);
    } finally {
      chmodSync(join(root, 'locked'), 0o755);
    }
  });
});
