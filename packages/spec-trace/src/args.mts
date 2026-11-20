import { parseArgs } from 'node:util';

export const USAGE = 'Usage : spec-trace [specs/NNN-nom…] [--base <ref git>] [--tests <motif>…]';

export interface TraceArgs {
  help: boolean;
  /** Référence git de l'avertissement de dérive. */
  base: string | undefined;
  /** Motifs des fichiers de tests, à la place de ceux de stack.yml. */
  tests: string[];
  /** Features visées ; aucune : toutes celles de specs/. */
  featureDirs: string[];
}

const MISSING_VALUE: Record<string, string> = {
  '--base': '--base attend une référence git (ex. origin/dev).',
  '--tests': "--tests attend un motif de fichiers de tests (ex. 'src/**/*.test.ts').",
};

/** Arguments de spec-trace. Une erreur dit en français ce qui ne va pas. */
export function traceArgs(args: string[]): TraceArgs {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        base: { type: 'string' },
        tests: { type: 'string', multiple: true },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (error) {
    throw new Error(argsMessage(error));
  }
  const { values, positionals } = parsed;
  if (values.base === '') throw new Error(MISSING_VALUE['--base']);
  if (values.tests?.includes('')) throw new Error(MISSING_VALUE['--tests']);
  return {
    help: values.help ?? false,
    base: values.base,
    tests: values.tests ?? [],
    featureDirs: positionals,
  };
}

// Les erreurs de parseArgs, en anglais, ne nomment l'option que dans leur texte : `'--base <value>'`,
// `'-h, --help'`. On garde le nom long.
function argsMessage(error: unknown): string {
  const { code, message } = error as NodeJS.ErrnoException;
  const option = /'(-[^']*)'/.exec(message)?.[1]?.split(', ').at(-1)?.split(' ')[0];
  if (option === undefined) return message;
  if (code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') return `Option inconnue : ${option}\n${USAGE}`;
  if (code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') {
    return MISSING_VALUE[option] ?? `${option} ne prend pas de valeur.`;
  }
  return message;
}
