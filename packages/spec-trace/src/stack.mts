import { matchesGlob } from 'node:path';
import { parse as parseYaml } from 'yaml';

/**
 * Ce que spec-trace lit dans `.specify/stack.yml` : les motifs des fichiers de tests
 * (`tests.globs`). Sans eux, ceux du boilerplate nx-react-nestjs.
 */
export const DEFAULT_TEST_GLOBS = ['**/*.spec.ts', '**/*.spec.tsx'];

export function testGlobs(stackYaml: string | undefined): string[] {
  if (stackYaml === undefined) return DEFAULT_TEST_GLOBS;
  let data: unknown;
  try {
    data = parseYaml(stackYaml);
  } catch (error) {
    throw new Error(`YAML invalide : ${(error as Error).message}`);
  }
  const tests = (data as { tests?: unknown } | null)?.tests;
  const globs = (tests as { globs?: unknown } | null | undefined)?.globs;
  if (globs === undefined || globs === null) return DEFAULT_TEST_GLOBS;
  if (
    !Array.isArray(globs) ||
    globs.length === 0 ||
    globs.some((glob) => typeof glob !== 'string' || glob.trim() === '')
  ) {
    throw new Error("tests.globs doit être une liste de motifs (ex. ['src/**/*.test.ts']).");
  }
  return globs as string[];
}

export function isTestFile(path: string, globs: string[]): boolean {
  return globs.some((glob) => matchesGlob(path, glob));
}

/** Les mêmes motifs pour `git diff -- …` : `**` y traverse les dossiers comme ici. */
export function pathspecs(globs: string[]): string[] {
  return globs.map((glob) => `:(glob)${glob}`);
}
