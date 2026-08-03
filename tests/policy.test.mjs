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

test("the 2.0 component surface is exactly four commands, four skills, two agents, and one rule", () => {
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
});

test("every command delegates to its declared skill", () => {
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
  ]) assert.equal(existsSync(join(defaultRoot, path)), false, `${path} must be removed in 2.0`);
});

test("auditors are read-only and the general auditor supports task and context focus", () => {
  for (const agentFile of componentFiles("agents", ".md")) {
    const fields = parseFrontmatter(join(defaultRoot, "agents", agentFile));
    assert.equal(fields.readonly, true, `${agentFile} must be read-only`);
    assert.equal(fields.model, "inherit", `${agentFile} must inherit the active model`);
  }
  const auditor = read("agents/efficiency-auditor.md");
  assert.match(auditor, /task review/i);
  assert.match(auditor, /context review/i);
  assert.match(auditor, /output utility/i);
  assert.match(auditor, /concrete item/i);
  assert.match(auditor, /length, tone.*AI-written/i);
  assert.match(auditor, /functional correctness, security, or domain acceptance/i);
  assert.match(auditor, /Do not implement corrections/);
});

test("efficiency covers before, during, and after work without replacing native controls", () => {
  const efficiency = `${read("commands/efficiency.md")}\n${read("skills/efficiency/SKILL.md")}`;
  for (const phase of ["Before work", "During work", "After work"]) assert.match(efficiency, new RegExp(phase, "i"));
  assert.match(efficiency, /same-session measurements/);
  assert.match(efficiency, /cumulative statistics/);
  assert.match(efficiency, /materially improve the result, a decision, or necessary verification/i);
  assert.match(efficiency, /redundant narration/);
  assert.match(efficiency, /unnecessary documentation or artifacts/);
  assert.match(efficiency, /speculative abstractions/);
  assert.match(efficiency, /concrete item/);
  assert.match(efficiency, /length, tone.*AI-written/i);
  assert.match(efficiency, /Never remove necessary evidence/);
  assert.match(efficiency, /Cursor's native approvals/);
  assert.match(efficiency, /functional correctness/);
});

test("RTK setup preserves identification, preview, approval, verification, and rollback gates", () => {
  const setup = `${read("commands/setup-rtk.md")}\n${read("skills/rtk-setup/SKILL.md")}`;
  for (const requiredTechnicalString of [
    "rtk --version",
    "rtk gain",
    "rtk init --show --agent cursor",
    "rtk init --global --agent cursor --dry-run",
    "rtk hook check --agent cursor",
    "rtk hook cursor",
    "updated_input",
    "permission: allow",
    "permission: ask",
    "rtk gain --history",
    "--uninstall --dry-run",
  ]) assert.ok(setup.includes(requiredTechnicalString), `missing setup safety contract: ${requiredTechnicalString}`);
});

test("RTK filter design preserves trust and diagnostic boundaries", () => {
  const filter = `${read("skills/rtk-filter-design/SKILL.md")}\n${read("skills/rtk-filter-design/references/filter-format.md")}`;
  for (const requiredTechnicalString of [
    "rtk verify --require-all",
    "RTK 0.44.0 or newer",
    "rtk hook check --agent cursor",
    "updated_input",
    "Preserve failures, warnings",
  ]) assert.ok(filter.includes(requiredTechnicalString), `missing filter safety contract: ${requiredTechnicalString}`);
  assert.match(filter, /Trust is a separate user-approved step/);
  assert.match(filter, /re-trust/);
});

test("context optimization follows user intent and Cursor-native control surfaces", () => {
  const context = `${read("commands/optimize-context.md")}\n${read("skills/context-optimization/SKILL.md")}`;
  assert.match(context, /user's intent/);
  assert.match(context, /active Cursor mode/);
  assert.match(context, /Do not create custom mode gates/);
  assert.match(context, /If a material edit is not clearly authorized/);
  assert.match(context, /efficiency-auditor.*context focus/);
});

test("response simplicity remains small and protects material technical content", () => {
  const path = join(defaultRoot, "rules", "response-simplicity.mdc");
  const fields = parseFrontmatter(path);
  const rule = read("rules/response-simplicity.mdc");
  assert.equal(fields.alwaysApply, true);
  assert.match(fields.description, /clear, concise, and complete/i);
  for (const protectedTerm of [
    "evidence",
    "uncertainty",
    "risks",
    "blockers",
    "approvals",
    "validation status",
    "Create only output and artifacts that materially improve the result, a decision, or necessary verification",
    "code, commands, paths, identifiers, and error messages exact",
  ]) assert.ok(rule.includes(protectedTerm), `missing protected response content: ${protectedTerm}`);
  assert.ok(rule.length < 1_200, "response rule should remain small enough for recurring context");
});

test("manifest and package metadata define the intended 2.0 integration surface", () => {
  const manifest = JSON.parse(read(".cursor-plugin/plugin.json"));
  const packageJson = JSON.parse(read("package.json"));
  const packageLock = JSON.parse(read("package-lock.json"));
  assert.equal(manifest.version, "2.0.0");
  assert.equal(packageJson.version, manifest.version);
  assert.equal(packageLock.version, manifest.version);
  assert.equal(packageLock.packages[""].version, manifest.version);
  assert.equal("minClientVersions" in manifest, false);
  assert.deepEqual({
    commands: manifest.commands,
    skills: manifest.skills,
    agents: manifest.agents,
    rules: manifest.rules,
  }, {
    commands: "./commands/",
    skills: "./skills/",
    agents: "./agents/",
    rules: "./rules/",
  });
  for (const field of ["hooks", "mcpServers"]) assert.equal(field in manifest, false);
});

test("vendored Cursor schema is byte-identical to its recorded source hash", () => {
  const schema = read("schemas/plugin.schema.json");
  const hash = createHash("sha256").update(schema).digest("hex");
  assert.equal(hash, "732a1163ae72844f1cccc8bb9ea9a018ad013a35b47be4551bf9bdbc1d29234a");
  const provenance = read("schemas/README.md");
  assert.match(provenance, /14d9dfa06283faa94bf9931d3e98c189bc375680/);
  assert.ok(provenance.includes(hash));
});

test("README and changelog document the complete 2.0 migration", () => {
  const readme = read("README.md");
  const changelog = read("CHANGELOG.md");
  for (const currentName of ["setup-rtk", "create-rtk-filter", "efficiency", "optimize-context", "rtk-filter-auditor", "efficiency-auditor", "response-simplicity"]) {
    assert.ok(readme.includes(currentName), `README.md does not document ${currentName}`);
  }
  for (const removedName of ["budget-efficiency", "review-efficiency", "efficiency-budget", "efficiency-review", "context-change-auditor"]) {
    assert.ok(readme.includes(removedName), `README.md migration does not document ${removedName}`);
    assert.ok(changelog.includes(removedName), `CHANGELOG.md does not document removal of ${removedName}`);
  }
  assert.match(readme, /AI-Slop.*low-value generated output/i);
  assert.match(readme, /observable utility, not whether text appears AI-written/i);
  assert.match(changelog, /output utility checks for low-value generated output/i);
  assert.match(changelog, /## 2\.0\.0 - 2026-08-01/);
});

test("release guidance verifies output utility within the existing runtime budget", () => {
  const checklist = read("docs/release-checklist.md");
  const smoke = read("docs/runtime-smoke.md");
  assert.match(checklist, /concrete low-value output.*missing material benefit.*practical adjustment/i);
  assert.match(checklist, /length, tone.*AI-written/i);
  assert.match(smoke, /at most two short fresh conversations/i);
  assert.match(smoke, /avoids redundant restatement and unrequested artifacts/i);
  assert.match(smoke, /concrete item, missing material benefit, and practical adjustment/i);
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
