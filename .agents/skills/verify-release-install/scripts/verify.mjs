#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtureRelease, writeCodexDriver } from "../../../../tests/helpers/release-install-fixture.mjs";
import { verifyRelease } from "../../../../skills/install-new-release-from-repo/scripts/install-release.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const evidence = mkdtempSync(join(tmpdir(), "efficiency-release-install-evidence-"));
const work = mkdtempSync(join(tmpdir(), "efficiency-release-install-drive-"));
const checks = [];
const transcripts = [];
let installer;
let failure;
function drive(args, expectedExit = 0) {
  const result = spawnSync(process.execPath, [installer, ...args], { cwd: work, encoding: "utf8", timeout: 60000 });
  const record = { command: [process.execPath, installer, ...args], exit: result.status, stdout: result.stdout, stderr: result.stderr };
  transcripts.push(record);
  writeFileSync(join(evidence, `drive-${transcripts.length}.json`), JSON.stringify(record, null, 2));
  assert.equal(result.status, expectedExit, result.stderr);
  return JSON.parse(expectedExit === 0 ? result.stdout : result.stderr);
}
const manifest = (path, host) => JSON.parse(readFileSync(join(path, host === "cursor" ? ".cursor-plugin" : ".codex-plugin", "plugin.json"), "utf8"));
try {
  const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  const parts = version.split(".").map(Number);
  assert.ok(parts.some((part) => part > 0), "Need a release newer than 0.0.0 for update verification");
  const previousVersion = parts[2] > 0 ? `${parts[0]}.${parts[1]}.${parts[2] - 1}` : parts[1] > 0 ? `${parts[0]}.${parts[1] - 1}.0` : `${parts[0] - 1}.0.0`;
  const current = fixtureRelease(join(work, "current"), version, { full: true });
  const previous = fixtureRelease(join(work, "previous"), previousVersion);
  const selected = verifyRelease(current.directory, "cursor");
  const bootstrap = join(work, "bootstrap", "geldmacher-efficiency");
  for (const entry of selected.entries) {
    const path = join(bootstrap, entry.relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, entry.bytes, { mode: entry.mode }); chmodSync(path, entry.mode);
  }
  installer = join(bootstrap, "skills", "install-new-release-from-repo", "scripts", "install-release.mjs");
  assert.ok(existsSync(installer));
  const ready = spawnSync(process.execPath, [installer, "--help"], { cwd: work, encoding: "utf8" });
  assert.equal(ready.status, 0, ready.stderr);
  assert.match(ready.stdout, /Usage: node install-release.mjs/);
  writeFileSync(join(evidence, "readiness.txt"), ready.stdout);
  const cursorHome = join(work, "cursor-home"); mkdirSync(cursorHome);
  const cursor = ["--host", "cursor", "--home", cursorHome, "--release-dir"];
  assert.equal(drive([...cursor, previous.directory, "--dry-run"]).status, "preview");
  assert.deepEqual(readdirSync(cursorHome), []);
  const first = drive([...cursor, previous.directory]);
  assert.equal(manifest(first.destination, "cursor").version, previousVersion);
  checks.push("Cursor preview and first install");
  const update = drive([...cursor, current.directory]);
  assert.equal(manifest(update.destination, "cursor").version, version);
  assert.equal(manifest(join(update.backup, "plugin"), "cursor").version, previousVersion);
  assert.equal(verifyRelease(join(update.backup, "release"), "cursor").provenance.version, previousVersion);
  assert.equal(drive([...cursor, current.directory]).no_op, true);
  checks.push("Cursor update, retained release, and unchanged repeat");
  const codexHome = join(work, "codex-home"); mkdirSync(codexHome);
  const binary = writeCodexDriver(codexHome);
  const marketplace = join(codexHome, ".agents", "plugins", "marketplace.json");
  mkdirSync(dirname(marketplace), { recursive: true });
  writeFileSync(marketplace, JSON.stringify({ name: "colleagues", interface: { displayName: "Colleagues" }, plugins: [{ name: "unrelated", source: { source: "local", path: "./untouched" } }] }));
  const codex = ["--host", "codex", "--home", codexHome, "--codex-bin", binary, "--release-dir"];
  const initial = drive([...codex, previous.directory]);
  assert.equal(initial.native_installation, "verified");
  assert.equal(JSON.parse(readFileSync(marketplace, "utf8")).plugins[0].name, "unrelated");
  const before = readFileSync(marketplace);
  checks.push("Codex first install and preserved custom marketplace");
  writeFileSync(join(codexHome, "fail-add"), "after");
  const failed = drive([...codex, current.directory], 1);
  assert.equal(failed.source_rollback, "completed_or_not_needed");
  assert.equal(failed.native_installation, "unverified_after_failure");
  assert.equal(manifest(initial.destination, "codex").version, previousVersion);
  assert.deepEqual(readFileSync(marketplace), before);
  assert.equal(verifyRelease(join(failed.backup, "attempted-release"), "codex").provenance.version, version);
  checks.push("Post-native failure restores source and preserves native recovery uncertainty");
  rmSync(join(codexHome, "fail-add"));
  const updated = drive([...codex, current.directory]);
  assert.equal(updated.native_installation, "verified");
  assert.equal(drive([...codex, current.directory]).no_op, true);
  checks.push("Codex retry/update and unchanged repeat");
} catch (error) {
  failure = error.stack || error.message;
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
  const report = { status: failure ? "failed" : "passed", platform: process.platform, node: process.version, checks, failure: failure ?? null, fixture_cleanup: !existsSync(work), evidence,
    limits: ["No real GitHub download", "Controlled Codex CLI only", "No agent routing or live host discovery", "Only the recorded operating system was executed"] };
  const reportPath = join(evidence, "report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  assert.ok(existsSync(reportPath));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
