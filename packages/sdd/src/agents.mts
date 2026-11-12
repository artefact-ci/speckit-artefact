import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';

export type AgentSpec = { name: string; access: 'read-only' | 'writes'; description: string };

/** Dossier où Spec Kit installe les consignes des sous-agents (relatif à la racine du projet). */
export const INSTRUCTIONS_DIR = '.specify/extensions/artefact-product/agents';

/** Fichier à écrire ; `path` est relatif à la racine, séparateurs POSIX. */
export type FileWrite = { path: string; content: string };

export function readAgentSpecs(root: string): AgentSpec[] {
  const file = join(root, INSTRUCTIONS_DIR, 'agents.yml');
  if (!existsSync(file)) {
    throw new Error(
      `${INSTRUCTIONS_DIR}/agents.yml introuvable dans ${root} : l'extension artefact-product est-elle installée ?`,
    );
  }
  const doc = parse(readFileSync(file, 'utf8')) as { agents?: AgentSpec[] } | null;
  if (!doc || !Array.isArray(doc.agents)) {
    throw new Error(`${INSTRUCTIONS_DIR}/agents.yml invalide : clé « agents » absente`);
  }
  return doc.agents.map((a) => ({ name: a.name, access: a.access, description: a.description }));
}

/** Intégrations Spec Kit installées (`.specify/integration.json`) ; [] si le fichier manque. */
export function readIntegrations(root: string): string[] {
  const file = join(root, '.specify', 'integration.json');
  if (!existsSync(file)) return [];
  const json = JSON.parse(readFileSync(file, 'utf8')) as {
    installed_integrations?: string[];
    integration?: string;
  };
  if (Array.isArray(json.installed_integrations)) return json.installed_integrations;
  return json.integration ? [json.integration] : [];
}

/** Intégration par défaut de `.specify/integration.json` (`default_integration`, sinon `integration`) ; null si aucune. */
export function readDefaultIntegration(root: string): string | null {
  const file = join(root, '.specify', 'integration.json');
  if (!existsSync(file)) return null;
  const json = JSON.parse(readFileSync(file, 'utf8')) as { default_integration?: string; integration?: string };
  return json.default_integration ?? json.integration ?? null;
}

function body(spec: AgentSpec): string {
  const lines = [
    `Lis \`${INSTRUCTIONS_DIR}/${spec.name}.md\` et applique-le à la lettre : méthode, grille et format du rapport.`,
  ];
  lines.push(
    spec.access === 'read-only'
      ? "Tu n'as pas écrit ce travail. Ne modifie aucun fichier, ne commite rien. Rends uniquement le rapport."
      : "Ne commite rien : la commande qui t'a lancé s'en charge après l'accord de l'utilisateur.",
  );
  return lines.join('\n\n');
}

function document(front: Record<string, unknown>, spec: AgentSpec): string {
  return `---\n${stringify(front, { lineWidth: 0 })}---\n\n${body(spec)}\n`;
}

const CLAUDE_TOOLS = {
  'read-only': 'Read, Grep, Glob, Bash',
  writes: 'Read, Grep, Glob, Bash, Write, Edit',
} as const;

// Antigravity : noms d'outils vérifiés dans l'app le 2026-11-12 (voir docs/plan.md, phase 6a).
// Antigravity traduit les noms de la doc (view_file → read_file, replace_file_content →
// edit_file, write_to_file → write_file) et refuse un agent qui déclare deux alias du même
// outil ; il ignore sans message grep_search, list_dir et find_by_name. On déclare donc
// les noms réels. write_file crée un fichier (dossiers compris), edit_file ne fait que
// modifier. Dans le bac à sable, une commande lit mais n'écrit pas : seuls ces deux
// outils écrivent.
const AGY_TOOLS = {
  'read-only': ['read_file', 'run_command'],
  writes: ['read_file', 'write_file', 'edit_file', 'run_command'],
} as const;

type Generator = {
  supports: (spec: AgentSpec) => boolean;
  file: (spec: AgentSpec) => FileWrite;
};

const GENERATORS: Record<string, Generator> = {
  claude: {
    supports: () => true,
    file: (spec) => ({
      path: `.claude/agents/${spec.name}.md`,
      content: document(
        { name: spec.name, description: spec.description, tools: CLAUDE_TOOLS[spec.access] },
        spec,
      ),
    }),
  },
  agy: {
    supports: () => true,
    file: (spec) => ({
      path: `.agents/agents/${spec.name}/agent.md`,
      content: document(
        {
          name: spec.name,
          description: spec.description,
          tools: [...AGY_TOOLS[spec.access]],
          commandExecutionPolicy: 'sandbox',
        },
        spec,
      ),
    }),
  },
};

/** Fichiers d'agent d'une intégration ; null si l'outil n'a pas de générateur. Pure. */
export function agentFiles(integration: string, specs: AgentSpec[]): FileWrite[] | null {
  const gen = GENERATORS[integration];
  if (!gen) return null;
  return specs.filter(gen.supports).map(gen.file);
}

/** Noms des agents sans fichier généré pour cette intégration ([] si inconnue ou complète). */
export function skippedAgents(integration: string, specs: AgentSpec[]): string[] {
  const gen = GENERATORS[integration];
  if (!gen) return [];
  return specs.filter((s) => !gen.supports(s)).map((s) => s.name);
}
