import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse } from 'yaml';
import { deduceStack, defaultExamplesDir } from './stack.mts';

const repo = (name: string): string => fileURLToPath(new URL(`../test/fixture/repos/${name}/`, import.meta.url));
const opts = { examplesDir: defaultExamplesDir(), toolsVersion: '0.1.0', branches: ['dev', 'main', 'feat/x'] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Stack = any;
const load = (yaml: string): Stack => parse(yaml) as Stack;

const copy = (name: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'sdd-stack-'));
  cpSync(repo(name), dir, { recursive: true });
  return dir;
};

test('nx repo', () => {
  const d = deduceStack(repo('nx'), opts);
  const s = load(d.yaml);
  assert.equal(d.kind, 'nx');
  assert.equal(s.commands.affected, 'pnpm nx affected -t lint typecheck test');
  assert.equal(s.commands.test, 'pnpm nx test {project}');
  assert.equal(s.commands.check, 'pnpm check');
  assert.equal(s.commands.trace, 'pnpm dlx @artefact-ci/spec-trace@0.1.0');
  assert.equal(s.ui.storybook, true);
  assert.equal(s.ui.theme, 'libs/web/ui/src/lib/styles/theme.css');
  assert.equal(s.ui.prototype, 'pnpm dlx @artefact-ci/prototype@0.1.0');
  assert.deepEqual(s.shared, ['libs/shared/contracts']);
  assert.equal(s.e2e.dir, 'apps/web-e2e');
  assert.deepEqual(s.branches, { base: 'dev', production: 'main' });
  assert.deepEqual(s.docs, ['AGENTS.md']);
  assert.ok(d.guessed.includes('e2e'));
  assert.equal(s.ui.components, 'libs/web/ui');
});

test('bun-hono repo', () => {
  const d = deduceStack(repo('bun-hono'), opts);
  const s = load(d.yaml);
  assert.equal(d.kind, 'bun-hono');
  assert.equal(s.commands.test, 'bun test {file}');
  assert.equal(s.commands.affected, 'bun run lint && bun run typecheck && bun run test');
  assert.equal(s.commands.check, 'bun run check');
  assert.equal(s.ui, null);
  assert.equal(s.e2e, null);
  assert.equal(s.commands.trace, 'bunx @artefact-ci/spec-trace@0.1.0');
  assert.ok(d.guessed.includes('ui') && d.guessed.includes('e2e'));
  assert.deepEqual(d.empty, []);
});

test('nextjs repo without theme', () => {
  const d = deduceStack(repo('nextjs'), opts);
  const s = load(d.yaml);
  assert.equal(d.kind, 'nextjs');
  assert.ok(d.empty.includes('ui.theme'));
  assert.ok(d.empty.includes('commands.check'));
  assert.match(d.yaml, /theme: +# à compléter/);
  assert.equal(s.ui.theme, null);
  assert.equal(s.ui.components, 'src/components/ui');
  assert.equal(s.commands.test, 'pnpm test {file}');
  assert.equal(s.commands.affected, 'pnpm lint && pnpm typecheck && pnpm test');
  assert.equal(s.e2e, null);
});

test('nextjs repo with theme and npm runner', () => {
  const dir = copy('nextjs');
  mkdirSync(join(dir, 'src/app'), { recursive: true });
  writeFileSync(join(dir, 'src/app/globals.css'), ':root {}\n');
  rmSync(join(dir, 'pnpm-lock.yaml'));
  writeFileSync(join(dir, 'package-lock.json'), '{}\n');
  const d = deduceStack(dir, { ...opts, branches: ['feat/x'] });
  const s = load(d.yaml);
  assert.equal(s.ui.theme, 'src/app/globals.css');
  assert.ok(!d.empty.includes('ui.theme'));
  assert.equal(s.commands.test, 'npm run test -- {file}');
  assert.equal(s.commands.trace, 'npx -y @artefact-ci/spec-trace@0.1.0');
  assert.deepEqual(s.branches, { base: 'feat/x' });
});

test('unknown repo without package.json', () => {
  const d = deduceStack(repo('unknown'), opts);
  const s = load(d.yaml);
  assert.equal(d.kind, 'unknown');
  assert.ok(d.empty.includes('commands.test') && d.empty.includes('commands.affected'));
  assert.match(d.yaml, /test: +# à compléter/);
  assert.equal(s.commands.test, null);
  assert.equal(s.ui, null);
});

test('nx wins over next.config', () => {
  const dir = copy('nx');
  writeFileSync(join(dir, 'next.config.mjs'), 'export default {};\n');
  assert.equal(deduceStack(dir, opts).kind, 'nx');
});

test('the header names the version and the output parses', () => {
  const d = deduceStack(repo('nx'), opts);
  assert.ok(d.yaml.startsWith('# Déduit par @artefact-ci/sdd 0.1.0 : relis chaque clé (voir docs/stack.md).\n'));
  assert.equal(load(d.yaml).version, 1);
});

test('the output is deterministic and sorted', () => {
  for (const name of ['nx', 'bun-hono', 'nextjs', 'unknown']) {
    const a = deduceStack(repo(name), opts);
    const b = deduceStack(repo(name), opts);
    assert.deepEqual(a, b);
    assert.deepEqual(a.guessed, [...a.guessed].sort());
    assert.deepEqual(a.empty, [...a.empty].sort());
  }
});

test('branches: base is dev, else the first; production is main when different', () => {
  const only = deduceStack(repo('unknown'), { ...opts, branches: ['main'] });
  assert.deepEqual(load(only.yaml).branches, { base: 'main' });
  const none = deduceStack(repo('unknown'), { ...opts, branches: [] });
  assert.ok(none.empty.includes('branches.base'));
});
