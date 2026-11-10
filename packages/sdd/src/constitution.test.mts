import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { baseConstitution, isBlankConstitution } from './constitution.mts';

const read = (u: URL) => readFileSync(u, 'utf8');
const blank = read(new URL('../test/fixture/constitution-blank.md', import.meta.url));
const template = read(new URL('../../../preset/templates/constitution-template.md', import.meta.url));

describe('constitution', () => {
  it('the core template is blank', () => {
    assert.equal(isBlankConstitution(blank), true);
  });

  it('a filled constitution is not blank', () => {
    assert.equal(isBlankConstitution(baseConstitution(template, 'demo')), false);
    assert.equal(isBlankConstitution('# Demo\n\nPrinciples written by hand.'), false);
  });

  it('baseConstitution keeps the other markers', () => {
    const out = baseConstitution('# [PROJECT_NAME] and [PROJECT_NAME]\n[PRINCIPLE_1_NAME]', 'demo');
    assert.equal(out, '# demo and demo\n[PRINCIPLE_1_NAME]');
  });
});
