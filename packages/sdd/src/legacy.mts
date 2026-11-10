import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type LegacyFinding = { path: string; state: 'unchanged' | 'modified' | 'unknown' };

const LEGACY_DIR = 'docs/agents';
/** SHA-256 des fichiers du boilerplate (commit b30bb7b). */
const BOILERPLATE: Record<string, string> = {
  'designer.md': '01be6c6e3f1f86452bde42fb5117d288604f9757e0cf56c58a645fccc940bb4d',
  'po.md': '2a78f6d5509157d26b866ad76de37abd3d075bb11dad63cc3eaae22188858696',
  'relecteur-design.md': '3580a65a90e7fa3d8930213c304c18e74217a22e2b72efcb224902ddd3db95c2',
  'relecteur-produit.md': '6907b77ab2d049462e9f06c5fbd4c64b901ccf9ba6d77f43a0a6150063c33b28',
  'relecteur.md': '39825229e09467c002a60ac73f034a1ca440fbba7e53a9b6413d126e3618038d',
};
const SKIPPED = new Set(['.git', 'node_modules', '.specify', 'dist']);
const GENERATED = new Set(['.claude/agents', '.agents/agents', LEGACY_DIR]);

function findMentions(root: string, rel: string, out: string[]): void {
  for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
    const path = rel ? `${rel}/${e.name}` : e.name;
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) {
      if (!SKIPPED.has(e.name) && !GENERATED.has(path)) findMentions(root, path, out);
    } else if (e.isFile() && e.name.endsWith('.md')) {
      if (readFileSync(join(root, path), 'utf8').includes(`${LEGACY_DIR}/`)) out.push(path);
    }
  }
}

/** Lit seulement : `docs/agents/` du projet n'est jamais modifié ni supprimé. */
export function legacyAgents(root: string): { files: LegacyFinding[]; mentions: string[] } {
  const dir = join(root, LEGACY_DIR);
  const files: LegacyFinding[] = [];
  if (existsSync(dir)) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isFile() || !e.name.endsWith('.md')) continue;
      const expected = BOILERPLATE[e.name];
      const sha = createHash('sha256').update(readFileSync(join(dir, e.name))).digest('hex');
      files.push({
        path: `${LEGACY_DIR}/${e.name}`,
        state: expected === undefined ? 'unknown' : expected === sha ? 'unchanged' : 'modified',
      });
    }
    files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }
  const mentions: string[] = [];
  findMentions(root, '', mentions);
  mentions.sort();
  return { files, mentions };
}
