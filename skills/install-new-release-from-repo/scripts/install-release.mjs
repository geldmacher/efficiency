#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PLUGIN_NAME, EXPECTED_REPOSITORY, RELEASE_HOSTS, assetName, canonicalJson, receiptForProvenance, sha256, validateProvenance } from "./release-format.mjs";
import { verifyArchive } from "./release-archive.mjs";

const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const manifestPath = (host) => `${host === "cursor" ? ".cursor-plugin" : ".codex-plugin"}/plugin.json`;
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const present = (path) => { try { lstatSync(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } };

function assertHost(host) {
  if (!RELEASE_HOSTS.includes(host)) throw new Error("Choose the invoking harness explicitly: --host cursor or --host codex");
}

function assertPath(root, path) {
  const tail = relative(root, path);
  if (!tail || tail === ".." || tail.startsWith(`..${sep}`) || isAbsolute(tail)) throw new Error(`Path escapes installation root: ${path}`);
  let current = root;
  for (const part of tail.split(sep)) {
    current = join(current, part);
    if (!present(current)) break;
    if (lstatSync(current).isSymbolicLink()) throw new Error(`Installation path contains a symlink: ${current}`);
  }
}

function regularFile(path) {
  if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw new Error(`Expected regular file: ${path}`);
  return readFileSync(path);
}

export function verifyRelease(directory, host, expectedVersion) {
  assertHost(host);
  const sums = regularFile(join(directory, "SHA256SUMS")).toString("utf8").split(/\r?\n/).filter(Boolean);
  const checked = (name) => {
    const matches = sums.map((line) => line.match(/^([0-9a-f]{64})  (.+)$/)).filter((match) => match?.[2] === name);
    if (matches.length !== 1) throw new Error(`SHA256SUMS must contain exactly one entry for ${name}`);
    const bytes = regularFile(join(directory, name));
    if (sha256(bytes) !== matches[0][1]) throw new Error(`SHA-256 mismatch for ${name}`);
    return bytes;
  };
  const provenance = JSON.parse(checked("provenance.json").toString("utf8"));
  validateProvenance(provenance);
  if (provenance.repository !== EXPECTED_REPOSITORY || !stableVersion.test(provenance.version)
    || (expectedVersion && provenance.version !== expectedVersion)
    || receiptForProvenance(provenance) !== provenance.receipt_sha256) throw new Error("Release identity or receipt differs");
  const archive = assetName(host, provenance.version);
  const zip = checked(archive);
  if (sha256(zip) !== provenance.targets[host].archive_sha256) throw new Error("Archive differs from provenance");
  const entries = verifyArchive(zip, provenance, host);
  return { provenance, archive, entries, directory, host };
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

export async function downloadLatest(directory, host, fetcher = fetch) {
  assertHost(host);
  const release = JSON.parse((await downloadBytes(`https://api.github.com/repos/${EXPECTED_REPOSITORY}/releases/latest`, 2 * 1024 * 1024, fetcher)).toString("utf8"));
  const version = release.tag_name?.slice(1);
  if (release.draft !== false || release.prerelease !== false || !stableVersion.test(version ?? "")
    || release.tag_name !== `v${version}` || !Array.isArray(release.assets)) throw new Error("GitHub latest must identify a published stable release");
  const names = [assetName(host, version), "SHA256SUMS", "provenance.json"];
  for (const name of names) {
    const matches = release.assets.filter((asset) => asset.name === name);
    const url = `https://github.com/${EXPECTED_REPOSITORY}/releases/download/v${version}/${name}`;
    if (matches.length !== 1 || matches[0].browser_download_url !== url) throw new Error(`Missing or conflicting GitHub asset: ${name}`);
    const bytes = await downloadBytes(url, name.endsWith(".zip") ? 64 * 1024 * 1024 : 2 * 1024 * 1024, fetcher);
    writeFileSync(join(directory, name), bytes, { flag: "wx" });
  }
  return verifyRelease(directory, host, version);
}

function sameTree(directory, entries) {
  if (!present(directory)) return false;
  const actual = [];
  const walk = (folder, prefix = "") => {
    if (!lstatSync(folder).isDirectory() || lstatSync(folder).isSymbolicLink()) throw new Error(`Unsafe installed directory: ${folder}`);
    for (const name of readdirSync(folder)) {
      const path = join(folder, name);
      const key = prefix ? `${prefix}/${name}` : name;
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`Installed tree contains a symlink: ${path}`);
      if (stat.isDirectory()) walk(path, key);
      else if (stat.isFile()) actual.push({ relativePath: key, bytes: readFileSync(path), mode: stat.mode & 0o777 });
      else throw new Error(`Installed tree contains a non-regular file: ${path}`);
    }
  };
  walk(directory);
  const expected = new Map(entries.map((entry) => [entry.relativePath, entry]));
  return actual.length === entries.length && actual.every((entry) => {
    const wanted = expected.get(entry.relativePath);
    return wanted && wanted.bytes.equals(entry.bytes) && (process.platform === "win32" || wanted.mode === entry.mode);
  });
}

export function marketplaceDocument(original, sourcePath) {
  const document = original ? JSON.parse(original.toString("utf8")) : {
    name: "geldmacher-personal", interface: { displayName: "Geldmacher Plugins" }, plugins: [],
  };
  if (!/^[a-zA-Z0-9_-](?:[a-zA-Z0-9._-]*[a-zA-Z0-9_-])?$/.test(document?.name ?? "") || !Array.isArray(document.plugins)) throw new Error("Invalid personal marketplace");
  const matches = document.plugins.filter((entry) => entry?.name === PLUGIN_NAME);
  if (matches.length > 1) throw new Error("Duplicate Efficiency marketplace entries");
  if (matches[0] && (matches[0].source?.source !== "local" || matches[0].source.path !== sourcePath)) {
    throw new Error("Efficiency marketplace points to another source; resolve this conflict first");
  }
  if (!matches.length) document.plugins.push({
    name: PLUGIN_NAME, source: { source: "local", path: sourcePath },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }, category: "Developer Tools",
  });
  return { name: document.name, bytes: matches.length ? original : Buffer.from(`${JSON.stringify(document, null, 2)}\n`) };
}

function defaultRunner(binary, args) {
  return binary.endsWith(".mjs")
    ? spawnSync(process.execPath, [binary, ...args], { encoding: "utf8", timeout: 60000, maxBuffer: 8 * 1024 * 1024 })
    : spawnSync(binary, args, { encoding: "utf8", timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
}

function codexList(binary, runner) {
  const response = runner(binary, ["plugin", "list", "--json"]);
  if (response.error?.code === "ENOENT") return null;
  if (response.status !== 0) throw new Error(`Codex plugin inspection failed: ${response.stderr || response.error?.message || response.status}`);
  const result = JSON.parse(response.stdout);
  if (!Array.isArray(result.installed)) throw new Error("Unsupported Codex plugin list response");
  return result.installed;
}

function cacheState(installed, marketplace, source, codexHome, release) {
  const other = installed.filter((entry) => entry.name === PLUGIN_NAME && entry.pluginId !== `${PLUGIN_NAME}@${marketplace}`);
  if (other.length) throw new Error("Efficiency is installed from another marketplace; resolve this conflict first");
  const current = installed.find((entry) => entry.pluginId === `${PLUGIN_NAME}@${marketplace}`);
  if (!current) return { current: false };
  if (current.source?.source !== "local" || resolve(current.source.path || "/") !== source) throw new Error("Installed Codex plugin points to another source");
  if (![release.provenance.version, "local"].includes(current.version)) return { current: false };
  const cache = join(codexHome, "plugins", "cache", marketplace, PLUGIN_NAME, current.version);
  assertPath(codexHome, cache);
  return { current: sameTree(cache, release.entries), cache, enabled: current.enabled };
}

function assertCodexMarketplace(binary, runner, marketplace, home) {
  const result = runner(binary, ["plugin", "marketplace", "list", "--json"]);
  if (result.status !== 0) throw new Error(`Codex marketplace inspection failed: ${result.stderr || result.error?.message || result.status}`);
  const matches = JSON.parse(result.stdout).marketplaces?.filter((entry) => entry.name === marketplace);
  if (matches?.length !== 1 || !matches[0].root || !existsSync(matches[0].root) || realpathSync(matches[0].root) !== home) {
    throw new Error("Codex does not resolve this marketplace to the intended home; refresh its local catalog before retrying");
  }
}

function atomicWrite(path, bytes) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try { writeFileSync(temporary, bytes, { flag: "wx" }); renameSync(temporary, path); }
  finally { rmSync(temporary, { force: true }); }
}

function sameFile(path, bytes) {
  return bytes === null ? !present(path) : present(path) && regularFile(path).equals(bytes);
}

function newer(installed, selected) {
  const a = installed.split(/[.+-]/).slice(0, 3).map(BigInt);
  const b = selected.split(".").map(BigInt);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

export function installRelease(release, { home = homedir(), codexHome, codexBinary = "codex", dryRun = false, replaceExisting = false, runner = defaultRunner } = {}) {
  const { host, provenance, entries } = release;
  assertHost(host);
  home = realpathSync(home);
  const isolated = home !== realpathSync(homedir());
  codexHome = resolve(codexHome || (isolated ? join(home, ".codex") : process.env.CODEX_HOME || join(home, ".codex")));
  if (isolated && host === "codex" && runner === defaultRunner) {
    if (!isAbsolute(codexBinary)) throw new Error("An isolated Codex drive requires --codex-bin inside --home");
    codexBinary = realpathSync(codexBinary);
    assertPath(home, codexBinary);
    if (!regularFile(codexBinary)) throw new Error("Missing isolated Codex driver");
  }
  const destination = host === "cursor" ? join(home, ".cursor", "plugins", "local", PLUGIN_NAME) : join(home, ".codex", "plugins", PLUGIN_NAME);
  const parent = dirname(destination);
  const state = join(parent, `.${PLUGIN_NAME}.release`);
  const lock = join(parent, `.${PLUGIN_NAME}.install-lock`);
  const marketplacePath = join(home, ".agents", "plugins", "marketplace.json");
  for (const path of [destination, state, lock, ...(host === "codex" ? [marketplacePath] : [])]) assertPath(home, path);
  if (present(lock)) throw new Error(`Another installation or interrupted run owns ${lock}; inspect it before retrying`);
  let locked = false;
  let stage;
  let backup;
  let movedSource = false;
  let placedSource = false;
  let movedState = false;
  let placedState = false;
  let marketplaceWritten = false;
  let nativeAttempted = false;
  let original = null;
  let marketplace;
  try {
    if (!dryRun) {
      mkdirSync(parent, { recursive: true });
      mkdirSync(lock);
      locked = true;
      writeFileSync(join(lock, "owner.json"), canonicalJson({ pid: process.pid, version: provenance.version, host }));
    }
    const exists = present(destination);
    const matches = exists && sameTree(destination, entries);
    let replacementReason = null;
    let previousVersion = null;
    if (exists) {
      const old = json(join(destination, manifestPath(host)));
      previousVersion = old.version;
      if (old.name !== PLUGIN_NAME || !/^\d+\.\d+\.\d+(?:[-+].+)?$/.test(old.version ?? "")) throw new Error("Existing directory is not a recognized Efficiency installation");
      if (!matches && !replaceExisting) {
        if (newer(old.version, provenance.version)) replacementReason = "Installed version is newer";
        else if (!present(state)) replacementReason = "Existing installation has no retained release evidence";
        else {
          const prior = verifyRelease(state, host, old.version);
          if (!sameTree(destination, prior.entries)) replacementReason = "Installed files were locally modified";
        }
        if (replacementReason && !dryRun) throw new Error(`${replacementReason}; preview and explicitly approve --replace-existing`);
      }
    } else if (present(state)) throw new Error("Release evidence exists without its installation; inspect interrupted state before retrying");
    let installed;
    let cache = null;
    if (host === "codex") {
      original = present(marketplacePath) ? regularFile(marketplacePath) : null;
      marketplace = marketplaceDocument(original, "./.codex/plugins/geldmacher-efficiency");
      installed = codexList(codexBinary, runner);
      if (installed) cache = cacheState(installed, marketplace.name, destination, codexHome, release);
    }
    const marketplaceChange = marketplace && !sameFile(marketplacePath, marketplace.bytes);
    const report = {
      plugin: PLUGIN_NAME, host, version: provenance.version, previous_version: previousVersion, tag: provenance.tag,
      repository: EXPECTED_REPOSITORY, destination, dry_run: dryRun,
      source_changed: !matches, marketplace_changed: Boolean(marketplaceChange),
      native_installation: host === "cursor" ? "not_applicable" : cache?.current ? "verified" : "pending",
      activation: "unverified", backup: null, replacement_requires_approval: replacementReason,
    };
    if (dryRun) return { ...report, status: "preview", next_step: replacementReason
      ? "Ask the user to approve replacing this installation before adding --replace-existing. The previous directory will be retained."
      : "Run the same command without --dry-run after resolving any reported prerequisites." };
    if (!matches || marketplaceChange) {
      stage = mkdtempSync(join(parent, `.${PLUGIN_NAME}.stage-`));
      const payload = join(stage, "plugin");
      mkdirSync(payload);
      for (const entry of entries) {
        const path = join(payload, entry.relativePath);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, entry.bytes, { flag: "wx", mode: entry.mode });
        chmodSync(path, entry.mode);
      }
      if (!sameTree(payload, entries)) throw new Error("Staged installation differs from release");
      const evidence = join(stage, "release");
      mkdirSync(evidence);
      for (const name of [release.archive, "SHA256SUMS", "provenance.json"]) cpSync(join(release.directory, name), join(evidence, name), { errorOnExist: true, force: false });
      verifyRelease(evidence, host, provenance.version);
      backup = join(parent, `.${PLUGIN_NAME}.backup-${randomUUID()}`);
      mkdirSync(backup);
      report.backup = backup;
      writeFileSync(join(backup, "recovery.json"), canonicalJson({ destination, state, marketplace: host === "codex" ? marketplacePath : null, previous_marketplace_existed: original !== null, selected_version: provenance.version }));
      if (original) writeFileSync(join(backup, "marketplace.before.json"), original);
      if (!matches) {
        if (exists) { renameSync(destination, join(backup, "plugin")); movedSource = true; }
        renameSync(payload, destination); placedSource = true;
        if (present(state)) { renameSync(state, join(backup, "release")); movedState = true; }
        renameSync(evidence, state); placedState = true;
      }
      if (marketplaceChange) {
        if (!sameFile(marketplacePath, original)) throw new Error("Marketplace changed concurrently");
        mkdirSync(dirname(marketplacePath), { recursive: true });
        atomicWrite(marketplacePath, marketplace.bytes); marketplaceWritten = true;
      }
    }
    if (host === "codex" && installed && (!cache.current || marketplaceChange)) {
      assertCodexMarketplace(codexBinary, runner, marketplace.name, home);
      nativeAttempted = true;
      const result = runner(codexBinary, ["plugin", "add", `${PLUGIN_NAME}@${marketplace.name}`, "--json"]);
      if (result.status !== 0) throw new Error(`Codex installation failed: ${result.stderr || result.error?.message || result.status}`);
      cache = cacheState(codexList(codexBinary, runner) ?? [], marketplace.name, destination, codexHome, release);
      if (!cache.current) throw new Error("Codex installed cache differs from the selected release");
    }
    if (!sameTree(destination, entries)) throw new Error("Installed files differ from release");
    if (marketplace && !sameFile(marketplacePath, marketplace.bytes)) throw new Error("Marketplace changed during installation");
    const status = host === "codex" && !cache?.current ? "prepared" : "installed";
    const noOp = matches && !marketplaceChange && (host === "cursor" || Boolean(cache?.current && !nativeAttempted));
    return {
      ...report, status, no_op: noOp,
      native_installation: host === "codex" ? cache?.current ? "verified" : "manual_action_required" : "not_applicable",
      cache: cache?.cache ?? null,
      next_step: noOp ? "No installation files changed. No additional reload is needed for this run; live activation remains unverified until observed."
        : host === "cursor"
        ? "Reload Cursor, then confirm the skill in Customize. Local imports must be allowed and a same-name marketplace install must not take precedence."
        : cache?.current
          ? "Restart the desktop app if needed, confirm the plugin is enabled, and start a new Codex task to verify skill discovery."
          : "Codex CLI is unavailable. Fully restart the desktop app, open Plugins Directory, select your marketplace, install or refresh Efficiency, verify the installed cache version, then start a new task.",
    };
  } catch (error) {
    const recovery = [];
    const attempt = (label, fn) => { try { fn(); } catch (failure) { recovery.push(`${label}: ${failure.message}`); } };
    if (placedSource) attempt("retain attempted source", () => renameSync(destination, join(backup, "attempted-plugin")));
    if (movedSource) attempt("restore previous source", () => renameSync(join(backup, "plugin"), destination));
    if (placedState) attempt("retain attempted release", () => renameSync(state, join(backup, "attempted-release")));
    if (movedState) attempt("restore previous evidence", () => renameSync(join(backup, "release"), state));
    if (marketplaceWritten) attempt("restore marketplace", () => {
      if (!sameFile(marketplacePath, marketplace.bytes)) throw new Error("Concurrent marketplace change preserved; restore manually");
      if (original) atomicWrite(marketplacePath, original); else rmSync(marketplacePath);
    });
    const result = {
      status: "failed", error: error.message,
      source_rollback: recovery.length ? "incomplete" : "completed_or_not_needed",
      recovery_errors: recovery, backup: backup ?? null,
      native_installation: nativeAttempted ? "unverified_after_failure" : "not_changed",
      next_step: nativeAttempted ? "Inspect the retained backup. Reinstall the restored source through the native host; for a failed first install inspect/remove only this plugin through the host. Do not delete caches manually." : "Resolve the reported conflict or prerequisite before retrying.",
    };
    throw Object.assign(new Error(error.message), { result });
  } finally {
    if (stage) rmSync(stage, { recursive: true, force: true });
    if (locked) rmSync(lock, { recursive: true });
  }
}

export async function main(args) {
  const options = {};
  let releaseDirectory;
  let downloadDirectory;
  const values = { "--host": "host", "--home": "home", "--codex-bin": "codexBinary" };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help") {
      process.stdout.write("Usage: node install-release.mjs --host cursor|codex [--dry-run] [--release-dir DIR] [--replace-existing]\nDownload and verify only: --host cursor|codex --download-dir NEW_DIR\nIsolation: --home DIR [--codex-bin /absolute/path/inside/home/driver.mjs]\nRequires Node.js >=22. Default: latest stable geldmacher/efficiency release. No Git or npm install required.\n");
      return;
    }
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--replace-existing") options.replaceExisting = true;
    else if (arg === "--release-dir" || arg === "--download-dir" || values[arg]) {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      if (arg === "--release-dir") releaseDirectory = resolve(value);
      else if (arg === "--download-dir") downloadDirectory = resolve(value);
      else options[values[arg]] = value;
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  assertHost(options.host);
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Node.js 22 or newer is required");
  if (downloadDirectory) {
    if (releaseDirectory || options.dryRun || options.replaceExisting) throw new Error("--download-dir cannot be combined with --release-dir, --dry-run or --replace-existing");
    mkdirSync(downloadDirectory);
    try {
      const release = await downloadLatest(downloadDirectory, options.host);
      process.stdout.write(canonicalJson({ status: "downloaded_and_verified", version: release.provenance.version, host: options.host, directory: downloadDirectory }));
    } catch (error) { rmSync(downloadDirectory, { recursive: true }); throw error; }
    return;
  }
  const temporary = releaseDirectory ? null : mkdtempSync(join(tmpdir(), "efficiency-release-download-"));
  try {
    const release = releaseDirectory ? verifyRelease(releaseDirectory, options.host) : await downloadLatest(temporary, options.host);
    const report = installRelease(release, options);
    process.stdout.write(canonicalJson(report));
  } finally { if (temporary) rmSync(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(canonicalJson(error.result ?? { status: "failed", error: error.message }));
    process.exitCode = 1;
  });
}
