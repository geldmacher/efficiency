#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { checkLinks } from "./check-links.mjs";
import { openCodeCommand, OPENCODE_COMPATIBILITY } from "../skills/install-new-release-from-repo/scripts/opencode-config.mjs";
import { validateAgentPlugin, validateCodexPlugin, validateOpenCodePackage, validatePlugin } from "./validate-plugin.mjs";

import { portableSkills, codexAdapterSkill } from "./plugin-components.mjs";

export { OPENCODE_COMPATIBILITY, openCodeCommand };

const defaultRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const plugin = "geldmacher-efficiency";
const codexAdapterSource = `adapters/codex/skills/${codexAdapterSkill}`;
const responseGuidanceRelative = `skills/${codexAdapterSkill}/references/response-simplicity.md`;
const persistentOutput = join(defaultRoot, ".build", "plugins");
const commonFiles = [
  "assets/logo.svg", "CHANGELOG.md", "LICENSE",
  "docs/installation.md", "docs/usage.md",
  ...portableSkills.map((name) => `skills/${name}`),
];
const allowed = {
  "agent-plugins": ["plugin.json", "schemas/agent-plugins", "README.md", ...commonFiles],
  cursor: [".cursor-plugin", "agents", "commands", "rules", "README.md", ...commonFiles],
  codex: [".codex-plugin", "README.md", ...commonFiles],
  opencode: commonFiles,
};
const developmentRoots = [".agents", ".build", ".cursor", ".git", "adapters", "node_modules", "targets", "test", "tests"];

function inside(base, path) {
  const item = relative(resolve(base), resolve(path));
  return item === "" || (item !== ".." && !item.startsWith(`..${sep}`) && !item.startsWith(sep));
}

function strictlyInside(base, path) {
  return resolve(base) !== resolve(path) && inside(base, path);
}

function canonicalCandidate(path) {
  let existing = resolve(path);
  const missing = [];
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) throw new Error(`target output has no existing ancestor: ${path}`);
    missing.unshift(relative(parent, existing));
    existing = parent;
  }
  return resolve(realpathSync(existing), ...missing);
}

function assertNoSymlinkComponents(base, path, label) {
  const basePath = resolve(base);
  const targetPath = resolve(path);
  if (!inside(basePath, targetPath)) throw new Error(`${label} escapes its allowed root`);
  let current = basePath;
  for (const part of relative(basePath, targetPath).split(sep).filter(Boolean)) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        throw new Error(`${label} may not contain symlink components: ${current}`);
      }
    } catch (error) {
      if (error?.code === "ENOENT") break;
      throw error;
    }
  }
}

function validateOutputRoot(outputRoot, sourceRoot) {
  const output = resolve(outputRoot);
  const canonicalOutput = canonicalCandidate(output);
  const canonicalRepository = realpathSync(defaultRoot);
  for (const source of new Set([canonicalRepository, realpathSync(sourceRoot)])) {
    const managedOutput = source === canonicalRepository && output === persistentOutput
      && canonicalOutput === join(canonicalRepository, ".build", "plugins");
    if (!managedOutput && (inside(source, canonicalOutput) || inside(canonicalOutput, source))) {
      throw new Error("target output must be the repository .build/plugins directory or a strict temporary-directory descendant; output overlaps plugin source");
    }
  }
  if (output === persistentOutput) {
    const expected = resolve(realpathSync(defaultRoot), ".build", "plugins");
    if (canonicalCandidate(output) !== expected) {
      throw new Error("persistent target output must resolve to the repository .build/plugins directory");
    }
    assertNoSymlinkComponents(defaultRoot, output, "persistent target output");
    return output;
  }

  const temporaryRoot = resolve(tmpdir());
  const canonicalTemporaryRoot = realpathSync(temporaryRoot);
  const lexicalBase = strictlyInside(temporaryRoot, output)
    ? temporaryRoot
    : strictlyInside(canonicalTemporaryRoot, output) ? canonicalTemporaryRoot : null;
  if (!lexicalBase) {
    throw new Error("target output must be the repository .build/plugins directory or a strict temporary-directory descendant");
  }
  assertNoSymlinkComponents(lexicalBase, output, "temporary target output");
  if (!strictlyInside(canonicalTemporaryRoot, canonicalCandidate(output))) {
    throw new Error("temporary target output resolves outside the temporary directory");
  }
  return output;
}

function copyRegular(source, destination, projectRoot) {
  const stat = lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error(`target source may not be a symlink: ${relative(projectRoot, source)}`);
  if (stat.isDirectory()) {
    mkdirSync(destination, { recursive: true, mode: stat.mode & 0o777 });
    for (const entry of readdirSync(source).sort()) copyRegular(join(source, entry), join(destination, entry), projectRoot);
    return;
  }
  if (!stat.isFile()) throw new Error(`target source must be a regular file: ${relative(projectRoot, source)}`);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, readFileSync(source), { mode: stat.mode & 0o777 });
  chmodSync(destination, stat.mode & 0o777);
}

function copyAllowed(projectRoot, destination, item) {
  const source = resolve(projectRoot, item);
  const output = resolve(destination, item);
  if (!inside(projectRoot, source) || !inside(destination, output)) throw new Error(`target path escapes its root: ${item}`);
  if (!existsSync(source)) throw new Error(`target source is missing: ${item}`);
  copyRegular(source, output, projectRoot);
}

function copyMapped(projectRoot, destination, sourceItem, destinationItem, transform = null) {
  const source = resolve(projectRoot, sourceItem);
  const output = resolve(destination, destinationItem);
  if (!inside(projectRoot, source) || !inside(destination, output)) {
    throw new Error(`mapped target path escapes its root: ${sourceItem} -> ${destinationItem}`);
  }
  if (!existsSync(source)) throw new Error(`mapped target source is missing: ${sourceItem}`);
  if (!transform) {
    copyRegular(source, output, projectRoot);
    return;
  }
  const stat = lstatSync(source);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`mapped target source must be a regular file: ${sourceItem}`);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, transform(readFileSync(source, "utf8")), { mode: stat.mode & 0o777 });
  chmodSync(output, stat.mode & 0o777);
}

function skillDescription(projectRoot, name) {
  const source = readFileSync(join(projectRoot, "skills", name, "SKILL.md"), "utf8");
  const document = parseDocument(source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "");
  const description = document.toJS()?.description;
  if (document.errors.length || typeof description !== "string") throw new Error(`invalid skill metadata: ${name}`);
  return description;
}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`built target contains a symlink: ${relative(directory, path)}`);
    return entry.isDirectory() ? files(path) : [path];
  }).sort();
}

function digest(directory) {
  const hash = createHash("sha256");
  for (const path of files(directory)) hash.update(`${relative(directory, path).split(sep).join("/")}\0${createHash("sha256").update(readFileSync(path)).digest("hex")}\n`);
  return hash.digest("hex");
}

function skillNames(directory, label) {
  if (!existsSync(directory) || !lstatSync(directory).isDirectory()) throw new Error(`${label} skills directory is missing`);
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(directory, entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();
}

function assertSkills(destination, directory, expected, label) {
  const actual = skillNames(join(destination, directory), label);
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} skills drifted: expected ${[...expected].sort().join(", ")}; got ${actual.join(", ")}`);
  }
}

export function validateBuiltTarget(destination, target, version) {
  for (const name of developmentRoots) if (existsSync(join(destination, name))) throw new Error(`${target} target leaked ${name}`);
  const manifestRelative = target === "agent-plugins"
    ? "plugin.json"
    : target === "cursor" ? ".cursor-plugin/plugin.json"
    : target === "codex" ? ".codex-plugin/plugin.json"
    : ".opencode-plugin/plugin.json";
  const manifestPath = join(destination, manifestRelative);
  if (!existsSync(manifestPath)) throw new Error(`${target} target manifest is missing: ${manifestRelative}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.name !== plugin || manifest.version !== version) throw new Error(`${target} manifest identity or version drifted`);

  const guidancePath = join(destination, "AGENTS.md");
  if (target === "codex") {
    if (!existsSync(guidancePath) || !lstatSync(guidancePath).isFile() || lstatSync(guidancePath).isSymbolicLink()) {
      throw new Error("Codex target must contain a regular root AGENTS.md response guidance file");
    }
    if (!readFileSync(guidancePath).equals(readFileSync(join(destination, responseGuidanceRelative)))) {
      throw new Error("Codex target AGENTS.md differs from canonical response guidance");
    }
  } else if (existsSync(guidancePath)) {
    throw new Error(`${target} target contains Codex-only AGENTS.md guidance`);
  }
  if (existsSync(join(destination, "CLAUDE.md"))) throw new Error(`${target} target contains CLAUDE.md`);

  if (target === "agent-plugins") {
    for (const path of [".cursor-plugin", ".codex-plugin", ".opencode-plugin", "commands", "agents", "rules", "mcp.json"]) {
      if (existsSync(join(destination, path))) throw new Error(`agent-plugins target contains non-portable component: ${path}`);
    }
    if ("extensions" in manifest) throw new Error("agent-plugins target must remain extension-free");
    assertSkills(destination, "skills", portableSkills, "Agent Plugins");
  } else if (target === "cursor") {
    if (existsSync(join(destination, "plugin.json"))) throw new Error(`${target} target contains the portable root manifest`);
    assertSkills(destination, "skills", portableSkills, "Cursor");
  } else if (target === "codex") {
    if (existsSync(join(destination, "plugin.json"))) throw new Error("codex target contains the portable root manifest");
    assertSkills(destination, "skills", [...portableSkills, codexAdapterSkill], "Codex");
  } else if (target === "opencode") {
    if (existsSync(join(destination, "plugin.json"))) throw new Error("opencode target contains the portable root manifest");
    assertSkills(destination, "skills", portableSkills, "OpenCode");
    if (manifest.skills !== "./skills/") throw new Error("OpenCode target skill path drifted from ./skills/");
    if (manifest.opencodeCompatibility !== OPENCODE_COMPATIBILITY) throw new Error(`OpenCode package must target OpenCode ${OPENCODE_COMPATIBILITY}`);
  } else throw new Error(`unsupported target: ${target}`);

  if (target === "cursor") {
    if (existsSync(join(destination, ".codex-plugin")) || existsSync(join(destination, ".opencode-plugin")) || existsSync(join(destination, "skills", "response-simplicity-setup"))) {
      throw new Error("Cursor target contains Codex-only components");
    }
  } else if (target === "opencode") {
    for (const path of [".cursor-plugin", ".codex-plugin", "agents", "rules", "skills/response-simplicity-setup"]) {
      if (existsSync(join(destination, path))) throw new Error(`OpenCode target contains a foreign component: ${path}`);
    }
  } else if (target === "codex") {
    if (existsSync(join(destination, ".cursor-plugin")) || existsSync(join(destination, "commands"))
      || existsSync(join(destination, "agents")) || existsSync(join(destination, "rules"))) {
      throw new Error("Codex target contains Cursor-only components");
    }
    const codexPluginEntries = readdirSync(join(destination, ".codex-plugin")).sort();
    if (JSON.stringify(codexPluginEntries) !== JSON.stringify(["plugin.json"])) {
      throw new Error("Codex target .codex-plugin must contain only plugin.json");
    }
    if (manifest.skills !== "./skills/") throw new Error("Codex target skill path drifted from ./skills/");
  }
  const structuralFailures = target === "agent-plugins"
    ? validateAgentPlugin(destination)
    : target === "cursor" ? validatePlugin(destination)
    : target === "codex" ? validateCodexPlugin(destination)
    : validateOpenCodePackage(destination);
  if (structuralFailures.length > 0) {
    throw new Error(`${target} target structure is invalid:\n- ${structuralFailures.join("\n- ")}`);
  }
  const linkFailures = checkLinks(destination);
  if (linkFailures.length > 0) {
    throw new Error(`${target} target Markdown links are invalid:\n- ${linkFailures.join("\n- ")}`);
  }
  files(destination);
}

export function buildPluginTargets(outputRoot, sourceRoot = defaultRoot) {
  const projectRoot = resolve(sourceRoot);
  const output = validateOutputRoot(outputRoot, projectRoot);
  const targets = ["agent-plugins", "cursor", "codex", "opencode"];
  const destinations = Object.fromEntries(targets.map((target) => [target, join(output, target, plugin)]));
  for (const [target, destination] of Object.entries(destinations)) {
    if (!strictlyInside(output, destination)) throw new Error(`${target} target destination escapes the output root`);
    assertNoSymlinkComponents(output, destination, `${target} target destination`);
  }
  for (const destination of Object.values(destinations)) rmSync(destination, { recursive: true, force: true });
  const version = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")).version;
  const result = { version };
  for (const target of targets) {
    const destination = destinations[target];
    for (const item of allowed[target]) copyAllowed(projectRoot, destination, item);
    if (target === "codex") {
      copyMapped(projectRoot, destination, codexAdapterSource, `skills/${codexAdapterSkill}`);
      copyMapped(projectRoot, destination, `${codexAdapterSource}/references/response-simplicity.md`, "AGENTS.md");
    }
    if (target === "opencode") {
      copyMapped(projectRoot, destination, "targets/opencode/.opencode-plugin", ".opencode-plugin");
      copyMapped(projectRoot, destination, "targets/opencode/README.md", "README.md", (text) => text.replaceAll("../../docs/", "docs/").replaceAll("../../skills/", "skills/"));
      for (const name of portableSkills) {
        const output = resolve(destination, "commands", `${name}.md`);
        mkdirSync(dirname(output), { recursive: true });
        writeFileSync(output, openCodeCommand(name, skillDescription(projectRoot, name)), { mode: 0o644 });
      }
    }
    validateBuiltTarget(destination, target, version);
    result[target] = { path: destination, hash: digest(destination), files: files(destination).length };
  }
  return result;
}

const direct = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const check = process.argv.includes("--check");
  const output = check ? mkdtempSync(join(tmpdir(), "efficiency-target-check-")) : persistentOutput;
  try {
    process.stdout.write(`${JSON.stringify(buildPluginTargets(output), null, 2)}\n`);
  } finally {
    if (check) rmSync(output, { recursive: true, force: true });
  }
}
