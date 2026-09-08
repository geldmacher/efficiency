import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { downloadLatest, installRelease, marketplaceDocument, verifyRelease } from "../skills/install-new-release-from-repo/scripts/install-release.mjs";
import { readReleaseArchive } from "../skills/install-new-release-from-repo/scripts/release-archive.mjs";
import { assetName, sha256 } from "../skills/install-new-release-from-repo/scripts/release-format.mjs";
import { fixtureRelease, rewriteEvidence, writeCodexDriver } from "./helpers/release-install-fixture.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const installer = join(root, "skills", "install-new-release-from-repo", "scripts", "install-release.mjs");
function workspace(t) {
  const path = mkdtempSync(join(tmpdir(), "efficiency-release-install-test-"));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}
function home(root) { const path = join(root, "home"); mkdirSync(path); return path; }
function manifest(path, host) { return JSON.parse(readFileSync(join(path, host === "cursor" ? ".cursor-plugin" : ".codex-plugin", "plugin.json"), "utf8")); }
function cli(args) {
  const result = spawnSync(process.execPath, [installer, ...args], { encoding: "utf8", cwd: tmpdir() });
  return { ...result, report: JSON.parse(result.status === 0 ? result.stdout : result.stderr) };
}

function pathArchive(names) {
  const local = []; const central = []; let offset = 0;
  for (const name of names) {
    const bytes = Buffer.from(name); const data = name.endsWith("/") ? Buffer.alloc(0) : Buffer.from("{}");
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50); header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(bytes.length, 26);
    local.push(header, bytes, data);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50); record.writeUInt32LE(data.length, 20); record.writeUInt32LE(data.length, 24); record.writeUInt16LE(bytes.length, 28);
    record.writeUInt32LE(((name.endsWith("/") ? 0o040755 : 0o100644) << 16) >>> 0, 38); record.writeUInt32LE(offset, 42);
    central.push(record, bytes); offset += header.length + bytes.length + data.length;
  }
  const table = Buffer.concat(central); const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(names.length, 8); end.writeUInt16LE(names.length, 10); end.writeUInt32LE(table.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, table, end]);
}

test("actual CLI installs, previews without writes, updates, retains backup, and repeats unchanged", (t) => {
  const temp = workspace(t); const targetHome = home(temp);
  const first = fixtureRelease(join(temp, "first"), "3.2.0");
  const second = fixtureRelease(join(temp, "second"));
  const args = ["--host", "cursor", "--home", targetHome, "--release-dir", first.directory];
  const preview = cli([...args, "--dry-run"]);
  assert.equal(preview.status, 0); assert.equal(preview.report.status, "preview");
  assert.deepEqual(readdirSync(targetHome), []);
  const installed = cli(args);
  assert.equal(installed.status, 0, installed.stderr); assert.equal(installed.report.activation, "unverified");
  assert.equal(manifest(installed.report.destination, "cursor").version, "3.2.0");
  const repeated = cli(args);
  assert.equal(repeated.report.no_op, true); assert.equal(repeated.report.backup, null);
  const update = cli(["--host", "cursor", "--home", targetHome, "--release-dir", second.directory]);
  assert.equal(update.status, 0, update.stderr);
  assert.equal(manifest(update.report.destination, "cursor").version, "3.2.1");
  assert.equal(manifest(join(update.report.backup, "plugin"), "cursor").version, "3.2.0");
  assert.equal(verifyRelease(join(update.report.backup, "release"), "cursor").provenance.version, "3.2.0");
  assert.equal(existsSync(join(targetHome, ".codex")), false);
});

test("checksum, duplicate checksum, receipt, repository, and host identity failures stop before installation", (t) => {
  const temp = workspace(t);
  const fixture = fixtureRelease(join(temp, "fixture"));
  const sumsPath = join(fixture.directory, "SHA256SUMS");
  const sums = readFileSync(sumsPath);
  writeFileSync(sumsPath, Buffer.concat([sums, sums]));
  assert.throws(() => verifyRelease(fixture.directory, "cursor"), /exactly one/);
  writeFileSync(sumsPath, sums);
  const archive = join(fixture.directory, assetName("cursor", "3.2.1"));
  const original = readFileSync(archive); writeFileSync(archive, "broken");
  assert.throws(() => verifyRelease(fixture.directory, "cursor"), /SHA-256/);
  writeFileSync(archive, original);
  const wrong = structuredClone(fixture.provenance); wrong.repository = "someone/else";
  rewriteEvidence(fixture.directory, wrong);
  assert.throws(() => verifyRelease(fixture.directory, "cursor"), /identity/);
  rewriteEvidence(fixture.directory, fixture.provenance);
  assert.throws(() => verifyRelease(fixture.directory, "unknown"), /invoking harness/);
  assert.throws(() => verifyRelease(fixture.directory, "cursor", "99.0.0"), /identity/);
  const altered = { ...fixture.provenance, receipt_sha256: "0".repeat(64) };
  const alteredBytes = Buffer.from(JSON.stringify(altered));
  writeFileSync(join(fixture.directory, "provenance.json"), alteredBytes);
  writeFileSync(sumsPath, readFileSync(sumsPath, "utf8").replace(/^[0-9a-f]{64}  provenance.json$/m, `${sha256(alteredBytes)}  provenance.json`));
  assert.throws(() => verifyRelease(fixture.directory, "cursor"), /receipt/);
  const wrongHost = structuredClone(fixture.provenance);
  const codexBytes = readFileSync(join(fixture.directory, assetName("codex", "3.2.1")));
  writeFileSync(archive, codexBytes);
  wrongHost.targets.cursor = { ...wrongHost.targets.codex, archive: assetName("cursor", "3.2.1") };
  rewriteEvidence(fixture.directory, wrongHost);
  assert.throws(() => verifyRelease(fixture.directory, "cursor"), /missing .cursor-plugin/);
});

test("unsafe ZIP paths, links, duplicate aliases, and nested roots are rejected before extraction", (t) => {
  const temp = workspace(t); const fixture = fixtureRelease(join(temp, "fixture"));
  const bytes = readFileSync(join(fixture.directory, assetName("cursor", "3.2.1")));
  for (const replacement of ["../macher-efficiency", "geldmacher:fficiency", "geldmacher\\fficiency"]) {
    const bad = Buffer.from(bytes.toString("latin1").replaceAll("geldmacher-efficiency", replacement), "latin1");
    assert.throws(() => readReleaseArchive(bad));
  }
  const link = Buffer.from(bytes);
  let offset = link.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  link.writeUInt32LE((0o120777 << 16) >>> 0, offset + 38);
  assert.throws(() => readReleaseArchive(link), /entry type/);
  assert.throws(() => readReleaseArchive(bytes.subarray(0, bytes.length - 20)), /record|directory/);
  assert.ok(readReleaseArchive(bytes).length > 0);
  for (const path of ["geldmacher-efficiency/../outside", "geldmacher-efficiency/C:/outside", "geldmacher-efficiency/file.", "geldmacher-efficiency/CON.txt", "geldmacher-efficiency/a\\outside", "geldmacher-efficiency/geldmacher-efficiency/nested", "/absolute"]) {
    assert.throws(() => readReleaseArchive(pathArchive([path])), /Unsafe archive path/);
  }
  assert.throws(() => readReleaseArchive(pathArchive(["geldmacher-efficiency/a", "geldmacher-efficiency/A"])), /Duplicate/);
  assert.throws(() => readReleaseArchive(pathArchive(["geldmacher-efficiency/a", "geldmacher-efficiency/a/b"])), /file used as a directory/);
});

test("local modifications and downgrade require a concrete replacement decision and preserve original files", (t) => {
  const temp = workspace(t); const targetHome = home(temp);
  const first = fixtureRelease(join(temp, "first")); const older = fixtureRelease(join(temp, "older"), "3.2.0");
  const release = verifyRelease(first.directory, "cursor");
  const original = installRelease(release, { home: targetHome });
  writeFileSync(join(original.destination, "local.txt"), "colleague's work");
  const preview = installRelease(release, { home: targetHome, dryRun: true });
  assert.match(preview.replacement_requires_approval, /modified/);
  assert.throws(() => installRelease(release, { home: targetHome }), /modified/);
  assert.equal(readFileSync(join(original.destination, "local.txt"), "utf8"), "colleague's work");
  const replaced = installRelease(release, { home: targetHome, replaceExisting: true });
  assert.equal(readFileSync(join(replaced.backup, "plugin", "local.txt"), "utf8"), "colleague's work");
  assert.throws(() => installRelease(verifyRelease(older.directory, "cursor"), { home: targetHome }), /newer/);
});

test("installation refuses symlink destinations and concurrent locks", (t) => {
  const temp = workspace(t); const targetHome = home(temp); const fixture = fixtureRelease(join(temp, "fixture"));
  const outside = join(temp, "outside"); mkdirSync(outside);
  symlinkSync(outside, join(targetHome, ".cursor"), "dir");
  const release = verifyRelease(fixture.directory, "cursor");
  assert.throws(() => installRelease(release, { home: targetHome }), /symlink/);
  assert.deepEqual(readdirSync(outside), []);
  rmSync(join(targetHome, ".cursor"));
  const lock = join(targetHome, ".cursor", "plugins", "local", ".geldmacher-efficiency.install-lock");
  mkdirSync(lock, { recursive: true });
  assert.throws(() => installRelease(release, { home: targetHome }), /interrupted run/);
  assert.ok(existsSync(lock));
});

test("marketplace names and unrelated bytes survive; conflicting sources are refused", () => {
  const original = Buffer.from('{ "name": "team-colleagues", "interface": {"displayName":"Our tools"}, "plugins": [{"name":"other","custom":true}] }');
  const changed = marketplaceDocument(original, "./.codex/plugins/geldmacher-efficiency");
  const document = JSON.parse(changed.bytes);
  assert.equal(changed.name, "team-colleagues");
  assert.deepEqual(document.plugins[0], { name: "other", custom: true });
  assert.equal(document.interface.displayName, "Our tools");
  assert.deepEqual(marketplaceDocument(changed.bytes, "./.codex/plugins/geldmacher-efficiency").bytes, changed.bytes);
  assert.throws(() => marketplaceDocument(changed.bytes, "./different"), /another source/);
});

test("Codex CLI verifies native cache and preserves a named marketplace through update and rollback", (t) => {
  const temp = workspace(t); const targetHome = home(temp); const binary = writeCodexDriver(targetHome);
  const first = fixtureRelease(join(temp, "first"), "3.2.0"); const second = fixtureRelease(join(temp, "second"));
  const marketplacePath = join(targetHome, ".agents", "plugins", "marketplace.json");
  mkdirSync(dirname(marketplacePath), { recursive: true });
  const original = '{"name":"colleagues","plugins":[{"name":"other","custom":true}]}';
  writeFileSync(marketplacePath, original);
  const args = ["--host", "codex", "--home", targetHome, "--codex-bin", binary, "--release-dir"];
  const installed = cli([...args, first.directory]);
  assert.equal(installed.status, 0, installed.stderr);
  assert.equal(installed.report.native_installation, "verified");
  assert.match(installed.report.cache, /colleagues/);
  const marketplace = readFileSync(marketplacePath);
  assert.equal(JSON.parse(marketplace).plugins[0].name, "other");
  assert.equal(cli([...args, first.directory]).report.no_op, true);
  writeFileSync(join(targetHome, "fail-add"), "after");
  const failed = cli([...args, second.directory]);
  assert.equal(failed.status, 1); assert.equal(failed.report.source_rollback, "completed_or_not_needed");
  assert.equal(failed.report.native_installation, "unverified_after_failure");
  assert.equal(manifest(installed.report.destination, "codex").version, "3.2.0");
  assert.deepEqual(readFileSync(marketplacePath), marketplace);
  assert.equal(verifyRelease(join(failed.report.backup, "attempted-release"), "codex").provenance.version, "3.2.1");
  assert.equal(existsSync(join(targetHome, ".cursor")), false);
});

test("Codex first-install failure restores original marketplace bytes and does not claim cache rollback", (t) => {
  const temp = workspace(t); const targetHome = home(temp); const binary = writeCodexDriver(targetHome);
  const fixture = fixtureRelease(join(temp, "fixture"));
  const marketplacePath = join(targetHome, ".agents", "plugins", "marketplace.json");
  mkdirSync(dirname(marketplacePath), { recursive: true });
  const original = '{ "name":"colleagues", "plugins": [] }\n'; writeFileSync(marketplacePath, original);
  writeFileSync(join(targetHome, "fail-add"), "corrupt-cache");
  const failed = cli(["--host", "codex", "--home", targetHome, "--codex-bin", binary, "--release-dir", fixture.directory]);
  assert.equal(failed.status, 1); assert.match(failed.report.error, /cache differs/);
  assert.equal(readFileSync(marketplacePath, "utf8"), original);
  assert.equal(existsSync(join(targetHome, ".codex", "plugins", "geldmacher-efficiency")), false);
  assert.equal(failed.report.native_installation, "unverified_after_failure");
});

test("a marketplace resolving to another root is stopped before native installation", (t) => {
  const temp = workspace(t); const targetHome = home(temp); const binary = writeCodexDriver(targetHome);
  const fixture = fixtureRelease(join(temp, "fixture"));
  writeFileSync(join(targetHome, "wrong-marketplace-root"), "conflict");
  const result = cli(["--host", "codex", "--home", targetHome, "--codex-bin", binary, "--release-dir", fixture.directory]);
  assert.equal(result.status, 1); assert.match(result.report.error, /intended home/);
  assert.equal(result.report.native_installation, "not_changed");
  assert.equal(existsSync(join(targetHome, "native.json")), false);
  assert.equal(existsSync(join(targetHome, ".agents", "plugins", "marketplace.json")), false);
  assert.equal(existsSync(join(targetHome, ".codex", "plugins", "geldmacher-efficiency")), false);
});

test("missing Codex CLI produces a prepared source with an explicit manual activation path", (t) => {
  const temp = workspace(t); const targetHome = home(temp); const fixture = fixtureRelease(join(temp, "fixture"));
  const report = installRelease(verifyRelease(fixture.directory, "codex"), { home: targetHome, runner: () => ({ error: { code: "ENOENT" } }) });
  assert.equal(report.status, "prepared"); assert.equal(report.native_installation, "manual_action_required");
  assert.match(report.next_step, /Plugins Directory/); assert.equal(report.activation, "unverified");
});

test("latest selection pins one stable release and downloads only the selected assets", async (t) => {
  const temp = workspace(t); const fixture = fixtureRelease(join(temp, "fixture"));
  const urls = [];
  const prefix = "https://github.com/geldmacher/efficiency/releases/download/v3.2.1/";
  const names = [assetName("cursor", "3.2.1"), "SHA256SUMS", "provenance.json"];
  const metadata = { tag_name: "v3.2.1", draft: false, prerelease: false, assets: names.map((name) => ({ name, browser_download_url: prefix + name })) };
  const fetcher = async (url) => {
    urls.push(url);
    return new Response(url.endsWith("/latest") ? JSON.stringify(metadata) : readFileSync(join(fixture.directory, url.slice(prefix.length))));
  };
  const directory = join(temp, "download"); mkdirSync(directory);
  const result = await downloadLatest(directory, "cursor", fetcher);
  assert.equal(result.provenance.version, "3.2.1"); assert.equal(urls.length, 4);
  assert.equal(urls.filter((url) => url.endsWith("/latest")).length, 1);
  assert.deepEqual(readdirSync(directory).sort(), [...names].sort());
  assert.equal(sha256(readFileSync(join(directory, names[0]))), fixture.provenance.targets.cursor.archive_sha256);
  await assert.rejects(downloadLatest(directory, "cursor", async () => new Response(JSON.stringify({ ...metadata, prerelease: true }))), /stable release/);
  await assert.rejects(downloadLatest(directory, "cursor", async () => new Response("not found", { status: 404 })), /404/);
  await assert.rejects(downloadLatest(directory, "cursor", async () => new Response(JSON.stringify({ ...metadata, assets: [] }))), /Missing/);
});
