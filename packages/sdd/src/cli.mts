#!/usr/bin/env node
/**
 * Installe la méthode Artefact CI dans le dépôt courant (Spec Kit, preset artefact-sdd,
 * extension artefact-product, agents de relecture, stack.yml, constitution).
 *   artefact-sdd init [--integration <outil>]
 *   artefact-sdd update
 * Sans --source, l'installeur installe la release GitHub de sa propre version.
 *   artefact-sdd init|update --source <clone de speckit-artefact>
 * Avec --source, il installe en --dev depuis ce clone (développement de la méthode).
 * init est idempotent ; update réinstalle les composants sans toucher stack.yml ni la constitution.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sddArgs, type SddArgs, USAGE } from './args.mts';
import { init, SetupError, update } from './install.mts';
import { formatReport } from './report.mts';
import { devSource, releaseSource } from './source.mts';
import { run, SpecifyError } from './specify.mts';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

let args: SddArgs;
try {
  args = sddArgs(process.argv.slice(2));
} catch (error) {
  fail(`${(error as Error).message}\n${USAGE}`);
}
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}
const { command, source, integration } = args;
if (command === 'update' && integration !== undefined) {
  console.error("Avertissement : --integration est ignoré par update, l'intégration du projet est gardée.");
}
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

try {
  const options = {
    root: process.cwd(),
    source: source ? devSource(resolve(source)) : releaseSource(pkg.version),
    toolsVersion: pkg.version,
    runner: run,
    ...(command === 'init' && integration !== undefined ? { integration } : {}),
  };
  const report = command === 'init' ? await init(options) : await update(options);
  process.stdout.write(formatReport(report));
} catch (error) {
  if (error instanceof SetupError || error instanceof SpecifyError) fail(error.message);
  throw error;
}
