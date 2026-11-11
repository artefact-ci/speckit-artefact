import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * La CLI de bout en bout, sur un dépôt git jetable fait de test/fixture/. Les sorties de
 * test/golden/ ont été produites par l'outil d'origine (tools/dev/spec-trace.mts du boilerplate,
 * b30bb7b ; all.txt par celui d'Afri Café, 874c6a4, qui ajoute la priorité des epics) sur ce même
 * dépôt : elles verrouillent le « même résultat ».
 */
const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, 'cli.mts');
const golden = (name: string) => readFileSync(join(here, '..', 'test', 'golden', name), 'utf8');

let repo: string;
const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
const write = (path: string, content: string) => {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), content);
};
function trace(...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const run = spawnSync(process.execPath, [CLI, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_ACTIONS: '' },
  });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'spec-trace-'));
  cpSync(join(here, '..', 'test', 'fixture'), repo, { recursive: true });
  git('init', '-q');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init');
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe('spec-trace, same output as the boilerplate tool', () => {
  it('traces every spec, requirements and epics', () => {
    const { status, stdout } = trace();
    assert.equal(stdout, golden('all.txt'));
    assert.equal(status, 1);
  });

  it('checks one spec in strict mode', () => {
    const { status, stdout } = trace('specs/002-draft');
    assert.equal(stdout, golden('strict-002-draft.txt'));
    assert.equal(status, 1);
  });

  it('asks for a git ref after --base', () => {
    const { status, stderr } = trace('--base');
    assert.equal(stderr, golden('base-without-ref.txt'));
    assert.equal(status, 1);
  });
});

describe('spec-trace, test files', () => {
  it('finds the tests of a dot directory with the default patterns', () => {
    write('.storybook/note.spec.ts', "it('001-US1-AS3: w', () => {});\n");
    assert.match(trace().stdout, /\| 001-US1-AS3 \| \.storybook\/note\.spec\.ts \|/);
  });

  it('reads tests.globs from stack.yml, braces and ./ included', () => {
    write('.specify/stack.yml', "tests:\n  globs: ['./src/**/*.{spec,test}.ts']\n");
    write('src/deep/note.test.ts', "it('001-US1-AS3: w', () => {});\n");
    const { stdout } = trace();
    assert.match(stdout, /\| 001-US1-AS3 \| src\/deep\/note\.test\.ts \|/);
    // journey.spec.tsx n'est plus un fichier de tests : le parcours n'a plus de test.
    assert.match(stdout, /\| E01-J1 Leave a note \| \*\*aucun\*\* \|/);
  });

  it('lets --tests replace stack.yml', () => {
    write('.specify/stack.yml', "tests:\n  globs: ['nothing/**']\n");
    const { stdout } = trace('--tests', '**/*.spec.ts', '--tests', '**/*.spec.tsx');
    assert.equal(stdout, golden('all.txt'));
  });

  it('stops on a stack.yml whose tests are not an object', () => {
    write('.specify/stack.yml', "tests: ['src/**']\n");
    const { status, stderr } = trace();
    assert.match(stderr, /^\.specify\/stack\.yml : tests doit être un objet/);
    assert.equal(status, 1);
  });

  it('stops on an unclosed brace', () => {
    const { status, stderr } = trace('--tests', 'src/*.{spec,test.ts');
    assert.match(stderr, /Accolade non fermée/);
    assert.equal(status, 1);
  });

  it('refuses an unknown option and --tests without a pattern', () => {
    assert.match(trace('--nope').stderr, /Option inconnue : --nope/);
    assert.match(trace('--tests').stderr, /--tests attend un motif/);
    assert.equal(trace('--help').status, 0);
  });
});

describe('spec-trace, drift', () => {
  it('warns about changed tests, matched by the same patterns as the matrix', () => {
    write('.specify/stack.yml', "tests:\n  globs: ['**/*.{spec,test}.ts', '.storybook/**/*.ts']\n");
    write('.storybook/a.ts', "it('001-US1-AS3: w', () => {});\n");
    git('add', '-A');
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'storybook');
    write('src/note.spec.ts', "it('001-US1-AS1: z renamed', () => {});\n");
    write('.storybook/a.ts', "it('001-US1-AS3: w renamed', () => {});\n");
    const { stdout } = trace('--base', 'HEAD');
    assert.match(stdout, /\| 001-US1-AS3 \| \.storybook\/a\.ts \|/);
    assert.match(stdout, /## Avertissements/);
    assert.match(stdout, /\(\.storybook\/a\.ts, src\/note\.spec\.ts\)/);
  });

  it('says nothing when the spec changed too', () => {
    write('src/note.spec.ts', "it('001-US1-AS1: z renamed', () => {});\n");
    write('specs/001-note/spec.md', `${readFileSync(join(repo, 'specs/001-note/spec.md'), 'utf8')}\n`);
    assert.doesNotMatch(trace('--base', 'HEAD').stdout, /Avertissements/);
  });
});
