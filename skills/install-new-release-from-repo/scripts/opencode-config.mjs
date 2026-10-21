import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { assertPath } from "./codex-install.mjs";

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

function readSharedFile(home, path) {
  assertPath(home, path);
  assertRegular(path, "OpenCode shared file");
  if (!lstatExists(path)) return { bytes: null, mode: null };
  return { bytes: readFileSync(path), mode: lstatSync(path).mode & 0o777 };
}

function assertUnchanged(home, path, expected) {
  const current = readSharedFile(home, path);
  const sameBytes = current.bytes === null ? expected.bytes === null : expected.bytes !== null && current.bytes.equals(expected.bytes);
  if (!sameBytes || (process.platform !== "win32" && current.mode !== expected.mode)) {
    throw new Error(`OpenCode shared file changed concurrently; current file preserved: ${path}`);
  }
}

function assertSharedPaths(home, paths) {
  for (const path of [paths.config, paths.configComments, paths.commands, paths.backups]) assertPath(home, path);
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

function readJsonDocument(home, path) {
  const file = readSharedFile(home, path);
  if (file.bytes === null) return { ...file, document: null };
  let document;
  try {
    document = JSON.parse(file.bytes.toString("utf8"));
  } catch {
    throw new Error(`invalid OpenCode JSON: ${path}`);
  }
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(`OpenCode config must be a JSON object: ${path}`);
  }
  return { ...file, document };
}

function readJsoncDocument(home, path) {
  const file = readSharedFile(home, path);
  if (file.bytes === null) return { ...file, document: null };
  const document = parseOpenCodeJsonc(file.bytes.toString("utf8"), path);
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(`OpenCode config must be a JSON object: ${path}`);
  }
  return { ...file, document };
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
  assertPath(home, join(root, "manifest.json"));
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
      assertPath(home, file.path);
      if (file.existed) {
        if (file.bytes === null || file.bytes === undefined) throw new Error(`OpenCode backup is missing bytes for ${file.path}`);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, file.bytes, { mode: 0o600, flag: "wx" });
      }
      manifestFiles.push({ kind: file.kind, path: file.path, existed: Boolean(file.existed), mode: file.mode ?? null, backup: file.existed ? backup : null });
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

export function restoreOpenCodeBackup(directory, { plugin, home, writes }) {
  assertPath(home, join(directory, "manifest.json"));
  const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8"));
  if (manifest?.schema !== 1 || manifest.plugin !== plugin || !Array.isArray(manifest.files)) {
    throw new Error(`OpenCode backup is not usable: ${directory}`);
  }
  const paths = openCodePaths(home, plugin);
  for (const file of manifest.files) {
    const target = resolve(file.path);
    const written = writes?.find((item) => item.path === target);
    if (writes && !written) continue;
    if (target !== paths.config && !isInside(paths.commands, target)) {
      throw new Error(`OpenCode backup restore target is outside the shared config: ${file.path}`);
    }
    if (!isInside(home, target)) throw new Error(`OpenCode restore target is outside the selected home: ${target}`);
    const current = written ?? readSharedFile(home, target);
    assertUnchanged(home, target, current);
    if (file.existed) {
      const backup = safeBackupName(file.backup);
      const source = resolve(directory, backup);
      assertPath(home, source);
      if (!isInside(directory, source) || !lstatExists(source) || !lstatSync(source).isFile() || lstatSync(source).isSymbolicLink()) {
        throw new Error(`OpenCode backup file is missing: ${file.backup}`);
      }
      atomicWrite(home, target, readFileSync(source), current, file.mode ?? 0o600);
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

function atomicWrite(home, path, bytes, expected, mode = expected.mode ?? 0o600) {
  assertPath(home, path);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, bytes, { mode: 0o600, flag: "wx" });
    chmodSync(temporary, mode);
    assertUnchanged(home, path, expected);
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
  assertSharedPaths(home, paths);
  const skillsPath = openCodeSkillsPath(home, plugin);
  const json = readJsonDocument(home, paths.config);
  const jsonc = readJsoncDocument(home, paths.configComments);
  const registered = openCodeSkillRegistered(json.document, skillsPath, home) || openCodeSkillRegistered(jsonc.document, skillsPath, home);
  const bytes = registered ? null : jsonBytes(updateOpenCodeDocument(json.document, skillsPath, home));
  const files = commandSources.map((source) => {
    const destination = join(paths.commands, source.name);
    const { bytes: currentBytes, mode } = readSharedFile(home, destination);
    const current = currentBytes === null ? null : currentBytes.toString("utf8");
    if (current !== null && current !== source.text && !isOwnOpenCodeCommand(source.name, current)) {
      throw new Error(`OpenCode command ${source.name} already exists and is not an Efficiency command`);
    }
    return { name: source.name, destination, source: source.text, currentBytes, mode, change: current !== source.text };
  });
  return {
    home,
    plugin,
    createdAt: createdAt || new Date().toISOString(),
    skillsPath,
    paths,
    config: { change: bytes !== null, registered, originalBytes: json.bytes, mode: json.mode, bytes },
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
      mode: plan.config.mode,
      nextBytes: plan.config.bytes,
      backup: "opencode.json",
    });
  }
  for (const file of plan.commands.files.filter((item) => item.change)) {
    files.push({
      kind: "opencode-command",
      path: file.destination,
      existed: file.currentBytes !== null,
      bytes: file.currentBytes,
      mode: file.mode,
      nextBytes: Buffer.from(file.source),
      backup: `commands/${file.name}`,
    });
  }
  for (const file of files) assertUnchanged(plan.home, file.path, file);
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
  applied.writes = [];
  const write = (file) => {
    atomicWrite(plan.home, file.path, file.nextBytes, file);
    applied.writes.push({ path: file.path, bytes: file.nextBytes, mode: file.mode ?? 0o600 });
  };
  if (plan.config.change) {
    write(files[0]);
  }
  if (hooks.afterConfig) hooks.afterConfig();
  for (const file of files.filter((item) => item.kind === "opencode-command")) write(file);
  if (hooks.afterCommands) hooks.afterCommands();
}

export function rollbackOpenCodeChanges(applied, { home, plugin }) {
  if (applied.backup) restoreOpenCodeBackup(applied.backup, { plugin, home, writes: applied.writes ?? [] });
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
  assertSharedPaths(home, paths);
  assertPath(home, paths.packageDir);
  const skillsPath = openCodeSkillsPath(home, plugin);
  const owned = ownedOpenCodeCommands(paths.packageDir, plugin);
  const json = readJsonDocument(home, paths.config);
  const jsonc = readJsoncDocument(home, paths.configComments);
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
    const { bytes, mode } = readSharedFile(home, destination);
    if (bytes === null) continue;
    if (!isOwnOpenCodeCommand(name, bytes.toString("utf8"))) continue;
    commands.push({ name, destination, bytes, mode });
  }
  const files = [];
  if (nextBytes !== null) files.push({ kind: "opencode-config", path: paths.config, existed: true, bytes: json.bytes, mode: json.mode, backup: "opencode.json" });
  for (const file of commands) files.push({ kind: "opencode-command", path: file.destination, existed: true, bytes: file.bytes, mode: file.mode, backup: `commands/${file.name}` });
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
  for (const file of files) assertUnchanged(home, file.path, file);
  const backup = files.length
    ? writeOpenCodeBackup({ home, plugin, root: paths.backups, createdAt: deployedAt, reason: "uninstall", files })
    : null;
  const applied = { backup, writes: [] };
  try {
    if (nextBytes !== null) {
      atomicWrite(home, paths.config, nextBytes, json);
      applied.writes.push({ path: paths.config, bytes: nextBytes, mode: json.mode });
    }
    for (const file of commands) {
      assertUnchanged(home, file.destination, file);
      rmSync(file.destination, { force: true });
      applied.writes.push({ path: file.destination, bytes: null, mode: null });
    }
    if (owned.present) rmSync(paths.packageDir, { recursive: true, force: true });
    result.backup = backup;
    result.opencode.backup = backup;
    return result;
  } catch (error) {
    rollbackOpenCodeChanges(applied, { plugin, home });
    throw new Error(`OpenCode uninstall rolled back: ${error.message}`, { cause: error });
  }
}
