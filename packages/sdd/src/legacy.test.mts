import assert from 'node:assert/strict';
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
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
});
