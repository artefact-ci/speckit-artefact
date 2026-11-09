import { parse as parseYaml } from 'yaml';

/**
 * Ce que spec-trace lit dans `.specify/stack.yml` : les motifs des fichiers de tests
 * (`tests.globs`). Sans eux, ceux du boilerplate nx-react-nestjs.
 */
export const DEFAULT_TEST_GLOBS = ['**/*.spec.ts', '**/*.spec.tsx'];

const SHAPE = "tests.globs doit être une liste de motifs (ex. ['src/**/*.test.ts']).";

export function testGlobs(stackYaml: string | undefined): string[] {
  if (stackYaml === undefined) return DEFAULT_TEST_GLOBS;
  let data: unknown;
  try {
    data = parseYaml(stackYaml);
  } catch (error) {
    throw new Error(`YAML invalide : ${(error as Error).message}`);
  }
  const tests = (data as { tests?: unknown } | null)?.tests;
  if (tests === undefined || tests === null) return DEFAULT_TEST_GLOBS;
  if (typeof tests !== 'object' || Array.isArray(tests)) {
    throw new Error(`tests doit être un objet (globs, needs). ${SHAPE}`);
  }
  const globs = (tests as { globs?: unknown }).globs;
  if (globs === undefined || globs === null) return DEFAULT_TEST_GLOBS;
  if (
    !Array.isArray(globs) ||
    globs.length === 0 ||
    globs.some((glob) => typeof glob !== 'string' || glob.trim() === '')
  ) {
    throw new Error(SHAPE);
  }
  return globs as string[];
}

/** `src/*.{test,spec}.ts` → `src/*.test.ts`, `src/*.spec.ts` ; accolades imbriquées comprises. */
export function expandBraces(glob: string): string[] {
  const open = glob.indexOf('{');
  if (open < 0) return [glob];
  let depth = 0;
  const commas: number[] = [];
  for (let at = open; at < glob.length; at++) {
    const char = glob[at];
    if (char === '{') depth++;
    else if (char === '}' && --depth === 0) {
      const parts: string[] = [];
      let start = open + 1;
      for (const comma of commas) {
        parts.push(glob.slice(start, comma));
        start = comma + 1;
      }
      parts.push(glob.slice(start, at));
      const before = glob.slice(0, open);
      const after = glob.slice(at + 1);
      return parts.flatMap((part) => expandBraces(`${before}${part}${after}`));
    } else if (char === ',' && depth === 1) commas.push(at);
  }
  throw new Error(`Accolade non fermée dans le motif « ${glob} ».`);
}

/**
 * Les motifs en pathspecs git (`:(glob)…`) : la liste des tests et l'avertissement de dérive
 * passent tous deux par git, donc par le même moteur de motifs, quel que soit le runtime. `**`
 * y couvre aussi la racine et les dossiers à point (`.storybook/`).
 */
export function pathspecs(globs: string[]): string[] {
  return globs
    .flatMap(expandBraces)
    .map((glob) => glob.replace(/^(\.\/)+/, ''))
    .map((glob) => `:(glob)${glob}`);
}
