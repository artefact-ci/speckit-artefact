import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { SetupError } from './errors.mts';

export type Source =
  | { kind: 'release'; version: string; baseUrl: string }
  | { kind: 'dev'; version: string; dir: string };

export type ComponentId = 'artefact-sdd' | 'artefact-product';

export const RELEASE_BASE = 'https://github.com/artefact-ci/speckit-artefact/releases/download';

/** Release GitHub de `version` ; SDD_RELEASE_BASE_URL (réservée aux tests) remplace le préfixe de l'URL. */
export function releaseSource(version: string, env: NodeJS.ProcessEnv = process.env): Source {
  const override = env['SDD_RELEASE_BASE_URL'];
  const baseUrl = override ? override.replace(/\/+$/, '') : `${RELEASE_BASE}/v${version}`;
  return { kind: 'release', version, baseUrl };
}

/** Clone de speckit-artefact : la version est `preset.version` du preset. */
export function devSource(dir: string): Source {
  for (const file of ['extension/extension.yml', 'preset/preset.yml']) {
    if (!existsSync(join(dir, file))) {
      throw new SetupError(
        `${dir} n'est pas un clone de speckit-artefact : ${file} introuvable (passe --source <clone de speckit-artefact>)`,
      );
    }
  }
  const file = join(dir, 'preset/preset.yml');
  const version = (parse(readFileSync(file, 'utf8')) as { preset?: { version?: unknown } } | null)?.preset?.version;
  if (typeof version !== 'string' || version === '') {
    throw new SetupError(`${file} : preset.version manque`);
  }
  return { kind: 'dev', version, dir };
}

export function zipUrl(s: Source & { kind: 'release' }, id: ComponentId): string {
  return `${s.baseUrl}/${id}-${s.version}.zip`;
}

/** Arguments `specify` d'installation de `id` ; `input` est envoyé sur stdin. */
export function componentArgs(s: Source, id: ComponentId, present: boolean): { args: string[]; input?: string } {
  if (s.kind === 'release') {
    const url = zipUrl(s, id);
    if (id === 'artefact-product') {
      // `extension add --from` demande « Continue with installation? [y/N] ».
      return { args: ['extension', 'add', '--from', url, ...(present ? ['--force'] : [])], input: 'y\n' };
    }
    return { args: present ? ['preset', 'update', 'artefact-sdd', '--from', url] : ['preset', 'add', '--from', url] };
  }
  if (id === 'artefact-product') {
    const dir = join(s.dir, 'extension');
    return { args: ['extension', 'add', '--dev', dir, ...(present ? ['--force'] : [])] };
  }
  const dir = join(s.dir, 'preset');
  return { args: present ? ['preset', 'update', 'artefact-sdd', '--dev', dir] : ['preset', 'add', '--dev', dir] };
}
