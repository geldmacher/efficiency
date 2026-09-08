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
    "context-optimization.md",
    "efficiency.md",
    "rtk-filter-design.md",
    "rtk-setup.md",
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
  for (const commandFile of componentFiles("commands", ".md")) {
    const commandPath = join(defaultRoot, "commands", commandFile);
    const command = readFileSync(commandPath, "utf8");
    const fields = parseFrontmatter(commandPath);
    const match = command.match(/\.\.\/skills\/([^/]+)\/SKILL\.md/);
    assert.ok(match, `${commandFile} does not link to a skill`);
    assert.equal(basename(commandFile, ".md"), fields.name);
    assert.equal(match[1], fields.name, `${commandFile} must link to the identically named portable skill`);
  }
});

test("removed and renamed components have no compatibility files", () => {
  for (const path of [
    "commands/create-rtk-filter.md",
    "commands/optimize-context.md",
    "commands/setup-rtk.md",
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
    /reader needs to act, decide, or understand/i,
    /project's exact terms and symbols/i,
    /conditions before an instruction.*common path before exceptions/is,
    /explicitly asks to restate the last response.*plainer, shorter language/is,
    /rewrite only that response/i,
    /material facts, evidence, risks, and open gaps.*no new analysis or claims/is,
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
    /reader must act, decide, or understand/i,
    /exact project terms and symbols.*conditions before requested actions.*common path before exceptions/is,
    /does not extend.*tutorials, READMEs, RFCs, or general documentation/is,
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
    "cumulative RTK gain",
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
  assert.match(efficiency, /Treat review, assessment, and analysis requests as read-only/i);
  assert.match(efficiency, /Change code only when the user explicitly asks to change, simplify, or refactor it/i);
  assert.match(efficiency, /candidate rather than implementing it.*materially broadens the approved scope/is);
  assert.match(efficiency, /Do not commit, push, or release/);
});

test("efficiency performs one bounded design and code simplicity challenge without making it always-on", () => {
  const efficiency = `${read("commands/efficiency.md")}\n${read("skills/efficiency/SKILL.md")}`;
  const skillFields = parseFrontmatter(join(defaultRoot, "skills", "efficiency", "SKILL.md"));
  const auditor = read("skills/efficiency/references/auditor.md");
  const design = read("skills/efficiency/references/design-and-code-simplicity.md");
  const responseRule = read("rules/response-simplicity.mdc");

  assert.match(skillFields.description, /^Guide coding, refactoring, and technical design toward evidence-guided simplicity/i);
  assert.match(efficiency, /read \[design and code simplicity\]\(references\/design-and-code-simplicity\.md\)/i);
  assert.match(efficiency, /coding, refactoring, or technical design work.*quick Evidence-Guided Simplicity ladder/is);
  assert.match(efficiency, /full bounded challenge only.*explicitly requests.*material complexity risk/is);
  assert.match(efficiency, /quick ladder silently.*changes the chosen solution, scope, or risk.*asks for the reasoning/is);
  assert.match(auditor, /read and apply \[design and code simplicity\]\(design-and-code-simplicity\.md\) once/i);
  const ladderSteps = [
    "Omit or delete work",
    "Reuse a capability already present in the project",
    "Use the standard library or a native platform capability",
    "Use an already installed dependency only when it lowers total reader, maintenance, and validation burden",
    "Add the smallest local implementation",
  ];
  let previousStep = -1;
  for (const step of ladderSteps) {
    const currentStep = design.indexOf(step);
    assert.ok(currentStep > previousStep, `quick ladder step is missing or out of order: ${step}`);
    previousStep = currentStep;
  }
  for (const required of [
    /stop at the first evidence-supported sufficient option/i,
    /YAGNI:.*speculative requirements.*unproved flexibility/is,
    /KISS:.*independent concepts.*trace depth.*hidden or mutable state.*interface burden/is,
    /DRY:.*knowledge, rule, decision, and validation.*one authoritative place/is,
    /Similar syntax alone does not justify an abstraction/i,
    /Do not optimize for one-liners, line-count or file-count targets, named intensity modes, or a fixed one-test rule/i,
    /public interfaces.*persisted formats.*correctness.*security.*accessibility.*data-loss protection.*performance.*lifecycle semantics.*domain distinctions.*project conventions.*proportionate verification/is,
    /exactly one bounded simplicity challenge/i,
    /required behavior.*fixed constraints.*available evidence/is,
    /root decision.*variants.*branches.*states.*sources of truth.*interface burden.*compatibility handling/is,
    /interface burden/i,
    /locality/i,
    /real variation/i,
    /deletion test.*complexity disappear.*complexity spreads/is,
    /reader load.*layers.*trace.*hidden or mutable state/is,
    /dead paths.*duplicated decisions or validation.*empty stubs.*speculative protection/is,
    /smallest viable alternative/i,
    /observable behavior, risk, validation effort, locality, reader load, and interface burden/i,
    /current design is already proportionate/i,
    /comment claims an invariant.*type.*test.*lint rule.*boundary check/is,
    /Keep comments.*rationale, external constraints.*code cannot express/is,
    /comment is flagged.*redundant comment.*symptom of unclear code/is,
    /authorized change.*remove only the former directly/is,
    /smallest in-scope root-cause clarification.*retain any rationale.*code still cannot express/is,
    /Do not repeat the challenge recursively/i,
  ]) assert.match(design, required);

  assert.doesNotMatch(responseRule, /Evidence-Guided Simplicity|YAGNI|KISS|DRY|bounded simplicity challenge|root decision|smallest viable alternative/i);
});

test("verification economy selects bounded direct evidence without granting execution authority", () => {
  const efficiency = read("skills/efficiency/SKILL.md");
  const auditor = read("skills/efficiency/references/auditor.md");
  const verification = read("skills/efficiency/references/verification-economy.md");
  const responseRule = read("rules/response-simplicity.mdc");

  assert.match(efficiency, /choosing, reviewing, or reporting validation.*read \[verification economy\]/is);
  assert.match(auditor, /validation selection or evidence claims.*read \[verification economy\]/is);
  for (const required of [
    /at most two facts.*material risk/is,
    /cheapest adequate direct observation/i,
    /Source inspection.*focused check.*live path/is,
    /builds, summaries, caches, timestamps, generated reports, and derived state as proxies/i,
    /risk-bearing input-to-output path/i,
    /failure isolation, rollback, or reviewer confidence/i,
    /intended behavior, source-supported behavior, executed checks, and live observation/i,
    /does not authorize creating or running tests or scripts.*starting servers.*deploying.*live system.*dispatching agents/is,
  ]) assert.match(verification, required);
  assert.doesNotMatch(responseRule, /risk-bearing facts|verification economy/i);
});

test("repeatable-work economy chooses tools only when their full cost is repaid", () => {
  const efficiency = read("skills/efficiency/SKILL.md");
  const auditor = read("skills/efficiency/references/auditor.md");
  const repeatable = read("skills/efficiency/references/repeatable-work-economy.md");
  const responseRule = read("rules/response-simplicity.mdc");
  const authorityBoundary = /does not authorize creating or running tests, checks, scripts, or tools.*changing files.*generating or persisting artifacts.*dispatching agents.*starting servers.*deploying.*accessing live systems.*broadening the approved scope/is;

  assert.match(efficiency, /repeated manual work or whether to automate it.*read \[repeatable-work economy\]/is);
  assert.match(efficiency, authorityBoundary);
  assert.match(auditor, /repeated manual work or an automation choice.*read \[repeatable-work economy\]/is);
  for (const required of [
    /number and similarity of units.*likely reruns.*consistency risk.*reviewer-verification benefit/is,
    /cost to build, check, maintain, and eventually remove the tool/i,
    /Prefer direct work for a few obvious/i,
    /deterministic tool.*material repetition.*drift risk.*reuse.*rerunnable verification/is,
    /narrowly scoped.*fail visibly.*protected paths.*safe to rerun/is,
    /identical mechanical transformations.*deterministic tool over delegating/is,
    authorityBoundary,
  ]) assert.match(repeatable, required);
  assert.doesNotMatch(responseRule, /repeatable-work economy|rerunnable tool/i);
});

test("context optimization conditionally audits agent documents without weakening authority", () => {
  const context = read("skills/context-optimization/SKILL.md");
  const reference = read("skills/context-optimization/references/agent-document-design.md");

  assert.match(context, /When the scoped context includes skills, `AGENTS\.md`, rules, commands.*read \[agent document design\]/is);
  assert.match(context, /Do not load that reference for ordinary human-facing documentation/i);
  for (const required of [
    /persistent pointers.*matching task/is,
    /identify what it leads to.*distinct task branches/is,
    /instructions needed by every branch.*main workflow/is,
    /branch-specific policy or detail.*conditional link/is,
    /one authoritative location for each meaning/i,
    /scripts, configuration, directory layout, and command help as sources of truth/i,
    /required behavior directly.*hard guardrails.*safe target behavior/is,
    /completion conditions observable and proportional/i,
    /Edit only after explicit authorization/i,
  ]) assert.match(reference, required);
});

test("debugging feedback guidance stays conditional, advisory, and non-authorizing", () => {
  const efficiency = read("skills/efficiency/SKILL.md");
  const auditor = read("skills/efficiency/references/auditor.md");
  const debugging = read("skills/efficiency/references/debugging-feedback-economy.md");
  const responseRule = read("rules/response-simplicity.mdc");

  assert.match(efficiency, /When task economy concerns debugging.*read \[debugging feedback economy\]/is);
  assert.match(efficiency, /does not authorize diagnosis, instrumentation, tests, fixes, delegation, or artifact creation/i);
  assert.match(auditor, /debugging or performance work.*read \[debugging feedback economy\].*read-only and non-authorizing/is);
  for (const required of [
    /exact observed symptom/i,
    /finite feedback loop.*symptom specifically/is,
    /signal, speed, determinism, safety/is,
    /minimizing the reproducer.*hypothesis set.*instrumentation/is,
    /measured baseline.*optimization/is,
    /precise access, redacted artifact, or separate permission/is,
    /does not authorize creating tests, starting servers, instrumenting production, changing code, dispatching agents, or persisting debugging artifacts/i,
  ]) assert.match(debugging, required);
  assert.doesNotMatch(responseRule, /debugging feedback|reproducer|instrumenting production/i);
});

test("RTK setup keeps Cursor receipts separate from Codex direct execution", () => {
  const setup = `${read("commands/rtk-setup.md")}\n${read("skills/rtk-setup/SKILL.md")}`;
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

test("RTK evidence distinguishes shell-output estimates from whole-task economics", () => {
  const evidence = read("skills/efficiency/references/rtk-evidence.md");
  const efficiency = read("skills/efficiency/SKILL.md");
  const setup = read("skills/rtk-setup/SKILL.md");
  const filter = read("skills/rtk-filter-design/SKILL.md");
  assert.match(efficiency, /references\/rtk-evidence\.md/);
  assert.match(setup, /efficiency\/references\/rtk-evidence\.md/);
  assert.match(filter, /efficiency\/references\/rtk-evidence\.md/);
  for (const required of [
    /raw versus filtered shell-output volume/i,
    /not provider-billed tokens, whole-session input, or task cost/i,
    /Execution coverage.*rtk gain --history/is,
    /Shell-output reduction/i,
    /Contributor concentration.*absolute estimated reduction.*scoped total/is,
    /Do not rank usefulness from average percentage alone/i,
    /Whole-task net effect.*provider tokens or cost.*agent turns.*result quality.*unverified/is,
    /same task, host, model, effort, and relevant environment/i,
    /global, project, session, or task scoped.*cumulative or same-session/is,
    /Cursor, Codex, another host, mixed hosts, or an unknown host/i,
    /host truncation, context-cache pricing, commands that bypass RTK, retries, and re-reads/i,
    /Do not persist machine-specific history totals.*Do not add telemetry or a background benchmark/is,
  ]) assert.match(evidence, required);
  assert.match(setup, /installation, host configuration, observed execution, estimated shell-output reduction, contributor concentration.*whole-task net effect as separate states/is);
  assert.match(setup, /confirm only that RTK executed the rewritten command/i);
  assert.doesNotMatch(`${evidence}\n${efficiency}\n${setup}\n${filter}`, /128\.7M|80\.2M|39334/);
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
  assert.match(filter, /complete and exact paths.*ordering when material.*explicit truncation.*exit status.*warnings.*machine-consumed or piped output/is);
  assert.match(filter, /cannot establish those properties, do not recommend the filter/is);
  assert.match(filter, /leave that command unfiltered.*documented raw bypass/is);
  assert.match(filter, /material absolute contributors.*percentages on rare commands/is);
});

test("context optimization recognizes native Cursor and Codex context surfaces", () => {
  const context = `${read("commands/context-optimization.md")}\n${read("skills/context-optimization/SKILL.md")}`;
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
  assert.ok(Buffer.byteLength(cursorRule) < 1_200);
  for (const required of [
    /mixed technical knowledge/i,
    /explain necessary jargon once/i,
    /practical meaning/i,
    /next action, its owner.*required or optional/i,
    /Preserve relevant evidence.*validation status/is,
    /Keep code, commands, paths, identifiers, and error messages exact/i,
    /Do not force a fixed template/i,
    /restate only the last response.*plainly and briefly.*facts, evidence, risks, and open gaps.*add no analysis or claims/is,
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

test("all manifests and package metadata define version 3.1.0 without hooks, MCP, apps, or extensions", () => {
  const portable = JSON.parse(read("plugin.json"));
  const cursor = JSON.parse(read(".cursor-plugin/plugin.json"));
  const codex = JSON.parse(read(".codex-plugin/plugin.json"));
  const packageJson = JSON.parse(read("package.json"));
  const packageLock = JSON.parse(read("package-lock.json"));
  for (const value of [portable.version, cursor.version, codex.version, packageJson.version, packageLock.version, packageLock.packages[""].version]) {
    assert.equal(value, "3.1.0");
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
    "docs/agent-plugins-runtime-smoke.md",
    "docs/codex-runtime-smoke.md",
    "docs/installation.md",
    "docs/receipts/2.0.0-code-simplicity.md",
    "docs/receipts/2.0.0.md",
    "docs/release-checklist.md",
    "docs/release-validation.md",
    "docs/runtime-smoke.md",
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

test("public metadata and documentation present Evidence-Guided Simplicity consistently", () => {
  const portable = JSON.parse(read("plugin.json"));
  const cursor = JSON.parse(read(".cursor-plugin/plugin.json"));
  const codex = JSON.parse(read(".codex-plugin/plugin.json"));
  const readme = read("README.md");
  const changelog = read("CHANGELOG.md");
  const checklist = read("docs/release-checklist.md");

  for (const manifest of [portable, cursor, codex]) {
    assert.match(manifest.description, /^Evidence-Guided Simplicity/i);
    for (const keyword of ["simplicity", "over-engineering", "yagni", "kiss", "dry"]) {
      assert.ok(manifest.keywords.includes(keyword), `${manifest.name} is missing keyword ${keyword}`);
    }
  }
  assert.match(codex.interface.shortDescription, /smallest evidence-supported solution/i);
  assert.match(codex.interface.longDescription, /Evidence-Guided Simplicity.*coding, refactoring, and technical design/is);
  assert.match(codex.interface.defaultPrompt.join("\n"), /YAGNI, KISS, DRY.*proportionate validation/is);

  for (const document of [readme, changelog, checklist]) {
    assert.match(document, /Evidence-Guided Simplicity/);
  }
  assert.match(readme, /essential advantage.*ordinary coding, refactoring, and technical-design work.*naturally select/is);
  assert.match(readme, /YAGNI.*KISS.*DRY/is);
  assert.match(changelog, /qualitative benefit.*without adding components, dependencies, modes, hooks, MCP servers, or quantitative claims/is);

  for (const smoke of [
    read("docs/runtime-smoke.md"),
    read("docs/codex-runtime-smoke.md"),
    read("docs/agent-plugins-runtime-smoke.md"),
  ]) {
    assert.match(smoke, /without (?:a slash command|manually invoking|explicitly invoking).*efficiency/is);
    assert.match(smoke, /first.*sufficient/is);
    assert.match(smoke, /unnecessary principle narration/i);
  }
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

test("README and changelog document the three-target 3.0 surface and both migrations", () => {
  const readme = read("README.md");
  const changelog = read("CHANGELOG.md");
  for (const currentName of [
    "context-optimization", "efficiency", "rtk-filter-design", "rtk-setup",
    "rtk-filter-auditor", "efficiency-auditor", "response-simplicity", "response-simplicity-setup",
  ]) assert.ok(readme.includes(currentName), `README.md does not document ${currentName}`);
  for (const [oldName, replacement] of [
    ["/optimize-context", "/context-optimization"],
    ["/create-rtk-filter", "/rtk-filter-design"],
    ["/setup-rtk", "/rtk-setup"],
  ]) {
    assert.match(readme, new RegExp(`${oldName.replace("/", "\\/")}.*${replacement.replace("/", "\\/")}`));
    assert.ok(changelog.includes(oldName));
    assert.ok(changelog.includes(replacement));
  }
  for (const removedName of ["budget-efficiency", "review-efficiency", "efficiency-budget", "efficiency-review", "context-change-auditor"]) {
    assert.ok(readme.includes(removedName));
    assert.ok(changelog.includes(removedName));
  }
  assert.match(readme, /AI-Slop.*low-value generated output/i);
  assert.match(readme, /Review requests never edit code/);
  assert.match(readme, /mixed technical knowledge/i);
  assert.match(readme, /verified behavior, intended behavior, and open work/i);
  assert.match(readme, /cannot prove live activation or actual human comprehension/i);
  assert.match(readme, /at most two risk-bearing facts.*cheapest adequate direct evidence/is);
  assert.match(readme, /recommend an approach.*do not authorize tests or checks.*scripts or tools.*file changes.*persisted artifacts.*delegation.*servers.*deployment.*live access.*scope expansion/is);
  assert.match(readme, /rewrites only that response.*without adding new analysis or claims/is);
  assert.match(readme, /bounded Cursor smoke.*supplied baseline restatement.*immediately preceding assistant response unverified/is);
  assert.match(readme, /three-invocation Codex smoke.*implicit simplicity selection.*RTK setup.*optional response-guidance evidence.*exclusive restatement-only behavior.*separately approved/is);
  assert.match(readme, /stays within the existing communication workflows.*READMEs or RFCs/is);
  assert.match(readme, /Agent Plugins.*four portable skills/is);
  assert.match(readme, /Codex.*five skills/is);
  assert.match(readme, /estimated shell-output reduction.*not as proof of fewer provider-billed tokens, lower cost, or fewer agent turns/is);
  assert.match(readme, /four evidence classes.*whole-task net effect.*unverified.*comparable paired run/is);
  assert.match(readme, /without compatibility aliases/i);
  assert.match(changelog, /### Breaking/);
  assert.match(changelog, /version 3\.0\.0/i);
  assert.match(changelog, /shared RTK evidence contract.*execution coverage.*estimated shell-output reduction.*contributor concentration.*unverified whole-task net effect/is);
  assert.match(changelog, /semantic equivalence.*complete exact paths.*material ordering.*explicit truncation.*exit status.*warnings.*machine-consumed or piped output/is);
  assert.match(changelog, /## 2\.2\.0 - 2026-08-11/);
  assert.match(changelog, /Agent Plugins 1\.0\.0/i);
  assert.match(changelog, /## 2\.1\.0 - 2026-08-03/);
  assert.match(changelog, /three deterministic targets/i);
  assert.match(changelog, /shared human communication contract/i);
  assert.match(changelog, /verification-economy.*repeatable-work/is);
  assert.match(changelog, /test, check, script, tool, file, artifact, delegation, server, deployment, live-access, or scope-expansion authority/i);
  assert.match(changelog, /rewrites only the last response without new analysis or claims/i);
  assert.match(changelog, /Cursor checks a supplied baseline.*Codex combines a preceding-response restatement with setup status.*neither proves exclusive restatement-only behavior/is);
  assert.match(changelog, /without a separate restatement skill/i);
  assert.match(changelog, /without changing dependencies or component counts/i);
});

test("release guidance separates conformance, bundles, native runtimes, and publication evidence", () => {
  const checklist = read("docs/release-checklist.md");
  const agentPluginsSmoke = read("docs/agent-plugins-runtime-smoke.md");
  const cursorSmoke = read("docs/runtime-smoke.md");
  const codexSmoke = read("docs/codex-runtime-smoke.md");
  assert.match(checklist, /four portable skills.*four Cursor skills.*one Codex-only adapter source/is);
  assert.match(checklist, /versions agree at 3\.1\.0/i);
  assert.match(checklist, /command filenames, frontmatter names, and delegated portable skill names match exactly/i);
  assert.match(checklist, /each of the four shared skill directories is byte-identical/i);
  assert.match(checklist, /RTK evidence reporting separates execution coverage.*shell-output reduction.*contributor concentration.*whole-task net effect/is);
  assert.match(checklist, /complete exact paths.*material ordering.*explicit truncation.*exit status.*warnings.*machine-consumed or piped output/is);
  assert.match(checklist, /generated Codex target has exactly five immediate root skills/i);
  assert.match(checklist, /Format conformance.*Built bundle.*Cursor runtime.*Codex runtime.*publication/is);
  assert.match(checklist, /explicit model-call and cost limit/i);
  assert.match(checklist, /Agent Plugins.*Working Draft/i);
  assert.match(checklist, /All four portable skills link to the shared human communication contract/i);
  assert.match(checklist, /at most two risk-bearing facts.*cheapest adequate direct evidence/is);
  assert.match(checklist, /deterministic rerunnable tool.*identical delegated transformations/is);
  assert.match(checklist, /does not authorize tests, checks, scripts, tools, file changes, artifacts, delegation, servers, deployment, live access, or scope expansion/is);
  assert.match(checklist, /restate only the last response.*without new analysis or claims.*below 1,200 characters/is);
  assert.match(checklist, /supplied-baseline restatement evidence.*immediate last-response binding.*unverified.*additional model invocation/is);
  assert.match(checklist, /three-invocation Codex smoke.*implicit simplicity selection.*RTK setup.*response-guidance evidence.*exclusive restatement-only behavior.*unverified.*additional model invocation/is);
  assert.match(checklist, /Do not infer actual human comprehension/i);
  assert.match(agentPluginsSmoke, /only the immediately preceding answer.*without adding analysis or claims/is);
  assert.match(cursorSmoke, /at most two short fresh conversations/i);
  assert.match(cursorSmoke, /does not prove last-response binding/i);
  assert.match(cursorSmoke, /immediately preceding assistant response as `unverified`.*additional model invocation/is);
  assert.match(codexSmoke, /fresh Codex task/i);
  assert.match(codexSmoke, /at most three model invocations/i);
  assert.match(codexSmoke, /maximum approved cost/i);
  assert.match(codexSmoke, /Use the third invocation only if needed/i);
  assert.match(codexSmoke, /tests selection and fidelity of the restatement segment, not exclusive restatement-only behavior/is);
  assert.match(codexSmoke, /restatement of the immediately preceding Smoke 2 response.*restatement segment preserves.*without adding analysis or claims within that segment/is);
  assert.match(codexSmoke, /exclusive restatement-only behavior as `unverified`.*additional model invocation/is);
  assert.doesNotMatch(codexSmoke, /restatement of only the immediately preceding/i);
  assert.match(codexSmoke, /does not prove.*Marketplace publication/i);
  assert.match(cursorSmoke, /\/context-optimization.*\/rtk-filter-design.*\/rtk-setup/is);
  assert.match(cursorSmoke, /provider tokens, cost, agent turns, or result quality.*comparable paired run/is);
  assert.match(codexSmoke, /execution evidence.*shell-output reduction.*whole-task net effect unverified/is);
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
