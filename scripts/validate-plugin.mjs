#!/usr/bin/env node
import {
  existsSync,
  globSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { parseDocument } from "yaml";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const defaultRoot = dirname(scriptDirectory);
const schemaPath = join(defaultRoot, "schemas", "plugin.schema.json");
const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const globPattern = /[*?[{]/;
const componentPredicates = {
  commands: (file) => [".md", ".txt"].includes(extname(file)),
  agents: (file) => extname(file) === ".md",
  skills: (file) => basename(file) === "SKILL.md",
  rules: (file) => [".md", ".mdc"].includes(extname(file)),
};

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

function formatAjvError(error) {
  const location = error.instancePath || "/";
  const detail = error.keyword === "additionalProperties"
    ? `${error.message}: ${error.params.additionalProperty}`
    : error.message;
  return `plugin.json ${location}: ${detail}`;
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

function validateComponentNames(records, type, failures) {
  const seen = new Map();
  for (const record of records) {
    if (typeof record.fields.name !== "string") continue;
    const previous = seen.get(record.fields.name);
    if (previous) failures.push(`${type}: duplicate name ${record.fields.name} in ${previous} and ${record.label}`);
    else seen.set(record.fields.name, record.label);
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

export function validatePlugin(root = defaultRoot) {
  const failures = [];
  const rootPath = resolve(root);
  if (!existsSync(rootPath)) return [`plugin root does not exist: ${rootPath}`];
  const rootReal = realpathSync(rootPath);
  const manifestPath = join(rootPath, ".cursor-plugin", "plugin.json");
  if (!existsSync(manifestPath)) return [".cursor-plugin/plugin.json is missing"];

  const manifest = readJson(manifestPath, "plugin.json", failures);
  if (!manifest) return normalizedFailures(rootPath, failures);

  const schema = JSON.parse(readText(schemaPath));
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

export function validateRepositoryPolicy(root = defaultRoot) {
  const failures = [];
  const rootPath = resolve(root);
  if (!existsSync(rootPath)) return [`plugin root does not exist: ${rootPath}`];

  for (const file of ["README.md", "CHANGELOG.md", "LICENSE", "package.json", "package-lock.json"]) {
    if (!existsSync(join(rootPath, file))) failures.push(`${file} is missing`);
  }

  const manifestPath = join(rootPath, ".cursor-plugin", "plugin.json");
  if (!existsSync(manifestPath)) return normalizedFailures(rootPath, failures);
  const manifest = readJson(manifestPath, "plugin.json", failures);
  if (!manifest) return normalizedFailures(rootPath, failures);

  for (const field of ["displayName", "description", "version", "author", "license", "logo"]) {
    if (!manifest[field]) failures.push(`plugin.json is missing repository field: ${field}`);
  }
  if (manifest.version && !semverPattern.test(manifest.version)) {
    failures.push(`plugin.json version is not semantic: ${manifest.version}`);
  }

  const packagePath = join(rootPath, "package.json");
  if (existsSync(packagePath)) {
    const packageJson = readJson(packagePath, "package.json", failures);
    if (packageJson?.version !== manifest.version) {
      failures.push(`package.json version ${packageJson?.version ?? "<missing>"} does not match plugin.json version ${manifest.version}`);
    }
  }

  return normalizedFailures(rootPath, failures);
}

function runCli() {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const groups = [
    ["Cursor structure", validatePlugin(root)],
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
  console.log("Plugin validation passed (Cursor structure and repository policy).");
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
