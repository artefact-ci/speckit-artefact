import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { init, SetupError, update, type Options } from './install.mts';
import { releaseSource, devSource, type Source } from './source.mts';
import { run, type Run } from './specify.mts';

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
function fakeRunner(opts: { uv?: boolean; failFrom?: boolean } = {}): { runner: Run; calls: string[][]; inputs: (string | undefined)[] } {
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
