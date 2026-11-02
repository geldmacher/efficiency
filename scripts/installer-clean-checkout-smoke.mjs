#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseManifestPath } from "../skills/install-new-release-from-repo/scripts/release-archive.mjs";
import { PLUGIN_NAME, RELEASE_HOSTS, assetName, canonicalJson, contentSummary, receiptForProvenance, sha256 } from "../skills/install-new-release-from-repo/scripts/release-format.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const version = "0.0.1";

function storedZip(name, bytes) {
  const encoded = Buffer.from(name);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt32LE(bytes.length, 18);
  header.writeUInt32LE(bytes.length, 22);
  header.writeUInt16LE(encoded.length, 26);
  const record = Buffer.alloc(46);
  record.writeUInt32LE(0x02014b50, 0);
  record.writeUInt32LE(bytes.length, 20);
  record.writeUInt32LE(bytes.length, 24);
  record.writeUInt16LE(encoded.length, 28);
  record.writeUInt32LE((0o100644 << 16) >>> 0, 38);
  const table = Buffer.concat([record, encoded]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(table.length, 12);
  end.writeUInt32LE(header.length + encoded.length + bytes.length, 16);
  return Buffer.concat([header, encoded, bytes, table, end]);
}

function writeReleaseFixture(directory) {
  mkdirSync(directory);
  const notes = Buffer.from(`Release ${version}\n`);
  writeFileSync(join(directory, "RELEASE_NOTES.md"), notes);
  const targets = {};
  for (const host of RELEASE_HOSTS) {
    const manifest = Buffer.from(canonicalJson({ name: PLUGIN_NAME, version }));
    const relativePath = releaseManifestPath(host);
    const zip = storedZip(`${PLUGIN_NAME}/${relativePath}`, manifest);
    const archive = assetName(host, version);
    writeFileSync(join(directory, archive), zip);
    targets[host] = {
      archive,
      archive_sha256: sha256(zip),
      ...contentSummary([{ relativePath, bytes: manifest, mode: 0o644 }]),
      root_directory: PLUGIN_NAME,
    };
  }
  const provenance = {
    schema: 2,
    kind: "github-release-provenance",
    plugin: PLUGIN_NAME,
    repository: "geldmacher/efficiency",
    version,
    tag: `v${version}`,
    source: { clean: true, commit_sha: "a".repeat(40), tree_sha: "b".repeat(40) },
    targets,
    release_gate: { command: "npm run release-check", result: "passed" },
    release_notes_sha256: sha256(notes),
    published_assets: [...RELEASE_HOSTS.map((host) => assetName(host, version)), "RELEASE_NOTES.md", "provenance.json", "SHA256SUMS"],
  };
  provenance.receipt_sha256 = receiptForProvenance(provenance);
  writeFileSync(join(directory, "provenance.json"), canonicalJson(provenance));
  writeFileSync(join(directory, "SHA256SUMS"), provenance.published_assets
    .filter((name) => name !== "SHA256SUMS")
    .map((name) => `${sha256(readFileSync(join(directory, name)))}  ${name}\n`)
    .join(""));
}

if (process.env.GITHUB_ACTIONS === "true" && existsSync(join(root, "node_modules"))) {
  process.stderr.write("installer smoke must run before npm ci\n");
  process.exit(1);
}

const isolated = mkdtempSync(join(tmpdir(), "efficiency-installer-smoke-"));
try {
  const scripts = join(isolated, "scripts");
  cpSync(join(root, "skills", "install-new-release-from-repo", "scripts"), scripts, { recursive: true });
  if (existsSync(join(scripts, "node_modules"))) throw new Error("isolated installer copy contains node_modules");
  const installer = join(scripts, "install-release.mjs");
  const env = { ...process.env };
  delete env.NODE_PATH;
  const help = spawnSync(process.execPath, [installer, "--help"], { encoding: "utf8", env, cwd: isolated });
  process.stdout.write(help.stdout);
  if (help.status !== 0 || !help.stdout.includes("No Git or npm install required.")) {
    throw new Error(help.stderr || "installer --help failed without dependencies");
  }
  const releaseDir = join(isolated, "release");
  const home = join(isolated, "home");
  mkdirSync(home);
  writeReleaseFixture(releaseDir);
  const dryRun = spawnSync(process.execPath, [
    installer, "--host", "cursor", "--home", home, "--release-dir", releaseDir, "--dry-run",
  ], { encoding: "utf8", env, cwd: isolated });
  process.stdout.write(dryRun.stdout);
  if (dryRun.status !== 0) throw new Error(dryRun.stderr || "installer --dry-run failed without dependencies");
  const report = JSON.parse(dryRun.stdout);
  if (report.status !== "preview" || report.dry_run !== true) throw new Error(`expected a dry-run preview, received ${dryRun.stdout}`);
  if (readdirSync(home).length !== 0) throw new Error("dry-run wrote into the selected home");
} catch (error) {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
} finally {
  rmSync(isolated, { recursive: true, force: true });
}
