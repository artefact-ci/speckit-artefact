import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * La CLI de bout en bout sur un projet jetable : Tailwind compile pour de vrai. Le projet n'a que
 * `tailwindcss` (ce que son thème importe) : le CLI Tailwind et Playwright viennent donc de ce
 * paquet, le repli le moins évident.
 */
const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, 'cli.mts');
const OWN_MODULES = join(here, '..', 'node_modules');

let project: string;
const write = (path: string, content: string) => {
  mkdirSync(dirname(join(project, path)), { recursive: true });
  writeFileSync(join(project, path), content);
};
function prototype(...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const run = spawnSync(process.execPath, [CLI, ...args], { cwd: project, encoding: 'utf8' });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), 'prototype-'));
  write('package.json', '{ "name": "fixture", "private": true }\n');
  mkdirSync(join(project, 'node_modules'));
  symlinkSync(join(OWN_MODULES, 'tailwindcss'), join(project, 'node_modules', 'tailwindcss'));
  write('.specify/stack.yml', 'ui:\n  theme: src/theme.css\n');
  write('src/theme.css', "@import 'tailwindcss';\n@theme { --color-brand: oklch(0.6 0.2 30); }\n");
  write(
    'specs/004-checkout/prototypes/index.html',
    '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head>' +
      '<body><a class="bg-brand p-4" href="cart.html">Panier</a></body></html>\n',
  );
  write(
    'specs/004-checkout/prototypes/cart.html',
    '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head>' +
      '<body data-capture="viewport"><a href="index.html">Retour</a></body></html>\n',
  );
});
afterEach(() => rmSync(project, { recursive: true, force: true }));

describe('prototype', () => {
  it('compiles styles.css from the theme and the classes of the pages', () => {
    const { status, stdout, stderr } = prototype('specs/004-checkout');
    assert.equal(status, 0, stderr);
    const css = readFileSync(join(project, 'specs/004-checkout/prototypes/styles.css'), 'utf8');
    assert.match(css, /\.bg-brand\{/);
    assert.match(stdout, /^file:\/\/.*\/specs\/004-checkout\/prototypes\/index\.html$/m);
    assert.equal(existsSync(join(project, 'specs/004-checkout/prototypes/.styles.entry.css')), false);
  });

  it('takes --theme over ui.theme', () => {
    write('.specify/stack.yml', 'ui:\n  theme: missing.css\n');
    assert.equal(prototype('specs/004-checkout', '--theme', 'src/theme.css').status, 0);
    assert.match(prototype('specs/004-checkout').stderr, /Thème introuvable : missing\.css/);
  });

  it('fails on a dead link, before compiling', () => {
    write('specs/004-checkout/prototypes/cart.html', '<a href="gone.html">x</a>\n');
    const { status, stderr } = prototype('specs/004-checkout');
    assert.equal(status, 1);
    assert.match(stderr, /cart\.html → gone\.html/);
    assert.equal(existsSync(join(project, 'specs/004-checkout/prototypes/styles.css')), false);
  });

  it('shows the usage first when the feature is missing, stack.yml or not', () => {
    rmSync(join(project, '.specify'), { recursive: true });
    const { status, stderr } = prototype();
    assert.equal(status, 1);
    assert.match(stderr, /^Usage : prototype/);
  });

  it('says what to install when the theme imports a package the project lacks', () => {
    write('src/theme.css', "@import 'tailwindcss';\n@import 'not-installed-anywhere';\n");
    const { status, stderr } = prototype('specs/004-checkout');
    assert.equal(status, 1);
    assert.match(stderr, /doivent être installés dans le projet/);
    assert.doesNotMatch(stderr, /at execFileSync/);
  });

  it('captures each page in both formats', (t) => {
    const { status, stderr } = prototype('specs/004-checkout', '--capture');
    if (status !== 0 && /Chromium manquant/.test(stderr) && !process.env['CI']) {
      t.skip(`Chromium absent en local : ${stderr.trim()}`);
      return;
    }
    assert.equal(status, 0, stderr);
    assert.deepEqual(readdirSync(join(project, 'specs/004-checkout/prototypes/captures')).sort(), [
      'cart-desktop.png',
      'cart-mobile.png',
      'index-desktop.png',
      'index-mobile.png',
    ]);
  });
});
