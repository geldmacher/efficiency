#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const guidanceStartMarker = "<!-- geldmacher-efficiency:response-simplicity:start -->";
export const guidanceEndMarker = "<!-- geldmacher-efficiency:response-simplicity:end -->";

function occurrences(text, value) {
  return text.split(value).length - 1;
}

function assertWellFormedMarkers(contents) {
  const starts = occurrences(contents, guidanceStartMarker);
  const ends = occurrences(contents, guidanceEndMarker);
  if (starts !== ends || starts > 1) {
    throw new Error("response-simplicity markers are missing, duplicated, or malformed");
  }
  if (starts === 1 && contents.indexOf(guidanceStartMarker) > contents.indexOf(guidanceEndMarker)) {
    throw new Error("response-simplicity markers are out of order");
  }
  return starts;
}

function hasUnmanagedEquivalent(contents, guidance) {
  if (contents.includes(guidance.trim())) return true;
  const normalized = contents.toLowerCase();
  return /(^|\n)\s*#{1,6}\s+response simplicity\s*($|\n)/i.test(contents)
    || (normalized.includes("lead with the answer, result, or decision")
      && normalized.includes("preserve relevant evidence"));
}

export function guidanceBlock(guidance) {
  const body = guidance.trim();
  if (!body) throw new Error("canonical response guidance is empty");
  return `${guidanceStartMarker}\n${body}\n${guidanceEndMarker}`;
}

export function installGuidance(contents, guidance) {
  const block = guidanceBlock(guidance);
  const markerCount = assertWellFormedMarkers(contents);
  if (markerCount === 1) {
    const start = contents.indexOf(guidanceStartMarker);
    const end = contents.indexOf(guidanceEndMarker, start) + guidanceEndMarker.length;
    return `${contents.slice(0, start)}${block}${contents.slice(end)}`;
  }

  if (hasUnmanagedEquivalent(contents, guidance)) {
    throw new Error("similar response guidance already exists without managed markers");
  }
  if (!contents) return `${block}\n`;
  const separator = contents.endsWith("\n") ? "\n" : "\n\n";
  return `${contents}${separator}${block}\n`;
}

export function removeGuidance(contents) {
  const markerCount = assertWellFormedMarkers(contents);
  if (markerCount === 0) return contents;
  const start = contents.indexOf(guidanceStartMarker);
  const end = contents.indexOf(guidanceEndMarker, start) + guidanceEndMarker.length;
  return `${contents.slice(0, start)}${contents.slice(end)}`;
}

export function guidanceState(contents, guidance) {
  const markerCount = assertWellFormedMarkers(contents);
  if (markerCount === 0) {
    return hasUnmanagedEquivalent(contents, guidance) ? "unmanaged-equivalent" : "absent";
  }
  const desired = installGuidance(contents, guidance);
  return desired === contents ? "current" : "outdated";
}

export function activeGlobalAgentsPath(codexHome = join(homedir(), ".codex")) {
  const overridePath = join(codexHome, "AGENTS.override.md");
  if (existsSync(overridePath) && readFileSync(overridePath, "utf8").trim()) return overridePath;
  return join(codexHome, "AGENTS.md");
}

function runCli() {
  const codexHomeIndex = process.argv.indexOf("--codex-home");
  const codexHome = codexHomeIndex === -1 ? undefined : resolve(process.argv[codexHomeIndex + 1]);
  const target = activeGlobalAgentsPath(codexHome);
  const contents = existsSync(target) ? readFileSync(target, "utf8") : "";
  const reference = resolve(
    fileURLToPath(new URL("../adapters/codex/skills/response-simplicity-setup/references/response-simplicity.md", import.meta.url)),
  );
  const guidance = readFileSync(reference, "utf8");
  console.log(JSON.stringify({ target, state: guidanceState(contents, guidance) }));
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
