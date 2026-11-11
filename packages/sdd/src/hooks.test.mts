import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';
import { applyGitHooks } from './hooks.mts';

type Hook = { extension: string; command: string };
type Doc = { installed: string[]; settings: Record<string, unknown>; hooks: Record<string, Hook[]> };

const fresh = readFileSync(new URL('../test/fixture/extensions-18.yml', import.meta.url), 'utf8');

test('keeps only the 10 hooks of the boilerplate', () => {
  assert.equal(fresh.match(/extension: git/g)?.length, 18);
  const doc = parse(applyGitHooks(fresh)) as Doc;
  assert.deepEqual(doc.installed, ['git']);
  assert.equal(doc.settings['auto_execute_hooks'], true);
  assert.deepEqual(Object.keys(doc.hooks), [
    'before_specify',
    'after_specify',
    'after_clarify',
    'after_plan',
    'after_tasks',
    'after_checklist',
    'after_analyze',
    'after_implement',
    'after_converge',
    'after_constitution',
  ]);
  assert.equal(doc.hooks['before_specify']?.[0]?.command, 'speckit.git.feature');
  for (const [event, hooks] of Object.entries(doc.hooks)) {
    assert.equal(hooks.length, 1, event);
    if (event !== 'before_specify') assert.equal(hooks[0]?.command, 'speckit.git.commit', event);
  }
  assert.deepEqual(doc.hooks['after_analyze']?.[0], {
    extension: 'git',
    command: 'speckit.git.commit',
    enabled: true,
    optional: false,
    priority: 10,
    prompt: 'Commit analysis corrections?',
    description: 'Auto-commit the corrections made after the analysis',
    condition: null,
  });
});

test('before_constitution and after_taskstoissues are gone', () => {
  assert.match(fresh, /before_constitution:/);
  const out = applyGitHooks(fresh);
  assert.doesNotMatch(out, /before_constitution|after_taskstoissues|speckit\.git\.initialize/);
});

test('is idempotent', () => {
  const once = applyGitHooks(fresh);
  assert.equal(applyGitHooks(once), once);
});

test('adds the header comment above hooks, once', () => {
  const out = applyGitHooks(fresh);
  assert.match(out, /# Wired on purpose[\s\S]*`npx @artefact-ci\/sdd update` reapplies them\.\nhooks:/);
  assert.equal(out.match(/Wired on purpose/g)?.length, 1);
});

const other = `# my project extensions
installed:
- git
- other
settings:
  auto_execute_hooks: false
hooks:
  after_plan:
  # keep me
  - extension: other
    command: speckit.other.plan
    enabled: true
  after_implement:
  - extension: git
    command: speckit.git.commit
    enabled: true
  before_tasks:
  - extension: other
    command: speckit.other.tasks
    enabled: true
`;

test('keeps hooks of other extensions and comments', () => {
  const out = applyGitHooks(other);
  const doc = parse(out) as Doc;
  assert.deepEqual(doc.installed, ['git', 'other']);
  assert.equal(doc.settings['auto_execute_hooks'], true);
  assert.match(out, /^# my project extensions/);
  assert.match(out, /# keep me/);
  assert.deepEqual(doc.hooks['before_tasks']?.map((h) => h.extension), ['other']);
  // Within an event holding both, the non-git entries stay first as they were, then the git one.
  assert.deepEqual(
    doc.hooks['after_plan']?.map((h) => `${h.extension}:${h.command}`),
    ['other:speckit.other.plan', 'git:speckit.git.commit'],
  );
  assert.deepEqual(doc.hooks['after_implement']?.map((h) => h.extension), ['git']);
  assert.equal(applyGitHooks(out), out);
});

test('input without hooks: gets the header once and is idempotent', () => {
  const out = applyGitHooks('installed:\n- git\n');
  assert.equal(out.match(/Wired on purpose/g)?.length, 1);
  assert.match(out, /reapplies them\.\nhooks:/);
  assert.equal(applyGitHooks(out), out);
});

test('empty or whitespace-only input is an empty document', () => {
  for (const input of ['', '  \n\n']) {
    const out = applyGitHooks(input);
    const doc = parse(out) as Doc;
    assert.equal(doc.settings['auto_execute_hooks'], true);
    assert.equal(Object.keys(doc.hooks).length, 10);
    assert.equal(out.match(/Wired on purpose/g)?.length, 1);
    assert.equal(applyGitHooks(out), out);
  }
});

test('throws on invalid YAML', () => {
  assert.throws(() => applyGitHooks('a: [unclosed\n'));
});
