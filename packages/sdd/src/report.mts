import type { Report } from './install.mts';

const LEGACY_STATE = {
  unchanged: 'identique au boilerplate, tu peux le supprimer',
  /** Variante quand des fichiers citent encore docs/agents/. */
  unchangedCited: 'identique au boilerplate : supprimable une fois les mentions ci-dessous mises à jour',
  modified: 'modifié, à reporter dans les docs avant de supprimer le dossier',
  unknown: 'inconnu du boilerplate, à reporter dans les docs avant de supprimer le dossier',
} as const;

/** Dossier d'agents d'un fichier généré : `.claude/agents/x.md` → `.claude/agents`. */
const agentDir = (path: string): string => path.split('/').slice(0, 2).join('/');

/** Le rapport d'init ou d'update, en français, pour la sortie standard. */
export function formatReport(r: Report): string {
  const out: string[] = [];
  const list = (items: string[]) => items.join(', ');

  out.push('Spec Kit');
  if (r.installed.length > 0) {
    out.push(`  ${r.mode === 'update' ? 'Réinstallé / mis à jour' : 'Installé'} : ${list(r.installed)}`);
  }
  if (r.skipped.length > 0) out.push(`  Déjà installé : ${list(r.skipped)}`);
  const { installed, previous, downgrade } = r.version;
  if (installed === null) {
    out.push('  Version installée inconnue : lance update pour aligner tous les composants');
  } else {
    const now = `${installed.version} (${installed.source})`;
    if (r.mode === 'init') out.push(`  Version : ${now}`);
    else if (previous) out.push(`  Version : ${previous.version} → ${now}`);
    else out.push(`  Version : ${now}, version précédente inconnue`);
    if (downgrade && previous) {
      out.push(`  Attention : ${previous.version} était plus récente que ${installed.version}, l'installeur a remis ${installed.version}`);
    }
  }

  if (r.migrated) {
    out.push(
      '',
      'Migration du boilerplate',
      '  preset `boilerplate` retiré ;',
      '  pour garder les templates de plan et de tâches propres à la stack, ajouter un preset local au-dessus',
      '  (`specify preset add --dev <chemin> --priority 5`, voir `examples/nx-preset/` de speckit-artefact) ;',
      '  remplacer `preset update boilerplate` dans `AGENTS.md` et les guides par `npx @artefact-ci/sdd update`.',
    );
  }

  if (r.noIntegration || r.agents.length > 0 || r.noAgentGenerator.length > 0 || r.agentsSkipped.length > 0) {
    out.push('', "Agents de relecture");
    if (r.noIntegration) {
      out.push("  aucune intégration trouvée dans .specify/integration.json : aucun fichier d'agent généré");
    }
    const byDir = new Map<string, string[]>();
    for (const path of r.agents) byDir.set(agentDir(path), [...(byDir.get(agentDir(path)) ?? []), path]);
    for (const [dir, paths] of byDir) out.push(`  ${dir} : ${paths.length} fichier(s) à jour`);
    for (const name of r.noAgentGenerator) {
      out.push(`  ${name} : pas de générateur de fichiers d'agent, la relecture se fait en contexte neuf`);
    }
    for (const { integration, names } of r.agentsSkipped) {
      out.push(
        `  ${integration}, ${list(names)} : pas de fichier d'agent pour cet outil : la commande fera la relecture en nouvelle session`,
      );
    }
  }

  if (r.stack) {
    out.push('', ".specify/stack.yml déduit du dépôt : relis-le et corrige-le avant de t'en servir.");
    out.push(`  Stack détectée : ${r.stack.kind === 'unknown' ? 'aucune reconnue' : r.stack.kind}`);
    if (r.stack.guessed.length > 0) out.push(`  Devinées : ${list(r.stack.guessed)}`);
    if (r.stack.empty.length > 0) out.push(`  À compléter : ${list(r.stack.empty)}`);
  }

  out.push(
    '',
    r.constitution === 'written'
      ? '.specify/memory/constitution.md écrit avec la base Artefact CI : ajoute les principes du projet.'
      : '.specify/memory/constitution.md gardé tel quel.',
  );

  if (r.legacy.files.length > 0 || r.legacy.mentions.length > 0) {
    out.push('', "Anciens agents (docs/agents/, jamais modifiés par l'installeur)");
    const cited = r.legacy.mentions.length > 0;
    for (const f of r.legacy.files) {
      out.push(`  ${f.path} : ${LEGACY_STATE[f.state === 'unchanged' && cited ? 'unchangedCited' : f.state]}`);
    }
    if (r.legacy.mentions.length > 0) {
      out.push(`  Citent encore docs/agents/ : ${list(r.legacy.mentions)}`);
    }
  }

  if (r.dirty) {
    out.push(
      '',
      "Attention : le dépôt avait des changements non commités avant l'installation ; relis le diff avant de commiter.",
    );
  }
  return `${out.join('\n')}\n`;
}
