import { parse as parseYaml } from 'yaml';

/**
 * Traçabilité spec → tests : chaque scénario d'acceptation d'une spec Spec Kit
 * (`specs/NNN-<nom>/spec.md`) porte un identifiant `NNN-US<story>-AS<n>`, et au moins un test
 * le cite dans son titre. Logique pure ; la lecture des fichiers est dans cli.mts.
 */

/**
 * Cycle de vie d'une spec : Draft (en cours, des scénarios peuvent encore attendre leur test),
 * Implemented (tous couverts), Shipped (feature flag supprimé), Retired (fonctionnalité retirée :
 * plus aucun test ne la cite).
 */
const SPEC_STATUSES = ['Draft', 'Implemented', 'Shipped', 'Retired'] as const;
export type SpecStatus = (typeof SPEC_STATUSES)[number];

export interface Scenario {
  id: string;
  text: string;
  /** Scénario retiré (`N. **Retired** …`) : son numéro reste pris, aucun test ne doit le citer. */
  retired: boolean;
}

export interface TestFile {
  path: string;
  content: string;
}

export interface TraceOptions {
  status: SpecStatus;
  /** Exige un test pour chaque scénario actif, même en Draft. */
  strict?: boolean;
}

export interface TraceReport {
  featureId: string;
  status: SpecStatus;
  /** Les scénarios sans test font échouer (sinon, simple information). */
  coverageRequired: boolean;
  rows: { id: string; text: string; retired: boolean; tests: string[] }[];
  uncovered: string[];
  orphans: { id: string; path: string }[];
  retiredCited: { id: string; path: string }[];
  ok: boolean;
}

export function featureIdOf(featureDir: string): string {
  const name = featureDir.replace(/\/+$/, '').split('/').pop() ?? '';
  const match = /^(\d+)-/.exec(name);
  if (!match?.[1]) {
    throw new Error(
      `Le dossier de feature "${featureDir}" n'a pas de préfixe numérique (attendu : NNN-<nom>).`,
    );
  }
  return match[1];
}

export function parseStatus(specMarkdown: string): SpecStatus {
  const value = /^\*\*Status\*\*:\s*(.*?)\s*$/m.exec(specMarkdown)?.[1];
  if (value === undefined) {
    throw new Error(`Ligne **Status** absente (attendu : ${SPEC_STATUSES.join(', ')}).`);
  }
  const status = SPEC_STATUSES.find((candidate) => candidate === value);
  if (!status) {
    throw new Error(`Statut "${value}" inconnu (attendu : ${SPEC_STATUSES.join(', ')}).`);
  }
  return status;
}

/**
 * Scénarios = éléments numérotés de la liste « Acceptance Scenarios » de chaque « User Story N ».
 * Le numéro est celui écrit dans la spec : retirer un scénario ne renumérote pas les suivants.
 */
export function parseScenarios(featureId: string, specMarkdown: string): Scenario[] {
  const scenarios: Scenario[] = [];
  let story: string | undefined;
  let inScenarios = false;

  for (const line of specMarkdown.split('\n')) {
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      story = /^User Story (\d+)\b/.exec(heading[1] ?? '')?.[1];
      inScenarios = false;
      continue;
    }
    if (story && line.startsWith('**Acceptance Scenarios**')) {
      inScenarios = true;
      continue;
    }
    const item = inScenarios ? /^(\d+)\.\s+(.*)$/.exec(line) : null;
    if (story && item) {
      const text = item[2] ?? '';
      scenarios.push({
        id: `${featureId}-US${story}-AS${item[1]}`,
        text,
        retired: text.startsWith('**Retired**'),
      });
    }
  }
  return scenarios;
}

export function traceFeature(
  featureId: string,
  scenarios: Scenario[],
  options: TraceOptions,
  testFiles: TestFile[],
): TraceReport {
  // Une spec retirée l'est en entier : chacun de ses scénarios est retiré.
  const featureRetired = options.status === 'Retired';
  const retiredIds = new Set(
    scenarios.filter((scenario) => featureRetired || scenario.retired).map((s) => s.id),
  );
  const known = new Set(scenarios.map((scenario) => scenario.id));
  const idPattern = new RegExp(`\\b${featureId}-US\\d+-AS\\d+\\b`, 'g');
  const testsById = new Map<string, Set<string>>();
  const orphans: TraceReport['orphans'] = [];
  const retiredCited: TraceReport['retiredCited'] = [];

  for (const file of testFiles) {
    for (const id of new Set(file.content.match(idPattern) ?? [])) {
      if (!known.has(id)) {
        orphans.push({ id, path: file.path });
        continue;
      }
      testsById.set(id, (testsById.get(id) ?? new Set()).add(file.path));
      if (retiredIds.has(id)) retiredCited.push({ id, path: file.path });
    }
  }

  const rows = scenarios.map((scenario) => ({
    id: scenario.id,
    text: scenario.text,
    retired: retiredIds.has(scenario.id),
    tests: [...(testsById.get(scenario.id) ?? [])].sort(),
  }));
  const active = rows.filter((row) => !row.retired);
  const uncovered = active.filter((row) => row.tests.length === 0).map((row) => row.id);
  const byIdThenPath = (a: { id: string; path: string }, b: { id: string; path: string }) =>
    a.id.localeCompare(b.id) || a.path.localeCompare(b.path);
  orphans.sort(byIdThenPath);
  retiredCited.sort(byIdThenPath);

  const coverageRequired =
    !featureRetired && (options.strict === true || options.status !== 'Draft');
  const coverageOk = !coverageRequired || (active.length > 0 && uncovered.length === 0);

  return {
    featureId,
    status: options.status,
    coverageRequired,
    rows,
    uncovered,
    orphans,
    retiredCited,
    ok: coverageOk && orphans.length === 0 && retiredCited.length === 0,
  };
}

/**
 * Dérive probable : un diff (`git diff -U0`) modifie des lignes de test qui citent un scénario
 * d'une feature, sans que le `spec.md` de cette feature figure parmi les fichiers modifiés.
 * Simple signal pour la revue : renommer ou refactorer un test ne change pas le comportement.
 */
export function driftedFeatures(
  diff: string,
  changedPaths: string[],
): { featureId: string; paths: string[] }[] {
  const specChanged = new Set(
    changedPaths.flatMap((path) => /^specs\/(\d+)-[^/]+\/spec\.md$/.exec(path)?.[1] ?? []),
  );
  const pathsByFeature = new Map<string, Set<string>>();
  let oldPath: string | undefined;
  let path: string | undefined;

  for (const line of diff.split('\n')) {
    if (line.startsWith('--- ')) {
      oldPath = line.slice(4).replace(/^a\//, '');
      continue;
    }
    if (line.startsWith('+++ ')) {
      const newPath = line.slice(4);
      path = newPath === '/dev/null' ? oldPath : newPath.replace(/^b\//, '');
      continue;
    }
    if (!path || !/^[+-]/.test(line)) continue;
    for (const match of line.matchAll(/\b(\d+)-US\d+-AS\d+\b/g)) {
      const featureId = match[1] ?? '';
      if (specChanged.has(featureId)) continue;
      pathsByFeature.set(featureId, (pathsByFeature.get(featureId) ?? new Set()).add(path));
    }
  }

  return [...pathsByFeature]
    .map(([featureId, paths]) => ({ featureId, paths: [...paths].sort() }))
    .sort((a, b) => a.featureId.localeCompare(b.featureId));
}

/**
 * Index du produit (`specs/product.yml`) : les exigences du cahier des charges (`PAY-03`),
 * regroupées en epics (`E03`) qui dépendent les uns des autres et déclarent leurs parcours de bout
 * en bout (`E03-J1`). Chaque spec nomme les exigences qu'elle implémente
 * (`**Product Requirements**:`) ; l'état d'une exigence se déduit du statut de ses specs, celui d'un
 * epic de ses exigences : rien ne s'écrit à la main. Un identifiant ne se renumérote jamais, il se
 * retire (`retired: <raison>`). Une priorité (`priority: P1`, P1 d'abord), sur tous les epics ou sur
 * aucun, dit lequel livrer quand plusieurs sont prêts.
 */
interface ProductRequirement {
  id: string;
  title: string;
  retired?: string | undefined;
}

interface Journey {
  id: string;
  title: string;
  steps: string[];
  retired?: string | undefined;
}

interface Epic {
  id: string;
  title: string;
  goal: string;
  requirements: string[];
  dependsOn: string[];
  /** Niveau de priorité : 1 pour P1, le plus urgent. Absent quand l'index n'en déclare pas. */
  priority: number | undefined;
  journeys: Journey[];
}

export interface ProductIndex {
  requirements: ProductRequirement[];
  epics: Epic[];
}

type RequirementState = 'Unspecified' | SpecStatus;

export interface SpecRequirementRefs {
  featureDir: string;
  status: SpecStatus;
  /** `undefined` : ligne `**Product Requirements**` absente ; `[]` : `None`. */
  refs: string[] | undefined;
}

export interface RequirementReport {
  rows: {
    id: string;
    title: string;
    state: RequirementState;
    specs: { featureDir: string; status: SpecStatus }[];
  }[];
  /** Exigences citées par une spec et absentes de l'index (ou index absent). */
  unknown: { featureDir: string; id: string }[];
  /** Specs actives sans ligne `**Product Requirements**`, alors que l'index existe. */
  missingLine: string[];
  /** Specs actives qui citent une exigence retirée : avertissement, la spec reste à retirer. */
  retiredCited: { featureDir: string; id: string }[];
  ok: boolean;
}

const REQUIREMENT_ID = /^[A-Z][A-Z0-9]*-\d+$/;
const EPIC_ID = /^E\d+$/;
const JOURNEY_ID = /^E\d+-J\d+$/;
const PRIORITY = /^P([1-9]\d*)$/;

type Fields = Record<string, unknown>;

function fieldsOf(value: unknown, what: string): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${what} : attendu un objet.`);
  }
  return value as Fields;
}

function text(fields: Fields, key: string, owner: string): string {
  const value = fields[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${owner} : champ ${key} absent ou vide.`);
  }
  return value;
}

function retiredOf(fields: Fields, owner: string): string | undefined {
  return fields['retired'] === undefined ? undefined : text(fields, 'retired', owner);
}

function textList(fields: Fields, key: string, owner: string): string[] {
  const value = fields[key] ?? [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${owner} : ${key} doit être une liste de textes.`);
  }
  return value as string[];
}

function priorityOf(fields: Fields, owner: string): number | undefined {
  const value = fields['priority'];
  if (value === undefined) return undefined;
  const level = typeof value === 'string' ? PRIORITY.exec(value)?.[1] : undefined;
  if (!level) {
    throw new Error(`${owner} : priority "${String(value)}" invalide (attendu : P1, P2…).`);
  }
  return Number(level);
}

function assertUnique(ids: string[], what: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${what} ${id} apparaît deux fois.`);
    seen.add(id);
  }
}

// Premier cycle trouvé dans le graphe des dépendances, sous la forme E01 → E02 → E01.
function findCycle(epics: Epic[]): string[] | undefined {
  const dependsOn = new Map(epics.map((epic) => [epic.id, epic.dependsOn]));
  const done = new Set<string>();
  const visit = (id: string, path: string[]): string[] | undefined => {
    const start = path.indexOf(id);
    if (start >= 0) return [...path.slice(start), id];
    if (done.has(id)) return undefined;
    for (const next of dependsOn.get(id) ?? []) {
      const cycle = visit(next, [...path, id]);
      if (cycle) return cycle;
    }
    done.add(id);
    return undefined;
  };
  for (const epic of epics) {
    const cycle = visit(epic.id, []);
    if (cycle) return cycle;
  }
  return undefined;
}

// Une priorité sur tous les epics ou sur aucun ; un epic ne passe pas avant ce dont il dépend. Un
// epic retiré (toutes ses exigences le sont) n'a plus rien à livrer : sa priorité ne compte plus.
function assertPriorities(epics: Epic[], retired: Set<string>): void {
  if (epics.every((epic) => epic.priority === undefined)) return;
  const missing = epics.find((epic) => epic.priority === undefined);
  if (missing) {
    throw new Error(
      `L'epic ${missing.id} : priority absente, alors que d'autres epics en ont une (tous ou aucun).`,
    );
  }
  const priorityOf = new Map(epics.map((epic) => [epic.id, epic.priority ?? 0]));
  for (const epic of epics.filter((candidate) => !retired.has(candidate.id))) {
    for (const dependency of epic.dependsOn.filter((id) => !retired.has(id))) {
      const level = priorityOf.get(dependency) ?? 0;
      if (level > (epic.priority ?? 0)) {
        throw new Error(
          `L'epic ${epic.id} (P${epic.priority}) dépend de ${dependency} (P${level}), moins ` +
            'prioritaire : il ne peut pas être livré avant lui.',
        );
      }
    }
  }
}

/** Lit et valide l'index : identifiants, références entre epics et exigences, cycles. */
export function parseProductIndex(yamlText: string): ProductIndex {
  let data: unknown;
  try {
    data = parseYaml(yamlText);
  } catch (error) {
    throw new Error(`YAML invalide : ${(error as Error).message}`);
  }
  const root = (data ?? {}) as Fields;
  if (!Array.isArray(root['requirements'])) {
    throw new Error('Attendu : requirements: [{ id: PAY-03, title: … }], puis epics (optionnel).');
  }

  const requirements = (root['requirements'] as unknown[]).map((entry, position) => {
    const fields = fieldsOf(entry, `Exigence n° ${position + 1}`);
    const id = fields['id'];
    if (typeof id !== 'string' || !REQUIREMENT_ID.test(id)) {
      throw new Error(`Identifiant d'exigence "${String(id)}" invalide (attendu : PAY-03).`);
    }
    return {
      id,
      title: text(fields, 'title', `L'exigence ${id}`),
      retired: retiredOf(fields, `L'exigence ${id}`),
    };
  });
  assertUnique(
    requirements.map((requirement) => requirement.id),
    "L'exigence",
  );

  const rawEpics = root['epics'] ?? [];
  if (!Array.isArray(rawEpics)) throw new Error('epics doit être une liste.');
  const epics = rawEpics.map((entry: unknown, position): Epic => {
    const fields = fieldsOf(entry, `Epic n° ${position + 1}`);
    const id = fields['id'];
    if (typeof id !== 'string' || !EPIC_ID.test(id)) {
      throw new Error(`Identifiant d'epic "${String(id)}" invalide (attendu : E03).`);
    }
    const owner = `L'epic ${id}`;
    const epicRequirements = textList(fields, 'requirements', owner);
    if (epicRequirements.length === 0) {
      throw new Error(`${owner} : requirements vide (au moins une exigence).`);
    }
    const rawJourneys = fields['journeys'] ?? [];
    if (!Array.isArray(rawJourneys)) throw new Error(`${owner} : journeys doit être une liste.`);
    const journeys = rawJourneys.map((journeyEntry: unknown, index): Journey => {
      const journey = fieldsOf(journeyEntry, `${owner}, parcours n° ${index + 1}`);
      const journeyId = journey['id'];
      if (typeof journeyId !== 'string' || !JOURNEY_ID.test(journeyId)) {
        throw new Error(
          `Identifiant de parcours "${String(journeyId)}" invalide (attendu : ${id}-J1).`,
        );
      }
      if (!journeyId.startsWith(`${id}-J`)) {
        throw new Error(`Le parcours ${journeyId} de l'epic ${id} doit s'appeler ${id}-J<n>.`);
      }
      const journeyOwner = `Le parcours ${journeyId}`;
      const retired = retiredOf(journey, journeyOwner);
      const steps = textList(journey, 'steps', journeyOwner);
      if (!retired && steps.length === 0) {
        throw new Error(`${journeyOwner} : steps vide (les étapes que le test enchaîne).`);
      }
      return { id: journeyId, title: text(journey, 'title', journeyOwner), steps, retired };
    });
    return {
      id,
      title: text(fields, 'title', owner),
      goal: text(fields, 'goal', owner),
      requirements: epicRequirements,
      dependsOn: textList(fields, 'depends_on', owner),
      priority: priorityOf(fields, owner),
      journeys,
    };
  });
  assertUnique(
    epics.map((epic) => epic.id),
    "L'epic",
  );
  assertUnique(
    epics.flatMap((epic) => epic.journeys.map((journey) => journey.id)),
    'Le parcours',
  );

  const knownRequirements = new Set(requirements.map((requirement) => requirement.id));
  const knownEpics = new Set(epics.map((epic) => epic.id));
  const epicOf = new Map<string, string>();
  for (const epic of epics) {
    for (const requirement of epic.requirements) {
      if (!knownRequirements.has(requirement)) {
        throw new Error(`L'epic ${epic.id} cite ${requirement}, absente de requirements.`);
      }
      const other = epicOf.get(requirement);
      if (other) {
        throw new Error(`L'exigence ${requirement} est dans deux epics : ${other} et ${epic.id}.`);
      }
      epicOf.set(requirement, epic.id);
    }
    for (const dependency of epic.dependsOn) {
      if (!knownEpics.has(dependency)) {
        throw new Error(`L'epic ${epic.id} dépend de ${dependency}, absent de epics.`);
      }
    }
  }
  if (epics.length > 0) {
    const orphan = requirements.find(
      (requirement) => !requirement.retired && !epicOf.has(requirement.id),
    );
    if (orphan) throw new Error(`L'exigence ${orphan.id} n'appartient à aucun epic.`);
  }
  const cycle = findCycle(epics);
  if (cycle) throw new Error(`Dépendances circulaires entre epics : ${cycle.join(' → ')}.`);
  const retiredRequirements = new Set(
    requirements.filter((requirement) => requirement.retired).map(({ id }) => id),
  );
  assertPriorities(
    epics,
    new Set(
      epics
        .filter((epic) => epic.requirements.every((id) => retiredRequirements.has(id)))
        .map((epic) => epic.id),
    ),
  );

  return { requirements, epics };
}

export function parseRequirementRefs(specMarkdown: string): string[] | undefined {
  const value = /^\*\*Product Requirements\*\*:\s*(.*?)\s*$/m.exec(specMarkdown)?.[1];
  if (value === undefined) return undefined;
  if (value === '' || value === 'None') return [];
  return value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id !== '');
}

const STATE_ORDER: SpecStatus[] = ['Draft', 'Implemented', 'Shipped'];

export function traceRequirements(
  index: ProductIndex | undefined,
  specs: SpecRequirementRefs[],
): RequirementReport {
  const known = new Set(index?.requirements.map((requirement) => requirement.id));
  const retired = new Set(
    index?.requirements.filter((requirement) => requirement.retired).map(({ id }) => id),
  );
  const unknown = specs
    .flatMap(({ featureDir, refs }) => (refs ?? []).map((id) => ({ featureDir, id })))
    .filter(({ id }) => !known.has(id));
  // Une spec retirée avant la création de l'index n'a pas à être complétée.
  const missingLine = index
    ? specs
        .filter((spec) => spec.refs === undefined && spec.status !== 'Retired')
        .map((spec) => spec.featureDir)
    : [];

  const retiredCited = specs
    .filter((spec) => spec.status !== 'Retired')
    .flatMap(({ featureDir, refs }) => (refs ?? []).map((id) => ({ featureDir, id })))
    .filter(({ id }) => retired.has(id));

  const rows = (index?.requirements ?? []).map(({ id, title }) => {
    const cited = specs
      .filter((spec) => spec.refs?.includes(id))
      .map(({ featureDir, status }) => ({ featureDir, status }))
      .sort((a, b) => a.featureDir.localeCompare(b.featureDir));
    const active = cited.filter((spec) => spec.status !== 'Retired');
    // L'exigence n'avance qu'avec sa spec la moins avancée : une v2 en Draft la remet en cours.
    const state: RequirementState = retired.has(id)
      ? 'Retired'
      : cited.length === 0
        ? 'Unspecified'
        : active.length === 0
          ? 'Retired'
          : (STATE_ORDER.find((status) => active.some((spec) => spec.status === status)) ??
            'Draft');
    return { id, title, state, specs: cited };
  });

  return {
    rows,
    unknown,
    missingLine,
    retiredCited,
    ok: unknown.length === 0 && missingLine.length === 0,
  };
}

export interface EpicReport {
  rows: {
    id: string;
    title: string;
    state: RequirementState;
    /** Exigences actives de l'epic : combien ont une spec, combien sont terminées. */
    progress: { total: number; specified: number; done: number };
    requirements: string[];
    dependsOn: string[];
    priority: number | undefined;
  }[];
  /**
   * Prochains epics à livrer : pas terminés, dépendances terminées, et du niveau de priorité le
   * plus urgent parmi eux (tous les prêts quand l'index n'a pas de priorités).
   */
  next: string[];
  journeys: { id: string; epicId: string; title: string; retired: boolean; tests: string[] }[];
  /** Parcours actifs sans test d'un epic terminé (Implemented ou Shipped). */
  uncovered: string[];
  orphans: { id: string; path: string }[];
  retiredCited: { id: string; path: string }[];
  /** Specs en Draft d'un epic dont une dépendance n'est pas terminée : avertissement. */
  blocked: { featureDir: string; epicId: string; waitingOn: string[] }[];
  ok: boolean;
}

// Du moins avancé au plus avancé : l'état d'un epic est celui de son exigence la moins avancée.
const PROGRESS: Exclude<RequirementState, 'Retired'>[] = [
  'Unspecified',
  'Draft',
  'Implemented',
  'Shipped',
];
const isDone = (state: RequirementState) => state === 'Implemented' || state === 'Shipped';

/**
 * Cellules État et Avancement du tableau des epics. L'état reste celui de l'exigence la moins
 * avancée ; un epic commencé ne s'affiche pas pour autant comme non spécifié.
 */
export function epicCells({
  state,
  progress: { total, specified, done },
}: Pick<EpicReport['rows'][number], 'state' | 'progress'>): { state: string; progress: string } {
  if (state === 'Retired') return { state, progress: '' };
  const label =
    state !== 'Unspecified' ? state : specified > 0 ? '**en cours**' : '**non spécifié**';
  return { state: label, progress: `${specified}/${total} spécifiées, ${done}/${total} terminées` };
}

/**
 * `requirementRows` vient de toutes les specs (l'état d'un epic en dépend) ; `specs`, seulement de
 * celles à vérifier (avertissements de dépendance).
 */
export function traceEpics(
  index: ProductIndex,
  requirementRows: RequirementReport['rows'],
  specs: SpecRequirementRefs[],
  testFiles: TestFile[],
): EpicReport {
  const stateOf = new Map(requirementRows.map((row) => [row.id, row.state]));
  const retiredInIndex = new Set(
    index.requirements.filter((requirement) => requirement.retired).map(({ id }) => id),
  );
  // Tri stable : à niveau égal, l'ordre du fichier.
  const ordered = [...index.epics].sort(
    (a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity),
  );
  const rows = ordered.map(({ id, title, requirements, dependsOn, priority }) => {
    // Seul l'index retire une exigence d'un epic : si toutes ses specs sont retirées alors qu'elle
    // reste active, elle est à refaire.
    const states = requirements
      .filter((requirement) => !retiredInIndex.has(requirement))
      .map((requirement) => stateOf.get(requirement) ?? 'Unspecified')
      .map((state) => (state === 'Retired' ? 'Unspecified' : state));
    const state: RequirementState =
      states.length === 0
        ? 'Retired'
        : (PROGRESS.find((candidate) => states.includes(candidate)) ?? 'Unspecified');
    const progress = {
      total: states.length,
      specified: states.filter((candidate) => candidate !== 'Unspecified').length,
      done: states.filter(isDone).length,
    };
    return { id, title, state, progress, requirements, dependsOn, priority };
  });
  const epicState = new Map(rows.map((row) => [row.id, row.state]));
  // Une dépendance ne retient plus rien une fois terminée, ou retirée : il n'y a plus rien à attendre.
  const settled = (dependency: string) => {
    const state = epicState.get(dependency) ?? 'Unspecified';
    return isDone(state) || state === 'Retired';
  };
  const ready = rows.filter(
    (row) => row.state !== 'Retired' && !isDone(row.state) && row.dependsOn.every(settled),
  );
  const next = ready.filter((row) => row.priority === ready[0]?.priority).map((row) => row.id);

  const journeyList = index.epics.flatMap((epic) =>
    epic.journeys.map((journey) => ({ ...journey, epicId: epic.id })),
  );
  const known = new Map(journeyList.map((journey) => [journey.id, journey]));
  const testsById = new Map<string, Set<string>>();
  const orphans: EpicReport['orphans'] = [];
  const retiredCited: EpicReport['retiredCited'] = [];
  for (const file of testFiles) {
    for (const id of new Set(file.content.match(/\bE\d+-J\d+\b/g) ?? [])) {
      const journey = known.get(id);
      if (!journey) {
        orphans.push({ id, path: file.path });
        continue;
      }
      testsById.set(id, (testsById.get(id) ?? new Set()).add(file.path));
      if (journey.retired) retiredCited.push({ id, path: file.path });
    }
  }
  const byIdThenPath = (a: { id: string; path: string }, b: { id: string; path: string }) =>
    a.id.localeCompare(b.id) || a.path.localeCompare(b.path);
  orphans.sort(byIdThenPath);
  retiredCited.sort(byIdThenPath);

  const journeys = journeyList.map(({ id, epicId, title, retired }) => ({
    id,
    epicId,
    title,
    retired: retired !== undefined,
    tests: [...(testsById.get(id) ?? [])].sort(),
  }));
  const uncovered = journeys
    .filter(
      (journey) =>
        !journey.retired &&
        journey.tests.length === 0 &&
        isDone(epicState.get(journey.epicId) ?? 'Unspecified'),
    )
    .map((journey) => journey.id);

  const epicOf = new Map(
    index.epics.flatMap((epic) => epic.requirements.map((id) => [id, epic] as const)),
  );
  const blocked: EpicReport['blocked'] = [];
  for (const spec of specs.filter((candidate) => candidate.status === 'Draft')) {
    const epics = new Set((spec.refs ?? []).flatMap((id) => epicOf.get(id) ?? []));
    for (const epic of epics) {
      const waitingOn = epic.dependsOn.filter((dependency) => !settled(dependency));
      if (waitingOn.length > 0)
        blocked.push({ featureDir: spec.featureDir, epicId: epic.id, waitingOn });
    }
  }

  return {
    rows,
    next,
    journeys,
    uncovered,
    orphans,
    retiredCited,
    blocked,
    ok: uncovered.length === 0 && orphans.length === 0 && retiredCited.length === 0,
  };
}
