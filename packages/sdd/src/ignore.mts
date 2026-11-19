/** Fichier lu par ripgrep, donc par la recherche de fichiers d'OpenCode (relatif à la racine). */
export const IGNORE_FILE = '.ignore';

const RULES = ['!.specify/', '!.specify/**'];
const COMMENT = '# OpenCode cherche avec ripgrep, qui saute les dossiers cachés : ces règles lui montrent .specify/';

/**
 * Ajoute à un `.ignore` les règles qui rendent `.specify/` visible à ripgrep, sans toucher aux
 * autres. Idempotent : une règle déjà présente n'est pas répétée. Pure.
 */
export function unhideSpecify(existing: string): string {
  const lines = new Set(existing.split('\n').map((l) => l.trim()));
  const missing = RULES.filter((r) => !lines.has(r));
  if (missing.length === 0) return existing;
  const head = existing === '' ? '' : `${existing.endsWith('\n') ? existing : `${existing}\n`}\n`;
  return `${head}${COMMENT}\n${missing.join('\n')}\n`;
}
