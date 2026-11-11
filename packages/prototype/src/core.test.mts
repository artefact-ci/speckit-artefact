import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  captureTargets,
  capturesViewportOnly,
  entryCss,
  linkProblems,
  localUrls,
  packageImports,
  pageFiles,
  prototypeArgs,
} from './core.mts';

describe('prototypeArgs', () => {
  it('reads the capture flag; the prototype is global, in specs/prototype', () => {
    assert.deepEqual(prototypeArgs([]), { capture: false });
    assert.deepEqual(prototypeArgs(['--capture']), { capture: true });
  });

  it('refuses a folder, from the time each feature had its own prototype', () => {
    for (const args of [['specs/004-checkout'], ['specs/004-checkout/prototypes', '--capture']]) {
      assert.throws(() => prototypeArgs(args), /specs\/prototype/);
    }
  });

  it('refuses an unknown option', () => {
    assert.throws(() => prototypeArgs(['--watch']), /--watch/);
  });
});

describe('entryCss', () => {
  it('imports the real theme and scans the pages of the prototype', () => {
    assert.equal(
      entryCss('../../../libs/web/ui/src/lib/styles/theme.css'),
      "@import '../../../libs/web/ui/src/lib/styles/theme.css';\n@source './*.html';\n",
    );
  });
});

describe('pageFiles', () => {
  it('keeps the HTML pages, index.html first, then in alphabetical order', () => {
    assert.deepEqual(pageFiles(['pay.html', 'styles.css', 'index.html', 'captures', 'cart.html']), [
      'index.html',
      'cart.html',
      'pay.html',
    ]);
  });

  it('refuses a prototype without pages or without index.html', () => {
    assert.throws(() => pageFiles(['styles.css']), /index\.html/);
    assert.throws(() => pageFiles(['cart.html']), /index\.html/);
  });
});

describe('captureTargets', () => {
  it('captures every page on desktop then on mobile, named after the page', () => {
    const targets = captureTargets(['index.html', 'cart.html']);
    assert.equal(targets.length, 4);
    assert.deepEqual(targets[0], {
      page: 'index.html',
      viewport: 'desktop',
      file: 'captures/index-desktop.png',
    });
    assert.deepEqual(targets[3], {
      page: 'cart.html',
      viewport: 'mobile',
      file: 'captures/cart-mobile.png',
    });
  });
});

describe('packageImports', () => {
  it('lists the packages the theme imports, not its relative imports', () => {
    const theme =
      "@import 'tailwindcss';\n@import \"@fontsource-variable/inter\";\n@import './local.css';\n";
    assert.deepEqual(packageImports(theme), ['tailwindcss', '@fontsource-variable/inter']);
  });
});

describe('localUrls', () => {
  it('lists once each local file the compiled stylesheet points to', () => {
    const css =
      "@font-face{src:url(./files/inter-latin.woff2) format('woff2')}" +
      '@font-face{src:url("./files/inter-greek.woff2")}' +
      '.a{background:url(./files/inter-latin.woff2)}.b{background:url(https://cdn.test/x.png)}.c{background:url(data:image/png;base64,AA)}';
    assert.deepEqual(localUrls(css), ['./files/inter-latin.woff2', './files/inter-greek.woff2']);
  });
});

describe('linkProblems', () => {
  it('finds the links to a page that does not exist, and the pages no other page links to', () => {
    const pages = {
      'index.html':
        '<a href="cart.html">Cart</a> <a href="#top">Top</a> <a href="https://acme.test">Site</a>',
      'cart.html':
        '<a href="pay.html?step=1#form">Pay</a> <a href="index.html">Back</a> <a href="gone.html">Gone</a>',
      'pay.html': '<a href="cart.html">Back</a>',
      'lost.html': '<a href="index.html">Home</a>',
    };
    assert.deepEqual(linkProblems(pages), {
      dead: ['cart.html → gone.html'],
      orphans: ['lost.html'],
    });
  });

  it('reads a link written ./page.html like page.html', () => {
    const pages = {
      'index.html': '<a href="./cart.html">Cart</a> <a href="./gone.html">Gone</a>',
      'cart.html': '',
    };
    assert.deepEqual(linkProblems(pages), { dead: ['index.html → gone.html'], orphans: [] });
  });
});

describe('capturesViewportOnly', () => {
  it('captures only the window of a page marked data-capture="viewport" (open dialog, toast)', () => {
    assert.equal(capturesViewportOnly('<html lang="fr" data-capture="viewport">'), true);
    assert.equal(capturesViewportOnly('<html lang="fr">'), false);
  });
});
