import { randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { parse as parseJsonc } from "jsonc-parser";

export const OPENCODE_COMPATIBILITY = "2.1.2";
export const SHARED_OPENCODE_CONFIG_RULE = "OpenCode config (opencode.json, commands/) is shared with Workflow and Design: merge only, always write a persistent backup before changing anything, touch only your own entries, rollback/uninstall removes only your own entries.";

function slash(path) {
  return path.split(sep).join("/");
}

function isInside(base, candidate) {
  const item = relative(resolve(base), resolve(candidate));
  return item === "" || (item !== ".." && !item.startsWith(`..${sep}`) && !item.startsWith(sep));
}

function lstatExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function assertRegular(path, label) {
  if (!lstatExists(path)) return;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`${label} is not a regular file: ${path}`);
}

export function openCodeCommand(name, description) {
  return `---\ndescription: ${JSON.stringify(description)}\n---\n\nLoad the \`${name}\` skill and apply it to the current request.\n\n$ARGUMENTS\n`;
}

export function isOwnOpenCodeCommand(name, text) {
  const skill = name.endsWith(".md") ? name.slice(0, -3) : name;
  return text.includes(`Load the \`${skill}\` skill and apply it to the current request.`);
}

export function openCodePaths(home, plugin) {
  const configDir = join(resolve(home), ".config", "opencode");
  return {
    configDir,
    packageDir: join(configDir, plugin),
    config: join(configDir, "opencode.json"),
    configComments: join(configDir, "opencode.jsonc"),
    commands: join(configDir, "commands"),
    backups: join(configDir, ".local-deploy-backups", plugin),
  };
}

export function openCodeSkillsPath(home, plugin) {
  return slash(resolve(openCodePaths(home, plugin).packageDir, "skills"));
}

export function assertStandardOpenCodeConfig(home, env = process.env) {
  const supported = resolve(home, ".config", "opencode");
  const configured = resolve(env.OPENCODE_CONFIG_DIR ?? join(env.XDG_CONFIG_HOME || join(resolve(home), ".config"), "opencode"));
  if (configured !== supported) {
    const variable = env.OPENCODE_CONFIG_DIR !== undefined ? "OPENCODE_CONFIG_DIR" : "XDG_CONFIG_HOME";
    throw new Error(`unsupported OpenCode configuration directory from ${variable}: ${configured}; local deployment supports ${supported}`);
  }
}

export function expandOpenCodePath(entry, home) {
  const text = String(entry).replaceAll("\\", "/");
  const expanded = text.startsWith("~/") ? slash(resolve(home, text.slice(2))) : slash(resolve(text));
  return expanded;
}

export function parseOpenCodeJsonc(text, label = "OpenCode config") {
  const errors = [];
  const document = parseJsonc(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) throw new Error(`invalid OpenCode JSONC: ${label}`);
  return document;
}

function readJsonDocument(path) {
  assertRegular(path, "OpenCode config");
  if (!lstatExists(path)) return { present: false, bytes: null, document: null };
  const bytes = readFileSync(path);
  let document;
  try {
    document = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`invalid OpenCode JSON: ${path}`);
  }
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(`OpenCode config must be a JSON object: ${path}`);
  }
  return { present: true, bytes, document };
}

function readJsoncDocument(path) {
  assertRegular(path, "OpenCode JSONC");
  if (!lstatExists(path)) return { present: false, bytes: null, document: null };
  const bytes = readFileSync(path);
  const document = parseOpenCodeJsonc(bytes.toString("utf8"), path);
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(`OpenCode config must be a JSON object: ${path}`);
  }
  return { present: true, bytes, document };
}

function backupStamp(createdAt) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) throw new Error("OpenCode backup timestamp is invalid");
  return `${date.toISOString().replaceAll(":", "-")}-${randomUUID()}`;
}

function safeBackupName(name) {
  if (typeof name !== "string" || name === "" || name.startsWith("/") || name.startsWith("\\") || name.split(/[\\/]/).includes("..")) {
    throw new Error(`OpenCode backup name is not safe: ${name}`);
  }
  return name;
}

export function writeOpenCodeBackup({ home, plugin, root, createdAt, reason, files }) {
  if (!isInside(home, join(root, "manifest.json"))) throw new Error(`OpenCode backup is outside the selected home: ${root}`);
  mkdirSync(root, { recursive: true });
  const rootStat = lstatSync(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error(`OpenCode backup directory is not a physical directory: ${root}`);
  const directory = join(root, backupStamp(createdAt));
  if (lstatExists(directory)) throw new Error(`OpenCode backup already exists: ${directory}`);
  const stage = mkdtempSync(join(root, ".staging-"));
  try {
    const manifestFiles = [];
    for (const file of files) {
      const backup = safeBackupName(file.backup);
      const target = resolve(stage, backup);
      if (!isInside(stage, target)) throw new Error(`OpenCode backup escapes its directory: ${backup}`);
      if (!isInside(home, file.path)) throw new Error(`OpenCode backup source is outside the selected home: ${file.path}`);
      if (file.existed) {
        if (file.bytes === null || file.bytes === undefined) throw new Error(`OpenCode backup is missing bytes for ${file.path}`);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, file.bytes);
      }
      manifestFiles.push({ kind: file.kind, path: file.path, existed: Boolean(file.existed), backup: file.existed ? backup : null });
    }
    writeFileSync(join(stage, "manifest.json"), `${JSON.stringify({
      schema: 1,
      plugin,
      created_at: new Date(createdAt).toISOString(),
      reason,
      files: manifestFiles,
    }, null, 2)}\n`);
    renameSync(stage, directory);
    return directory;
  } catch (error) {
    rmSync(stage, { recursive: true, force: true });
    throw error;
  }
}

export function restoreOpenCodeBackup(directory, { plugin, home }) {
  const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8"));
  if (manifest?.schema !== 1 || manifest.plugin !== plugin || !Array.isArray(manifest.files)) {
    throw new Error(`OpenCode backup is not usable: ${directory}`);
  }
  const paths = openCodePaths(home, plugin);
  for (const file of manifest.files) {
    const target = resolve(file.path);
    if (target !== paths.config && !isInside(paths.commands, target)) {
      throw new Error(`OpenCode backup restore target is outside the shared config: ${file.path}`);
    }
    if (!isInside(home, target)) throw new Error(`OpenCode restore target is outside the selected home: ${target}`);
    if (lstatExists(target) && lstatSync(target).isSymbolicLink()) throw new Error(`OpenCode restore target is a symlink: ${target}`);
    if (file.existed) {
      const backup = safeBackupName(file.backup);
      const source = resolve(directory, backup);
      if (!isInside(directory, source) || !lstatExists(source) || !lstatSync(source).isFile() || lstatSync(source).isSymbolicLink()) {
        throw new Error(`OpenCode backup file is missing: ${file.backup}`);
      }
      atomicWrite(target, readFileSync(source));
    } else if (lstatExists(target)) rmSync(target, { force: true });
  }
}

export function openCodeSkillRegistered(document, skillsPath, home) {
  return Array.isArray(document?.skills) && document.skills.some((entry) => typeof entry === "string" && expandOpenCodePath(entry, home) === skillsPath);
}

export function updateOpenCodeDocument(document, skillsPath, home = undefined) {
  if (document !== null && (typeof document !== "object" || Array.isArray(document))) {
    throw new Error("OpenCode config must be a JSON object");
  }
  const next = document === null ? { $schema: "https://opencode.ai/config.json" } : structuredClone(document);
  if (next.skills === undefined) next.skills = [];
  if (!Array.isArray(next.skills) || next.skills.some((entry) => typeof entry !== "string")) {
    throw new Error("OpenCode skills entries must be strings");
  }
  const present = next.skills.some((entry) => entry === skillsPath || (home !== undefined && expandOpenCodePath(entry, home) === skillsPath));
  if (!present) next.skills = [...next.skills, skillsPath];
  return next;
}

function jsonBytes(document) {
  return Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
}

function atomicWrite(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, bytes);
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function commandSourcesFromPackage(packageRoot) {
  const directory = join(packageRoot, "commands");
  if (!existsSync(directory)) throw new Error("OpenCode package is missing commands");
  const names = readdirSync(directory).filter((name) => name.endsWith(".md")).sort();
  if (names.length === 0) throw new Error("OpenCode package is missing commands");
  return names.map((name) => ({ name, text: readFileSync(join(directory, name), "utf8") }));
}

export function commandSourcesFromEntries(entries) {
  return entries
    .filter((entry) => /^commands\/[^/]+\.md$/.test(entry.relativePath))
    .map((entry) => ({ name: entry.relativePath.slice("commands/".length), text: entry.bytes.toString("utf8") }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function planOpenCodeChanges({ home, plugin, commandSources, env = process.env, createdAt } = {}) {
  assertStandardOpenCodeConfig(home, env);
  if (!Array.isArray(commandSources) || commandSources.length === 0) throw new Error("OpenCode package is missing commands");
  const paths = openCodePaths(home, plugin);
  const skillsPath = openCodeSkillsPath(home, plugin);
  const json = readJsonDocument(paths.config);
  const jsonc = readJsoncDocument(paths.configComments);
  const registered = openCodeSkillRegistered(json.document, skillsPath, home) || openCodeSkillRegistered(jsonc.document, skillsPath, home);
  const bytes = registered ? null : jsonBytes(updateOpenCodeDocument(json.document, skillsPath, home));
  const files = commandSources.map((source) => {
    const destination = join(paths.commands, source.name);
    assertRegular(destination, "OpenCode command");
    const currentBytes = lstatExists(destination) ? readFileSync(destination) : null;
    const current = currentBytes === null ? null : currentBytes.toString("utf8");
    if (current !== null && current !== source.text && !isOwnOpenCodeCommand(source.name, current)) {
      throw new Error(`OpenCode command ${source.name} already exists and is not an Efficiency command`);
    }
    return { name: source.name, destination, source: source.text, currentBytes, change: current !== source.text };
  });
  return {
    home,
    plugin,
    createdAt: createdAt || new Date().toISOString(),
    skillsPath,
    paths,
    config: { change: bytes !== null, registered, originalBytes: json.bytes, bytes },
    commands: { change: files.some((file) => file.change), files },
  };
}

export function applyOpenCodeChanges(plan, applied, hooks = {}) {
  const files = [];
  if (plan.config.change) {
    files.push({
      kind: "opencode-config",
      path: plan.paths.config,
      existed: plan.config.originalBytes !== null,
      bytes: plan.config.originalBytes,
      backup: "opencode.json",
    });
  }
  for (const file of plan.commands.files.filter((item) => item.change)) {
    files.push({
      kind: "opencode-command",
      path: file.destination,
      existed: file.currentBytes !== null,
      bytes: file.currentBytes,
      backup: `commands/${file.name}`,
    });
  }
  if (files.length) {
    applied.backup = writeOpenCodeBackup({
      home: plan.home,
      plugin: plan.plugin,
      root: plan.paths.backups,
      createdAt: plan.createdAt,
      reason: "deploy",
      files,
    });
  }
  if (plan.config.change) {
    atomicWrite(plan.paths.config, plan.config.bytes);
    applied.configWritten = true;
  }
  if (hooks.afterConfig) hooks.afterConfig();
  if (plan.commands.files.some((file) => file.change)) mkdirSync(plan.paths.commands, { recursive: true });
  for (const file of plan.commands.files.filter((item) => item.change)) atomicWrite(file.destination, file.source);
  if (hooks.afterCommands) hooks.afterCommands();
}

export function rollbackOpenCodeChanges(applied, { home, plugin }) {
  if (applied.backup) restoreOpenCodeBackup(applied.backup, { plugin, home });
}

function ownedOpenCodeCommands(packageRoot, plugin) {
  if (!lstatExists(packageRoot)) return { present: false, names: [] };
  const stat = lstatSync(packageRoot);
  if (stat.isSymbolicLink()) throw new Error(`OpenCode package is a symlink: ${packageRoot}`);
  if (!stat.isDirectory()) throw new Error(`OpenCode package is not a directory: ${packageRoot}`);
  const manifestPath = join(packageRoot, ".opencode-plugin", "plugin.json");
  if (!existsSync(manifestPath)) throw new Error(`OpenCode package has no plugin manifest: ${packageRoot}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.name !== plugin) throw new Error(`OpenCode package belongs to ${manifest.name || "<unknown>"}`);
  const sourceDir = join(packageRoot, "commands");
  if (!lstatExists(sourceDir)) return { present: true, names: [] };
  const commandStat = lstatSync(sourceDir);
  if (commandStat.isSymbolicLink() || !commandStat.isDirectory()) throw new Error(`OpenCode package commands are not a directory: ${sourceDir}`);
  const names = readdirSync(sourceDir).filter((name) => name.endsWith(".md")).sort();
  for (const name of names) {
    if (basename(name) !== name || name.includes("..")) throw new Error(`OpenCode command name is not safe: ${name}`);
  }
  return { present: true, names };
}

export function uninstallOpenCodeDeployment({ plugin, home, env = process.env, deployedAt = new Date().toISOString() } = {}) {
  if (!plugin || typeof plugin !== "string") throw new Error("OpenCode uninstall requires a plugin name");
  assertStandardOpenCodeConfig(home, env);
  const paths = openCodePaths(home, plugin);
  const skillsPath = openCodeSkillsPath(home, plugin);
  const owned = ownedOpenCodeCommands(paths.packageDir, plugin);
  const json = readJsonDocument(paths.config);
  const jsonc = readJsoncDocument(paths.configComments);
  const removed = [];
  let nextBytes = null;
  if (json.document !== null && Array.isArray(json.document.skills)) {
    if (json.document.skills.some((entry) => typeof entry !== "string")) throw new Error("OpenCode skills entries must be strings");
    const skills = json.document.skills.filter((entry) => {
      const match = entry === skillsPath || expandOpenCodePath(entry, home) === skillsPath;
      if (match) removed.push(entry);
      return !match;
    });
    if (removed.length) {
      const next = structuredClone(json.document);
      next.skills = skills;
      nextBytes = jsonBytes(next);
    }
  }
  const commands = [];
  for (const name of owned.names) {
    const destination = join(paths.commands, name);
    if (!lstatExists(destination)) continue;
    assertRegular(destination, "OpenCode command");
    const bytes = readFileSync(destination);
    if (!isOwnOpenCodeCommand(name, bytes.toString("utf8"))) continue;
    commands.push({ name, destination, bytes });
  }
  const files = [];
  if (nextBytes !== null) files.push({ kind: "opencode-config", path: paths.config, existed: true, bytes: json.bytes, backup: "opencode.json" });
  for (const file of commands) files.push({ kind: "opencode-command", path: file.destination, existed: true, bytes: file.bytes, backup: `commands/${file.name}` });
  const result = {
    plugin,
    no_op: false,
    backup: null,
    opencode: {
      config: paths.config,
      skills: skillsPath,
      skills_removed: removed,
      commands_removed: commands.map((file) => file.name),
      package_removed: owned.present,
      jsonc_registered: openCodeSkillRegistered(jsonc.document, skillsPath, home),
      backup_root: paths.backups,
      backup: null,
    },
  };
  if (!files.length && !owned.present) return { ...result, no_op: true };
  const backup = files.length
    ? writeOpenCodeBackup({ home, plugin, root: paths.backups, createdAt: deployedAt, reason: "uninstall", files })
    : null;
  try {
    if (nextBytes !== null) atomicWrite(paths.config, nextBytes);
    for (const file of commands) rmSync(file.destination, { force: true });
    if (owned.present) rmSync(paths.packageDir, { recursive: true, force: true });
    result.backup = backup;
    result.opencode.backup = backup;
    return result;
  } catch (error) {
    if (backup) restoreOpenCodeBackup(backup, { plugin, home });
    throw new Error(`OpenCode uninstall rolled back: ${error.message}`, { cause: error });
  }
}
