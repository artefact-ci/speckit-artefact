/**
 * Prototype du produit (/speckit-prototype) : un seul, global, que chaque fonctionnalité complète.
 * Pages HTML statiques à plat dans specs/prototype/, index.html en entrée (par epic et parcours),
 * parcours de chaque fonctionnalité dans journeys/NNN-<nom>.md, styles.css compilé depuis le vrai
 * thème du projet (`ui.theme` de .specify/stack.yml), captures par page et par format dans
 * captures/. Logique pure ; les fichiers, la compilation et les captures sont dans cli.mts.
 */

/** Formats des captures : un écran de bureau courant et un téléphone courant. */
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

export type Viewport = keyof typeof VIEWPORTS;

/** Arguments de `pnpm prototype` : `--capture` seulement, le prototype n'a qu'un dossier. */
/** Dossier du prototype global. */
export const PROTOTYPE_DIR = 'specs/prototype';

/** Arguments hors `--theme` : `--capture` seulement, le prototype n'a qu'un dossier. */
export function prototypeArgs(args: string[]): { capture: boolean } {
  for (const arg of args) {
    if (arg === '--capture') continue;
    throw new Error(
      arg.startsWith('--')
        ? `Option inconnue : ${arg}.`
        : `« ${arg} » : le prototype est global, dans ${PROTOTYPE_DIR}/ ; la commande ne prend plus de dossier.`,
    );
  }
  return { capture: args.includes('--capture') };
}

/** Feuille d'entrée de Tailwind : le thème de l'app, et les classes des pages du prototype. */
export function entryCss(themeRelativePath: string): string {
  return `@import '${themeRelativePath}';\n@source './*.html';\n`;
}

/** Pages du prototype parmi les fichiers de son dossier : index.html d'abord, puis par nom. */
export function pageFiles(names: string[]): string[] {
  if (!names.includes('index.html')) {
    throw new Error("Le prototype n'a pas de page index.html, son point d'entrée.");
  }
  const others = names.filter((name) => name.endsWith('.html') && name !== 'index.html').sort();
  return ['index.html', ...others];
}

/** Une capture par page et par format, nommée d'après la page : captures/cart-mobile.png. */
export function captureTargets(
  pages: string[],
): { page: string; viewport: Viewport; file: string }[] {
  return pages.flatMap((page) =>
    (Object.keys(VIEWPORTS) as Viewport[]).map((viewport) => ({
      page,
      viewport,
      file: `captures/${page.replace(/\.html$/, '')}-${viewport}.png`,
    })),
  );
}

/** Paquets importés par le thème (`@import '@fontsource-variable/inter'`), sans les imports relatifs. */
export function packageImports(themeCss: string): string[] {
  return [...themeCss.matchAll(/@import\s+['"]([^'"]+)['"]/g)]
    .map((match) => match[1])
    .filter((path) => !path.startsWith('.') && !path.startsWith('/'));
}

/**
 * Fichiers locaux visés par la feuille compilée (`url(./files/inter-latin.woff2)`). Tailwind laisse
 * ces chemins relatifs au paquet importé : ils sont à copier à côté de styles.css.
 */
export function localUrls(css: string): string[] {
  const urls = [...css.matchAll(/url\(\s*['"]?(\.\/[^'")]+)['"]?\s*\)/g)].map((match) => match[1]);
  return [...new Set(urls)];
}

/**
 * Liens entre les pages : `dead`, un lien vers une page absente (`cart.html → gone.html`) ;
 * `orphans`, une page vers laquelle aucune autre ne mène (index.html est l'entrée, jamais orpheline).
 * Ancres, URL externes et liens vers autre chose qu'une page HTML sont ignorés.
 */
export function linkProblems(pages: Record<string, string>): { dead: string[]; orphans: string[] } {
  const dead: string[] = [];
  const linked = new Set<string>();
  for (const [page, html] of Object.entries(pages)) {
    for (const match of html.matchAll(/href\s*=\s*['"]([^'"]+)['"]/g)) {
      const target = match[1].split(/[?#]/)[0].replace(/^\.\//, '');
      if (!/^[\w.-]+\.html$/.test(target)) continue;
      if (target in pages) {
        if (target !== page) linked.add(target);
      } else {
        dead.push(`${page} → ${target}`);
      }
    }
  }
  const orphans = Object.keys(pages).filter((page) => page !== 'index.html' && !linked.has(page));
  return { dead, orphans };
}

/** Une page marquée `data-capture="viewport"` (dialogue ouvert, toast) se capture sans défiler. */
export function capturesViewportOnly(html: string): boolean {
  return /data-capture\s*=\s*['"]viewport['"]/.test(html);
}
