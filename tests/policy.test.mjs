import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import test from "node:test";
import { defaultRoot, parseFrontmatter } from "../scripts/validate-plugin.mjs";

function read(path) {
  return readFileSync(join(defaultRoot, path), "utf8");
}

test("every command delegates to an existing matching skill", () => {
  const expectedSkills = new Map([
    ["budget-efficiency", "efficiency-budget"],
    ["create-rtk-filter", "rtk-filter-design"],
    ["optimize-context", "context-optimization"],
    ["review-efficiency", "efficiency-review"],
    ["setup-rtk", "rtk-setup"],
  ]);
  const commands = readdirSync(join(defaultRoot, "commands")).filter((file) => file.endsWith(".md"));
  assert.equal(commands.length, expectedSkills.size);
  for (const commandFile of commands) {
    const commandPath = join(defaultRoot, "commands", commandFile);
    const command = readFileSync(commandPath, "utf8");
    const fields = parseFrontmatter(commandPath);
    const match = command.match(/\.\.\/skills\/([^/]+)\/SKILL\.md/);
    assert.ok(match, `${commandFile} does not link to a skill`);
    assert.equal(basename(commandFile, ".md"), fields.name);
    assert.equal(match[1], expectedSkills.get(fields.name), `${commandFile} links to the wrong skill`);
  }
});

test("auditors are explicitly read-only", () => {
  const agents = readdirSync(join(defaultRoot, "agents")).filter((file) => file.endsWith(".md"));
  for (const agentFile of agents) {
    const fields = parseFrontmatter(join(defaultRoot, "agents", agentFile));
    assert.equal(fields.readonly, true, `${agentFile} must be read-only`);
    assert.equal(fields.model, "inherit", `${agentFile} must inherit the active model`);
  }
});

test("RTK setup preserves identification, preview, approval, verification, and rollback gates", () => {
  const setup = `${read("commands/setup-rtk.md")}\n${read("skills/rtk-setup/SKILL.md")}`;
  for (const expected of [
    "rtk --version",
    "rtk gain",
    "rtk init --show --agent cursor",
    "rtk init --global --agent cursor --dry-run",
    "rtk hook check --agent cursor",
    "--uninstall --dry-run",
    "explicit",
  ]) assert.ok(setup.includes(expected), `missing setup policy: ${expected}`);
});

test("RTK filter design requires diagnostic fixtures and complete verification", () => {
  const filter = `${read("skills/rtk-filter-design/SKILL.md")}\n${read("skills/rtk-filter-design/references/filter-format.md")}`;
  assert.match(filter, /rtk verify --require-all/);
  assert.match(filter, /Trust is a separate user-approved step/);
  assert.match(filter, /rtk hook check --agent cursor/);
  assert.match(filter, /Preserve failures, warnings/);
});

test("context optimization follows user intent and Cursor-native control surfaces", () => {
  const context = `${read("commands/optimize-context.md")}\n${read("skills/context-optimization/SKILL.md")}`;
  assert.match(context, /user's intent/);
  assert.match(context, /active Cursor mode/);
  assert.match(context, /Do not create custom mode gates/);
  assert.match(context, /If a material edit is not clearly authorized/);
});

test("the plugin remains opt-in without hidden integration surfaces", () => {
  const manifest = JSON.parse(read(".cursor-plugin/plugin.json"));
  for (const field of ["rules", "hooks", "mcpServers"]) assert.equal(field in manifest, false);
  assert.equal(manifest.commands, "./commands/");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.agents, "./agents/");
});

test("README documents every command and auditor", () => {
  const readme = read("README.md");
  for (const directory of ["commands", "agents"]) {
    const files = readdirSync(join(defaultRoot, directory)).filter((file) => file.endsWith(".md"));
    for (const file of files) {
      const fields = parseFrontmatter(join(defaultRoot, directory, file));
      assert.ok(readme.includes(fields.name), `README.md does not document ${fields.name}`);
    }
  }
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
