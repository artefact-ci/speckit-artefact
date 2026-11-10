import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
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
const ZIP_CLI = join(SOURCE, 'scripts', 'zip.mts');
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

function runSdd(cwd: string, env: NodeJS.ProcessEnv, ...args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
}

/** Asynchrone : le serveur de zips vit dans ce processus, un spawnSync bloquerait sa boucle d'événements. */
function runSddAsync(cwd: string, env: NodeJS.ProcessEnv, ...args: string[]) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], { cwd, env: { ...process.env, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (c: string) => (stdout += c));
    child.stderr.setEncoding('utf8').on('data', (c: string) => (stderr += c));
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

function report(r: { status: number | null; stdout: string; stderr: string }, args: string[], cwd: string): string {
  assert.equal(r.status, 0, `artefact-sdd ${args.join(' ')} :\n${r.stdout}\n${r.stderr}`);
  if (process.env['SDD_E2E_PRINT'] === '1') console.log(`--- artefact-sdd ${args[0]} (${cwd})\n${r.stdout}${r.stderr}`);
  return r.stdout;
}

function sdd(cwd: string, ...args: string[]): string {
  return report(runSdd(cwd, {}, ...args), args, cwd);
}

async function sddEnv(cwd: string, env: NodeJS.ProcessEnv, ...args: string[]): Promise<string> {
  return report(await runSddAsync(cwd, env, ...args), args, cwd);
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

  describe('release mode, zips served behind a 302 like GitHub', () => {
    let server: Server;
    let env: NodeJS.ProcessEnv;
    let componentVersion: string;
    let installerVersion: string;
    let repo: string;

    const manifestVersion = (file: string) => /^ {2}version: '([^']+)'/m.exec(readFileSync(join(SOURCE, file), 'utf8'))![1]!;
    const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

    before(async () => {
      installerVersion = json(join(pkg, 'package.json')).version;
      const presetV = manifestVersion('preset/preset.yml');
      const extensionV = manifestVersion('extension/extension.yml');
      componentVersion = presetV;
      assert.equal(extensionV, presetV, 'preset and extension share one version');
      const out = workDir('zips');
      execFileSync(process.execPath, [ZIP_CLI, out], { cwd: SOURCE, stdio: 'pipe' });
      const built: Record<string, string> = {
        [`artefact-sdd-${installerVersion}.zip`]: `artefact-sdd-${presetV}.zip`,
        [`artefact-product-${installerVersion}.zip`]: `artefact-product-${extensionV}.zip`,
      };
      server = createServer((req, res) => {
        const url = req.url ?? '';
        const asked = basename(url);
        if (url.startsWith(`/v${installerVersion}/`) && built[asked]) {
          res.writeHead(302, { location: `/files/${built[asked]}` });
          res.end();
        } else if (url.startsWith('/files/') && existsSync(join(out, asked))) {
          res.writeHead(200, { 'content-type': 'application/zip' });
          res.end(readFileSync(join(out, asked)));
        } else {
          res.writeHead(404);
          res.end();
        }
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const { port } = server.address() as AddressInfo;
      env = { SDD_RELEASE_BASE_URL: `http://127.0.0.1:${port}/v${installerVersion}` };
    });
    after(() => {
      server.close();
    });

    it('release mode: init twice leaves no diff', async () => {
      repo = workDir('release');
      cpSync(join(FIXTURE, 'repos', 'bun-hono'), repo, { recursive: true });
      git(repo, 'init', '-q');
      commit(repo, 'project');

      const first = await sddEnv(repo, env, 'init');
      assert.match(first, /Installé : git, artefact-product, artefact-sdd/);
      assert.ok(first.includes(`Version : ${installerVersion} (release)`), first);
      assert.deepEqual(json(join(repo, '.specify', 'artefact.json')), { version: installerVersion, source: 'release' });
      assert.equal(json(join(repo, '.specify', 'presets', '.registry')).presets['artefact-sdd'].version, componentVersion);
      assert.equal(json(join(repo, '.specify', 'extensions', '.registry')).extensions['artefact-product'].version, componentVersion);
      commit(repo, 'artefact-sdd');

      await sddEnv(repo, env, 'init');
      assert.equal(git(repo, 'status', '--porcelain'), '');
    });

    it('release mode: init refuses a project recorded at another version', async () => {
      writeFileSync(join(repo, '.specify', 'artefact.json'), '{"version":"0.0.1","source":"release"}\n');
      commit(repo, 'recorded at 0.0.1');

      const r = await runSddAsync(repo, env, 'init');
      assert.equal(r.status, 1, `${r.stdout}\n${r.stderr}`);
      assert.match(`${r.stdout}${r.stderr}`, /lance update/);
      assert.equal(git(repo, 'status', '--porcelain'), '');
    });

    it('release mode: update records the new version', async () => {
      const out = await sddEnv(repo, env, 'update');
      assert.deepEqual(json(join(repo, '.specify', 'artefact.json')), { version: installerVersion, source: 'release' });
      assert.ok(out.includes(`0.0.1 → ${installerVersion}`), out);
      assert.doesNotMatch(out, /^ {2}Attention/m);
    });
  });
});
