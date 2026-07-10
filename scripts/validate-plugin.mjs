#!/usr/bin/env node
import {
  existsSync,
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
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const globPattern = /[*?[{]/;

function readText(path) {
  return readFileSync(path, "utf8");
}

function listFilesRecursive(directory, predicate) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFilesRecursive(path, predicate));
    else if (entry.isFile() && predicate(path)) files.push(path);
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
  return prefix.endsWith("/") ? prefix.slice(0, -1) : dirname(prefix);
}

function formatAjvError(error) {
  const location = error.instancePath || "/";
  const detail = error.keyword === "additionalProperties"
    ? `${error.message}: ${error.params.additionalProperty}`
    : error.message;
  return `plugin.json ${location}: ${detail}`;
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

function validateComponentNames(records, type, failures) {
  const seen = new Map();
  for (const record of records) {
    if (typeof record.fields.name !== "string") continue;
    const previous = seen.get(record.fields.name);
    if (previous) failures.push(`${type}: duplicate name ${record.fields.name} in ${previous} and ${record.label}`);
    else seen.set(record.fields.name, record.label);
  }
}

function validateDeclaredPath(root, rootReal, value, label, failures) {
  if (typeof value !== "string" || value.trim() === "") {
    failures.push(`${label}: path must be a non-empty string`);
    return;
  }
  if (isAbsolute(value)) {
    failures.push(`${label}: absolute paths are not allowed: ${value}`);
    return;
  }

  const candidate = resolve(root, staticPath(value));
  if (!isWithin(root, candidate)) {
    failures.push(`${label}: path escapes plugin root: ${value}`);
    return;
  }
  if (!existsSync(candidate)) {
    failures.push(`${label}: target does not exist: ${value}`);
    return;
  }
  if (!isWithin(rootReal, realpathSync(candidate))) {
    failures.push(`${label}: target resolves outside plugin root: ${value}`);
  }
}

function componentPaths(value) {
  return Array.isArray(value) ? value : [value];
}

export function validatePlugin(root = defaultRoot) {
  const failures = [];
  const rootPath = resolve(root);
  const rootReal = realpathSync(rootPath);
  const manifestPath = join(rootPath, ".cursor-plugin", "plugin.json");

  if (!existsSync(manifestPath)) return [".cursor-plugin/plugin.json is missing"];

  let manifest;
  try {
    manifest = JSON.parse(readText(manifestPath));
  } catch (error) {
    return [`plugin.json is invalid JSON: ${error.message}`];
  }

  const schema = JSON.parse(readText(schemaPath));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validateManifest = ajv.compile(schema);
  if (!validateManifest(manifest)) {
    failures.push(...validateManifest.errors.map(formatAjvError));
  }

  for (const field of ["displayName", "description", "version", "author", "license", "logo"]) {
    if (!manifest[field]) failures.push(`plugin.json is missing internal required field: ${field}`);
  }
  if (manifest.version && !semverPattern.test(manifest.version)) {
    failures.push(`plugin.json version is not semantic: ${manifest.version}`);
  }

  for (const field of ["commands", "agents", "skills", "rules"]) {
    if (!manifest[field]) {
      failures.push(`plugin.json must explicitly declare ${field}`);
      continue;
    }
    for (const value of componentPaths(manifest[field])) {
      validateDeclaredPath(rootPath, rootReal, value, `plugin.json ${field}`, failures);
    }
  }

  if (manifest.logo && !/^https?:\/\//.test(manifest.logo)) {
    validateDeclaredPath(rootPath, rootReal, manifest.logo, "plugin.json logo", failures);
  }

  const commands = listFilesRecursive(join(rootPath, "commands"), (file) => extname(file) === ".md")
    .map((file) => ({ file, label: relative(rootPath, file), fields: parseFrontmatter(file, failures) }));
  const agents = listFilesRecursive(join(rootPath, "agents"), (file) => extname(file) === ".md")
    .map((file) => ({ file, label: relative(rootPath, file), fields: parseFrontmatter(file, failures) }));
  const skills = listFilesRecursive(join(rootPath, "skills"), (file) => basename(file) === "SKILL.md")
    .map((file) => ({ file, label: relative(rootPath, file), fields: parseFrontmatter(file, failures) }));
  const rules = listFilesRecursive(join(rootPath, "rules"), (file) => extname(file) === ".mdc")
    .map((file) => ({ file, label: relative(rootPath, file), fields: parseFrontmatter(file, failures) }));

  for (const record of commands) {
    requireString(record.fields, "name", record.label, failures);
    requireString(record.fields, "description", record.label, failures);
    if (record.fields.name && record.fields.name !== basename(record.file, ".md")) {
      failures.push(`${record.label}: name must match filename`);
    }
    if (record.fields.name && !namePattern.test(record.fields.name)) failures.push(`${record.label}: invalid name`);
  }

  for (const record of agents) {
    requireString(record.fields, "name", record.label, failures);
    requireString(record.fields, "description", record.label, failures);
    if (record.fields.name && record.fields.name !== basename(record.file, ".md")) {
      failures.push(`${record.label}: name must match filename`);
    }
    if (record.fields.name && !namePattern.test(record.fields.name)) failures.push(`${record.label}: invalid name`);
    if (record.fields.readonly !== true) failures.push(`${record.label}: readonly must be boolean true`);
  }

  for (const record of skills) {
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

  for (const record of rules) {
    requireString(record.fields, "description", record.label, failures);
    if (typeof record.fields.alwaysApply !== "boolean") {
      failures.push(`${record.label}: alwaysApply must be boolean`);
    }
  }

  validateComponentNames(commands, "commands", failures);
  validateComponentNames(agents, "agents", failures);
  validateComponentNames(skills, "skills", failures);

  return [...new Set(failures.map((failure) => failure.replace(`${rootPath}${sep}`, "")))];
}

function runCli() {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const failures = validatePlugin(root);
  if (failures.length > 0) {
    console.error("Plugin validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log("Plugin validation passed.");
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
