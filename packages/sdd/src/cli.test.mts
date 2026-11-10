import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

  it('asks for --source until the release source of phase 5', () => {
    const { status, stderr } = sdd('init');
    assert.equal(status, 1);
    assert.match(stderr, /la source release arrive en phase 5 : passe --source <clone de speckit-artefact>/);
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
  constitution: 'kept',
  legacy: { files: [], mentions: [] },
  dirty: false,
};

describe('formatReport', () => {
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
    assert.match(text, /agy, designer : pas de fichier d'agent pour cet outil : la commande fera la relecture en nouvelle session/);
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
