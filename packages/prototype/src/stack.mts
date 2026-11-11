import { parse as parseYaml } from 'yaml';

/** Thème du projet, `ui.theme` dans `.specify/stack.yml` : la maquette en compile ses styles. */
export function themeOf(stackYaml: string | undefined): string {
  if (stackYaml === undefined) {
    throw new Error('.specify/stack.yml introuvable : il donne le thème du projet (ui.theme).');
  }
  let data: unknown;
  try {
    data = parseYaml(stackYaml);
  } catch (error) {
    throw new Error(`.specify/stack.yml : YAML invalide : ${(error as Error).message}`);
  }
  const ui = (data as { ui?: unknown } | null)?.ui;
  if (ui === undefined) {
    throw new Error(
      'ui absent de .specify/stack.yml : sans front (ui: null), rien à maquetter ; sinon, ui.theme.',
    );
  }
  if (ui === null) {
    throw new Error("ui: null dans .specify/stack.yml : le projet n'a pas de front à maquetter.");
  }
  const theme = (ui as { theme?: unknown }).theme;
  if (typeof theme !== 'string' || theme.trim() === '') {
    throw new Error('ui.theme absent de .specify/stack.yml : le fichier de thème du projet.');
  }
  return theme;
}

/** Chemin du binaire `name` d'un paquet, d'après son package.json (`bin`). */
export function binOf(
  packageJson: { name?: string; bin?: string | Record<string, string> },
  name: string,
): string | undefined {
  const { bin } = packageJson;
  if (typeof bin === 'string') return bin;
  return bin?.[name];
}

/** Commande qui installe le Chromium de la version de Playwright chargée, pas celui de `latest`. */
export function chromiumInstallHint(playwrightVersion: string | undefined): string {
  const pinned = playwrightVersion ? `playwright@${playwrightVersion}` : 'playwright';
  return `npx ${pinned} install chromium`;
}
