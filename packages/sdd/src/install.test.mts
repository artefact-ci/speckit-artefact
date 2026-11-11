import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { init, SetupError, update, type Options } from './install.mts';
import { releaseSource, devSource, type Source } from './source.mts';
import { run, SpecifyError, type Run } from './specify.mts';

const source = fileURLToPath(new URL('../../../', import.meta.url));
const dev: Source = devSource(source);
const releaseUrl = 'http://localhost:1';
const fixture = (n: string): string => fileURLToPath(new URL(`../test/fixture/${n}`, import.meta.url));
const read = (root: string, p: string): string => readFileSync(join(root, p), 'utf8');

const METHOD_AGENTS = [
  '.claude/agents/designer.md',
  '.claude/agents/relecteur.md',
  '.claude/agents/relecteur-produit.md',
  '.claude/agents/relecteur-design.md',
];

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
  });

/** Dépôt git temporaire ; avec `commit`, un README commité sur `main` plus une branche `dev`. */
function tempRepo(commit = true): string {
  const root = mkdtempSync(join(tmpdir(), 'sdd-install-'));
  git(root, 'init', '-q', '-b', 'main');
  if (commit) {
    writeFileSync(join(root, 'README.md'), '# demo\n');
    git(root, 'add', '.');
    git(root, 'commit', '-q', '-m', 'init');
    git(root, 'branch', 'dev');
  }
  return root;
}

type Registry = { schema_version: string; [k: string]: unknown };

function register(root: string, kind: 'extensions' | 'presets', id: string, on: boolean): void {
  const file = join(root, '.specify', kind, '.registry');
  const reg: Registry = existsSync(file)
    ? (JSON.parse(readFileSync(file, 'utf8')) as Registry)
    : { schema_version: '1.0', [kind]: {} };
  const map = reg[kind] as Record<string, unknown>;
  if (on) map[id] = { version: '1.0.0', installed_at: new Date().toISOString() };
  else delete map[id];
  mkdirSync(join(root, '.specify', kind), { recursive: true });
  writeFileSync(file, JSON.stringify(reg, null, 2));
}

const isRegistered = (root: string, kind: 'extensions' | 'presets', id: string): boolean => {
  const file = join(root, '.specify', kind, '.registry');
  if (!existsSync(file)) return false;
  return id in ((JSON.parse(readFileSync(file, 'utf8')) as Registry)[kind] as object);
};

/** Source attendue : le clone en --dev, l'URL du zip en --from. */
const from = (a: string[], id: string, dir: string): string =>
  a.includes('--from') ? `${releaseUrl}/${id}-0.2.0.zip` : join(source, dir);

/** Faux Spec Kit : simule `specify`, délègue `git` au vrai git, enregistre chaque appel `specify`. */
function fakeRunner(opts: { uv?: boolean; failFrom?: boolean; failUse?: string } = {}): { runner: Run; calls: string[][]; inputs: (string | undefined)[] } {
  const calls: string[][] = [];
  const inputs: (string | undefined)[] = [];
  const runner: Run = async (cmd, args, o) => {
    if (cmd === 'git') return run(cmd, args, o);
    if (cmd !== 'uvx') throw new Error(`unexpected command ${cmd}`);
    if (opts.uv === false) throw Object.assign(new Error('spawn uvx ENOENT'), { code: 'ENOENT' });
    if (args[0] === '--version') return { code: 0, stdout: 'uv 0.9.0', stderr: '' };
    assert.deepEqual(args.slice(0, 3), ['--from', 'specify-cli==1.3.2', 'specify']);
    const a = args.slice(3);
    calls.push(a);
    const root = o.cwd;
    const fail = (stderr: string) => ({ code: 1, stdout: '', stderr });
    const has = (f: string) => a.includes(f);
    inputs.push(o.input);
    if (has('--from') && opts.failFrom) return { code: 1, stdout: 'Error: download failed', stderr: '' };
    if (a[0] === 'init') {
      // Comme Spec Kit 1.3.2 : `.git` compte, l'erreur sort sur stdout.
      if (readdirSync(root).length > 0 && !has('--force')) {
        return { code: 1, stdout: 'Error: Current directory is not empty. Use --force.', stderr: '' };
      }
      const integration = a[a.indexOf('--integration') + 1] ?? 'copilot';
      mkdirSync(join(root, '.specify/memory'), { recursive: true });
      writeFileSync(join(root, '.specify/memory/constitution.md'), readFileSync(fixture('constitution-blank.md')));
      writeFileSync(join(root, '.specify/init-options.json'), '{"script":"sh"}\n');
      writeFileSync(
        join(root, '.specify/integration.json'),
        JSON.stringify({ integration, installed_integrations: [integration] }, null, 2),
      );
    } else if (a[0] === 'extension' && a[1] === 'add') {
      const id = a[2] === 'git' ? 'git' : 'artefact-product';
      if (isRegistered(root, 'extensions', id) && !has('--force')) return fail(`${id} already installed, retry with --force`);
      if (id === 'git') {
        writeFileSync(join(root, '.specify/extensions.yml'), readFileSync(fixture('extensions-18.yml')));
      } else {
        assert.equal(a[a.includes('--from') ? a.indexOf('--from') + 1 : a.indexOf('--dev') + 1], from(a, 'artefact-product', 'extension'));
        cpSync(join(source, 'extension/agents'), join(root, '.specify/extensions/artefact-product/agents'), {
          recursive: true,
        });
      }
      register(root, 'extensions', id, true);
    } else if (a[0] === 'preset' && (a[1] === 'add' || a[1] === 'update')) {
      assert.equal(a[a.includes('--from') ? a.indexOf('--from') + 1 : a.indexOf('--dev') + 1], from(a, 'artefact-sdd', 'preset'));
      if (a[1] === 'add' && isRegistered(root, 'presets', 'artefact-sdd')) return fail('already installed');
      if (a[1] === 'update') assert.equal(a[2], 'artefact-sdd');
      const dir = join(root, '.specify/presets/artefact-sdd/templates');
      mkdirSync(dir, { recursive: true });
      cpSync(join(source, 'preset/templates/constitution-template.md'), join(dir, 'constitution-template.md'));
      register(root, 'presets', 'artefact-sdd', true);
    } else if (a[0] === 'preset' && a[1] === 'remove') {
      register(root, 'presets', a[2] ?? '', false);
    } else if (a[0] === 'integration' && a[1] === 'use') {
      if (opts.failUse === a[2]) return { code: 1, stdout: `Error: cannot use ${a[2]}`, stderr: '' };
      // Comme Spec Kit 1.3.2 : `use` réécrit les scripts partagés sans leur droit d'exécution.
      const scripts = join(root, '.specify/scripts/bash');
      if (existsSync(scripts)) for (const f of readdirSync(scripts)) chmodSync(join(scripts, f), 0o644);
    } else {
      return fail(`unknown: ${a.join(' ')}`);
    }
    return { code: 0, stdout: '', stderr: '' };
  };
  return { runner, calls, inputs };
}

const options = (root: string, runner: Run, extra: Partial<Options> = {}): Options => ({
  root,
  source: dev,
  toolsVersion: '0.1.0',
  runner,
  ...extra,
});

/** Chemin relatif → [mtime, contenu] de chaque fichier hors `.git`. */
function snapshot(root: string): Map<string, [number, string]> {
  const out = new Map<string, [number, string]>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git') continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else out.set(relative(root, p), [statSync(p).mtimeMs, readFileSync(p, 'utf8')]);
    }
  };
  walk(root);
  return out;
}

/** Un `.specify/` déjà installé (sans composant), intégration claude. */
function existingSpecify(root: string, integration = 'claude'): void {
  mkdirSync(join(root, '.specify/memory'), { recursive: true });
  writeFileSync(join(root, '.specify/integration.json'), JSON.stringify({ integration }));
  writeFileSync(join(root, '.specify/memory/constitution.md'), readFileSync(fixture('constitution-blank.md')));
}

describe('install', () => {
  it('init installs everything in order', async () => {
    const root = tempRepo();
    const { runner, calls } = fakeRunner();
    const report = await init(options(root, runner));
    assert.deepEqual(calls, [
      ['init', '--here', '--script', 'sh', '--non-interactive', '--ignore-agent-tools', '--integration', 'claude', '--force'],
      ['extension', 'add', 'git'],
      ['extension', 'add', '--dev', join(source, 'extension')],
      ['preset', 'add', '--dev', join(source, 'preset')],
    ]);
    assert.deepEqual(report.installed, ['git', 'artefact-product', 'artefact-sdd']);
    assert.deepEqual(report.skipped, []);
    assert.deepEqual(report.agents, METHOD_AGENTS);
    assert.deepEqual(report.noAgentGenerator, []);
    assert.deepEqual(report.agentsSkipped, []);
    assert.equal(report.constitution, 'written');
    assert.equal(report.dirty, false);
    assert.equal(report.mode, 'init');
    assert.equal(report.migrated, false);
    assert.equal(report.noIntegration, false);
    assert.ok(report.stack);
    assert.equal(read(root, '.specify/stack.yml'), report.stack.yaml);
    assert.match(report.stack.yaml, /base: dev/);
    assert.match(report.stack.yaml, /production: main/);
    const constitution = read(root, '.specify/memory/constitution.md');
    assert.ok(constitution.includes(basename(root)));
    assert.ok(!constitution.includes('[PROJECT_NAME]'));
    const ext = read(root, '.specify/extensions.yml');
    assert.ok(ext.includes('Wired on purpose'));
    assert.ok(!ext.includes('speckit.git.initialize'));
    for (const a of METHOD_AGENTS) assert.ok(existsSync(join(root, a)), a);
    assert.ok(!existsSync(join(root, '.claude/agents/po.md')));
  });

  it('init with a release source runs extension add --from <url> with y on stdin', async () => {
    const root = tempRepo();
    const { runner, calls, inputs } = fakeRunner();
    const release = releaseSource('0.2.0', { SDD_RELEASE_BASE_URL: `${releaseUrl}/` });
    await init(options(root, runner, { source: release }));
    const specifyCalls = calls.filter((a) => a[0] !== 'init');
    assert.deepEqual(specifyCalls, [
      ['extension', 'add', 'git'],
      ['extension', 'add', '--from', `${releaseUrl}/artefact-product-0.2.0.zip`],
      ['preset', 'add', '--from', `${releaseUrl}/artefact-sdd-0.2.0.zip`],
    ]);
    const stdin = calls.map((a, i) => [a, inputs[i]] as const).filter(([a]) => a.includes('--from'));
    assert.deepEqual(stdin.map(([, input]) => input), ['y\n', undefined]);
    assert.ok(existsSync(join(root, '.specify/extensions/artefact-product')));
  });

  it('a failing release download names the URL', async () => {
    const root = tempRepo();
    const { runner } = fakeRunner({ failFrom: true });
    const release = releaseSource('0.2.0', { SDD_RELEASE_BASE_URL: releaseUrl });
    await assert.rejects(init(options(root, runner, { source: release })), (e: Error) => {
      assert.ok(e instanceof SetupError, String(e));
      assert.match(e.message, /http:\/\/localhost:1\/artefact-product-0\.2\.0\.zip/);
      assert.match(e.message, /impossible d'installer artefact-product 0\.2\.0/);
      return true;
    });
  });

  it('a failing preset update --from during update names the URL and says to rerun', async () => {
    const root = tempRepo();
    const { runner } = fakeRunner();
    const release = releaseSource('0.2.0', { SDD_RELEASE_BASE_URL: `${releaseUrl}/` });
    await init(options(root, runner, { source: release }));
    const failing: Run = async (cmd, args, o) =>
      cmd === 'uvx' && args.includes('preset') && args.includes('update') && args.includes('--from')
        ? { code: 1, stdout: 'Error: download failed', stderr: '' }
        : runner(cmd, args, o);
    await assert.rejects(update(options(root, failing, { source: release })), (e: Error) => {
      assert.ok(e instanceof SetupError, String(e));
      assert.match(e.message, /impossible d'installer artefact-sdd 0\.2\.0 depuis http:\/\/localhost:1\/artefact-sdd-0\.2\.0\.zip/);
      assert.match(e.message, /relance la même commande une fois le réseau rétabli$/);
      return true;
    });
  });

  it('init in a git repo without commit forces (.git counts) and finds no branch', async () => {
    const root = tempRepo(false);
    const { runner, calls } = fakeRunner();
    const report = await init(options(root, runner));
    assert.ok(calls[0]?.includes('--force'));
    assert.equal(report.dirty, false);
    assert.ok(report.stack);
    assert.match(report.stack.yaml, /base: # à compléter/);
    assert.match(report.stack.yaml, /production: # à compléter/);
  });

  it('init on chore/x with only main: base main, production to complete', async () => {
    const root = tempRepo();
    git(root, 'branch', '-D', 'dev');
    git(root, 'checkout', '-q', '-b', 'chore/x');
    const { runner } = fakeRunner();
    const report = await init(options(root, runner));
    assert.ok(report.stack);
    assert.match(report.stack.yaml, /base: main\n/);
    assert.match(report.stack.yaml, /production: # à compléter/);
  });

  it('init in a fresh clone of dev: main only on origin is still production', async () => {
    const origin = tempRepo();
    const root = mkdtempSync(join(tmpdir(), 'sdd-clone-'));
    git(root, 'clone', '-q', '-b', 'dev', origin, '.');
    assert.equal(git(root, 'branch', '--format=%(refname:short)').trim(), 'dev');
    const { runner } = fakeRunner();
    const report = await init(options(root, runner));
    assert.ok(report.stack);
    assert.match(report.stack.yaml, /base: dev\n/);
    assert.match(report.stack.yaml, /production: main\n/);
  });

  it('init in a clone without dev takes the default branch of origin as base', async () => {
    const origin = tempRepo();
    git(origin, 'branch', '-D', 'dev');
    git(origin, 'branch', '-m', 'main', 'trunk');
    git(origin, 'branch', 'main');
    git(origin, 'branch', 'feature');
    const root = mkdtempSync(join(tmpdir(), 'sdd-clone-'));
    git(root, 'clone', '-q', '-b', 'feature', origin, '.');
    const { runner } = fakeRunner();
    const report = await init(options(root, runner));
    assert.ok(report.stack);
    assert.match(report.stack.yaml, /base: trunk\n/);
    assert.match(report.stack.yaml, /production: main\n/);
  });

  it('second init calls no install and writes nothing', async () => {
    const root = tempRepo();
    const { runner, calls } = fakeRunner();
    await init(options(root, runner));
    const before = snapshot(root);
    calls.length = 0;
    const report = await init(options(root, runner));
    assert.deepEqual(calls, []);
    assert.deepEqual(report.installed, []);
    assert.deepEqual(report.skipped, ['git', 'artefact-product', 'artefact-sdd']);
    assert.deepEqual(report.agents, METHOD_AGENTS);
    assert.equal(report.constitution, 'kept');
    assert.equal(report.stack, undefined);
    assert.deepEqual(snapshot(root), before);
  });

  it('init keeps an existing stack.yml and constitution', async () => {
    const root = tempRepo();
    existingSpecify(root);
    writeFileSync(join(root, '.specify/memory/constitution.md'), '# Mine\n');
    writeFileSync(join(root, '.specify/stack.yml'), 'version: 1\n# hand-written\n');
    const { runner, calls } = fakeRunner();
    const report = await init(options(root, runner));
    assert.ok(!calls.some((c) => c[0] === 'init'));
    assert.equal(report.constitution, 'kept');
    assert.equal(report.stack, undefined);
    assert.equal(read(root, '.specify/memory/constitution.md'), '# Mine\n');
    assert.equal(read(root, '.specify/stack.yml'), 'version: 1\n# hand-written\n');
  });

  it('init migrates the boilerplate preset', async () => {
    const root = tempRepo();
    existingSpecify(root);
    register(root, 'presets', 'boilerplate', true);
    const { runner, calls } = fakeRunner();
    const report = await init(options(root, runner));
    assert.deepEqual(calls, [
      ['preset', 'remove', 'boilerplate'],
      ['extension', 'add', 'git'],
      ['extension', 'add', '--dev', join(source, 'extension')],
      ['preset', 'add', '--dev', join(source, 'preset')],
    ]);
    assert.ok(!isRegistered(root, 'presets', 'boilerplate'));
    assert.equal(report.migrated, true);
    assert.equal(report.constitution, 'written');
  });

  it('update never writes stack.yml nor the constitution', async () => {
    const root = tempRepo();
    const { runner, calls } = fakeRunner();
    await init(options(root, runner));
    // Constitution remise à vierge : update ne doit pas la remplir pour autant.
    writeFileSync(join(root, '.specify/memory/constitution.md'), readFileSync(fixture('constitution-blank.md')));
    writeFileSync(join(root, '.specify/stack.yml'), 'version: 1\n# edited\n');
    const before = snapshot(root);
    calls.length = 0;
    const report = await update(options(root, runner));
    assert.deepEqual(calls, [
      ['extension', 'add', 'git', '--force'],
      ['extension', 'add', '--dev', join(source, 'extension'), '--force'],
      ['preset', 'update', 'artefact-sdd', '--dev', join(source, 'preset')],
    ]);
    assert.deepEqual(report.installed, ['git', 'artefact-product', 'artefact-sdd']);
    assert.equal(report.mode, 'update');
    assert.equal(report.migrated, false);
    assert.equal(report.constitution, 'kept');
    assert.equal(report.stack, undefined);
    assert.deepEqual(report.agents, METHOD_AGENTS);
    const after = snapshot(root);
    assert.deepEqual(after.get('.specify/stack.yml'), before.get('.specify/stack.yml'));
    assert.deepEqual(after.get('.specify/memory/constitution.md'), before.get('.specify/memory/constitution.md'));
    // extensions.yml réécrit à 18 hooks par la réinstallation, puis ramené aux 10.
    assert.ok(!read(root, '.specify/extensions.yml').includes('speckit.git.initialize'));
  });

  it('first init writes artefact.json with the source version', async () => {
    const root = tempRepo();
    const { runner } = fakeRunner();
    const report = await init(options(root, runner));
    assert.deepEqual(JSON.parse(read(root, '.specify/artefact.json')), { version: dev.version, source: 'dev' });
    assert.equal(read(root, '.specify/artefact.json'), `${JSON.stringify({ version: dev.version, source: 'dev' }, null, 2)}\n`);
    assert.deepEqual(report.version, { installed: { version: dev.version, source: 'dev' }, previous: null, downgrade: false });
  });

  it('second init with the same version leaves artefact.json untouched', async () => {
    const root = tempRepo();
    const { runner } = fakeRunner();
    await init(options(root, runner));
    const before = snapshot(root).get('.specify/artefact.json');
    const report = await init(options(root, runner));
    assert.deepEqual(snapshot(root).get('.specify/artefact.json'), before);
    assert.deepEqual(report.version.previous, { version: dev.version, source: 'dev' });
    assert.equal(report.version.downgrade, false);
  });

  it('init refuses another version and runs no specify command', async () => {
    const root = tempRepo();
    const { runner, calls } = fakeRunner();
    await init(options(root, runner));
    calls.length = 0;
    register(root, 'presets', 'boilerplate', true);
    const other: Source = { kind: 'dev', version: '9.9.9', dir: source };
    await assert.rejects(init(options(root, runner, { source: other })), (e: unknown) => {
      assert.ok(e instanceof SetupError);
      assert.equal(
        e.message,
        `Spec Kit a déjà la méthode en ${dev.version} (.specify/artefact.json) ; cet installeur installe 9.9.9 : lance update pour changer de version`,
      );
      return true;
    });
    assert.deepEqual(calls, []);
    assert.ok(isRegistered(root, 'presets', 'boilerplate'));
  });

  it('init on a phase 4 install installs nothing new and writes no artefact.json', async () => {
    const root = tempRepo();
    existingSpecify(root);
    register(root, 'extensions', 'git', true);
    register(root, 'extensions', 'artefact-product', true);
    register(root, 'presets', 'artefact-sdd', true);
    mkdirSync(join(root, '.specify/presets/artefact-sdd/templates'), { recursive: true });
    cpSync(
      join(source, 'preset/templates/constitution-template.md'),
      join(root, '.specify/presets/artefact-sdd/templates/constitution-template.md'),
    );
    cpSync(join(source, 'extension/agents'), join(root, '.specify/extensions/artefact-product/agents'), { recursive: true });
    const { runner, calls } = fakeRunner();
    const report = await init(options(root, runner));
    assert.deepEqual(calls, []);
    assert.deepEqual(report.installed, []);
    assert.ok(!existsSync(join(root, '.specify/artefact.json')));
    assert.deepEqual(report.version, { installed: null, previous: null, downgrade: false });
  });

  it('update writes the new version and reports the previous one', async () => {
    const root = tempRepo();
    const { runner } = fakeRunner();
    await init(options(root, runner));
    const next: Source = { kind: 'dev', version: '9.9.9', dir: source };
    const report = await update(options(root, runner, { source: next }));
    assert.deepEqual(JSON.parse(read(root, '.specify/artefact.json')), { version: '9.9.9', source: 'dev' });
    assert.deepEqual(report.version, {
      installed: { version: '9.9.9', source: 'dev' },
      previous: { version: dev.version, source: 'dev' },
      downgrade: false,
    });
  });

  it('update without artefact.json writes it and knows no previous version', async () => {
    const root = tempRepo();
    const { runner } = fakeRunner();
    await init(options(root, runner));
    rmSync(join(root, '.specify/artefact.json'));
    const report = await update(options(root, runner));
    assert.equal(report.version.previous, null);
    assert.deepEqual(report.version.installed, { version: dev.version, source: 'dev' });
    assert.ok(existsSync(join(root, '.specify/artefact.json')));
  });

  it('update to an older version warns and goes on', async () => {
    const root = tempRepo();
    const { runner } = fakeRunner();
    await init(options(root, runner, { source: { kind: 'dev', version: '9.9.9', dir: source } }));
    const report = await update(options(root, runner));
    assert.equal(report.version.downgrade, true);
    assert.deepEqual(report.installed, ['git', 'artefact-product', 'artefact-sdd']);
    assert.deepEqual(JSON.parse(read(root, '.specify/artefact.json')), { version: dev.version, source: 'dev' });
  });

  it('a malformed artefact.json stops init and update before any specify command', async () => {
    const root = tempRepo();
    existingSpecify(root);
    writeFileSync(join(root, '.specify/artefact.json'), '{"version":1}');
    const { runner, calls } = fakeRunner();
    for (const f of [init, update]) {
      await assert.rejects(f(options(root, runner)), (e: unknown) => e instanceof SetupError && e.message.includes('.specify/artefact.json'));
    }
    assert.deepEqual(calls, []);
    assert.equal(read(root, '.specify/artefact.json'), '{"version":1}');
  });

  it('a failing git extension keeps its SpecifyError in release mode', async () => {
    const root = tempRepo();
    const { runner } = fakeRunner();
    const failGit: Run = async (cmd, args, o) =>
      cmd === 'uvx' && args.includes('git') ? { code: 1, stdout: 'Error: git boom', stderr: '' } : runner(cmd, args, o);
    const release = releaseSource('0.2.0', { SDD_RELEASE_BASE_URL: releaseUrl });
    await assert.rejects(init(options(root, failGit, { source: release })), (e: unknown) => {
      assert.ok(e instanceof SpecifyError, String(e));
      assert.ok(!/git-0\.2\.0\.zip/.test((e as Error).message));
      return true;
    });
  });

  it('update without .specify fails', async () => {
    const root = tempRepo();
    const { runner, calls } = fakeRunner();
    await assert.rejects(update(options(root, runner)), (e: unknown) => e instanceof SetupError && /lance init/.test(e.message));
    assert.deepEqual(calls, []);
  });

  it('init without uv fails with the install link', async () => {
    const root = tempRepo();
    const { runner, calls } = fakeRunner({ uv: false });
    await assert.rejects(
      init(options(root, runner)),
      (e: unknown) =>
        e instanceof SetupError && e.message.includes('https://docs.astral.sh/uv/getting-started/installation/'),
    );
    assert.deepEqual(calls, []);
    assert.ok(!existsSync(join(root, '.specify')));
  });

  it('init on a dirty repo keeps the modified file and reports dirty', async () => {
    const root = tempRepo();
    writeFileSync(join(root, 'README.md'), '# demo\nwork in progress\n');
    const { runner } = fakeRunner();
    const report = await init(options(root, runner));
    assert.equal(report.dirty, true);
    assert.equal(read(root, 'README.md'), '# demo\nwork in progress\n');
  });

  it('a project agent in .claude/agents is untouched', async () => {
    const root = tempRepo();
    mkdirSync(join(root, '.claude/agents'), { recursive: true });
    writeFileSync(join(root, '.claude/agents/mine.md'), 'my agent\n');
    writeFileSync(join(root, '.claude/agents/relecteur.md'), 'old pointer\n');
    const { runner } = fakeRunner();
    const report = await init(options(root, runner));
    assert.equal(read(root, '.claude/agents/mine.md'), 'my agent\n');
    assert.notEqual(read(root, '.claude/agents/relecteur.md'), 'old pointer\n');
    assert.deepEqual(readdirSync(join(root, '.claude/agents')).sort(), [
      'designer.md',
      'mine.md',
      'relecteur-design.md',
      'relecteur-produit.md',
      'relecteur.md',
    ]);
    assert.ok(!report.agents.includes('.claude/agents/mine.md'));
  });

  it('unknown integration is reported', async () => {
    const root = tempRepo();
    const { runner, calls } = fakeRunner();
    const report = await init(options(root, runner, { integration: 'copilot' }));
    assert.ok(calls[0]?.includes('copilot'));
    assert.deepEqual(report.noAgentGenerator, ['copilot']);
    assert.deepEqual(report.agents, []);
    assert.ok(!existsSync(join(root, '.claude')));
  });

  it('no integration in integration.json is reported', async () => {
    const root = tempRepo();
    existingSpecify(root);
    writeFileSync(join(root, '.specify/integration.json'), JSON.stringify({ installed_integrations: [] }));
    const { runner } = fakeRunner();
    const report = await init(options(root, runner));
    assert.equal(report.noIntegration, true);
    assert.deepEqual(report.agents, []);
    assert.deepEqual(report.noAgentGenerator, []);
  });

  it('init on an existing .specify reports a --integration it did not install', async () => {
    const root = tempRepo();
    existingSpecify(root);
    const { runner, calls } = fakeRunner();
    const report = await init(options(root, runner, { integration: 'agy' }));
    assert.ok(!calls.some((c) => c[0] === 'init'));
    assert.deepEqual(report.integrationIgnored, { requested: 'agy', installed: ['claude'] });
  });

  it('init on an existing .specify says nothing when --integration is already installed', async () => {
    const root = tempRepo();
    existingSpecify(root);
    const { runner } = fakeRunner();
    const report = await init(options(root, runner, { integration: 'claude' }));
    assert.equal(report.integrationIgnored, undefined);
  });

  it('init on a new project uses --integration and reports nothing ignored', async () => {
    const root = tempRepo();
    const { runner } = fakeRunner();
    const report = await init(options(root, runner, { integration: 'agy' }));
    assert.equal(report.integrationIgnored, undefined);
  });

  it('agy integration reports the agents it skips', async () => {
    const root = tempRepo();
    existingSpecify(root);
    writeFileSync(
      join(root, '.specify/integration.json'),
      JSON.stringify({ integration: 'claude', installed_integrations: ['claude', 'agy'] }),
    );
    const { runner } = fakeRunner();
    const report = await init(options(root, runner));
    assert.deepEqual(report.agentsSkipped, [{ integration: 'agy', names: ['designer'] }]);
    assert.ok(report.agents.includes('.agents/agents/relecteur/agent.md'));
    assert.equal(report.agents.length, 7);
  });

  /** Projet installé avec claude par défaut, plus `others`, et un script partagé exécutable. */
  async function multiTool(others: string[], failUse?: string) {
    const root = tempRepo();
    const fake = fakeRunner(failUse ? { failUse } : {});
    await init(options(root, fake.runner));
    writeFileSync(
      join(root, '.specify/integration.json'),
      JSON.stringify({ integration: 'claude', default_integration: 'claude', installed_integrations: ['claude', ...others] }),
    );
    mkdirSync(join(root, '.specify/scripts/bash'), { recursive: true });
    writeFileSync(join(root, '.specify/scripts/bash/common.sh'), '#!/bin/sh\n');
    chmodSync(join(root, '.specify/scripts/bash/common.sh'), 0o755);
    fake.calls.length = 0;
    return { root, ...fake };
  }

  const uses = (calls: string[][]): string[] =>
    calls.filter((c) => c[0] === 'integration' && c[1] === 'use').map((c) => c[2] ?? '');

  it('update registers the commands for each secondary tool, then selects the default again', async () => {
    const { root, runner, calls } = await multiTool(['agy', 'codex']);
    const report = await update(options(root, runner));
    assert.deepEqual(uses(calls), ['agy', 'codex', 'claude']);
    // Après les composants : `use` enregistre ce qu'ils viennent d'installer.
    const firstUse = calls.findIndex((c) => c[0] === 'integration');
    assert.ok(calls.slice(firstUse).every((c) => c[0] === 'integration'));
    assert.deepEqual(report.registeredFor, ['agy', 'codex']);
  });

  it('update keeps the executable bit of the shared scripts that use rewrites', async () => {
    const { root, runner } = await multiTool(['agy']);
    await update(options(root, runner));
    assert.equal(statSync(join(root, '.specify/scripts/bash/common.sh')).mode & 0o777, 0o755);
  });

  it('a failing use still selects the default tool again and names the tool', async () => {
    const { root, runner, calls } = await multiTool(['agy'], 'agy');
    await assert.rejects(
      update(options(root, runner)),
      (e: unknown) => e instanceof SetupError && e.message.includes('agy') && e.message.includes('update'),
    );
    assert.deepEqual(uses(calls), ['agy', 'claude']);
    assert.equal(statSync(join(root, '.specify/scripts/bash/common.sh')).mode & 0o777, 0o755);
  });

  it('a project with one tool runs no integration use', async () => {
    const root = tempRepo();
    const { runner, calls } = fakeRunner();
    await init(options(root, runner));
    const report = await update(options(root, runner));
    assert.deepEqual(uses(calls), []);
    assert.deepEqual(report.registeredFor, []);
  });

  it('a registered preset without its template asks for update', async () => {
    const root = tempRepo();
    existingSpecify(root);
    register(root, 'presets', 'artefact-sdd', true);
    const { runner } = fakeRunner();
    await assert.rejects(
      init(options(root, runner)),
      (e: unknown) => e instanceof SetupError && /constitution-template\.md/.test(e.message) && /update/.test(e.message),
    );
  });

  it('a malformed integration.json names the file', async () => {
    const root = tempRepo();
    existingSpecify(root);
    writeFileSync(join(root, '.specify/integration.json'), '{ nope');
    const { runner } = fakeRunner();
    await assert.rejects(
      init(options(root, runner)),
      (e: unknown) => e instanceof SetupError && e.message.includes('.specify/integration.json'),
    );
  });

  it('a malformed registry names the file', async () => {
    const root = tempRepo();
    existingSpecify(root);
    mkdirSync(join(root, '.specify/presets'), { recursive: true });
    writeFileSync(join(root, '.specify/presets/.registry'), 'not json');
    const { runner } = fakeRunner();
    await assert.rejects(
      init(options(root, runner)),
      (e: unknown) => e instanceof SetupError && e.message.includes('.specify/presets/.registry'),
    );
  });
});
