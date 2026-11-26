#!/usr/bin/env node
// One-time upgrade for an Efficiency updater that only accepts provenance schema 1.
// It checks the release's own SHA-256 manifest and receipt before it runs any code from the archive.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const REPOSITORY = "geldmacher/efficiency";
const PLUGIN = "geldmacher-efficiency";
const SCHEMA1_NAME = "provenance.schema1.json";
const SCHEMA2_ANCHOR = "provenance.schema2.json";
const COMMITMENT_LABEL = "schema-1 provenance sha256:";
const HOSTS = new Set(["cursor", "codex", "opencode"]);
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const INSTALLER_PATH = /^geldmacher-efficiency\/skills\/(?:install-new-release-from-repo|efficiency-install-release)\/scripts\/[A-Za-z0-9._-]+\.mjs$/;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(canonicalValue(value), null, 2)}\n`;
}

function receiptFor(provenance) {
  const value = structuredClone(provenance);
  delete value.receipt_sha256;
  return sha256(canonicalJson(value));
}

function assetName(host, version) {
  return `${PLUGIN}-${host}-v${version}.zip`;
}

function readSums(directory) {
  return readFileSync(join(directory, "SHA256SUMS"), "utf8").split(/\r?\n/).filter(Boolean);
}

export function checkedFile(directory, name, sums = readSums(directory)) {
  const matches = sums.map((line) => line.match(/^([0-9a-f]{64})  (.+)$/)).filter((match) => match?.[2] === name);
  if (matches.length !== 1) throw new Error(`SHA256SUMS must contain exactly one entry for ${name}`);
  const bytes = readFileSync(join(directory, name));
  if (sha256(bytes) !== matches[0][1]) throw new Error(`SHA-256 mismatch for ${name}`);
  return bytes;
}

function assertBoundDocument(provenance, host) {
  if (provenance?.kind !== "github-release-provenance" || provenance.plugin !== PLUGIN || provenance.repository !== REPOSITORY) {
    throw new Error("Release identity or receipt differs");
  }
  if (!STABLE.test(provenance.version ?? "") || provenance.tag !== `v${provenance.version}`) throw new Error("Release identity or receipt differs");
  if (receiptFor(provenance) !== provenance.receipt_sha256) throw new Error("Release identity or receipt differs");
  const target = provenance.targets?.[host];
  if (!target || target.archive !== assetName(host, provenance.version) || !/^[0-9a-f]{64}$/.test(target.archive_sha256 ?? "")) {
    throw new Error("Archive differs from provenance");
  }
  return target;
}

function assertSchema1Commitment(schema2, notes, schema1Bytes) {
  const text = notes.toString("utf8");
  const artifact = schema1Bytes.toString("utf8");
  if (sha256(text) !== schema2.release_notes_sha256) throw new Error("RELEASE_NOTES.md differs from provenance");
  const marker = `${COMMITMENT_LABEL} `;
  if (!text.endsWith("\n")) throw new Error("release notes must end with a newline");
  const commitment = text.slice(0, -1).split("\n").at(-1) ?? "";
  const digest = commitment.startsWith(marker) ? commitment.slice(marker.length) : "";
  if (!/^[0-9a-f]{64}$/.test(digest) || sha256(artifact) !== digest || text.indexOf(marker) !== text.length - commitment.length - 1) {
    throw new Error("schema-1 provenance commitment does not match");
  }
  const schema1 = JSON.parse(artifact);
  const prefix = text.slice(0, text.length - commitment.length - 1);
  if (schema1.schema !== 1 || schema1.release_notes_sha256 !== sha256(prefix) || receiptFor(schema1) !== schema1.receipt_sha256) {
    throw new Error("schema-1 receipt differs");
  }
  for (const name of ["cursor", "codex"]) {
    if (canonicalJson(schema1.targets?.[name]) !== canonicalJson(schema2.targets?.[name])) {
      throw new Error(`${name} provenance target differs across schemas`);
    }
  }
}

export function verifyUpgradedRelease(directory, host) {
  if (!HOSTS.has(host)) throw new Error("Choose the invoking harness explicitly: --host cursor, --host codex, or --host opencode");
  const sums = readSums(directory);
  const primary = JSON.parse(checkedFile(directory, "provenance.json", sums).toString("utf8"));
  let bound = primary;
  if (primary?.schema !== 1 && primary?.schema !== 2) {
    bound = JSON.parse(checkedFile(directory, SCHEMA2_ANCHOR, sums).toString("utf8"));
    if (bound?.schema !== 2) throw new Error("provenance.schema2.json must be schema 2");
    if (typeof primary?.version === "string" && primary.version !== bound.version) throw new Error("unsupported provenance version differs from the schema-2 anchor");
    if (typeof primary?.tag === "string" && primary.tag !== bound.tag) throw new Error("unsupported provenance tag differs from the schema-2 anchor");
  }
  const target = assertBoundDocument(bound, host);
  const archive = checkedFile(directory, target.archive, sums);
  if (sha256(archive) !== target.archive_sha256) throw new Error("Archive differs from provenance");
  const schema1Listed = sums.some((line) => line.match(/^([0-9a-f]{64})  (.+)$/)?.[2] === SCHEMA1_NAME);
  if (schema1Listed) {
    if (!existsSync(join(directory, SCHEMA1_NAME))) throw new Error(`SHA256SUMS lists ${SCHEMA1_NAME} but the file is missing`);
    if (bound.schema !== 2) throw new Error("schema-1 provenance requires a schema-2 document");
    assertSchema1Commitment(bound, checkedFile(directory, "RELEASE_NOTES.md", sums), checkedFile(directory, SCHEMA1_NAME, sums));
  }
  return { provenance: bound, archiveName: target.archive, claimedSchema: primary?.schema };
}

export function extractInstaller(zip, destination) {
  if (zip.length < 22 || zip.length > 64 * 1024 * 1024) throw new Error("Archive size is invalid");
  let end = zip.length - 22;
  while (end >= Math.max(0, zip.length - 65557)) {
    if (zip.readUInt32LE(end) === 0x06054b50 && end + 22 + zip.readUInt16LE(end + 20) === zip.length) break;
    end -= 1;
  }
  if (end < Math.max(0, zip.length - 65557)) throw new Error("ZIP end record is missing");
  const count = zip.readUInt16LE(end + 10);
  const centralStart = zip.readUInt32LE(end + 16);
  let offset = centralStart;
  if (centralStart + zip.readUInt32LE(end + 12) !== end || count < 1) throw new Error("Unsupported ZIP directory");
  const written = [];
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > end || zip.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid ZIP entry");
    const method = zip.readUInt16LE(offset + 10);
    const compressed = zip.readUInt32LE(offset + 20);
    const size = zip.readUInt32LE(offset + 24);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const rawName = zip.subarray(offset + 46, offset + 46 + nameLength);
    const name = rawName.toString("utf8");
    const local = zip.readUInt32LE(offset + 42);
    const unixMode = zip.readUInt32LE(offset + 38) >>> 16;
    offset += 46 + nameLength + extraLength + commentLength;
    if (!INSTALLER_PATH.test(name)) continue;
    if (![0, 8].includes(method) || size > 1024 * 1024 || ((unixMode & 0o170000) && (unixMode & 0o170000) !== 0o100000)) {
      throw new Error("Unsupported installer entry");
    }
    if (local + 30 > centralStart || zip.readUInt32LE(local) !== 0x04034b50) throw new Error("Invalid ZIP local header");
    const localNameLength = zip.readUInt16LE(local + 26);
    if (!zip.subarray(local + 30, local + 30 + localNameLength).equals(rawName)) throw new Error("ZIP local path differs");
    const dataStart = local + 30 + localNameLength + zip.readUInt16LE(local + 28);
    if (dataStart + compressed > centralStart) throw new Error("ZIP local path or size differs");
    const data = zip.subarray(dataStart, dataStart + compressed);
    const bytes = method === 0 ? Buffer.from(data) : inflateRawSync(data, { maxOutputLength: size });
    if (bytes.length !== size) throw new Error("ZIP expanded size differs");
    const relative = name.slice("geldmacher-efficiency/".length);
    const path = join(destination, relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes, { flag: "wx" });
    written.push(relative);
  }
  const script = written.find((path) => path.endsWith("/scripts/install-release.mjs"));
  if (!script) throw new Error("verified archive has no release installer");
  return script;
}

async function downloadBytes(url, limit, fetcher) {
  const response = await fetcher(url, {
    headers: { "User-Agent": "geldmacher-efficiency-release-installer", Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`GitHub download failed (${response.status}) for ${url}`);
  if (Number(response.headers.get("content-length")) > limit) throw new Error("Download exceeds size limit");
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error("Download exceeds size limit");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function downloadStableRelease(directory, host, fetcher = globalThis.fetch) {
  const release = JSON.parse((await downloadBytes(`https://api.github.com/repos/${REPOSITORY}/releases/latest`, 2 * 1024 * 1024, fetcher)).toString("utf8"));
  const version = release.tag_name?.slice(1);
  if (release.draft !== false || release.prerelease !== false || !STABLE.test(version ?? "")
    || release.tag_name !== `v${version}` || !Array.isArray(release.assets)) throw new Error("GitHub latest must identify a published stable release");
  const listed = (name) => release.assets.filter((asset) => asset.name === name);
  const downloadAsset = async (name) => {
    const matches = listed(name);
    const url = `https://github.com/${REPOSITORY}/releases/download/v${version}/${name}`;
    if (matches.length !== 1 || matches[0].browser_download_url !== url) throw new Error(`Missing or conflicting GitHub asset: ${name}`);
    const bytes = await downloadBytes(url, name.endsWith(".zip") ? 64 * 1024 * 1024 : 2 * 1024 * 1024, fetcher);
    writeFileSync(join(directory, name), bytes, { flag: "wx" });
  };
  for (const name of [assetName(host, version), "SHA256SUMS", "provenance.json"]) await downloadAsset(name);
  for (const name of [SCHEMA1_NAME, SCHEMA2_ANCHOR, "RELEASE_NOTES.md"]) {
    if (listed(name).length > 1) throw new Error(`Missing or conflicting GitHub asset: ${name}`);
    if (listed(name).length === 1) await downloadAsset(name);
  }
  if (listed(SCHEMA1_NAME).length === 1 && listed("RELEASE_NOTES.md").length !== 1) throw new Error("Missing or conflicting GitHub asset: RELEASE_NOTES.md");
  return verifyUpgradedRelease(directory, host);
}

export function runVerifiedInstaller(directory, host, { apply = false, home, replaceExisting = false } = {}) {
  const verified = verifyUpgradedRelease(directory, host);
  const archive = readFileSync(join(directory, verified.archiveName));
  const extracted = mkdtempSync(join(tmpdir(), "efficiency-upgrade-"));
  try {
    const script = extractInstaller(archive, extracted);
    const args = [join(extracted, script), "--host", host, "--release-dir", directory];
    if (home) args.push("--home", home);
    if (!apply) args.push("--dry-run");
    if (replaceExisting) args.push("--replace-existing");
    const result = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) throw Object.assign(new Error(result.stderr?.trim() || result.stdout?.trim() || result.error?.message || "release installer failed"), { alreadyReported: Boolean(result.stdout || result.stderr) });
    return verified;
  } finally {
    rmSync(extracted, { recursive: true, force: true });
  }
}

async function main(argv) {
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Node.js 22 or newer is required");
  const options = { apply: false, replaceExisting: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      process.stdout.write("Usage: node upgrade-from-schema1.mjs --host cursor|codex|opencode (--download-dir NEW_DIR | --release-dir DIR) [--home DIR] [--replace-existing] [--apply]\nPreview is the default. --apply installs only after the checksum, receipt, and archive hash match. Save this file from the installation guide; do not use the installed schema-1 helper.\n");
      return;
    }
    if (arg === "--apply") options.apply = true;
    else if (arg === "--replace-existing") options.replaceExisting = true;
    else if (arg === "--host" || arg === "--download-dir" || arg === "--release-dir" || arg === "--home") {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      options[arg.slice(2)] = value;
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!HOSTS.has(options.host)) throw new Error("Choose the invoking harness explicitly: --host cursor, --host codex, or --host opencode");
  if (Boolean(options["download-dir"]) === Boolean(options["release-dir"])) throw new Error("Choose exactly one of --download-dir or --release-dir");
  if (options["download-dir"]) {
    const directory = options["download-dir"];
    mkdirSync(directory);
    try {
      await downloadStableRelease(directory, options.host);
      runVerifiedInstaller(directory, options.host, options);
    } catch (error) {
      rmSync(directory, { recursive: true, force: true });
      throw error;
    }
    return;
  }
  runVerifiedInstaller(options["release-dir"], options.host, options);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    if (!error.alreadyReported) process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
