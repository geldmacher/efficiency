import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { fixtureRelease, rewriteEvidence } from "./helpers/release-install-fixture.mjs";
import { downloadLatest, installRelease, materializeSchema1View, verifyRelease } from "../skills/install-new-release-from-repo/scripts/install-release.mjs";
import { assetName, buildSchema1Artifact, canonicalJson, receiptForProvenance, SCHEMA1_PROVENANCE_NAME, SCHEMA2_ANCHOR_NAME, sha256, validateProvenance } from "../skills/install-new-release-from-repo/scripts/release-format.mjs";
import { downloadStableRelease, extractInstaller, verifyUpgradedRelease } from "../skills/install-new-release-from-repo/scripts/upgrade-from-schema1.mjs";

const root = join(dirname(new URL(import.meta.url).pathname), "..");
const upgradeScript = join(root, "skills/install-new-release-from-repo/scripts/upgrade-from-schema1.mjs");
const scriptDirectory = join(root, "skills/install-new-release-from-repo/scripts");

function workspace(t) {
  const path = mkdtempSync(join(tmpdir(), "efficiency-provenance-"));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

function currentScripts() {
  return Object.fromEntries(readdirSync(scriptDirectory).filter((name) => name.endsWith(".mjs")).map((name) => [
    `skills/install-new-release-from-repo/scripts/${name}`,
    readFileSync(join(scriptDirectory, name)),
  ]));
}

function attachSchema1(directory) {
  const provenance = JSON.parse(readFileSync(join(directory, "provenance.json"), "utf8"));
  const artifact = buildSchema1Artifact(provenance, readFileSync(join(directory, "RELEASE_NOTES.md"), "utf8"));
  writeFileSync(join(directory, "RELEASE_NOTES.md"), artifact.notes);
  writeFileSync(join(directory, SCHEMA1_PROVENANCE_NAME), artifact.bytes);
  provenance.release_notes_sha256 = sha256(artifact.notes);
  provenance.receipt_sha256 = receiptForProvenance(provenance);
  writeFileSync(join(directory, "provenance.json"), canonicalJson(provenance));
  const names = readdirSync(directory).filter((name) => name !== "SHA256SUMS").sort();
  writeFileSync(join(directory, "SHA256SUMS"), names.map((name) => `${sha256(readFileSync(join(directory, name)))}  ${name}\n`).join(""));
  return JSON.parse(readFileSync(join(directory, "provenance.json"), "utf8"));
}

function asUnknownSchema(directory, schema = 99) {
  const original = readFileSync(join(directory, "provenance.json"));
  writeFileSync(join(directory, SCHEMA2_ANCHOR_NAME), original);
  const provenance = JSON.parse(original.toString("utf8"));
  provenance.schema = schema;
  provenance.receipt_sha256 = receiptForProvenance(provenance);
  writeFileSync(join(directory, "provenance.json"), canonicalJson(provenance));
  const names = readdirSync(directory).filter((name) => name !== "SHA256SUMS").sort();
  writeFileSync(join(directory, "SHA256SUMS"), names.map((name) => `${sha256(readFileSync(join(directory, name)))}  ${name}\n`).join(""));
}

async function loadTagInstaller(t, tag) {
  const dir = mkdtempSync(join(tmpdir(), `efficiency-${tag}-`));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const files = tag === "v3.6.0"
    ? ["codex-install.mjs", "install-release.mjs", "release-archive.mjs", "release-format.mjs"]
    : ["codex-install.mjs", "install-release.mjs", "opencode-config.mjs", "release-archive.mjs", "release-format.mjs"];
  for (const file of files) writeFileSync(join(dir, file), execFileSync("git", ["show", `${tag}:skills/install-new-release-from-repo/scripts/${file}`]));
  return import(pathToFileURL(join(dir, "install-release.mjs")).href);
}

const agreeingStub = `import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export function verifyRelease(directory, host) {
  const provenance = JSON.parse(readFileSync(join(directory, "provenance.json"), "utf8"));
  if (provenance.schema !== 99) throw new Error("stub expected schema 99");
  const archive = provenance.targets[host].archive;
  const actual = createHash("sha256").update(readFileSync(join(directory, archive))).digest("hex");
  if (actual !== provenance.targets[host].archive_sha256) throw new Error("stub archive hash mismatch");
  return { provenance, archive, entries: [], directory, host };
}
`;

const disagreeingStub = `export function verifyRelease() {
  return { provenance: { version: "9.9.9", targets: { cursor: { archive_sha256: "${"0".repeat(64)}" }, codex: { archive_sha256: "${"0".repeat(64)}" }, opencode: { archive_sha256: "${"0".repeat(64)}" } } } };
}
`;

test("schema 1 updater rejects a schema 2 release and accepts the bound schema 1 view", async (t) => {
  const temp = workspace(t);
  const fixture = fixtureRelease(join(temp, "source"));
  const historical = await loadTagInstaller(t, "v3.6.0");
  const fielded = await loadTagInstaller(t, "v4.0.3");
  assert.throws(() => historical.verifyRelease(fixture.directory, "cursor"), /provenance\.json identity is invalid/);
  const schema2 = attachSchema1(fixture.directory);
  assert.equal(schema2.schema, 2);
  assert.equal(schema2.published_assets.includes(SCHEMA1_PROVENANCE_NAME), false);
  assert.throws(() => historical.verifyRelease(fixture.directory, "cursor"), /provenance\.json identity is invalid/);
  for (const host of ["cursor", "codex", "opencode"]) {
    assert.equal(fielded.verifyRelease(fixture.directory, host).provenance.targets[host].archive_sha256, schema2.targets[host].archive_sha256);
    assert.equal(verifyRelease(fixture.directory, host).provenance.version, "3.2.1");
  }
  const view = join(temp, "schema1-view");
  materializeSchema1View(fixture.directory, "cursor", view);
  const verified = historical.verifyRelease(view, "cursor");
  assert.equal(verified.provenance.schema, 1);
  assert.equal(verified.provenance.targets.cursor.archive_sha256, schema2.targets.cursor.archive_sha256);
  assert.equal(verified.provenance.targets.cursor.content_sha256, schema2.targets.cursor.content_sha256);
  assert.equal(verified.provenance.targets.cursor.file_count, schema2.targets.cursor.file_count);
  const home = join(temp, "home");
  mkdirSync(home);
  const installed = historical.installRelease(verified, { home });
  assert.equal(installed.status, "installed");
  assert.equal(JSON.parse(readFileSync(join(installed.destination, ".cursor-plugin/plugin.json"), "utf8")).version, "3.2.1");
  assert.throws(() => materializeSchema1View(fixture.directory, "opencode", join(temp, "opencode-view")), /no OpenCode target/);
});

test("a tampered schema 1 artifact fails before installation", (t) => {
  const temp = workspace(t);
  const fixture = fixtureRelease(join(temp, "source"));
  attachSchema1(fixture.directory);
  const artifact = Buffer.from(readFileSync(join(fixture.directory, SCHEMA1_PROVENANCE_NAME)));
  artifact[30] = artifact[30] === 0x61 ? 0x62 : 0x61;
  writeFileSync(join(fixture.directory, SCHEMA1_PROVENANCE_NAME), artifact);
  const sums = readFileSync(join(fixture.directory, "SHA256SUMS"), "utf8").replace(
    new RegExp(`^[0-9a-f]{64}  ${SCHEMA1_PROVENANCE_NAME}$`, "m"),
    `${sha256(readFileSync(join(fixture.directory, SCHEMA1_PROVENANCE_NAME)))}  ${SCHEMA1_PROVENANCE_NAME}`,
  );
  writeFileSync(join(fixture.directory, "SHA256SUMS"), sums);
  assert.throws(() => verifyRelease(fixture.directory, "cursor"), /schema-1 provenance commitment does not match/);
});

test("an unknown provenance schema names the manual upgrade and does not install", (t) => {
  const temp = workspace(t);
  const fixture = fixtureRelease(join(temp, "source"));
  const provenance = structuredClone(fixture.provenance);
  provenance.schema = 99;
  rewriteEvidence(fixture.directory, provenance);
  assert.throws(() => validateProvenance(provenance), /schema 99 is not supported/);
  const home = join(temp, "home");
  mkdirSync(home);
  const result = spawnSync(process.execPath, [
    join(scriptDirectory, "install-release.mjs"), "--host", "cursor", "--home", home, "--release-dir", fixture.directory,
  ], { encoding: "utf8" });
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stderr);
  assert.equal(report.status, "failed");
  assert.match(report.error, /schema 99 is not supported/);
  assert.match(report.error, /3\.6\.0 through 3\.10\.0/);
  assert.match(report.error, /upgrade-from-schema1\.mjs --host cursor/);
  assert.match(report.error, /nothing was installed/);
  assert.deepEqual(readdirSync(home), []);
});

test("an unknown schema installs only when the schema 2 anchor and archive verifier agree", (t) => {
  const temp = workspace(t);
  const agreeing = fixtureRelease(join(temp, "agree"), "3.2.1", {
    extraFiles: { "skills/install-new-release-from-repo/scripts/install-release.mjs": agreeingStub },
  });
  asUnknownSchema(agreeing.directory);
  const verified = verifyRelease(agreeing.directory, "cursor");
  assert.equal(verified.provenance.schema, 2);
  assert.equal(verified.provenance.version, "3.2.1");
  const home = join(temp, "home");
  mkdirSync(home);
  const installed = installRelease(verified, { home });
  assert.equal(installed.status, "installed");
  assert.equal(JSON.parse(readFileSync(join(installed.destination, ".cursor-plugin/plugin.json"), "utf8")).version, "3.2.1");
  const evidence = join(dirname(installed.destination), ".geldmacher-efficiency.release");
  assert.equal(verifyRelease(evidence, "cursor", "3.2.1").provenance.schema, 2);
  writeFileSync(join(installed.destination, "local.txt"), "local edit");
  assert.throws(() => installRelease(verified, { home }), /locally modified/);

  const refusing = fixtureRelease(join(temp, "refuse"), "3.2.1", { extraFiles: currentScripts() });
  asUnknownSchema(refusing.directory);
  assert.throws(() => verifyRelease(refusing.directory, "cursor"), /schema 99 is not supported[\s\S]*embedded verifier rejected/);

  const disagreeing = fixtureRelease(join(temp, "disagree"), "3.2.1", {
    extraFiles: { "skills/install-new-release-from-repo/scripts/install-release.mjs": disagreeingStub },
  });
  asUnknownSchema(disagreeing.directory);
  assert.throws(() => verifyRelease(disagreeing.directory, "cursor"), /embedded verifier disagreed with the schema-2 anchor/);
});

test("the one-time upgrade program installs from a schema 2 archive without the schema 1 helper", (t) => {
  const temp = workspace(t);
  const fixture = fixtureRelease(join(temp, "source"), "3.2.1", { extraFiles: currentScripts() });
  const home = join(temp, "home");
  mkdirSync(home);
  const preview = spawnSync(process.execPath, [
    upgradeScript, "--host", "cursor", "--release-dir", fixture.directory, "--home", home,
  ], { encoding: "utf8" });
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(JSON.parse(preview.stdout).status, "preview");
  assert.deepEqual(readdirSync(home), []);
  const applied = spawnSync(process.execPath, [
    upgradeScript, "--host", "cursor", "--release-dir", fixture.directory, "--home", home, "--apply",
  ], { encoding: "utf8" });
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(JSON.parse(applied.stdout).status, "installed");
  assert.equal(JSON.parse(readFileSync(join(home, ".cursor/plugins/local/geldmacher-efficiency/.cursor-plugin/plugin.json"), "utf8")).version, "3.2.1");

  attachSchema1(fixture.directory);
  const committed = verifyUpgradedRelease(fixture.directory, "cursor");
  assert.equal(committed.provenance.schema, 2);
  const broken = Buffer.from(readFileSync(join(fixture.directory, SCHEMA1_PROVENANCE_NAME)).toString("utf8").replace("geldmacher-efficiency", "geldmacher-efficiency-tampered"));
  writeFileSync(join(fixture.directory, SCHEMA1_PROVENANCE_NAME), broken);
  const sums = readFileSync(join(fixture.directory, "SHA256SUMS"), "utf8").replace(
    new RegExp(`^[0-9a-f]{64}  ${SCHEMA1_PROVENANCE_NAME}$`, "m"),
    `${sha256(broken)}  ${SCHEMA1_PROVENANCE_NAME}`,
  );
  writeFileSync(join(fixture.directory, "SHA256SUMS"), sums);
  const rejected = spawnSync(process.execPath, [
    upgradeScript, "--host", "cursor", "--release-dir", fixture.directory, "--home", home,
  ], { encoding: "utf8" });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /schema-1 provenance commitment does not match/);
});

test("latest download keeps the historical three-file set and also fetches a published schema 1 artifact", async (t) => {
  const temp = workspace(t);
  const fixture = fixtureRelease(join(temp, "source"));
  const version = "3.2.1";
  const prefix = `https://github.com/geldmacher/efficiency/releases/download/v${version}/`;
  const required = [assetName("cursor", version), "SHA256SUMS", "provenance.json"];
  const fetcherFor = (names) => {
    const metadata = {
      tag_name: `v${version}`, draft: false, prerelease: false,
      assets: names.map((name) => ({ name, browser_download_url: prefix + name })),
    };
    return async (url) => new Response(url.endsWith("/latest") ? JSON.stringify(metadata) : readFileSync(join(fixture.directory, url.slice(prefix.length))));
  };
  const historical = await loadTagInstaller(t, "v3.6.0");
  const historicalDir = join(temp, "historical");
  mkdirSync(historicalDir);
  await assert.rejects(historical.downloadLatest(historicalDir, "cursor", fetcherFor(required)), /provenance\.json identity is invalid/);

  attachSchema1(fixture.directory);
  const optional = [...required, "RELEASE_NOTES.md", SCHEMA1_PROVENANCE_NAME];
  const directory = join(temp, "current");
  mkdirSync(directory);
  const urls = [];
  const fetcher = fetcherFor(optional);
  const wrapped = async (url, ...rest) => {
    urls.push(url);
    return fetcher(url, ...rest);
  };
  const downloaded = await downloadLatest(directory, "cursor", wrapped);
  assert.equal(downloaded.provenance.schema, 2);
  assert.equal(urls.filter((url) => url.endsWith("/latest")).length, 1);
  assert.ok(urls.some((url) => url.endsWith(`/${SCHEMA1_PROVENANCE_NAME}`)));
  assert.deepEqual(readdirSync(directory).sort(), [...optional].sort());

  const upgraded = join(temp, "upgraded");
  mkdirSync(upgraded);
  const viaProgram = await downloadStableRelease(upgraded, "cursor", fetcher);
  assert.equal(viaProgram.claimedSchema, 2);
  const extracted = join(temp, "extracted");
  mkdirSync(extracted);
  assert.throws(() => extractInstaller(Buffer.from("not a zip"), extracted), /Archive size is invalid/);
});
