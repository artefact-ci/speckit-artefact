#!/usr/bin/env node
/**
 * Installe la méthode Artefact CI dans le dépôt courant (Spec Kit, preset artefact-sdd,
 * extension artefact-product, agents de relecture, stack.yml, constitution).
 *   artefact-sdd init --source <clone de speckit-artefact> [--integration <outil>]
 *   artefact-sdd update --source <clone de speckit-artefact>
 * init est idempotent ; update réinstalle les composants sans toucher stack.yml ni la constitution.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { init, SetupError, update } from './install.mts';
import { formatReport } from './report.mts';
import { devSource } from './source.mts';
import { run, SpecifyError } from './specify.mts';

const USAGE = 'Usage : artefact-sdd init|update [--source <dir>] [--integration <outil>] [--help]';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

let parsed;
try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      source: { type: 'string' },
      integration: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
} catch (error) {
  fail(`${(error as Error).message}\n${USAGE}`);
}
const { values, positionals } = parsed;
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}
const [command, ...extra] = positionals;
if (command === undefined) fail(USAGE);
if (command !== 'init' && command !== 'update') fail(`Commande inconnue : ${command}\n${USAGE}`);
if (extra.length > 0) fail(`Argument en trop : ${extra.join(' ')}\n${USAGE}`);
if (command === 'update' && values.integration !== undefined) {
  console.error("Avertissement : --integration est ignoré par update, l'intégration du projet est gardée.");
}
if (!values.source) fail('la source release arrive en phase 5 : passe --source <clone de speckit-artefact>');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

try {
  const options = {
    root: process.cwd(),
    source: devSource(resolve(values.source)),
    toolsVersion: pkg.version,
    runner: run,
    ...(command === 'init' && values.integration !== undefined ? { integration: values.integration } : {}),
  };
  const report = command === 'init' ? await init(options) : await update(options);
  process.stdout.write(formatReport(report));
} catch (error) {
  if (error instanceof SetupError || error instanceof SpecifyError) fail(error.message);
  throw error;
}
