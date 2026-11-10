import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SetupError } from './errors.mts';
import { writeIfChanged } from './fs.mts';

/** Version de la méthode installée dans un projet, et d'où elle vient. */
export type Installed = { version: string; source: 'release' | 'dev' };

export const ARTEFACT_JSON = '.specify/artefact.json';

/** Lit `.specify/artefact.json` ; null si absent, SetupError s'il est illisible ou incomplet. */
export function readInstalled(root: string): Installed | null {
  const file = join(root, ARTEFACT_JSON);
  if (!existsSync(file)) return null;
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new SetupError(`${ARTEFACT_JSON} illisible : ${(e as Error).message}`);
  }
  const o = (typeof json === 'object' && json !== null ? json : {}) as Record<string, unknown>;
  if (typeof o['version'] !== 'string' || o['version'] === '') {
    throw new SetupError(`${ARTEFACT_JSON} : version manque ou n'est pas une chaîne`);
  }
  if (o['source'] !== 'release' && o['source'] !== 'dev') {
    throw new SetupError(`${ARTEFACT_JSON} : source doit valoir release ou dev`);
  }
  return { version: o['version'], source: o['source'] };
}

/** Écrit `.specify/artefact.json` ; vrai si le contenu a changé. */
export function writeInstalled(root: string, i: Installed): boolean {
  return writeIfChanged(join(root, ARTEFACT_JSON), `${JSON.stringify(i, null, 2)}\n`);
}

/** Compare deux versions `X.Y.Z` numériquement : négatif, nul ou positif. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
