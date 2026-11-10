import { isMap, isScalar, isSeq, parseDocument, type YAMLMap, type YAMLSeq } from 'yaml';

type GitHook = {
  extension: 'git';
  command: string;
  enabled: true;
  optional: false;
  priority: 10;
  prompt: string;
  description: string;
  condition: null;
};

const hook = (command: string, prompt: string, description: string): GitHook => ({
  extension: 'git',
  command: `speckit.git.${command}`,
  enabled: true,
  optional: false,
  priority: 10,
  prompt,
  description,
  condition: null,
});

/** Les 10 hooks git du boilerplate, dans l'ordre de ses événements. */
const rows: [event: string, command: string, prompt: string, description: string][] = [
  ['before_specify', 'feature', 'Execute speckit.git.feature?', 'Create feature branch before specification'],
  ['after_specify', 'commit', 'Commit specify changes?', 'Auto-commit after specification'],
  ['after_clarify', 'commit', 'Commit clarify changes?', 'Auto-commit after spec clarification'],
  ['after_plan', 'commit', 'Commit plan changes?', 'Auto-commit after implementation planning'],
  ['after_tasks', 'commit', 'Commit tasks changes?', 'Auto-commit after task generation'],
  ['after_checklist', 'commit', 'Commit checklist changes?', 'Auto-commit after checklist generation'],
  ['after_analyze', 'commit', 'Commit analysis corrections?', 'Auto-commit the corrections made after the analysis'],
  ['after_implement', 'commit', 'Commit implement changes?', 'Auto-commit after implementation'],
  ['after_converge', 'commit', 'Commit converge changes?', 'Auto-commit after convergence'],
  ['after_constitution', 'commit', 'Commit constitution changes?', 'Auto-commit after constitution update'],
];

export const GIT_HOOKS: ReadonlyArray<readonly [string, GitHook]> = rows.map(
  ([event, command, prompt, description]) => [event, hook(command, prompt, description)] as const,
);

const HEADER = ` Wired on purpose: branch creation before specify, and a commit after each command that writes files
 (after analyze too: it reports only, but the corrections applied right after it get committed; with
 nothing changed the hook does nothing). The extension's other hooks (repository initialization,
 commits before each command, taskstoissues) are left out. \`specify extension update git\` re-adds them:
 \`npx @artefact-ci/sdd update\` reapplies them.`;

const isGit = (item: unknown): boolean =>
  isMap(item) && item.get('extension') === 'git';

/**
 * Ramène les hooks git d'un `.specify/extensions.yml` aux 10 du boilerplate : retire toutes les entrées
 * `extension: git`, supprime les événements devenus vides, ajoute les 10 hooks (après les entrées des
 * autres extensions d'un même événement). Conserve `installed`, les autres extensions et les commentaires.
 */
export function applyGitHooks(extensionsYml: string): string {
  const doc = parseDocument(extensionsYml);
  if (doc.errors.length > 0) throw new Error(`extensions.yml invalide : ${doc.errors[0]?.message}`);
  if (doc.contents === null) doc.contents = doc.createNode({}) as YAMLMap.Parsed;
  if (!isMap(doc.contents)) throw new Error('extensions.yml invalide : un mapping est attendu à la racine');
  doc.setIn(['settings', 'auto_execute_hooks'], true);

  if (!isMap(doc.get('hooks'))) doc.set(doc.createNode('hooks'), doc.createNode({}));
  const hooks = doc.get('hooks') as YAMLMap;

  for (const pair of [...hooks.items]) {
    const seq = pair.value;
    if (!isSeq(seq)) continue;
    seq.items = seq.items.filter((item) => !isGit(item));
    if (seq.items.length === 0) hooks.items = hooks.items.filter((p) => p !== pair);
  }
  for (const [event, entry] of GIT_HOOKS) {
    let seq = hooks.get(event);
    if (!isSeq(seq)) {
      seq = doc.createNode([]) as YAMLSeq;
      hooks.set(event, seq);
    }
    (seq as YAMLSeq).add(doc.createNode(entry));
  }

  const key = doc.contents.items.find((p) => isScalar(p.key) && p.key.value === 'hooks')?.key;
  if (isScalar(key) && !(key.commentBefore ?? '').includes('Wired on purpose')) {
    key.commentBefore = key.commentBefore ? `${key.commentBefore}\n${HEADER}` : HEADER;
  }
  return doc.toString({ indentSeq: false });
}
