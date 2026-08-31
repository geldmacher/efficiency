#!/usr/bin/env node
import {
  existsSync,
  globSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parseDocument } from "yaml";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const defaultRoot = dirname(scriptDirectory);
const cursorSchemaPath = join(defaultRoot, "schemas", "plugin.schema.json");
const agentPluginsSchemaPath = join(defaultRoot, "schemas", "agent-plugins", "1.0.0", "plugin.schema.json");
const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const globPattern = /[*?[{]/;
const componentPredicates = {
  commands: (file) => [".md", ".txt"].includes(extname(file)),
  agents: (file) => extname(file) === ".md",
  skills: (file) => basename(file) === "SKILL.md",
  rules: (file) => [".md", ".mdc"].includes(extname(file)),
};
const codexManifestKeys = new Set([
  "id", "name", "version", "description", "skills", "apps", "mcpServers",
  "interface", "author", "homepage", "repository", "license", "keywords",
]);
const codexInterfaceKeys = new Set([
  "displayName", "shortDescription", "longDescription", "developerName", "category",
  "capabilities", "websiteURL", "privacyPolicyURL", "termsOfServiceURL", "brandColor",
  "composerIcon", "logo", "logoDark", "screenshots", "defaultPrompt", "default_prompt",
]);
const httpsPattern = /^https:\/\/[^\s/$.?#].[^\s]*$/i;
const hexColorPattern = /^#[0-9a-f]{6}$/i;
const agentSkillKeys = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
const portableSkillNames = ["context-optimization", "efficiency", "rtk-filter-design", "rtk-setup"];
const codexAdapterSkillsRelative = "adapters/codex/skills";

function readText(path) {
  return readFileSync(path, "utf8");
}

function listFilesRecursive(directory, predicate) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFilesRecursive(path, predicate));
    else if ((entry.isFile() || entry.isSymbolicLink()) && predicate(path)) files.push(path);
  }
  return files.sort();
}

function isWithin(root, target) {
  const path = relative(root, target);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

function staticPath(path) {
  const match = path.match(globPattern);
  if (!match) return path;
  const prefix = path.slice(0, match.index);
  if (prefix === "") return ".";
  return prefix.endsWith("/") ? prefix.slice(0, -1) : dirname(prefix);
}

function formatAjvError(error, label = "plugin.json") {
  const location = error.instancePath || "/";
  const detail = error.keyword === "additionalProperties"
    ? `${error.message}: ${error.params.additionalProperty}`
    : error.message;
  return `${label} ${location}: ${detail}`;
}

function normalizedFailures(rootPath, failures) {
  return [...new Set(failures.map((failure) => failure.replace(`${rootPath}${sep}`, "")))];
}

export function parseFrontmatter(file, failures = []) {
  const text = readText(file);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    failures.push(`${file}: missing or malformed frontmatter`);
    return {};
  }

  const document = parseDocument(match[1], { prettyErrors: false, uniqueKeys: true });
  if (document.errors.length > 0) {
    for (const error of document.errors) failures.push(`${file}: invalid YAML: ${error.message}`);
    return {};
  }

  const value = document.toJS();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push(`${file}: frontmatter must be a YAML object`);
    return {};
  }
  return value;
}

function requireString(fields, field, label, failures) {
  if (typeof fields[field] !== "string" || fields[field].trim() === "") {
    failures.push(`${label}: missing non-empty string field ${field}`);
  }
}

function optionalString(fields, field, label, failures) {
  if (field in fields && (typeof fields[field] !== "string" || fields[field].trim() === "")) {
    failures.push(`${label}: ${field} must be a non-empty string when present`);
  }
}

function rejectUnknownFields(fields, allowed, label, failures) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return;
  for (const field of Object.keys(fields).sort()) {
    if (!allowed.has(field)) failures.push(`${label}: unsupported field ${field}`);
  }
}

function validateHttpsUrl(fields, field, label, failures) {
  if (!(field in fields)) return;
  if (typeof fields[field] !== "string" || !httpsPattern.test(fields[field])) {
    failures.push(`${label}: ${field} must be an absolute https URL`);
  }
}

function rejectTodoMarkers(value, label, failures) {
  if (typeof value === "string" && value.includes("[TODO:")) {
    failures.push(`${label}: contains a TODO placeholder`);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => rejectTodoMarkers(item, `${label}[${index}]`, failures));
  } else if (value && typeof value === "object") {
    for (const [field, item] of Object.entries(value)) rejectTodoMarkers(item, `${label}.${field}`, failures);
  }
}

function validateComponentNames(records, type, failures) {
  const seen = new Map();
  for (const record of records) {
    if (typeof record.fields.name !== "string") continue;
    const previous = seen.get(record.fields.name);
    if (previous) failures.push(`${type}: duplicate name ${record.fields.name} in ${previous} and ${record.label}`);
    else seen.set(record.fields.name, record.label);
  }
}

function validatePortableCommandSkillParity(records, failures) {
  const commandNames = records.commands
    .map((record) => record.fields.name)
    .filter((name) => typeof name === "string")
    .sort();
  const skillNames = records.skills
    .map((record) => record.fields.name)
    .filter((name) => typeof name === "string")
    .sort();
  if (JSON.stringify(commandNames) !== JSON.stringify(skillNames)) {
    failures.push(
      `Cursor command names must exactly match portable skill names: commands=${commandNames.join(",")} skills=${skillNames.join(",")}`,
    );
  }
}

function componentPaths(value) {
  return Array.isArray(value) ? value : [value];
}

function readJson(path, label, failures) {
  try {
    return JSON.parse(readText(path));
  } catch (error) {
    failures.push(`${label} is invalid JSON: ${error.message}`);
    return undefined;
  }
}

function validatePathPrefix(rootPath, value, label, failures) {
  if (typeof value !== "string" || value.trim() === "") {
    failures.push(`${label}: path must be a non-empty string`);
    return false;
  }
  if (isAbsolute(value)) {
    failures.push(`${label}: absolute paths are not allowed: ${value}`);
    return false;
  }

  const prefix = resolve(rootPath, staticPath(value));
  if (!isWithin(rootPath, prefix)) {
    failures.push(`${label}: path escapes plugin root: ${value}`);
    return false;
  }
  return true;
}

function validateCandidate(rootPath, rootReal, candidate, label, source, failures) {
  if (!isWithin(rootPath, candidate)) {
    failures.push(`${label}: path escapes plugin root: ${source}`);
    return false;
  }
  if (!existsSync(candidate)) {
    failures.push(`${label}: target does not exist: ${source}`);
    return false;
  }
  if (!isWithin(rootReal, realpathSync(candidate))) {
    failures.push(`${label}: target resolves outside plugin root: ${source}`);
    return false;
  }
  return true;
}

function declaredCandidates(rootPath, value, label, failures) {
  if (!validatePathPrefix(rootPath, value, label, failures)) return [];
  if (!globPattern.test(value)) return [resolve(rootPath, value)];

  try {
    return globSync(value, { cwd: rootPath }).map((match) => resolve(rootPath, match));
  } catch (error) {
    failures.push(`${label}: invalid glob ${value}: ${error.message}`);
    return [];
  }
}

function resolveDeclaredComponents(rootPath, rootReal, value, type, failures) {
  const label = `plugin.json ${type}`;
  const predicate = componentPredicates[type];
  const candidates = declaredCandidates(rootPath, value, label, failures);
  const files = [];

  if (candidates.length === 0 && validatePathPrefix(rootPath, value, label, [])) {
    failures.push(`${label}: path or glob matches no targets: ${value}`);
    return files;
  }

  for (const candidate of candidates) {
    if (!validateCandidate(rootPath, rootReal, candidate, label, value, failures)) continue;
    const stat = statSync(candidate);
    const discovered = stat.isDirectory()
      ? listFilesRecursive(candidate, predicate)
      : stat.isFile() && predicate(candidate) ? [candidate] : [];

    for (const file of discovered) {
      if (validateCandidate(rootPath, rootReal, file, label, value, failures)) files.push(resolve(file));
    }
  }

  const unique = [...new Set(files)].sort();
  if (unique.length === 0 && candidates.length > 0) {
    failures.push(`${label}: path or glob matches no component files: ${value}`);
  }
  return unique;
}

function validateDeclaredResource(rootPath, rootReal, value, label, failures) {
  if (!validatePathPrefix(rootPath, value, label, failures)) return;
  const candidate = resolve(rootPath, value);
  validateCandidate(rootPath, rootReal, candidate, label, value, failures);
}

function componentRecords(rootPath, rootReal, manifest, type, failures) {
  if (!(type in manifest)) return [];
  const files = componentPaths(manifest[type]).flatMap((value) => (
    resolveDeclaredComponents(rootPath, rootReal, value, type, failures)
  ));
  return [...new Set(files)].map((file) => ({
    file,
    label: relative(rootPath, file),
    fields: parseFrontmatter(file, failures),
  }));
}

function validateCommand(record, failures) {
  requireString(record.fields, "name", record.label, failures);
  requireString(record.fields, "description", record.label, failures);
  if (record.fields.name && record.fields.name !== basename(record.file, extname(record.file))) {
    failures.push(`${record.label}: name must match filename`);
  }
  if (record.fields.name && !namePattern.test(record.fields.name)) failures.push(`${record.label}: invalid name`);
}

function validateAgent(record, failures) {
  requireString(record.fields, "name", record.label, failures);
  requireString(record.fields, "description", record.label, failures);
  optionalString(record.fields, "model", record.label, failures);
  if (record.fields.name && record.fields.name !== basename(record.file, ".md")) {
    failures.push(`${record.label}: name must match filename`);
  }
  if (record.fields.name && !namePattern.test(record.fields.name)) failures.push(`${record.label}: invalid name`);
  if ("readonly" in record.fields && typeof record.fields.readonly !== "boolean") {
    failures.push(`${record.label}: readonly must be boolean when present`);
  }
}

function validateSkill(record, failures) {
  requireString(record.fields, "name", record.label, failures);
  requireString(record.fields, "description", record.label, failures);
  if (record.fields.name && record.fields.name !== basename(dirname(record.file))) {
    failures.push(`${record.label}: name must match parent folder`);
  }
  if (record.fields.name && !namePattern.test(record.fields.name)) failures.push(`${record.label}: invalid name`);
  if ("disable-model-invocation" in record.fields && typeof record.fields["disable-model-invocation"] !== "boolean") {
    failures.push(`${record.label}: disable-model-invocation must be boolean`);
  }
}

function skillBody(file) {
  const text = readText(file);
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  return match ? text.slice(match[0].length).trim() : "";
}

function validateAgentSkill(record, failures) {
  const fields = record.fields;
  rejectUnknownFields(fields, agentSkillKeys, record.label, failures);
  requireString(fields, "name", record.label, failures);
  requireString(fields, "description", record.label, failures);

  if (typeof fields.name === "string") {
    if (fields.name.length > 64 || !namePattern.test(fields.name)) {
      failures.push(`${record.label}: name must be 1-64 lowercase letters, numbers, or single hyphens`);
    }
    if (fields.name !== basename(dirname(record.file))) failures.push(`${record.label}: name must match parent folder`);
  }
  if (typeof fields.description === "string" && (fields.description.length < 1 || fields.description.length > 1024)) {
    failures.push(`${record.label}: description must be 1-1024 characters`);
  }
  optionalString(fields, "license", record.label, failures);
  optionalString(fields, "compatibility", record.label, failures);
  if (typeof fields.compatibility === "string" && fields.compatibility.length > 500) {
    failures.push(`${record.label}: compatibility must be at most 500 characters`);
  }
  optionalString(fields, "allowed-tools", record.label, failures);
  if ("metadata" in fields) {
    if (!fields.metadata || typeof fields.metadata !== "object" || Array.isArray(fields.metadata)) {
      failures.push(`${record.label}: metadata must be a string-to-string mapping`);
    } else if (Object.values(fields.metadata).some((value) => typeof value !== "string")) {
      failures.push(`${record.label}: metadata values must be strings`);
    }
  }
  if (!skillBody(record.file)) failures.push(`${record.label}: Markdown body must not be empty`);
}

function validateRegularTree(rootReal, directory, label, failures, seen = new Set()) {
  let resolved;
  try {
    resolved = realpathSync(directory);
  } catch (error) {
    failures.push(`${label}: cannot resolve path: ${error.message}`);
    return;
  }
  if (!isWithin(rootReal, resolved)) {
    failures.push(`${label}: resolves outside plugin root`);
    return;
  }
  if (seen.has(resolved)) return;
  seen.add(resolved);

  const stat = statSync(directory);
  if (!stat.isDirectory()) {
    if (!stat.isFile()) failures.push(`${label}: must resolve to a regular file or directory`);
    return;
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    validateRegularTree(rootReal, join(directory, entry.name), `${label}/${entry.name}`, failures, seen);
  }
}

function agentSkillRecords(rootPath, rootReal, skillsRelative, failures, label = skillsRelative) {
  const skillsRoot = join(rootPath, skillsRelative);
  if (!existsSync(skillsRoot)) {
    failures.push(`${label}: directory is missing`);
    return [];
  }
  if (!statSync(skillsRoot).isDirectory()) {
    failures.push(`${label}: must resolve to a directory`);
    return [];
  }
  if (!isWithin(rootReal, realpathSync(skillsRoot))) {
    failures.push(`${label}: directory resolves outside plugin root`);
    return [];
  }
  validateRegularTree(rootReal, skillsRoot, label, failures);

  const records = [];
  for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const skillDirectory = join(skillsRoot, entry.name);
    let stat;
    try { stat = statSync(skillDirectory); }
    catch (error) { failures.push(`${label}/${entry.name}: cannot inspect path: ${error.message}`); continue; }
    if (!stat.isDirectory()) continue;
    if (!isWithin(rootReal, realpathSync(skillDirectory))) {
      failures.push(`${label}/${entry.name}: resolves outside plugin root`);
      continue;
    }
    const skillFile = join(skillDirectory, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    if (!statSync(skillFile).isFile()) {
      failures.push(`${label}/${entry.name}/SKILL.md: must resolve to a regular file`);
      continue;
    }
    if (!isWithin(rootReal, realpathSync(skillFile))) {
      failures.push(`${label}/${entry.name}/SKILL.md: resolves outside plugin root`);
      continue;
    }
    const record = {
      file: skillFile,
      label: relative(rootPath, skillFile),
      fields: parseFrontmatter(skillFile, failures),
    };
    validateAgentSkill(record, failures);
    records.push(record);
  }
  validateComponentNames(records, label, failures);
  return records;
}

function validateRule(record, failures) {
  requireString(record.fields, "description", record.label, failures);
  if ("alwaysApply" in record.fields && typeof record.fields.alwaysApply !== "boolean") {
    failures.push(`${record.label}: alwaysApply must be boolean when present`);
  }
  if ("globs" in record.fields) {
    const globs = Array.isArray(record.fields.globs) ? record.fields.globs : [record.fields.globs];
    if (globs.some((glob) => typeof glob !== "string" || glob.trim() === "")) {
      failures.push(`${record.label}: globs must be a string or an array of non-empty strings`);
    }
  }
}

export function validateAgentPlugin(root = defaultRoot) {
  const failures = [];
  const rootPath = resolve(root);
  if (!existsSync(rootPath)) return [`plugin root does not exist: ${rootPath}`];
  const rootReal = realpathSync(rootPath);
  const manifestPath = join(rootPath, "plugin.json");
  if (!existsSync(manifestPath)) return ["plugin.json is missing"];
  if (!lstatSync(manifestPath).isFile()) failures.push("plugin.json must be a regular file, not a link or special file");
  if (!isWithin(rootReal, realpathSync(manifestPath))) failures.push("plugin.json resolves outside plugin root");

  const manifest = readJson(manifestPath, "plugin.json", failures);
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    if (manifest !== undefined) failures.push("plugin.json must contain a JSON object");
    return normalizedFailures(rootPath, failures);
  }

  const schema = JSON.parse(readText(agentPluginsSchemaPath));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validateManifest = ajv.compile(schema);
  if (!validateManifest(manifest)) failures.push(...validateManifest.errors.map((error) => formatAjvError(error)));

  const skillsRoot = join(rootPath, "skills");
  if (existsSync(skillsRoot)) agentSkillRecords(rootPath, rootReal, "skills", failures);
  return normalizedFailures(rootPath, failures);
}

export function validatePlugin(root = defaultRoot) {
  const failures = [];
  const rootPath = resolve(root);
  if (!existsSync(rootPath)) return [`plugin root does not exist: ${rootPath}`];
  const rootReal = realpathSync(rootPath);
  const manifestPath = join(rootPath, ".cursor-plugin", "plugin.json");
  if (!existsSync(manifestPath)) return [".cursor-plugin/plugin.json is missing"];

  const manifest = readJson(manifestPath, "plugin.json", failures);
  if (!manifest) return normalizedFailures(rootPath, failures);

  const schema = JSON.parse(readText(cursorSchemaPath));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validateManifest = ajv.compile(schema);
  if (!validateManifest(manifest)) failures.push(...validateManifest.errors.map(formatAjvError));

  const records = {};
  for (const type of Object.keys(componentPredicates)) {
    records[type] = componentRecords(rootPath, rootReal, manifest, type, failures);
  }

  for (const record of records.commands) validateCommand(record, failures);
  for (const record of records.agents) validateAgent(record, failures);
  for (const record of records.skills) validateSkill(record, failures);
  for (const record of records.rules) validateRule(record, failures);
  for (const type of ["commands", "agents", "skills"]) validateComponentNames(records[type], type, failures);
  if (manifest.name === "geldmacher-efficiency") validatePortableCommandSkillParity(records, failures);

  for (const field of ["hooks", "mcpServers"]) {
    if (!(field in manifest)) continue;
    for (const value of componentPaths(manifest[field])) {
      if (typeof value === "string") validateDeclaredResource(rootPath, rootReal, value, `plugin.json ${field}`, failures);
    }
  }
  if (manifest.logo && !/^https?:\/\//.test(manifest.logo)) {
    validateDeclaredResource(rootPath, rootReal, manifest.logo, "plugin.json logo", failures);
  }

  return normalizedFailures(rootPath, failures);
}

export function validateCodexPlugin(root = defaultRoot) {
  const failures = [];
  const rootPath = resolve(root);
  if (!existsSync(rootPath)) return [`plugin root does not exist: ${rootPath}`];
  const rootReal = realpathSync(rootPath);
  const manifestPath = join(rootPath, ".codex-plugin", "plugin.json");
  if (!existsSync(manifestPath)) return [".codex-plugin/plugin.json is missing"];

  const manifest = readJson(manifestPath, ".codex-plugin/plugin.json", failures);
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    if (manifest !== undefined) failures.push(".codex-plugin/plugin.json must contain a JSON object");
    return normalizedFailures(rootPath, failures);
  }

  rejectTodoMarkers(manifest, "plugin.json", failures);
  rejectUnknownFields(manifest, codexManifestKeys, "plugin.json", failures);
  for (const field of ["name", "version", "description"]) requireString(manifest, field, "plugin.json", failures);
  if (manifest.name && !namePattern.test(manifest.name)) failures.push(`plugin.json: invalid name ${manifest.name}`);
  if (manifest.version && !semverPattern.test(manifest.version)) {
    failures.push(`plugin.json: version is not strict semantic versioning: ${manifest.version}`);
  }
  for (const field of ["homepage", "repository"]) validateHttpsUrl(manifest, field, "plugin.json", failures);
  if ("keywords" in manifest && (!Array.isArray(manifest.keywords)
    || manifest.keywords.some((item) => typeof item !== "string" || !item.trim()))) {
    failures.push("plugin.json: keywords must be an array of non-empty strings");
  }

  if (!manifest.author || typeof manifest.author !== "object" || Array.isArray(manifest.author)) {
    failures.push("plugin.json: author must be an object");
  } else {
    rejectUnknownFields(manifest.author, new Set(["name", "email", "url"]), "plugin.json author", failures);
    requireString(manifest.author, "name", "plugin.json author", failures);
    optionalString(manifest.author, "email", "plugin.json author", failures);
    validateHttpsUrl(manifest.author, "url", "plugin.json author", failures);
  }

  if (manifest.skills !== "./skills/") {
    failures.push("plugin.json: skills must declare the root ./skills/ directory");
  }
  for (const unsupported of ["apps", "mcpServers"]) {
    if (unsupported in manifest) failures.push(`plugin.json: ${unsupported} is outside this plugin's declared surface`);
  }

  const codexPluginEntries = readdirSync(join(rootPath, ".codex-plugin")).sort();
  if (JSON.stringify(codexPluginEntries) !== JSON.stringify(["plugin.json"])) {
    failures.push(".codex-plugin must contain only plugin.json");
  }

  const rootSkillRecords = agentSkillRecords(rootPath, rootReal, "skills", failures, "skills");
  const hasAdapterSource = existsSync(join(rootPath, codexAdapterSkillsRelative));
  const adapterRecords = hasAdapterSource
    ? agentSkillRecords(
      rootPath,
      rootReal,
      codexAdapterSkillsRelative,
      failures,
      codexAdapterSkillsRelative,
    )
    : [];
  const codexSkillRecords = [...rootSkillRecords, ...adapterRecords];
  for (const record of codexSkillRecords) {
    if (record.fields["disable-model-invocation"] === true || record.fields.disable_model_invocation === true) {
      failures.push(`${record.label}: Codex plugin skills must allow model invocation`);
    }
  }
  validateComponentNames(codexSkillRecords, "Codex skills", failures);
  if (rootSkillRecords.length === 0) failures.push("skills: no Codex SKILL.md files discovered");
  if (hasAdapterSource && adapterRecords.length === 0) {
    failures.push(`${codexAdapterSkillsRelative}: no adapter SKILL.md files discovered`);
  }

  if (!manifest.interface || typeof manifest.interface !== "object" || Array.isArray(manifest.interface)) {
    failures.push("plugin.json: interface must be an object");
  } else {
    const fields = manifest.interface;
    rejectUnknownFields(fields, codexInterfaceKeys, "plugin.json interface", failures);
    for (const field of ["displayName", "shortDescription", "longDescription", "developerName", "category"]) {
      requireString(fields, field, "plugin.json interface", failures);
    }
    if (!("defaultPrompt" in fields) && !("default_prompt" in fields)) {
      failures.push("plugin.json interface: defaultPrompt or default_prompt is required");
    }
    for (const promptField of ["defaultPrompt", "default_prompt"]) {
      if (!(promptField in fields)) continue;
      if (!Array.isArray(fields[promptField]) || fields[promptField].length === 0
        || fields[promptField].length > 3
        || fields[promptField].some((item) => typeof item !== "string" || !item.trim() || item.length > 128)) {
        failures.push(`plugin.json interface: ${promptField} must contain one to three non-empty strings of at most 128 characters`);
      }
    }
    if (!Array.isArray(fields.capabilities)
      || fields.capabilities.some((item) => typeof item !== "string" || !item.trim())) {
      failures.push("plugin.json interface: capabilities must be an array of non-empty strings");
    }
    for (const field of ["websiteURL", "privacyPolicyURL", "termsOfServiceURL"]) {
      validateHttpsUrl(fields, field, "plugin.json interface", failures);
    }
    if ("brandColor" in fields && (typeof fields.brandColor !== "string" || !hexColorPattern.test(fields.brandColor))) {
      failures.push("plugin.json interface: brandColor must use #RRGGBB");
    }
    for (const field of ["composerIcon", "logo", "logoDark"]) {
      if (field in fields) validateDeclaredResource(rootPath, rootReal, fields[field], `plugin.json interface ${field}`, failures);
    }
    if ("screenshots" in fields) {
      if (!Array.isArray(fields.screenshots)) failures.push("plugin.json interface: screenshots must be an array");
      else fields.screenshots.forEach((path, index) => (
        validateDeclaredResource(rootPath, rootReal, path, `plugin.json interface screenshots[${index}]`, failures)
      ));
    }
  }

  return normalizedFailures(rootPath, failures);
}

export function validateRepositoryPolicy(root = defaultRoot) {
  const failures = [];
  const rootPath = resolve(root);
  if (!existsSync(rootPath)) return [`plugin root does not exist: ${rootPath}`];

  for (const file of ["README.md", "CHANGELOG.md", "LICENSE", "package.json", "package-lock.json"]) {
    if (!existsSync(join(rootPath, file))) failures.push(`${file} is missing`);
  }

  const portableManifestPath = join(rootPath, "plugin.json");
  const manifestPath = join(rootPath, ".cursor-plugin", "plugin.json");
  const codexManifestPath = join(rootPath, ".codex-plugin", "plugin.json");
  if (!existsSync(portableManifestPath)) failures.push("plugin.json is missing");
  if (!existsSync(manifestPath)) failures.push(".cursor-plugin/plugin.json is missing");
  if (!existsSync(codexManifestPath)) failures.push(".codex-plugin/plugin.json is missing");
  if (!existsSync(portableManifestPath) || !existsSync(manifestPath) || !existsSync(codexManifestPath)) {
    return normalizedFailures(rootPath, failures);
  }
  const portableManifest = readJson(portableManifestPath, "plugin.json", failures);
  const manifest = readJson(manifestPath, ".cursor-plugin/plugin.json", failures);
  const codexManifest = readJson(codexManifestPath, ".codex-plugin/plugin.json", failures);
  if (!portableManifest || !manifest || !codexManifest) return normalizedFailures(rootPath, failures);

  for (const field of ["displayName", "description", "version", "author", "license", "logo"]) {
    if (!manifest[field]) failures.push(`plugin.json is missing repository field: ${field}`);
  }
  if (manifest.version && !semverPattern.test(manifest.version)) {
    failures.push(`plugin.json version is not semantic: ${manifest.version}`);
  }
  for (const field of ["name", "version", "description", "homepage", "repository", "license"]) {
    for (const [label, adapter] of [["Cursor", manifest], ["Codex", codexManifest]]) {
      if (adapter[field] !== portableManifest[field]) {
        failures.push(`${label} plugin ${field} ${adapter[field] ?? "<missing>"} does not match portable plugin ${field} ${portableManifest[field] ?? "<missing>"}`);
      }
    }
  }
  for (const field of ["name", "email"]) {
    if (manifest.author?.[field] !== portableManifest.author?.[field]) {
      failures.push(`Cursor plugin author ${field} does not match portable plugin metadata`);
    }
    if (codexManifest.author?.[field] !== portableManifest.author?.[field]) {
      failures.push(`Codex plugin author ${field} does not match portable plugin metadata`);
    }
  }
  if (codexManifest.author?.url !== portableManifest.author?.url) {
    failures.push("Codex plugin author URL does not match portable plugin metadata");
  }
  for (const [label, adapter] of [["Cursor", manifest], ["Codex", codexManifest]]) {
    if (JSON.stringify(adapter.keywords) !== JSON.stringify(portableManifest.keywords)) {
      failures.push(`${label} plugin keywords do not match portable plugin metadata`);
    }
  }

  if (portableManifest.name === "geldmacher-efficiency") {
    const expectedCursorSkills = [
      "./skills/context-optimization/SKILL.md",
      "./skills/efficiency/SKILL.md",
      "./skills/rtk-filter-design/SKILL.md",
      "./skills/rtk-setup/SKILL.md",
    ];
    if (JSON.stringify(manifest.skills) !== JSON.stringify(expectedCursorSkills)) {
      failures.push("Cursor plugin must declare exactly the four shared skills explicitly");
    }
    const sourceSkills = readdirSync(join(rootPath, "skills"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    if (JSON.stringify(sourceSkills) !== JSON.stringify(portableSkillNames)) {
      failures.push(`portable skills must be exactly: ${portableSkillNames.join(", ")}`);
    }
    const codexAdapterSkills = readdirSync(join(rootPath, codexAdapterSkillsRelative), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    if (JSON.stringify(codexAdapterSkills) !== JSON.stringify(["response-simplicity-setup"])) {
      failures.push("Codex adapter must contain only response-simplicity-setup");
    }
  }
  if (codexManifest.skills !== "./skills/") {
    failures.push("Codex plugin must declare the root ./skills/ path");
  }
  if ("extensions" in portableManifest) failures.push("portable plugin must not declare extensions");
  if (existsSync(join(rootPath, "mcp.json"))) failures.push("portable plugin must remain skills-only and omit mcp.json");
  for (const field of ["hooks", "mcpServers"]) {
    if (field in manifest) failures.push(`Cursor plugin must not declare ${field}`);
  }
  for (const field of ["hooks", "mcpServers", "apps"]) {
    if (field in codexManifest) failures.push(`Codex plugin must not declare ${field}`);
  }

  const packagePath = join(rootPath, "package.json");
  if (existsSync(packagePath)) {
    const packageJson = readJson(packagePath, "package.json", failures);
    if (packageJson?.version !== portableManifest.version) {
      failures.push(`package.json version ${packageJson?.version ?? "<missing>"} does not match plugin.json version ${portableManifest.version}`);
    }
  }

  const lockPath = join(rootPath, "package-lock.json");
  if (existsSync(lockPath)) {
    const packageLock = readJson(lockPath, "package-lock.json", failures);
    if (packageLock?.version !== portableManifest.version) {
      failures.push(`package-lock.json version ${packageLock?.version ?? "<missing>"} does not match plugin.json version ${portableManifest.version}`);
    }
    if (packageLock?.packages?.[""]?.version !== portableManifest.version) {
      failures.push(`package-lock.json root version ${packageLock?.packages?.[""]?.version ?? "<missing>"} does not match plugin.json version ${portableManifest.version}`);
    }
  }

  return normalizedFailures(rootPath, failures);
}

function runCli() {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const groups = [
    ["Agent Plugins structure", validateAgentPlugin(root)],
    ["Cursor structure", validatePlugin(root)],
    ["Codex structure", validateCodexPlugin(root)],
    ["Repository policy", validateRepositoryPolicy(root)],
  ];
  const failedGroups = groups.filter(([, failures]) => failures.length > 0);
  if (failedGroups.length > 0) {
    console.error("Plugin validation failed:");
    for (const [label, failures] of failedGroups) {
      console.error(`${label}:`);
      for (const failure of failures) console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("Plugin validation passed (Agent Plugins, Cursor, Codex, and repository policy).");
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
