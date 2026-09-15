import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import test from "node:test";
import { parseDocument } from "yaml";
import { defaultRoot, parseFrontmatter } from "../scripts/validate-plugin.mjs";
import { portableSkills } from "./helpers/plugin-surface.mjs";

const read = (path) => readFileSync(join(defaultRoot, path), "utf8");
const entries = (path, extension) => readdirSync(join(defaultRoot, path)).filter((name) => name.endsWith(extension)).sort();
const body = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();

test("public surface retains portable skills, matching commands and the Codex adapter", () => {
  const skills = readdirSync(join(defaultRoot, "skills")).filter((name) => existsSync(join(defaultRoot, "skills", name, "SKILL.md"))).sort();
  assert.deepEqual(skills, portableSkills);
  assert.deepEqual(entries("commands", ".md"), portableSkills.map((name) => `${name}.md`));
  assert.deepEqual(entries("agents", ".md"), ["efficiency-auditor.md", "rtk-filter-auditor.md"]);
  assert.deepEqual(entries("rules", ".mdc"), ["response-simplicity.mdc"]);
  const cursor = JSON.parse(read(".cursor-plugin/plugin.json"));
  assert.deepEqual(cursor.skills, portableSkills.map((name) => `./skills/${name}/SKILL.md`));
  assert.equal(JSON.parse(read(".codex-plugin/plugin.json")).skills, "./skills/");
  assert.deepEqual(readdirSync(join(defaultRoot, ".codex-plugin")), ["plugin.json"]);
  assert.deepEqual(readdirSync(join(defaultRoot, "adapters/codex/skills")), ["response-simplicity-setup"]);
});

test("Cursor commands resolve to the identically named shared skill", () => {
  for (const file of entries("commands", ".md")) {
    const fields = parseFrontmatter(join(defaultRoot, "commands", file));
    const link = read(`commands/${file}`).match(/\.\.\/skills\/([^/]+)\/SKILL\.md/);
    assert.ok(link, `${file} must delegate to a skill`);
    assert.equal(fields.name, basename(file, ".md"));
    assert.equal(link[1], fields.name);
  }
});

test("public skills remain available for implicit selection without file scoping", () => {
  const directories = [
    ...portableSkills.map((name) => `skills/${name}`),
    "adapters/codex/skills/response-simplicity-setup",
  ];
  for (const directory of directories) {
    const fields = parseFrontmatter(join(defaultRoot, directory, "SKILL.md"));
    assert.notEqual(fields["disable-model-invocation"], true, directory);
    assert.notEqual(fields.disable_model_invocation, true, directory);
    assert.equal(fields.paths, undefined, directory);
    assert.equal(fields.globs, undefined, directory);
    const metadata = `${directory}/agents/openai.yaml`;
    if (existsSync(join(defaultRoot, metadata))) {
      const document = parseDocument(read(metadata));
      assert.deepEqual(document.errors, [], metadata);
      assert.notEqual(document.toJS()?.policy?.allow_implicit_invocation, false, metadata);
    }
  }
});

test("communication and specialized references remain reachable through their entrypoints", () => {
  for (const name of portableSkills) assert.match(read(`skills/${name}/SKILL.md`), /references\/human-communication\.md/);
  const efficiency = read("skills/efficiency/SKILL.md");
  for (const name of ["change-communication", "verification-economy", "repeatable-work-economy", "debugging-feedback-economy", "rtk-evidence", "design-and-code-simplicity", "auditor"]) {
    assert.ok(efficiency.includes(`references/${name}.md`), `missing branch: ${name}`);
  }
  assert.match(read("skills/context-optimization/SKILL.md"), /references\/agent-document-design\.md/);
  assert.match(read("skills/rtk-filter-design/SKILL.md"), /references\/filter-format\.md/);
  // Critical selection boundaries; these are instruction checks, not observations of model behavior.
  assert.match(efficiency, /Only for commit messages.*change communication/is);
  assert.match(efficiency, /full bounded challenge only.*explicitly requests.*material complexity risk/is);
  assert.match(read("skills/context-optimization/SKILL.md"), /Do not load that reference for ordinary human-facing documentation/i);
});

test("review and delegation preserve user authority", () => {
  const efficiency = read("skills/efficiency/SKILL.md");
  assert.match(efficiency, /Treat review, assessment, and analysis requests as read-only/i);
  assert.match(efficiency, /Change code only when the user explicitly asks/i);
  assert.match(efficiency, /Do not commit, push, or release unless the user separately requests/i);
  assert.match(efficiency, /user explicitly requests an independent pass/);
  assert.match(efficiency, /In Codex, delegate.*only after that explicit request/is);
  for (const [file, policy] of [["efficiency-auditor.md", "efficiency"], ["rtk-filter-auditor.md", "rtk-filter-design"]]) {
    const fields = parseFrontmatter(join(defaultRoot, "agents", file));
    assert.equal(fields.readonly, true);
    assert.equal(fields.model, "inherit");
    assert.ok(read(`agents/${file}`).includes(`../skills/${policy}/references/auditor.md`));
  }
});

test("advisory branches do not independently authorize execution", () => {
  for (const name of ["verification-economy", "repeatable-work-economy", "debugging-feedback-economy"]) {
    assert.match(read(`skills/efficiency/references/${name}.md`), /does not authorize/i, name);
  }
});

test("RTK setup and filtering retain distinct host paths and native trust", () => {
  const setup = read("skills/rtk-setup/SKILL.md");
  for (const command of ["rtk --version", "rtk gain", "rtk init --show --agent cursor", "rtk init --codex --show", "rtk init --global --codex --dry-run", "--uninstall --dry-run"]) assert.ok(setup.includes(command));
  assert.match(setup, /Do not expect or claim Cursor-style `updated_input`/);
  assert.match(setup, /do not run Cursor or Codex setup commands/i);
  const filter = read("skills/rtk-filter-design/SKILL.md") + read("skills/rtk-filter-design/references/filter-format.md");
  assert.match(filter, /rtk verify --require-all/);
  assert.match(filter, /re-trust/i);
  assert.match(filter, /complete and exact paths.*exit status.*machine-consumed or piped output/is);
  assert.match(read("skills/efficiency/references/rtk-evidence.md"), /not provider-billed tokens/);
});

test("global response guidance remains opt-in and identical to the Cursor rule", () => {
  const rule = read("rules/response-simplicity.mdc");
  const canonical = read("adapters/codex/skills/response-simplicity-setup/references/response-simplicity.md");
  assert.equal(parseFrontmatter(join(defaultRoot, "rules/response-simplicity.mdc")).alwaysApply, true);
  assert.equal(body(rule), canonical.trim());
  const setup = read("adapters/codex/skills/response-simplicity-setup/SKILL.md");
  for (const text of ["AGENTS.override.md", "AGENTS.md", "geldmacher-efficiency:response-simplicity:start", "geldmacher-efficiency:response-simplicity:end"]) assert.ok(setup.includes(text));
  assert.match(setup, /show the exact diff and wait for explicit user approval/);
  assert.match(setup, /Removal deletes only the marked block/);
  assert.match(setup, /equivalent unmarked guidance already exists, stop/i);
  assert.match(setup, /start a new Codex task/i);
});

test("vendored schemas remain pinned to their independently recorded hashes", () => {
  for (const [path, expected] of [
    ["schemas/plugin.schema.json", "732a1163ae72844f1cccc8bb9ea9a018ad013a35b47be4551bf9bdbc1d29234a"],
    ["schemas/agent-plugins/1.0.0/plugin.schema.json", "0a4aad95ce337878ad38802ebf0daa3fde76abe3f65400c86bcbb1ec0b3ab883"],
  ]) {
    assert.equal(createHash("sha256").update(read(path)).digest("hex"), expected);
    assert.ok(read("schemas/README.md").includes(expected));
  }
});

test("CI and local development use the same release gate", () => {
  const scripts = JSON.parse(read("package.json")).scripts;
  assert.equal(scripts.validate, "node scripts/validate-plugin.mjs");
  assert.equal(scripts["check:links"], "node scripts/check-links.mjs");
  assert.match(scripts["release-check"], /npm run check:targets.*npm run validate.*npm run check:links.*npm test/);
  assert.match(read(".github/workflows/validate.yml"), /run: npm run release-check/);
});
