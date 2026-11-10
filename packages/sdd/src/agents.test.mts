import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  agentFiles,
  INSTRUCTIONS_DIR,
  readAgentSpecs,
  readIntegrations,
  skippedAgents,
} from './agents.mts';

const repoAgents = new URL('../../../extension/agents/agents.yml', import.meta.url);

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'sdd-agents-'));
  mkdirSync(join(root, INSTRUCTIONS_DIR), { recursive: true });
  cpSync(repoAgents, join(root, INSTRUCTIONS_DIR, 'agents.yml'));
  return root;
}

describe('agents', () => {
  const specs = readAgentSpecs(tempRoot());

  it('readAgentSpecs reads the 4 agents and fails clearly when missing', () => {
    assert.equal(specs.length, 4);
    assert.throws(() => readAgentSpecs(mkdtempSync(join(tmpdir(), 'sdd-empty-'))), /agents\.yml/);
  });

  it('claude files point to the installed instructions', () => {
    const files = agentFiles('claude', specs)!;
    assert.deepEqual(
      files.map((f) => f.path),
      specs.map((s) => `.claude/agents/${s.name}.md`),
    );
    const rel = files.find((f) => f.path.endsWith('/relecteur.md'))!;
    assert.match(rel.content, /tools: Read, Grep, Glob, Bash\n/);
    assert.ok(rel.content.includes(`${INSTRUCTIONS_DIR}/relecteur.md`));
    assert.match(rel.content, /Tu n'as pas écrit ce travail/);
    const des = files.find((f) => f.path.endsWith('/designer.md'))!;
    assert.match(des.content, /tools: Read, Grep, Glob, Bash, Write, Edit\n/);
    assert.match(des.content, /Ne commite rien/);
    assert.doesNotMatch(des.content, /Tu n'as pas écrit/);
    assert.ok(rel.content.endsWith('\n'));
  });

  it('agy files use the folder form', () => {
    const files = agentFiles('agy', specs)!;
    const rel = files.find((f) => f.path === '.agents/agents/relecteur/agent.md')!;
    assert.ok(rel);
    assert.match(rel.content, /commandExecutionPolicy: sandbox/);
    assert.match(rel.content, /- view_file\n {2}- grep_search\n {2}- run_command|- view_file\n- grep_search\n- run_command/);
    assert.ok(rel.content.includes(`${INSTRUCTIONS_DIR}/relecteur.md`));
  });

  it('agy skips writes agents', () => {
    const files = agentFiles('agy', specs)!;
    assert.equal(files.length, 3);
    assert.ok(!files.some((f) => f.path.includes('designer')));
    assert.deepEqual(skippedAgents('agy', specs), ['designer']);
    assert.deepEqual(skippedAgents('claude', specs), []);
  });

  it('unknown integration has no generator', () => {
    assert.equal(agentFiles('copilot', specs), null);
  });

  it('readIntegrations reads installed_integrations', () => {
    const root = mkdtempSync(join(tmpdir(), 'sdd-int-'));
    mkdirSync(join(root, '.specify'));
    const p = join(root, '.specify/integration.json');
    writeFileSync(p, JSON.stringify({ installed_integrations: ['claude', 'agy'], integration: 'claude' }));
    assert.deepEqual(readIntegrations(root), ['claude', 'agy']);
    writeFileSync(p, JSON.stringify({ integration: 'claude' }));
    assert.deepEqual(readIntegrations(root), ['claude']);
    assert.deepEqual(readIntegrations(mkdtempSync(join(tmpdir(), 'sdd-none-'))), []);
  });

  it('agentFiles is deterministic', () => {
    assert.deepEqual(agentFiles('claude', specs), agentFiles('claude', specs));
    assert.deepEqual(agentFiles('agy', specs), agentFiles('agy', specs));
  });
});
