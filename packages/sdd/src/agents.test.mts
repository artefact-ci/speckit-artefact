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

  it('readAgentSpecs reads the 5 agents and fails clearly when missing', () => {
    assert.equal(specs.length, 5);
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

  it('agy files use the folder form and the tool names Antigravity resolves', () => {
    const files = agentFiles('agy', specs)!;
    const rel = files.find((f) => f.path === '.agents/agents/relecteur/agent.md')!;
    assert.ok(rel);
    assert.match(rel.content, /commandExecutionPolicy: sandbox/);
    assert.match(rel.content, /tools:\n {2}- read_file\n {2}- run_command\n/);
    // Ignorés sans message par Antigravity (vérifié le 2026-11-12) : on ne les déclare pas.
    assert.doesNotMatch(rel.content, /grep_search|view_file/);
    assert.ok(rel.content.includes(`${INSTRUCTIONS_DIR}/relecteur.md`));
  });

  it('agy has a designer that can create and edit files', () => {
    const files = agentFiles('agy', specs)!;
    assert.equal(files.length, 5);
    const des = files.find((f) => f.path === '.agents/agents/designer/agent.md')!;
    assert.ok(des);
    assert.match(des.content, /tools:\n {2}- read_file\n {2}- write_file\n {2}- edit_file\n {2}- run_command\n/);
    assert.match(des.content, /commandExecutionPolicy: sandbox/);
    assert.match(des.content, /Ne commite rien/);
    assert.deepEqual(skippedAgents('agy', specs), []);
    assert.deepEqual(skippedAgents('claude', specs), []);
  });

  it('opencode files are subagents that point to the installed instructions', () => {
    const files = agentFiles('opencode', specs)!;
    assert.deepEqual(
      files.map((f) => f.path),
      specs.map((s) => `.opencode/agents/${s.name}.md`),
    );
    for (const f of files) {
      assert.match(f.content, /\nmode: subagent\n/);
      // Pas de champ `name` : OpenCode prend le nom du fichier.
      assert.doesNotMatch(f.content, /\nname:/);
    }
    const rel = files.find((f) => f.path === '.opencode/agents/relecteur.md')!;
    assert.match(rel.content, /permission:\n {2}edit: deny\n {2}task: deny\n {2}webfetch: deny\n/);
    assert.ok(rel.content.includes(`${INSTRUCTIONS_DIR}/relecteur.md`));
    assert.match(rel.content, /Tu n'as pas écrit ce travail/);
    const des = files.find((f) => f.path === '.opencode/agents/designer.md')!;
    assert.match(des.content, /permission:\n {2}task: deny\n/);
    assert.doesNotMatch(des.content, /edit: deny/);
    assert.match(des.content, /Ne commite rien/);
    assert.deepEqual(skippedAgents('opencode', specs), []);
  });

  it('implementeur writes files on every tool', () => {
    const claude = agentFiles('claude', specs)!.find((f) => f.path === '.claude/agents/implementeur.md')!;
    assert.match(claude.content, /tools: Read, Grep, Glob, Bash, Write, Edit\n/);
    assert.match(claude.content, /Ne commite rien/);
    assert.ok(claude.content.includes(`${INSTRUCTIONS_DIR}/implementeur.md`));
    assert.doesNotMatch(claude.content, /Tu n'as pas écrit/);
    // L'implémenteur ne commite pas, mais l'agent principal commite sans attendre l'utilisateur.
    assert.doesNotMatch(claude.content, /accord de l'utilisateur/);
    const agy = agentFiles('agy', specs)!.find((f) => f.path === '.agents/agents/implementeur/agent.md')!;
    assert.match(agy.content, /tools:\n {2}- read_file\n {2}- write_file\n {2}- edit_file\n {2}- run_command\n/);
    assert.match(agy.content, /commandExecutionPolicy: sandbox/);
    const oc = agentFiles('opencode', specs)!.find((f) => f.path === '.opencode/agents/implementeur.md')!;
    assert.match(oc.content, /permission:\n {2}task: deny\n/);
    assert.doesNotMatch(oc.content, /edit: deny/);
  });

  it('claude files carry the model of agents.yml, and inherit the session model without one', () => {
    const files = agentFiles('claude', specs)!;
    const imp = files.find((f) => f.path === '.claude/agents/implementeur.md')!;
    assert.match(imp.content, /\nmodel: sonnet\n/);
    for (const name of ['relecteur', 'relecteur-produit', 'relecteur-design', 'designer']) {
      const f = files.find((x) => x.path === `.claude/agents/${name}.md`)!;
      assert.doesNotMatch(f.content, /\nmodel:/, name);
    }
  });

  it('agy and opencode files never declare a model', () => {
    // Antigravity : aucune clé vérifiée ; OpenCode : le nom dépend du fournisseur du projet.
    for (const integration of ['agy', 'opencode']) {
      for (const f of agentFiles(integration, specs)!) assert.doesNotMatch(f.content, /\nmodel:/, f.path);
    }
  });

  it('readAgentSpecs rejects a model that is not a non-empty string', () => {
    const root = tempRoot();
    const file = join(root, INSTRUCTIONS_DIR, 'agents.yml');
    writeFileSync(file, 'agents:\n  - name: x\n    access: writes\n    description: d\n    model: ""\n');
    assert.throws(() => readAgentSpecs(root), /model/);
    writeFileSync(file, 'agents:\n  - name: x\n    access: writes\n    description: d\n    model: 3\n');
    assert.throws(() => readAgentSpecs(root), /model/);
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
