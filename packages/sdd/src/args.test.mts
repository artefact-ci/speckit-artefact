import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sddArgs } from './args.mts';

describe('sddArgs', () => {
  it('reads the command, --source and --integration, in both forms', () => {
    assert.deepEqual(sddArgs(['init']), { help: false, command: 'init', source: undefined, integration: undefined });
    assert.deepEqual(sddArgs(['update', '--source=../clone']), {
      help: false,
      command: 'update',
      source: '../clone',
      integration: undefined,
    });
    assert.deepEqual(sddArgs(['--integration', 'agy', 'init']), {
      help: false,
      command: 'init',
      source: undefined,
      integration: 'agy',
    });
  });

  it('prints the help without a command, or whatever the command', () => {
    assert.deepEqual(sddArgs(['-h']), { help: true });
    assert.deepEqual(sddArgs(['install', '--help']), { help: true });
  });

  it('refuses a missing, unknown or extra command', () => {
    assert.throws(() => sddArgs([]), /^Error: Commande manquante : init ou update\.$/);
    assert.throws(() => sddArgs(['install']), /^Error: Commande inconnue : install$/);
    assert.throws(() => sddArgs(['init', 'a', 'b']), /^Error: Argument en trop : a b$/);
  });

  it('refuses an unknown option, long or short', () => {
    assert.throws(() => sddArgs(['init', '--sauce', 'x']), /^Error: Option inconnue : --sauce$/);
    assert.throws(() => sddArgs(['init', '-x']), /^Error: Option inconnue : -x$/);
    assert.throws(() => sddArgs(['init', '--help=yes']), /^Error: --help ne prend pas de valeur\.$/);
  });

  it('asks for a value after --source and --integration', () => {
    for (const args of [['init', '--source'], ['init', '--source', '--integration', 'agy'], ['init', '--source=']]) {
      assert.throws(() => sddArgs(args), /^Error: --source attend le dossier d'un clone de speckit-artefact\.$/);
    }
    for (const args of [['init', '--integration'], ['init', '--integration=']]) {
      assert.throws(() => sddArgs(args), /^Error: --integration attend le nom de l'outil \(ex\. agy, opencode\)\.$/);
    }
  });
});
