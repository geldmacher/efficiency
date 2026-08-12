import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import test from "node:test";
import { defaultRoot, parseFrontmatter } from "../scripts/validate-plugin.mjs";

function read(path) {
  return readFileSync(join(defaultRoot, path), "utf8");
}

function componentFiles(directory, extension) {
  return readdirSync(join(defaultRoot, directory)).filter((file) => file.endsWith(extension)).sort();
}

function skillDirectories() {
  return readdirSync(join(defaultRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(defaultRoot, "skills", entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();
}

function bodyWithoutFrontmatter(contents) {
  return contents.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}

test("the three-target surface keeps four portable skills and one Codex-only adapter skill", () => {
  assert.deepEqual(componentFiles("commands", ".md"), [
    "create-rtk-filter.md",
    "efficiency.md",
    "optimize-context.md",
    "setup-rtk.md",
  ]);
  assert.deepEqual(skillDirectories(), [
    "context-optimization",
    "efficiency",
    "rtk-filter-design",
    "rtk-setup",
  ]);
  assert.deepEqual(componentFiles("agents", ".md"), [
    "efficiency-auditor.md",
    "rtk-filter-auditor.md",
  ]);
  assert.deepEqual(componentFiles("rules", ".mdc"), ["response-simplicity.mdc"]);

  const cursorManifest = JSON.parse(read(".cursor-plugin/plugin.json"));
  assert.deepEqual(cursorManifest.skills, [
    "./skills/context-optimization/SKILL.md",
    "./skills/efficiency/SKILL.md",
    "./skills/rtk-filter-design/SKILL.md",
    "./skills/rtk-setup/SKILL.md",
  ]);
  assert.equal(cursorManifest.skills.some((path) => path.includes("response-simplicity-setup")), false);
  assert.equal(JSON.parse(read(".codex-plugin/plugin.json")).skills, "./skills/");
  assert.deepEqual(readdirSync(join(defaultRoot, ".codex-plugin")), ["plugin.json"]);
  assert.equal(existsSync(join(defaultRoot, "adapters/codex/skills/response-simplicity-setup/SKILL.md")), true);
  assert.equal(existsSync(join(defaultRoot, "skills/response-simplicity-setup")), false);
});

test("every Cursor command delegates to its declared shared skill", () => {
  const expectedSkills = new Map([
    ["create-rtk-filter", "rtk-filter-design"],
    ["efficiency", "efficiency"],
    ["optimize-context", "context-optimization"],
    ["setup-rtk", "rtk-setup"],
  ]);
  for (const commandFile of componentFiles("commands", ".md")) {
    const commandPath = join(defaultRoot, "commands", commandFile);
    const command = readFileSync(commandPath, "utf8");
    const fields = parseFrontmatter(commandPath);
    const match = command.match(/\.\.\/skills\/([^/]+)\/SKILL\.md/);
    assert.ok(match, `${commandFile} does not link to a skill`);
    assert.equal(basename(commandFile, ".md"), fields.name);
    assert.equal(match[1], expectedSkills.get(fields.name), `${commandFile} links to the wrong skill`);
  }
});

test("removed 1.x components have no compatibility files", () => {
  for (const path of [
    "commands/budget-efficiency.md",
    "commands/review-efficiency.md",
    "skills/efficiency-budget/SKILL.md",
    "skills/efficiency-review/SKILL.md",
    "agents/context-change-auditor.md",
  ]) assert.equal(existsSync(join(defaultRoot, path)), false, `${path} must remain removed`);
});

test("all portable workflows share one human communication contract", () => {
  const skills = [
    "skills/context-optimization/SKILL.md",
    "skills/efficiency/SKILL.md",
    "skills/rtk-filter-design/SKILL.md",
    "skills/rtk-setup/SKILL.md",
  ];
  for (const skill of skills) {
    assert.match(read(skill), /efficiency\/references\/human-communication\.md|references\/human-communication\.md/,
      `${skill} must link to the shared contract`);
  }

  const contract = read("skills/efficiency/references/human-communication.md");
  for (const required of [
    /mixed technical knowledge/i,
    /Lead with the outcome or decision/i,
    /what the outcome means/i,
    /who should take it/i,
    /required or optional/i,
    /jargon once/i,
    /Keep code, commands, paths, identifiers, and error messages exact/i,
    /verified facts.*open gaps/is,
    /evidence close to the claim/i,
    /do not force a fixed template/i,
  ]) assert.match(contract, required);

  assert.match(read("skills/rtk-setup/SKILL.md"), /current RTK state.*next safe action/is);
  assert.match(read("skills/rtk-filter-design/SKILL.md"), /filter coverage.*diagnostics.*trust action/is);
  assert.match(read("skills/context-optimization/SKILL.md"), /affected context sources.*approval or implementation action/is);
  assert.match(read("skills/efficiency/SKILL.md"), /efficiency verdict.*person's goal.*practical adjustment/is);
});

test("change communication is evidence-based and loaded only for relevant efficiency work", () => {
  const efficiency = read("skills/efficiency/SKILL.md");
  const auditor = read("skills/efficiency/references/auditor.md");
  assert.match(efficiency, /Only for commit messages.*change communication contract/is);
  assert.match(auditor, /Only when reviewing a commit message.*change communication contract/is);
  for (const unrelatedSkill of [
    "skills/context-optimization/SKILL.md",
    "skills/rtk-filter-design/SKILL.md",
    "skills/rtk-setup/SKILL.md",
  ]) assert.doesNotMatch(read(unrelatedSkill), /change-communication\.md/);

  const contract = read("skills/efficiency/references/change-communication.md");
  for (const required of [
    /project's own communication conventions first/i,
    /capitalized, imperative.*final period/is,
    /about 50 characters/i,
    /72 characters.*fallback upper bound/is,
    /blank line/i,
    /problem and rationale/i,
    /outcome and scope/i,
    /diff, check, other evidence.*labelled assumption/is,
    /verified behavior, intended behavior, and open work/i,
    /Do not score style.*AI-written/is,
  ]) assert.match(contract, required);
});

test("Cursor auditors are thin read-only adapters over shared policies", () => {
  const adapters = [
    ["efficiency-auditor.md", "../skills/efficiency/references/auditor.md"],
    ["rtk-filter-auditor.md", "../skills/rtk-filter-design/references/auditor.md"],
  ];
  for (const [agentFile, policyPath] of adapters) {
    const path = join(defaultRoot, "agents", agentFile);
    const fields = parseFrontmatter(path);
    const adapter = read(`agents/${agentFile}`);
    assert.equal(fields.readonly, true);
    assert.equal(fields.model, "inherit");
    assert.ok(adapter.includes(policyPath));
    assert.match(adapter, /human-communication\.md/);
    assert.ok(adapter.length < 500, `${agentFile} should remain a thin host adapter`);
  }

  const auditor = read("skills/efficiency/references/auditor.md");
  for (const focus of ["task review", "context review", "code review", "output utility"]) {
    assert.match(auditor, new RegExp(focus, "i"));
  }
  for (const protectedTerm of ["observable behavior", "public interfaces", "persisted formats"]) {
    assert.ok(auditor.includes(protectedTerm));
  }
  assert.match(auditor, /Do not implement corrections/);
  assert.match(auditor, /change-communication\.md/);
  const filterAuditor = read("skills/rtk-filter-design/references/auditor.md");
  assert.match(filterAuditor, /matcher precision/i);
  assert.match(filterAuditor, /Do not edit files/);
});

test("efficiency uses host-native controls and delegates only on explicit request", () => {
  const efficiency = `${read("commands/efficiency.md")}\n${read("skills/efficiency/SKILL.md")}`;
  for (const phase of ["Before work", "During work", "After work"]) assert.match(efficiency, new RegExp(phase, "i"));
  for (const protectedTerm of [
    "same-session measurements",
    "cumulative statistics",
    "observable behavior",
    "public interfaces",
    "persisted formats",
    "relevant existing checks",
  ]) assert.ok(efficiency.includes(protectedTerm), `missing boundary: ${protectedTerm}`);
  assert.match(efficiency, /active host's native approvals/);
  assert.match(efficiency, /user explicitly requests an independent pass/);
  assert.match(efficiency, /In Codex, delegate.*only after that explicit request/i);
  assert.match(efficiency, /selected parent model through inheritance/i);
  assert.match(efficiency, /label it as not independent/);
  assert.match(efficiency, /do not trigger an auditor automatically after implementation/i);
  assert.match(efficiency, /Do not commit, push, or release/);
});

test("RTK setup keeps Cursor receipts separate from Codex direct execution", () => {
  const setup = `${read("commands/setup-rtk.md")}\n${read("skills/rtk-setup/SKILL.md")}`;
  for (const required of [
    "rtk --version",
    "rtk gain",
    "rtk init --show --agent cursor",
    "rtk init --global --agent cursor --dry-run",
    "rtk hook check --agent cursor",
    "rtk hook cursor",
    "updated_input",
    "permission: allow",
    "permission: ask",
    "rtk init --codex --show",
    "rtk init --global --codex --dry-run",
    "rtk gain --history",
    "--uninstall --dry-run",
  ]) assert.ok(setup.includes(required), `missing setup contract: ${required}`);
  assert.match(setup, /locally verified RTK 0\.44\.2/);
  assert.match(setup, /Do not expect or claim Cursor-style `updated_input`/);
  assert.match(setup, /another Agent Plugins client/i);
  assert.match(setup, /do not run Cursor or Codex setup commands/i);
});

test("RTK filter design preserves trust, diagnostics, and host-specific evidence", () => {
  const filter = `${read("skills/rtk-filter-design/SKILL.md")}\n${read("skills/rtk-filter-design/references/filter-format.md")}`;
  for (const required of [
    "rtk verify --require-all",
    "RTK 0.44.0 or newer",
    "rtk hook check --agent cursor",
    "updated_input",
    "rtk init --codex --show",
    "rtk gain --history",
    "Preserve failures, warnings",
  ]) assert.ok(filter.includes(required), `missing filter contract: ${required}`);
  assert.match(filter, /Trust is a separate user-approved step/);
  assert.match(filter, /Codex has no Cursor `updated_input` receipt/);
  assert.match(filter, /another Agent Plugins client/i);
  assert.match(filter, /mark host integration as unverified/i);
  assert.match(filter, /delegate.*only after the explicit request/i);
});

test("context optimization recognizes native Cursor and Codex context surfaces", () => {
  const context = `${read("commands/optimize-context.md")}\n${read("skills/context-optimization/SKILL.md")}`;
  assert.match(context, /user's intent/);
  assert.match(context, /active host mode/);
  assert.match(context, /project `AGENTS\.md`/);
  assert.match(context, /project `\.codex\/config\.toml`/);
  assert.match(context, /another Agent Plugins client/i);
  assert.match(context, /do not infer Cursor or Codex paths/i);
  assert.match(context, /native planning uses the host's plan surface/);
  assert.match(context, /If a material edit is not clearly authorized/);
  assert.match(context, /Do not create custom mode gates/);
});

test("Codex response setup uses the same compact guidance and requires explicit diff approval", () => {
  const cursorRule = read("rules/response-simplicity.mdc");
  const canonical = read("adapters/codex/skills/response-simplicity-setup/references/response-simplicity.md");
  const setup = read("adapters/codex/skills/response-simplicity-setup/SKILL.md");
  const fields = parseFrontmatter(join(defaultRoot, "rules", "response-simplicity.mdc"));
  assert.equal(fields.alwaysApply, true);
  assert.equal(bodyWithoutFrontmatter(cursorRule), canonical.trim());
  assert.ok(cursorRule.length < 1_200);
  for (const required of [
    /mixed technical knowledge/i,
    /explain necessary jargon once/i,
    /practical meaning/i,
    /next action, its owner.*required or optional/i,
    /Preserve relevant evidence.*validation status/is,
    /Keep code, commands, paths, identifiers, and error messages exact/i,
    /Do not force a fixed template/i,
  ]) assert.match(canonical, required);
  for (const required of [
    "AGENTS.override.md",
    "AGENTS.md",
    "geldmacher-efficiency:response-simplicity:start",
    "geldmacher-efficiency:response-simplicity:end",
    "preserve all existing content, including RTK imports",
    "show the exact diff and wait for explicit user approval",
    "Removal deletes only the marked block",
    "start a new Codex task",
  ]) assert.ok(setup.includes(required), `missing response setup contract: ${required}`);
  assert.match(setup, /equivalent unmarked guidance already exists, stop/i);
});

test("all manifests and package metadata define version 2.2.0 without hooks, MCP, apps, or extensions", () => {
  const portable = JSON.parse(read("plugin.json"));
  const cursor = JSON.parse(read(".cursor-plugin/plugin.json"));
  const codex = JSON.parse(read(".codex-plugin/plugin.json"));
  const packageJson = JSON.parse(read("package.json"));
  const packageLock = JSON.parse(read("package-lock.json"));
  for (const value of [portable.version, cursor.version, codex.version, packageJson.version, packageLock.version, packageLock.packages[""].version]) {
    assert.equal(value, "2.2.0");
  }
  assert.equal(portable.name, cursor.name);
  assert.equal(cursor.name, codex.name);
  assert.equal(portable.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
  assert.equal(codex.interface.displayName, "Efficiency");
  assert.equal(codex.interface.developerName, "Dennis Geldmacher");
  assert.equal(codex.interface.category, "Developer Tools");
  assert.deepEqual(codex.interface.capabilities, ["Interactive", "Read", "Write"]);
  assert.deepEqual(packageJson.files, [
    "plugin.json",
    ".codex-plugin",
    ".cursor-plugin",
    "adapters/codex",
    "agents",
    "assets",
    "CHANGELOG.md",
    "commands",
    "docs",
    "LICENSE",
    "README.md",
    "rules",
    "schemas/agent-plugins",
    "skills",
  ]);
  assert.equal("minClientVersions" in cursor, false);
  for (const field of ["hooks", "mcpServers"]) assert.equal(field in cursor, false);
  for (const field of ["hooks", "mcpServers", "apps"] ) assert.equal(field in codex, false);
  assert.equal("extensions" in portable, false);
  assert.equal(existsSync(join(defaultRoot, "mcp.json")), false);
});

test("vendored Cursor schema is byte-identical to its recorded source hash", () => {
  const schema = read("schemas/plugin.schema.json");
  const hash = createHash("sha256").update(schema).digest("hex");
  assert.equal(hash, "732a1163ae72844f1cccc8bb9ea9a018ad013a35b47be4551bf9bdbc1d29234a");
  const provenance = read("schemas/README.md");
  assert.match(provenance, /14d9dfa06283faa94bf9931d3e98c189bc375680/);
  assert.ok(provenance.includes(hash));
});

test("vendored Agent Plugins schema is byte-identical to its pinned Working Draft source", () => {
  const schema = read("schemas/agent-plugins/1.0.0/plugin.schema.json");
  const hash = createHash("sha256").update(schema).digest("hex");
  assert.equal(hash, "0a4aad95ce337878ad38802ebf0daa3fde76abe3f65400c86bcbb1ec0b3ab883");
  const provenance = read("schemas/README.md");
  assert.match(provenance, /bd383552095128f6effe895b9257cfd580a6d179/);
  assert.match(provenance, /Working Draft/);
  assert.ok(provenance.includes(hash));
});

test("README and changelog document the three-target 2.2 surface and the 1.x migration", () => {
  const readme = read("README.md");
  const changelog = read("CHANGELOG.md");
  for (const currentName of [
    "setup-rtk", "create-rtk-filter", "efficiency", "optimize-context",
    "rtk-filter-auditor", "efficiency-auditor", "response-simplicity", "response-simplicity-setup",
  ]) assert.ok(readme.includes(currentName), `README.md does not document ${currentName}`);
  for (const removedName of ["budget-efficiency", "review-efficiency", "efficiency-budget", "efficiency-review", "context-change-auditor"]) {
    assert.ok(readme.includes(removedName));
    assert.ok(changelog.includes(removedName));
  }
  assert.match(readme, /AI-Slop.*low-value generated output/i);
  assert.match(readme, /Review requests never edit code/);
  assert.match(readme, /mixed technical knowledge/i);
  assert.match(readme, /verified behavior, intended behavior, and open work/i);
  assert.match(readme, /cannot prove live activation or actual human comprehension/i);
  assert.match(readme, /Agent Plugins.*four portable skills/is);
  assert.match(readme, /Codex.*five skills/is);
  assert.match(changelog, /## 2\.2\.0 - 2026-08-11/);
  assert.match(changelog, /Agent Plugins 1\.0\.0/i);
  assert.match(changelog, /## 2\.1\.0 - 2026-08-03/);
  assert.match(changelog, /three deterministic targets/i);
  assert.match(changelog, /shared human communication contract/i);
  assert.match(changelog, /manifests, versions, dependencies, or component counts/i);
});

test("release guidance separates conformance, bundles, native runtimes, and publication evidence", () => {
  const checklist = read("docs/release-checklist.md");
  const cursorSmoke = read("docs/runtime-smoke.md");
  const codexSmoke = read("docs/codex-runtime-smoke.md");
  assert.match(checklist, /four portable skills.*four Cursor skills.*one Codex-only adapter source/is);
  assert.match(checklist, /generated Codex target has exactly five immediate root skills/i);
  assert.match(checklist, /Format conformance.*Built bundle.*Cursor runtime.*Codex runtime.*publication/is);
  assert.match(checklist, /explicit model-call and cost limit/i);
  assert.match(checklist, /Agent Plugins.*Working Draft/i);
  assert.match(checklist, /All four portable skills link to the shared human communication contract/i);
  assert.match(checklist, /Do not infer actual human comprehension/i);
  assert.match(cursorSmoke, /at most two short fresh conversations/i);
  assert.match(codexSmoke, /fresh Codex task/i);
  assert.match(codexSmoke, /at most two model invocations/i);
  assert.match(codexSmoke, /maximum approved cost/i);
  assert.match(codexSmoke, /does not prove.*Marketplace publication/i);
});

test("CI and local development use the same release gate", () => {
  const packageJson = JSON.parse(read("package.json"));
  const workflow = read(".github/workflows/validate.yml");
  assert.equal(packageJson.scripts.validate, "node scripts/validate-plugin.mjs");
  assert.equal(packageJson.scripts["check:links"], "node scripts/check-links.mjs");
  assert.equal(packageJson.scripts.test, "node --test");
  assert.match(packageJson.scripts["release-check"], /npm run validate.*npm run check:links.*npm test/);
  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /run: npm run release-check/);
});
