#!/usr/bin/env node
/**
 * Prototype d'une fonctionnalité (/speckit-prototype), pages HTML dans specs/NNN-<nom>/prototypes/,
 * à lancer à la racine du dépôt :
 *   prototype specs/004-checkout             → compile styles.css depuis le thème (ui.theme)
 *   prototype specs/004-checkout --capture   → puis remplace captures/ (desktop et mobile)
 * Affiche l'URL de index.html, à ouvrir dans le navigateur : aucun serveur.
 * Tailwind (`@tailwindcss/cli`) et Playwright sont pris dans le projet s'il les a, sinon dans ce
 * paquet : la maquette compile avec la même version que l'app, et les captures trouvent le Chromium
 * déjà installé pour les parcours.
 */
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  VIEWPORTS,
  captureTargets,
  capturesViewportOnly,
  entryCss,
  linkProblems,
  localUrls,
  packageImports,
  pageFiles,
  prototypesDir,
} from './core.mts';
import { binOf, themeOf } from './stack.mts';

const STACK_FILE = join('.specify', 'stack.yml');
const USAGE = 'Usage : prototype <specs/NNN-nom> [--capture] [--theme <fichier css>]';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}
const themeAt = args.indexOf('--theme');
const themeArg = themeAt >= 0 ? args.splice(themeAt, 2)[1] : undefined;
if (themeAt >= 0 && (!themeArg || themeArg.startsWith('--'))) {
  console.error(`--theme attend le fichier de thème du projet.\n${USAGE}`);
  process.exit(1);
}
const capture = args.includes('--capture');
const unknownOption = args.find((arg) => arg.startsWith('--') && arg !== '--capture');
if (unknownOption) {
  console.error(`Option inconnue : ${unknownOption}\n${USAGE}`);
  process.exit(1);
}
const featurePath = args.find((arg) => !arg.startsWith('--')) ?? '';

let THEME: string;
try {
  THEME = themeArg ?? themeOf(existsSync(STACK_FILE) ? readFileSync(STACK_FILE, 'utf8') : undefined);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
if (!existsSync(THEME)) {
  console.error(`Thème introuvable : ${THEME}.`);
  process.exit(1);
}

// Un paquet du projet d'abord, sinon celui de ce paquet.
const fromProject = createRequire(resolve('package.json'));
const fromHere = createRequire(import.meta.url);
function resolvePackage(specifier: string): string {
  try {
    return fromProject.resolve(specifier);
  } catch {
    return fromHere.resolve(specifier);
  }
}

let dir: string;
let pages: string[];
try {
  dir = prototypesDir(featurePath);
  pages = pageFiles(readdirSync(dir));
} catch (error) {
  const message =
    (error as NodeJS.ErrnoException).code === 'ENOENT'
      ? `${featurePath} n'a pas de dossier prototypes/.`
      : (error as Error).message;
  console.error(`${USAGE}\n${message}`);
  process.exit(1);
}

const html = Object.fromEntries(pages.map((page) => [page, readFileSync(join(dir, page), 'utf8')]));
const { dead, orphans } = linkProblems(html);
if (orphans.length > 0) {
  console.warn(`Pages vers lesquelles aucune autre ne mène : ${orphans.join(', ')}`);
}
if (dead.length > 0) {
  console.error(`Liens vers des pages absentes :\n  ${dead.join('\n  ')}`);
  process.exit(1);
}

// L'entrée vit à côté des pages, le temps de la compilation : `@source './*.html'` les vise.
const entry = join(dir, '.styles.entry.css');
writeFileSync(entry, entryCss(relative(dir, THEME)));
try {
  const cliPackage = resolvePackage('@tailwindcss/cli/package.json');
  const bin = binOf(JSON.parse(readFileSync(cliPackage, 'utf8')), 'tailwindcss');
  if (!bin) throw new Error(`${cliPackage} ne déclare pas le binaire tailwindcss.`);
  execFileSync(
    process.execPath,
    [join(dirname(cliPackage), bin), '-i', entry, '-o', join(dir, 'styles.css'), '--minify'],
    { stdio: 'inherit' },
  );
} finally {
  rmSync(entry, { force: true });
}

// Les fichiers d'un paquet importé par le thème (polices @fontsource) restent visés en relatif
// (`url(./files/…)`) : on les copie à côté de styles.css, sinon la page retombe sur une autre police.
const requireFromTheme = createRequire(resolve(THEME));
const packageDirs = packageImports(readFileSync(THEME, 'utf8')).flatMap((name) => {
  try {
    return [dirname(requireFromTheme.resolve(name))];
  } catch {
    return [];
  }
});
for (const url of localUrls(readFileSync(join(dir, 'styles.css'), 'utf8'))) {
  const source = packageDirs
    .map((packageDir) => join(packageDir, url))
    .find((path) => existsSync(path));
  if (source) {
    mkdirSync(dirname(join(dir, url)), { recursive: true });
    copyFileSync(source, join(dir, url));
  }
}

// Playwright du projet (`playwright` ou `@playwright/test`), sinon celui de ce paquet.
type Chromium = (typeof import('playwright'))['chromium'];
// Un module CommonJS importé expose ses exports sous `default` quand Node ne les devine pas.
const chromiumOf = (module: { chromium?: Chromium; default?: { chromium?: Chromium } }) =>
  module.chromium ?? module.default?.chromium;
async function loadChromium(): Promise<Chromium> {
  for (const specifier of ['playwright', '@playwright/test']) {
    let path: string;
    try {
      path = fromProject.resolve(specifier);
    } catch {
      continue; // pas dans le projet : on essaie le suivant
    }
    const chromium = chromiumOf(await import(pathToFileURL(path).href));
    if (chromium) return chromium;
  }
  const chromium = chromiumOf(await import('playwright'));
  if (!chromium) throw new Error('Playwright introuvable.');
  return chromium;
}

if (capture) {
  let browser;
  try {
    browser = await (await loadChromium()).launch();
  } catch (error) {
    const missing = /Executable doesn't exist/.test((error as Error).message);
    console.error(
      missing ? 'Chromium manquant : npx playwright install chromium' : (error as Error).message,
    );
    process.exit(1);
  }
  // Les captures s'écrivent à part, puis remplacent les anciennes d'un coup : un échec garde les
  // anciennes, et celles d'une page retirée ne survivent pas.
  const captures = join(dir, 'captures');
  const fresh = join(dir, '.captures.tmp');
  rmSync(fresh, { recursive: true, force: true });
  mkdirSync(fresh);
  try {
    for (const target of captureTargets(pages)) {
      const page = await browser.newPage({ viewport: VIEWPORTS[target.viewport] });
      await page.goto(pathToFileURL(resolve(dir, target.page)).href);
      await page.screenshot({
        path: join(fresh, basename(target.file)),
        fullPage: !capturesViewportOnly(html[target.page]),
      });
      await page.close();
    }
    rmSync(captures, { recursive: true, force: true });
    renameSync(fresh, captures);
  } finally {
    rmSync(fresh, { recursive: true, force: true });
    await browser.close();
  }
  console.log(`${pages.length * Object.keys(VIEWPORTS).length} captures dans ${captures}/`);
}

console.log(pathToFileURL(resolve(dir, 'index.html')).href);
