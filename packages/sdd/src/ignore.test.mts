import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { unhideSpecify } from './ignore.mts';

describe('unhideSpecify', () => {
  it('writes the two rules in an empty file', () => {
    const out = unhideSpecify('');
    assert.match(out, /^# .*\n!\.specify\/\n!\.specify\/\*\*\n$/);
  });

  it('keeps the existing rules and appends after them', () => {
    const out = unhideSpecify('dist/\n');
    assert.ok(out.startsWith('dist/\n\n# '));
    assert.ok(out.endsWith('!.specify/\n!.specify/**\n'));
  });

  it('adds a missing newline before appending', () => {
    assert.ok(unhideSpecify('dist/').startsWith('dist/\n\n# '));
  });

  it('is idempotent, and adds only the missing rule', () => {
    const once = unhideSpecify('dist/\n');
    assert.equal(unhideSpecify(once), once);
    const partial = unhideSpecify('!.specify/\n');
    assert.equal(partial.match(/^!\.specify\/$/gm)?.length, 1);
    assert.match(partial, /^!\.specify\/\*\*$/m);
  });
});
