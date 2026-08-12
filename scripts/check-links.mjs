#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const defaultRoot = dirname(scriptDirectory);
const ignoredDirectories = new Set([".build", ".git", "node_modules"]);

function markdownFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.isFile() && [".md", ".mdc"].includes(extname(path))) files.push(path);
  }
  return files.sort();
}

function within(root, target) {
  const path = relative(root, target);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

function linkTarget(raw) {
  const value = raw.trim();
  if (value.startsWith("<")) return value.slice(1, value.indexOf(">"));
  return value.split(/\s+["']/)[0];
}

export function checkLinks(root = defaultRoot) {
  const rootPath = resolve(root);
  const failures = [];
  for (const file of markdownFiles(rootPath)) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const raw = linkTarget(match[1]);
      if (!raw || raw.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
      let decoded;
      try { decoded = decodeURIComponent(raw.split(/[?#]/)[0]); }
      catch { failures.push(`${relative(rootPath, file)}: invalid encoded link ${raw}`); continue; }
      const target = resolve(dirname(file), decoded);
      if (!within(rootPath, target)) failures.push(`${relative(rootPath, file)}: link escapes plugin root: ${raw}`);
      else if (!existsSync(target)) failures.push(`${relative(rootPath, file)}: missing link target: ${raw}`);
    }
  }
  return [...new Set(failures)];
}

function runCli() {
  const failures = checkLinks(defaultRoot);
  if (failures.length > 0) {
    console.error("Markdown link check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log("Markdown link check passed.");
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
