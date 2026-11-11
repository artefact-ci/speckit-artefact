import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Report } from './install.mts';
import { formatReport } from './report.mts';

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, 'cli.mts');

let project: string;
beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), 'sdd-cli-'));
});
afterEach(() => rmSync(project, { recursive: true, force: true }));

function sdd(...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const run = spawnSync(process.execPath, [CLI, ...args], { cwd: project, encoding: 'utf8' });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

describe('artefact-sdd, command line', () => {
  it('prints the usage with --help', () => {
    const { status, stdout } = sdd('--help');
    assert.equal(status, 0);
    assert.match(stdout, /^Usage : artefact-sdd/);
  });

  it('fails on an unknown command', () => {
    const { status, stderr } = sdd('install');
    assert.equal(status, 1);
    assert.match(stderr, /Commande inconnue : install/);
    assert.match(stderr, /Usage : artefact-sdd/);
  });

  it('fails without a command', () => {
    const { status, stderr } = sdd();
    assert.equal(status, 1);
    assert.match(stderr, /Usage : artefact-sdd/);
  });

  it('fails on an unknown option', () => {
    const { status, stderr } = sdd('init', '--sauce', 'x');
    assert.equal(status, 1);
    assert.match(stderr, /--sauce/);
  });

  it('without --source it tries the release of its own version', () => {
    const version = (JSON.parse(readFileSync(join(here, '../package.json'), 'utf8')) as { version: string }).version;
    const bin = mkdtempSync(join(tmpdir(), 'sdd-bin-'));
    writeFileSync(join(bin, 'uvx'), '#!/bin/sh\ncase " $* " in *" --from http"*) exit 1 ;; esac\nexit 0\n', { mode: 0o755 });
    mkdirSync(join(project, '.specify/memory'), { recursive: true });
    writeFileSync(join(project, '.specify/integration.json'), JSON.stringify({ integration: 'claude' }));
    const run = spawnSync(process.execPath, [CLI, 'init'], {
      cwd: project,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env['PATH']}`, SDD_RELEASE_BASE_URL: 'http://127.0.0.1:9' },
    });
    rmSync(bin, { recursive: true, force: true });
    assert.equal(run.status, 1, run.stderr);
    assert.ok(run.stderr.includes(`http://127.0.0.1:9/artefact-product-${version}.zip`), run.stderr);
    assert.ok(!run.stderr.includes('    at '), run.stderr);
  });

  it('fails when --source is not a speckit-artefact clone', () => {
    const { status, stderr } = sdd('init', '--source', project);
    assert.equal(status, 1);
    assert.match(stderr, /n'est pas un clone de speckit-artefact/);
    assert.match(stderr, /extension\/extension\.yml/);
    assert.ok(!stderr.includes('    at '), stderr);
  });

  it('fails when --source has the extension but no preset', () => {
    const src = mkdtempSync(join(tmpdir(), 'sdd-src-'));
    mkdirSync(join(src, 'extension'));
    writeFileSync(join(src, 'extension/extension.yml'), 'x: 1\n');
    const { status, stderr } = sdd('update', '--source', src);
    rmSync(src, { recursive: true, force: true });
    assert.equal(status, 1);
    assert.match(stderr, /preset\/preset\.yml/);
  });

  it('warns that update ignores --integration', () => {
    const { stderr } = sdd('update', '--integration', 'codex');
    assert.match(stderr, /--integration est ignoré par update/);
  });
});

const base: Report = {
  mode: 'init',
  migrated: false,
  noIntegration: false,
  installed: [],
  skipped: [],
  agents: [],
  agentsSkipped: [],
  noAgentGenerator: [],
  registeredFor: [],
  constitution: 'kept',
  legacy: { files: [], mentions: [] },
  dirty: false,
  version: { installed: { version: '0.2.0', source: 'release' }, previous: null, downgrade: false },
};

describe('formatReport', () => {
  it('prints the installed version, for init', () => {
    assert.ok(formatReport(base).split('\n').includes('  Version : 0.2.0 (release)'));
  });

  it('prints previous and new version, for update', () => {
    const prev = { version: '0.1.1', source: 'release' } as const;
    const text = formatReport({ ...base, mode: 'update', version: { ...base.version, previous: prev } });
    assert.ok(text.split('\n').includes('  Version : 0.1.1 → 0.2.0 (release)'));
    const unknown = formatReport({ ...base, mode: 'update' });
    assert.ok(unknown.split('\n').includes('  Version : 0.2.0 (release), version précédente inconnue'));
  });

  it('says the installed version is unknown', () => {
    const text = formatReport({ ...base, version: { installed: null, previous: null, downgrade: false } });
    assert.ok(text.split('\n').includes('  Version installée inconnue : lance update pour aligner tous les composants'));
    assert.doesNotMatch(text, /  Version : /);
  });

  it('warns about a downgrade', () => {
    const prev = { version: '0.3.0', source: 'release' } as const;
    const text = formatReport({ ...base, mode: 'update', version: { installed: base.version.installed, previous: prev, downgrade: true } });
    assert.ok(text.split('\n').includes("  Attention : 0.3.0 était plus récente que 0.2.0, l'installeur a remis 0.2.0"));
    assert.doesNotMatch(formatReport(base), /était plus récente/);
  });

  it('asks to carry a modified legacy agent over to the docs', () => {
    const text = formatReport({
      ...base,
      legacy: { files: [{ path: 'docs/agents/relecteur.md', state: 'modified' }], mentions: [] },
    });
    assert.match(text, /docs\/agents\/relecteur\.md : modifié, à reporter dans les docs avant de supprimer le dossier/);
  });

  it('lists installed and already installed components', () => {
    const text = formatReport({ ...base, installed: ['artefact-sdd'], skipped: ['git', 'artefact-product'] });
    assert.match(text, /Installé : artefact-sdd/);
    assert.match(text, /Déjà installé : git, artefact-product/);
  });

  it('says stack.yml was deduced and must be reread', () => {
    const text = formatReport({
      ...base,
      stack: { yaml: '', kind: 'bun-hono', guessed: ['commands.test'], empty: ['docs'] },
    });
    assert.match(text, /\.specify\/stack\.yml déduit du dépôt : relis-le/);
    assert.match(text, /Stack détectée : bun-hono/);
    assert.match(text, /Devinées : commands\.test\n/);
    assert.match(text, /À compléter : docs/);
  });

  it('reports tools without agent files and skipped agents', () => {
    const text = formatReport({
      ...base,
      noAgentGenerator: ['codex'],
      agentsSkipped: [{ integration: 'agy', names: ['designer'] }],
    });
    assert.match(text, /codex : pas de générateur de fichiers d'agent, la relecture se fait en contexte neuf/);
    assert.match(text, /agy : pas de fichier d'agent designer pour cet outil : la commande fera ce travail en nouvelle session/);
    assert.doesNotMatch(text, /agy, designer/);
  });

  it('lists the secondary tools whose commands were registered', () => {
    const text = formatReport({ ...base, mode: 'update', registeredFor: ['agy'] });
    assert.match(text, /Commandes de la méthode enregistrées aussi pour : agy \(outil par défaut inchangé\)/);
    assert.doesNotMatch(formatReport(base), /enregistrées aussi/);
  });

  it('warns when the working tree was dirty', () => {
    assert.match(formatReport({ ...base, dirty: true }), /Attention : le dépôt avait des changements non commités/);
    assert.doesNotMatch(formatReport(base), /Attention/);
  });

  it('labels update components as reinstalled', () => {
    const text = formatReport({ ...base, mode: 'update', installed: ['git', 'artefact-sdd'] });
    assert.match(text, /Réinstallé \/ mis à jour : git, artefact-sdd/);
    assert.doesNotMatch(text, /^ {2}Installé/m);
  });

  it('shows the boilerplate migration', () => {
    const text = formatReport({ ...base, migrated: true });
    assert.match(text, /preset `boilerplate` retiré/);
    assert.match(text, /specify preset add --dev <chemin> --priority 5/);
    assert.match(text, /examples\/nx-preset\//);
    assert.match(text, /remplacer `preset update boilerplate` dans `AGENTS\.md` et les guides par `npx @artefact-ci\/sdd update`/);
    assert.doesNotMatch(formatReport(base), /boilerplate/);
  });

  it('warns when init ignored --integration and gives the Spec Kit commands', () => {
    const text = formatReport({ ...base, integrationIgnored: { requested: 'agy', installed: ['claude'] } });
    assert.match(text, /Attention : --integration agy ignoré : Spec Kit était déjà installé ici avec claude/);
    assert.match(text, /pour garder claude et ajouter agy : uvx --from specify-cli==1\.3\.2 specify integration install agy --script sh --force/);
    assert.match(text, /pour remplacer claude par agy : uvx --from specify-cli==1\.3\.2 specify integration switch agy/);
    assert.match(text, /puis : npx @artefact-ci\/sdd update/);
    assert.doesNotMatch(formatReport(base), /ignoré/);
  });

  it('says when no integration was found', () => {
    const text = formatReport({ ...base, noIntegration: true });
    assert.match(text, /aucune intégration trouvée dans \.specify\/integration\.json : aucun fichier d'agent généré/);
    assert.doesNotMatch(formatReport(base), /aucune intégration/);
  });

  it('an unchanged legacy agent is deletable once the mentions are updated', () => {
    const file = { path: 'docs/agents/relecteur.md', state: 'unchanged' } as const;
    const withMentions = formatReport({ ...base, legacy: { files: [file], mentions: ['.specify/memory/constitution.md'] } });
    assert.match(
      withMentions,
      /docs\/agents\/relecteur\.md : identique au boilerplate : supprimable une fois les mentions ci-dessous mises à jour/,
    );
    assert.match(withMentions, /Citent encore docs\/agents\/ : \.specify\/memory\/constitution\.md/);
    const alone = formatReport({ ...base, legacy: { files: [file], mentions: [] } });
    assert.match(alone, /docs\/agents\/relecteur\.md : identique au boilerplate, tu peux le supprimer/);
  });
});
