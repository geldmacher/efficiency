#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function parseFrontmatter(file) {
  const text = readText(file);
  if (!text.startsWith("---\n")) {
    fail(`${relative(root, file)} is missing opening frontmatter`);
    return {};
  }

  const end = text.indexOf("\n---", 4);
  if (end === -1) {
    fail(`${relative(root, file)} is missing closing frontmatter`);
    return {};
  }

  const block = text.slice(4, end);
  const fields = {};
  for (const line of block.split("\n")) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (match) {
      fields[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
  return fields;
}

function requireFields(file, fields) {
  const parsed = parseFrontmatter(file);
  for (const field of fields) {
    if (!parsed[field]) {
      fail(`${relative(root, file)} is missing frontmatter field: ${field}`);
    }
  }
  return parsed;
}

function listFiles(dir, extension) {
  const target = join(root, dir);
  if (!existsSync(target)) {
    fail(`${dir}/ is missing`);
    return [];
  }

  return readdirSync(target)
    .map((entry) => join(target, entry))
    .filter((file) => statSync(file).isFile() && file.endsWith(extension));
}

function listSkillFiles() {
  const target = join(root, "skills");
  if (!existsSync(target)) {
    fail("skills/ is missing");
    return [];
  }

  return readdirSync(target)
    .map((entry) => join(target, entry, "SKILL.md"))
    .filter((file) => existsSync(file));
}

const manifestPath = join(root, ".cursor-plugin", "plugin.json");
if (!existsSync(manifestPath)) {
  fail(".cursor-plugin/plugin.json is missing");
} else {
  try {
    const manifest = JSON.parse(readText(manifestPath));
    for (const field of ["name", "displayName", "description", "version", "author", "license", "logo"]) {
      if (!manifest[field]) {
        fail(`plugin.json is missing field: ${field}`);
      }
    }
    if (manifest.logo && !existsSync(join(root, manifest.logo))) {
      fail(`plugin.json logo does not exist: ${manifest.logo}`);
    }
  } catch (error) {
    fail(`plugin.json is invalid JSON: ${error.message}`);
  }
}

for (const file of listFiles("commands", ".md")) {
  requireFields(file, ["name", "description"]);
}

for (const file of listSkillFiles()) {
  requireFields(file, ["name", "description"]);
}

for (const file of listFiles("agents", ".md")) {
  const parsed = requireFields(file, ["name", "description", "readonly"]);
  if (parsed.readonly !== "true") {
    fail(`${relative(root, file)} must set readonly: true`);
  }
}

for (const file of listFiles("rules", ".mdc")) {
  requireFields(file, ["description", "alwaysApply"]);
}

if (failures.length > 0) {
  console.error("Plugin validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Plugin validation passed.");
