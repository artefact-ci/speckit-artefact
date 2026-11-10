import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';
import { readVersions } from './version.mts';

const DOS_TIME = 0;
const DOS_DATE = 0x0021; // 1980-01-01
const FLAGS = 0x0800; // UTF-8 names
const MADE_BY = (3 << 8) | 20; // Unix, version 2.0
const EXTERNAL_ATTRS = (0o100644 << 16) >>> 0;

export function trackedFiles(root: string, dir: string): string[] {
  const out = execFileSync('git', ['ls-files', '-z', '--', dir], { cwd: root, encoding: 'buffer' });
  return out
    .toString('utf8')
    .split('\0')
    .filter((path) => path !== '')
    .map((path) => path.slice(dir.length + 1))
    .sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

export function buildZip(root: string, dir: string, out: string): void {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of trackedFiles(root, dir)) {
    const name = Buffer.from(file);
    const data = readFileSync(join(root, dir, file));
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(FLAGS, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(MADE_BY, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(FLAGS, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(DOS_TIME, 12);
    entry.writeUInt16LE(DOS_DATE, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(EXTERNAL_ATTRS, 38);
    entry.writeUInt32LE(offset, 42);

    parts.push(local, name, packed);
    central.push(entry, name);
    offset += local.length + name.length + packed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length / 2, 8);
  end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.concat([...parts, directory, end]));
}

function main(argv: string[]): number {
  const outDir = argv[0];
  if (!outDir) {
    console.error('Usage : node scripts/zip.mts <dossier de sortie>');
    return 2;
  }
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const versions = readVersions(root);
  const targets = [
    { dir: 'preset', name: 'artefact-sdd', file: 'preset/preset.yml' },
    { dir: 'extension', name: 'artefact-product', file: 'extension/extension.yml' },
  ];
  for (const { dir, name, file } of targets) {
    const version = versions.find((v) => v.file === file)?.version;
    const out = join(outDir, `${name}-${version}.zip`);
    buildZip(root, dir, out);
    console.log(out);
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
