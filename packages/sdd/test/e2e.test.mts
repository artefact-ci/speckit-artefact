import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * La CLI construite (dist/cli.mjs) contre le vrai Spec Kit 1.3.2 via uvx, sur des dépôts git
 * jetables. Lente et réseau : sautée sauf si SDD_E2E=1 (`pnpm test:e2e`, job installer de la CI).
 */
const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const CLI = join(pkg, 'dist', 'cli.mjs');
const SOURCE = join(pkg, '..', '..');
const FIXTURE = join(here, 'fixture');
const SPECIFY = ['--from', 'specify-cli==1.3.2', 'specify'];
const TIMEOUT = 10 * 60 * 1000;

const dirs: string[] = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
function workDir(name: string): string {
  const d = mkdtempSync(join(tmpdir(), `sdd-e2e-${name}-`));
  dirs.push(d);
  return d;
}

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=e2e', '-c', 'user.email=e2e@example.com', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });
const commit = (cwd: string, message: string) => {
  git(cwd, 'add', '-A');
  git(cwd, 'commit', '-qm', message);
};

function specify(cwd: string, ...args: string[]): string {
  const r = spawnSync('uvx', [...SPECIFY, ...args], { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `specify ${args.join(' ')} :\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}

function sdd(cwd: string, ...args: string[]): string {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `artefact-sdd ${args.join(' ')} :\n${r.stdout}\n${r.stderr}`);
  if (process.env['SDD_E2E_PRINT'] === '1') console.log(`--- artefact-sdd ${args[0]} (${cwd})\n${r.stdout}${r.stderr}`);
  return r.stdout;
}

describe('artefact-sdd end to end, real Spec Kit', { skip: process.env['SDD_E2E'] !== '1', timeout: TIMEOUT }, () => {
  it('installs on a project, is idempotent, and update keeps stack.yml and the constitution', () => {
    const repo = workDir('install');
    cpSync(join(FIXTURE, 'repos', 'bun-hono'), repo, { recursive: true });
    git(repo, 'init', '-q');
    commit(repo, 'project');

    const first = sdd(repo, 'init', '--source', SOURCE);
    assert.match(first, /Installé : git, artefact-product, artefact-sdd/);
    assert.match(first, /\.specify\/stack\.yml déduit du dépôt/);
    assert.match(first, /Stack détectée : bun-hono/);
    assert.match(first, /constitution\.md écrit/);
    assert.ok(existsSync(join(repo, '.claude', 'agents', 'relecteur.md')));
    commit(repo, 'artefact-sdd');

    const second = sdd(repo, 'init', '--source', SOURCE);
    assert.match(second, /Déjà installé : git, artefact-product, artefact-sdd/);
    assert.equal(git(repo, 'status', '--porcelain'), '');

    const stack = join(repo, '.specify', 'stack.yml');
    const constitution = join(repo, '.specify', 'memory', 'constitution.md');
    appendFileSync(stack, '# relu par l’équipe\n');
    appendFileSync(constitution, '\n### Principe du projet\n\nRelu par l’équipe.\n');
    commit(repo, 'project settings');
    const before = [readFileSync(stack), readFileSync(constitution)];

    const updated = sdd(repo, 'update', '--source', SOURCE);
    assert.match(updated, /Réinstallé \/ mis à jour : git, artefact-product, artefact-sdd/);
    assert.deepEqual([readFileSync(stack), readFileSync(constitution)], before);
  });

  it('migrates a boilerplate project: removes its preset, keeps docs/agents/', () => {
    const repo = workDir('migrate');
    specify(repo, 'init', '--here', '--integration', 'claude', '--script', 'sh', '--non-interactive', '--ignore-agent-tools');
    git(repo, 'init', '-q');
    specify(repo, 'preset', 'add', '--dev', join(FIXTURE, 'boilerplate-preset'));
    assert.match(specify(repo, 'preset', 'list'), /boilerplate/);
    mkdirSync(join(repo, 'docs', 'agents'), { recursive: true });
    copyFileSync(join(FIXTURE, 'legacy', 'relecteur.md'), join(repo, 'docs', 'agents', 'relecteur.md'));
    commit(repo, 'boilerplate project');
    const legacy = join(repo, 'docs', 'agents', 'relecteur.md');
    const legacyBefore = readFileSync(legacy);

    const out = sdd(repo, 'init', '--source', SOURCE);
    const presets = specify(repo, 'preset', 'list');
    assert.doesNotMatch(presets, /boilerplate/);
    assert.match(presets, /artefact-sdd/);
    assert.deepEqual(readFileSync(legacy), legacyBefore);
    assert.match(out, /docs\/agents\/relecteur\.md : identique au boilerplate/);
    assert.match(out, /preset `boilerplate` retiré/);
    assert.match(out, /`npx @artefact-ci\/sdd update`/);
  });
});
