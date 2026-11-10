import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VERSION_FILES: readonly string[] = [
  'preset/preset.yml',
  'extension/extension.yml',
  'packages/sdd/package.json',
  'packages/spec-trace/package.json',
  'packages/prototype/package.json',
];

const YAML_VERSION = /^( {2}version: ')([^']*)(')$/m;
const JSON_VERSION = /^( {2}"version": ")([^"]*)(")/m;

function pattern(file: string): RegExp {
  return file.endsWith('.json') ? JSON_VERSION : YAML_VERSION;
}

export function readVersions(root: string): { file: string; version: string }[] {
  return VERSION_FILES.map((file) => {
    const match = pattern(file).exec(readFileSync(join(root, file), 'utf8'));
    return { file, version: match?.[2] ?? '(introuvable)' };
  });
}

export function checkVersions(root: string, expected: string): string[] {
  return readVersions(root)
    .filter(({ version }) => version !== expected)
    .map(({ file, version }) => `${file} : ${version}, attendu ${expected}`);
}

export function setVersions(root: string, version: string): void {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`version invalide : « ${version} », attendu X.Y.Z (par exemple 0.2.0)`);
  for (const file of VERSION_FILES) {
    const path = join(root, file);
    const re = pattern(file);
    const text = readFileSync(path, 'utf8');
    if (!re.test(text)) throw new Error(`${file} : ligne de version introuvable`);
    writeFileSync(path, text.replace(re, (_m, a: string, _v: string, c: string) => `${a}${version}${c}`));
  }
}

export function changelogSection(text: string, version: string): string | null {
  const lines = text.split(/\r?\n/);
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp(`^## \\[?${escaped}\\]?(\\s|$)`);
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

function main(argv: string[]): number {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const [command, raw] = argv;
  if (!raw || !['check', 'set', 'notes'].includes(command ?? '')) {
    console.error('Usage : node scripts/version.mts <check|set|notes> <version>');
    return 2;
  }
  const version = raw.replace(/^v/, '');
  if (command === 'check') {
    const errors = checkVersions(root, version);
    if (errors.length > 0) {
      console.error(errors.join('\n'));
      return 1;
    }
    return 0;
  }
  if (command === 'set') {
    try {
      setVersions(root, version);
    } catch (e) {
      console.error((e as Error).message);
      return 1;
    }
    return 0;
  }
  const changelog = join(root, 'CHANGELOG.md');
  const section = changelogSection(existsSync(changelog) ? readFileSync(changelog, 'utf8') : '', version);
  if (section === null) {
    console.error(`CHANGELOG.md : pas de section pour ${version}`);
    return 1;
  }
  console.log(section);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
