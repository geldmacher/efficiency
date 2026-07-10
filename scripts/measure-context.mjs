#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./validate-plugin.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const defaultRoot = dirname(scriptDirectory);
export const limits = Object.freeze({
  alwaysOnTokens: 250,
  discoverabilityTokens: 250,
  totalTokens: 500,
});

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

function estimateTokens(characters) {
  return Math.ceil(characters / 4);
}

export function measureContext(root = defaultRoot) {
  const failures = [];
  const rootPath = resolve(root);
  let alwaysOnCharacters = 0;
  let discoverabilityCharacters = 0;

  const ruleFiles = listFilesRecursive(join(rootPath, "rules"), (file) => extname(file) === ".mdc");
  for (const file of ruleFiles) {
    const fields = parseFrontmatter(file, failures);
    if (fields.alwaysApply === true) alwaysOnCharacters += readFileSync(file, "utf8").length;
  }

  const skillFiles = listFilesRecursive(join(rootPath, "skills"), (file) => basename(file) === "SKILL.md");
  for (const file of skillFiles) {
    const fields = parseFrontmatter(file, failures);
    if (fields["disable-model-invocation"] !== true) {
      discoverabilityCharacters += `${fields.name ?? ""}\n${fields.description ?? ""}`.length;
    }
  }

  const agentFiles = listFilesRecursive(join(rootPath, "agents"), (file) => extname(file) === ".md");
  for (const file of agentFiles) {
    const fields = parseFrontmatter(file, failures);
    discoverabilityCharacters += `${fields.name ?? ""}\n${fields.description ?? ""}`.length;
  }

  if (failures.length > 0) throw new Error(failures.join("\n"));

  const alwaysOnTokens = estimateTokens(alwaysOnCharacters);
  const discoverabilityTokens = estimateTokens(discoverabilityCharacters);
  return {
    method: "characters / 4, rounded up",
    alwaysOnCharacters,
    alwaysOnTokens,
    discoverabilityCharacters,
    discoverabilityTokens,
    totalTokens: alwaysOnTokens + discoverabilityTokens,
    limits,
  };
}

export function budgetFailures(measurement) {
  const failures = [];
  if (measurement.alwaysOnTokens > limits.alwaysOnTokens) {
    failures.push(`always-on rules: ${measurement.alwaysOnTokens} > ${limits.alwaysOnTokens}`);
  }
  if (measurement.discoverabilityTokens > limits.discoverabilityTokens) {
    failures.push(`discoverability metadata: ${measurement.discoverabilityTokens} > ${limits.discoverabilityTokens}`);
  }
  if (measurement.totalTokens > limits.totalTokens) {
    failures.push(`total baseline: ${measurement.totalTokens} > ${limits.totalTokens}`);
  }
  return failures;
}

function runCli() {
  const rootArgument = process.argv.find((argument, index) => index > 1 && !argument.startsWith("--"));
  const measurement = measureContext(rootArgument ? resolve(rootArgument) : defaultRoot);
  console.log(JSON.stringify(measurement, null, 2));
  if (process.argv.includes("--check")) {
    const failures = budgetFailures(measurement);
    if (failures.length > 0) {
      for (const failure of failures) console.error(`Context budget exceeded: ${failure}`);
      process.exitCode = 1;
    }
  }
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
