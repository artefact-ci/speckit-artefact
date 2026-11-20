import { parseArgs } from 'node:util';

export const USAGE = 'Usage : artefact-sdd init|update [--source <dir>] [--integration <outil>] [--help]';

export type SddArgs =
  | { help: true }
  | {
      help: false;
      command: 'init' | 'update';
      /** Clone de speckit-artefact à installer en --dev ; sans lui, la release de l'installeur. */
      source: string | undefined;
      integration: string | undefined;
    };

const MISSING_VALUE: Record<string, string> = {
  '--source': "--source attend le dossier d'un clone de speckit-artefact.",
  '--integration': "--integration attend le nom de l'outil (ex. agy, opencode).",
};

/** Arguments de artefact-sdd. Une erreur dit en français ce qui ne va pas, sans l'usage. */
export function sddArgs(args: string[]): SddArgs {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        source: { type: 'string' },
        integration: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (error) {
    throw new Error(argsMessage(error));
  }
  const { values, positionals } = parsed;
  if (values.help) return { help: true };
  const [command, ...extra] = positionals;
  if (command === undefined) throw new Error('Commande manquante : init ou update.');
  if (command !== 'init' && command !== 'update') throw new Error(`Commande inconnue : ${command}`);
  if (extra.length > 0) throw new Error(`Argument en trop : ${extra.join(' ')}`);
  if (values.source === '') throw new Error(MISSING_VALUE['--source']);
  if (values.integration === '') throw new Error(MISSING_VALUE['--integration']);
  return { help: false, command, source: values.source, integration: values.integration };
}

// Les erreurs de parseArgs, en anglais, ne nomment l'option que dans leur texte : `'--source <value>'`,
// `'-h, --help'`. On garde le nom long.
function argsMessage(error: unknown): string {
  const { code, message } = error as NodeJS.ErrnoException;
  const option = /'(-[^']*)'/.exec(message)?.[1]?.split(', ').at(-1)?.split(' ')[0];
  if (option === undefined) return message;
  if (code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') return `Option inconnue : ${option}`;
  if (code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') {
    return MISSING_VALUE[option] ?? `${option} ne prend pas de valeur.`;
  }
  return message;
}
