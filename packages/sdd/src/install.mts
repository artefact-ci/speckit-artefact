import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { agentFiles, readAgentSpecs, readIntegrations, skippedAgents } from './agents.mts';
import { baseConstitution, isBlankConstitution } from './constitution.mts';
import { applyGitHooks } from './hooks.mts';
import { legacyAgents } from './legacy.mts';
import { SetupError } from './errors.mts';
import { componentArgs, zipUrl, type ComponentId, type Source } from './source.mts';
import { hasUv, specify, SpecifyError, type Run } from './specify.mts';
import { deduceStack, defaultExamplesDir, type Branches, type Deduction } from './stack.mts';

/** source : release GitHub ou clone de speckit-artefact (--dev). */
export type Options = { root: string; source: Source; integration?: string; toolsVersion: string; runner: Run };

export type Report = {
  mode: 'init' | 'update';
  /** Vrai si le preset `boilerplate` a été retiré pendant cette exécution. */
  migrated: boolean;
  /** Vrai si `.specify/integration.json` ne nomme aucune intégration. */
  noIntegration: boolean;
  installed: string[];
  skipped: string[];
  /** Fichiers d'agent écrits ou déjà à jour (relatifs à la racine). */
  agents: string[];
  /** Agents sans fichier pour une intégration (entrées non vides seulement). */
  agentsSkipped: { integration: string; names: string[] }[];
  /** Intégrations sans générateur de fichiers d'agent. */
  noAgentGenerator: string[];
  stack?: Deduction;
  constitution: 'written' | 'kept';
  legacy: ReturnType<typeof legacyAgents>;
  dirty: boolean;
};

export { SetupError };

const UV_MISSING = 'uv manque : https://docs.astral.sh/uv/getting-started/installation/';
const CONSTITUTION = '.specify/memory/constitution.md';
const STACK = '.specify/stack.yml';
const EXTENSIONS_YML = '.specify/extensions.yml';
const PRESET_TEMPLATE = '.specify/presets/artefact-sdd/templates/constitution-template.md';

/** Écrit `content` seulement s'il diffère du fichier (crée les dossiers) ; vrai si écrit. */
export function writeIfChanged(path: string, content: string): boolean {
  if (existsSync(path) && readFileSync(path, 'utf8') === content) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return true;
}

type Kind = 'extensions' | 'presets';

/** Vrai si `id` est une clé du `.registry` de `kind` ; registre absent → faux. */
function registered(root: string, kind: Kind, id: string): boolean {
  const rel = `.specify/${kind}/.registry`;
  const file = join(root, rel);
  if (!existsSync(file)) return false;
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch (e) {
    throw new SetupError(`${rel} illisible : ${(e as Error).message}`);
  }
  const map = json?.[kind];
  return typeof map === 'object' && map !== null && id in map;
}

type Component = {
  id: string;
  kind: Kind;
  install: (source: Source, present: boolean) => { args: string[]; input?: string };
};

const COMPONENTS: Component[] = [
  {
    id: 'git',
    kind: 'extensions',
    install: (_s, present) => ({ args: ['extension', 'add', 'git', ...(present ? ['--force'] : [])] }),
  },
  { id: 'artefact-product', kind: 'extensions', install: (s, present) => componentArgs(s, 'artefact-product', present) },
  { id: 'artefact-sdd', kind: 'presets', install: (s, present) => componentArgs(s, 'artefact-sdd', present) },
];

/** stdout d'une commande git, ou null si elle échoue (pas un dépôt, pas de commit…). */
async function git(o: Options, args: string[]): Promise<string | null> {
  try {
    const r = await o.runner('git', args, { cwd: o.root });
    return r.code === 0 ? r.stdout : null;
  } catch {
    return null;
  }
}

/** Branches locales et de `origin` (préfixe retiré, dédupliquées) et cible de `origin/HEAD` ; vide hors dépôt. */
async function branches(o: Options): Promise<Branches> {
  const refs = ((await git(o, ['for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/remotes/origin'])) ?? '')
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r !== '' && r !== 'refs/remotes/origin/HEAD')
    .map((r) => r.replace(/^refs\/heads\//, '').replace(/^refs\/remotes\/origin\//, ''));
  const head = (await git(o, ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD']))?.trim();
  const defaultBranch = head?.startsWith('refs/remotes/origin/') ? head.slice('refs/remotes/origin/'.length) : undefined;
  return { names: [...new Set(refs)], ...(defaultBranch ? { defaultBranch } : {}) };
}

async function isDirty(o: Options): Promise<boolean> {
  return ((await git(o, ['status', '--porcelain'])) ?? '').trim() !== '';
}

type Common = Omit<Report, 'mode' | 'stack' | 'constitution' | 'dirty'>;

/** Étapes 3 à 6 communes à init et update, puis le relevé des anciens agents. */
async function common(o: Options, mode: 'init' | 'update'): Promise<Common> {
  const { root } = o;
  const migrated = registered(root, 'presets', 'boilerplate');
  if (migrated) await specify(o.runner, root, ['preset', 'remove', 'boilerplate']);

  const installed: string[] = [];
  const skipped: string[] = [];
  for (const c of COMPONENTS) {
    const present = registered(root, c.kind, c.id);
    if (mode === 'init' && present) {
      skipped.push(c.id);
      continue;
    }
    const { args, input } = c.install(o.source, present);
    try {
      await specify(o.runner, root, args, input);
    } catch (e) {
      if (o.source.kind === 'release' && e instanceof SpecifyError) {
        const url = zipUrl(o.source, c.id as ComponentId);
        throw new SetupError(`impossible d'installer ${c.id} ${o.source.version} depuis ${url} : ${e.message}`);
      }
      throw e;
    }
    installed.push(c.id);
  }

  const extYml = join(root, EXTENSIONS_YML);
  writeIfChanged(extYml, applyGitHooks(existsSync(extYml) ? readFileSync(extYml, 'utf8') : ''));

  let integrations: string[];
  try {
    integrations = readIntegrations(root);
  } catch (e) {
    throw new SetupError(`.specify/integration.json illisible : ${(e as Error).message}`);
  }
  const specs = readAgentSpecs(root);
  const agents: string[] = [];
  const agentsSkipped: Report['agentsSkipped'] = [];
  const noAgentGenerator: string[] = [];
  for (const integration of integrations) {
    const files = agentFiles(integration, specs);
    if (files === null) {
      noAgentGenerator.push(integration);
      continue;
    }
    for (const f of files) {
      writeIfChanged(join(root, f.path), f.content);
      agents.push(f.path);
    }
    const names = skippedAgents(integration, specs);
    if (names.length > 0) agentsSkipped.push({ integration, names });
  }

  return {
    migrated,
    noIntegration: integrations.length === 0,
    installed,
    skipped,
    agents,
    agentsSkipped,
    noAgentGenerator,
    legacy: legacyAgents(root),
  };
}

export async function init(o: Options): Promise<Report> {
  const { root } = o;
  if (!(await hasUv(o.runner))) throw new SetupError(UV_MISSING);
  const dirty = await isDirty(o);

  if (!existsSync(join(root, '.specify'))) {
    const args = ['init', '--here', '--script', 'sh', '--non-interactive', '--ignore-agent-tools'];
    args.push('--integration', o.integration ?? 'claude');
    // Spec Kit 1.3.2 compte `.git` comme contenu : sans --force, il refuse un dossier non vide.
    if (readdirSync(root).length > 0) args.push('--force');
    await specify(o.runner, root, args);
  }

  const done = await common(o, 'init');

  let stack: Deduction | undefined;
  if (!existsSync(join(root, STACK))) {
    stack = deduceStack(root, { examplesDir: defaultExamplesDir(), toolsVersion: o.toolsVersion, branches: await branches(o) });
    writeIfChanged(join(root, STACK), stack.yaml);
  }

  let constitution: Report['constitution'] = 'kept';
  const constFile = join(root, CONSTITUTION);
  if (!existsSync(constFile) || isBlankConstitution(readFileSync(constFile, 'utf8'))) {
    const template = join(root, PRESET_TEMPLATE);
    if (!existsSync(template)) {
      throw new SetupError(`${PRESET_TEMPLATE} introuvable alors que le preset artefact-sdd est enregistré : lance update`);
    }
    writeIfChanged(constFile, baseConstitution(readFileSync(template, 'utf8'), basename(root)));
    constitution = 'written';
  }

  return { mode: 'init', ...done, stack, constitution, dirty };
}

export async function update(o: Options): Promise<Report> {
  if (!(await hasUv(o.runner))) throw new SetupError(UV_MISSING);
  if (!existsSync(join(o.root, '.specify'))) throw new SetupError('.specify/ absent : lance init');
  const dirty = await isDirty(o);
  const done = await common(o, 'update');
  return { mode: 'update', ...done, constitution: 'kept', dirty };
}
