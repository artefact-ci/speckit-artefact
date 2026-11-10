import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

export type Kind = 'nx' | 'nextjs' | 'bun-hono' | 'unknown';
export type Deduction = { yaml: string; kind: Kind; guessed: string[]; empty: string[] };
type Runner = 'bun' | 'pnpm' | 'yarn' | 'npm';
type Example = {
  docs?: string[];
  commands?: Record<string, string>;
  tests?: { globs?: string[]; needs?: string[] };
  shared?: string[];
  ui?: { components?: string; storybook?: boolean; theme?: string; preview?: string } | null;
  e2e?: { dir: string; command?: string; setup?: string } | null;
};

const TODO = '# à compléter';

/** Les exemples sont copiés dans `dist/examples/` au build ; depuis `src/` (dev, tests), on lit ceux du dépôt. */
export function defaultExamplesDir(): string {
  const built = new URL('./examples/', import.meta.url);
  return fileURLToPath(existsSync(built) ? built : new URL('../../../examples/stack/', import.meta.url));
}

const RUNNERS: Record<Runner, { run: string; dlx: string }> = {
  bun: { run: 'bun run', dlx: 'bunx' },
  pnpm: { run: 'pnpm', dlx: 'pnpm dlx' },
  yarn: { run: 'yarn', dlx: 'yarn dlx' },
  npm: { run: 'npm run', dlx: 'npx -y' },
};
const EXEC: Record<Runner, string> = { bun: 'bunx ', pnpm: 'pnpm ', yarn: 'yarn ', npm: 'npx ' };

const detectRunner = (has: (p: string) => boolean): Runner =>
  has('bun.lock') || has('bun.lockb') ? 'bun'
  : has('pnpm-lock.yaml') ? 'pnpm'
  : has('yarn.lock') ? 'yarn'
  : 'npm';

const detectKind = (root: string, has: (p: string) => boolean): Kind => {
  if (has('nx.json')) return 'nx';
  if (['js', 'mjs', 'cjs', 'ts', 'mts'].some((e) => has(`next.config.${e}`))) return 'nextjs';
  if (has('bun.lock') || has('bun.lockb')) return 'bun-hono';
  return 'unknown';
};

const readScripts = (root: string): Record<string, string> => {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
};

const scalar = (v: string): string => stringify(v, { lineWidth: 0, singleQuote: true }).trimEnd();
const flow = (v: string[]): string =>
  stringify(v, { collectionStyle: 'flow', flowCollectionPadding: false, singleQuote: true, lineWidth: 0 }).trimEnd();

/**
 * Déduit le texte de `.specify/stack.yml` d'un dépôt, sans rien écrire. Part de l'exemple le plus proche
 * (`examples/stack/`), garde ce que le dépôt confirme, laisse le reste vide avec `# à compléter`.
 */
export function deduceStack(
  root: string,
  opts: { examplesDir: string; toolsVersion: string; branches: string[] },
): Deduction {
  const has = (p: string): boolean => existsSync(join(root, p));
  const kind = detectKind(root, has);
  const runner = detectRunner(has);
  const scripts = readScripts(root);
  const run = RUNNERS[runner].run;
  const dlx = RUNNERS[runner].dlx;
  const ex: Example =
    kind === 'unknown' ? {} : (parse(readFileSync(join(opts.examplesDir, `${kind}.yml`), 'utf8')) as Example);

  /** `pnpm exec x` / `pnpm x` de l'exemple, réécrits pour le runner du projet. */
  const swap = (cmd: string): string => {
    if (runner === 'pnpm') return cmd;
    if (cmd.startsWith('pnpm exec ')) return EXEC[runner] + cmd.slice('pnpm exec '.length);
    if (cmd.startsWith('pnpm ')) return EXEC[runner] + cmd.slice('pnpm '.length);
    return cmd;
  };

  const guessed = new Set<string>(['kind', 'branches']);
  const empty = new Set<string>();
  const lines: string[] = [`# Déduit par @artefact-ci/sdd ${opts.toolsVersion} : relis chaque clé (voir docs/stack.md).`, 'version: 1'];

  /** Une clé : valeur, ou vide + `# à compléter`. */
  const put = (indent: number, path: string, value: string | undefined, comment?: string): void => {
    const key = path.split('.').at(-1)!;
    const pad = ' '.repeat(indent);
    if (value === undefined || value === '') {
      empty.add(path);
      lines.push(`${pad}${key}: ${TODO}`);
    } else {
      lines.push(`${pad}${key}: ${value}${comment ? ` ${comment}` : ''}`);
    }
  };
  const putList = (path: string, values: string[]): void => {
    if (values.length === 0) return void put(0, path, undefined);
    lines.push(`${path}:`, ...values.map((v) => `  - ${scalar(v)}`));
  };

  // branches : base = dev sinon la première de la liste (la courante) ; production = main si présente et différente
  const base = opts.branches.includes('dev') ? 'dev' : opts.branches[0];
  lines.push('branches:');
  put(2, 'branches.base', base);
  if (opts.branches.includes('main') && base !== 'main') put(2, 'branches.production', 'main');

  putList('docs', (ex.docs ?? ['AGENTS.md']).filter(has));

  // commandes
  lines.push('commands:');
  const exampleCmd = (name: string): string | undefined => {
    const c = ex.commands?.[name];
    return c === undefined ? undefined : swap(c);
  };
  const cmds: [string, string | undefined][] = [];
  if (kind === 'nx') {
    cmds.push(['test', exampleCmd('test')], ['affected', exampleCmd('affected')], ['fresh', exampleCmd('fresh')]);
  } else {
    const t = scripts['test'];
    const test = t === undefined ? undefined : t === 'bun test' ? 'bun test {file}' : runner === 'npm' ? 'npm run test -- {file}' : `${run} test {file}`;
    const parts = ['lint', 'typecheck', 'test'].filter((s) => scripts[s] !== undefined).map((s) => `${run} ${s}`);
    cmds.push(['test', test], ['affected', t === undefined ? undefined : parts.join(' && ')]);
  }
  cmds.push(['check', scripts['check'] === undefined ? undefined : `${run} check`]);
  cmds.push(['trace', `${dlx} @artefact-ci/spec-trace@${opts.toolsVersion}`]);
  for (const [name, value] of cmds) {
    put(2, `commands.${name}`, value === undefined ? undefined : scalar(value));
    if (value !== undefined) guessed.add(`commands.${name}`);
  }

  // tests, shared
  if (ex.tests) {
    lines.push('tests:');
    if (ex.tests.globs) (put(2, 'tests.globs', flow(ex.tests.globs)), guessed.add('tests.globs'));
    if (ex.tests.needs) (put(2, 'tests.needs', flow(ex.tests.needs)), guessed.add('tests.needs'));
  }
  if (ex.shared) putList('shared', ex.shared.filter(has));

  // ui : objet dès qu'un front est détecté
  guessed.add('ui');
  if (kind === 'nx' || kind === 'nextjs') {
    const ui = ex.ui ?? {};
    lines.push('ui:');
    put(2, 'ui.components', ui.components && has(ui.components) ? scalar(ui.components) : undefined);
    if (ui.storybook !== undefined) put(2, 'ui.storybook', String(ui.storybook));
    put(2, 'ui.theme', ui.theme && has(ui.theme) ? scalar(ui.theme) : undefined);
    if (ui.preview) put(2, 'ui.preview', scalar(swap(ui.preview)), '# http://localhost:6006');
    put(2, 'ui.prototype', scalar(scripts['prototype'] !== undefined ? `${run} prototype` : `${dlx} @artefact-ci/prototype@${opts.toolsVersion}`));
  } else {
    lines.push('ui: null # pas de front : /speckit-design n\'écrit que la partie non visuelle, /speckit-prototype s\'arrête');
  }

  // e2e : seulement si le dossier des parcours existe
  guessed.add('e2e');
  if (ex.e2e && has(ex.e2e.dir)) {
    lines.push('e2e:');
    put(2, 'e2e.dir', scalar(ex.e2e.dir));
    if (ex.e2e.command) put(2, 'e2e.command', scalar(swap(ex.e2e.command)), kind === 'nx' ? '# --skip-nx-cache avant Converged' : undefined);
    if (ex.e2e.setup) put(2, 'e2e.setup', scalar(swap(ex.e2e.setup)));
  } else {
    lines.push('e2e: null');
  }

  return { yaml: `${lines.join('\n')}\n`, kind, guessed: [...guessed].sort(), empty: [...empty].sort() };
}
