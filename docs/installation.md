# Install and update Efficiency

[Back to Efficiency](../README.md) · [Usage and examples](usage.md)

Install and update Efficiency from the latest stable [GitHub Release](https://github.com/geldmacher/efficiency/releases/latest). Choose the manual steps or copy a prompt for your agent. These paths use the released package for Cursor, Codex, or OpenCode 2.1.2; no repository checkout or build is needed.

- Install for the first time: [manually](#manual-installation) or [with your agent](#installation-prompt)
- Update Efficiency: [manually](#manual-update) or [with the update skill](#update-with-your-agent)
- [Finish installation or find a missing skill](#finish-installation)
- [Set up optional Codex response guidance](#optional-codex-response-guidance)
- [Resolve a conflict or roll back](#conflicts-and-recovery)
- Reference: [download verification](#manual-verified-download), [agent bootstrap procedure](#first-installation-without-the-skill), and [direct helper usage](#installed-skill-and-direct-helper-usage)

## Before you start

You need **Cursor, Codex, or OpenCode 2.1.2** (`@opencode/cli`, not the `opencode-ai` 1.x package), **Node.js 22 or newer**, and GitHub HTTPS access. Git, npm packages, RTK, and the GitHub CLI are not required for release installation.

After a successful agent-driven Efficiency update, the skill checks optional RTK installation and the latest stable RTK version. If missing, it offers installation and integration through `rtk-setup`; if outdated, it offers the update and integration through `rtk-update`. Only your explicit acceptance permits RTK or global configuration changes. Declining, a failed lookup, or an RTK failure does not undo the successful plugin update. See [RTK usage](usage.md#reduce-terminal-output-with-rtk-optional) for a direct update request.

The installer has packages for Cursor, Codex, and OpenCode and defaults to the app in which you make the request. The same helper supports macOS, Linux, and Windows; this does not mean every app and OS combination has been tested. Other Agent Plugins clients have no supported release archive. OpenCode 1.x is not a supported host.

## Install for the first time

### Manual installation

1. Open the [latest stable GitHub Release](https://github.com/geldmacher/efficiency/releases/latest) and note its version.
2. Download the package for your app: `geldmacher-efficiency-cursor-v<version>.zip`, `geldmacher-efficiency-codex-v<version>.zip`, or `geldmacher-efficiency-opencode-v<version>.zip`. Download `SHA256SUMS` and `provenance.json` from that same release into the same new directory. GitHub's **Source code** archives are development sources, not installable plugin packages. Extra checksum lines for the other hosts are expected.
3. [Verify the download](#manual-verified-download) before extracting it into a temporary directory.
4. Follow the [Cursor](#cursor), [Codex](#codex), or [OpenCode](#opencode) procedure to place the complete package at its installation path and finish the app's installation steps.
5. [Confirm activation](#finish-installation) in the reloaded app or a new task. Keep the downloaded release files with the version so they are available for later recovery.

### Installation prompt

Paste this request into Cursor, Codex, or OpenCode:

```text
Install the latest stable Efficiency release from
https://github.com/geldmacher/efficiency for my current app.
Follow https://github.com/geldmacher/efficiency/blob/main/docs/installation.md,
section "First installation without the skill".
Verify the release before installing and tell me whether a reload or new task is needed.
```

Your agent identifies the app, downloads and verifies one release, previews the installation, and applies it under your request. It reports the installed version and the next activation step. If the existing installation contains local changes or a newer version, it asks before replacing that specific installation. Replacement removes the previous plugin directory and does not retain a copy.

You do not need to run the technical steps later in this guide yourself when the agent completes them for you. Continue with [Finish installation](#finish-installation).

## Update Efficiency

### Manual update

1. Download the latest stable package for your app, `SHA256SUMS`, and `provenance.json` together, then [verify the download](#manual-verified-download).
2. Preserve any local changes you want to keep separately. Replacing the plugin directory removes the previous directory and does not retain a copy.
3. Extract the new archive into a temporary directory. Replace the installed source with its complete `geldmacher-efficiency` directory at the same path; do not merge files from different versions.
4. Finish the update for your app: [reload Cursor](#cursor), or [refresh/reinstall Efficiency in Codex](#codex) and verify the refreshed cache version before starting a new task. For Codex, preserve the existing Marketplace entry and its source path.

If an update fails, follow [recovery and rollback](#conflicts-and-recovery). To have download checks and installation handled for you, use the update skill below.

### Update with your agent

If you already have Efficiency 3.3.0 or newer, use its installed update skill.

**Cursor:**

```text
/install-new-release-from-repo Update Efficiency to the latest stable GitHub Release for Cursor.
```

**Codex:**

```text
$geldmacher-efficiency:install-new-release-from-repo Update Efficiency to the latest stable GitHub Release for Codex.
```

**OpenCode:**

```text
@efficiency-install-release Update Efficiency to the latest stable GitHub Release for OpenCode.
```

`/efficiency-install-release` sends the same request.

The skill downloads and verifies the selected release, previews the update, and applies it under your request. It reports any remaining activation step. Replacing an installation removes the previous plugin directory and does not retain a copy.

For an older installation or a missing update skill, use the [installation prompt](#installation-prompt) instead.

To inspect an update without installing it, replace the request with “Preview the latest stable Efficiency update for this app. Preview only.” The preview may download temporary files, but it does not change your plugin, marketplace, or cache. A normal update request authorizes the ordinary installation after preview; app permission prompts still apply.

### Update from Efficiency 3.6.0 through 3.10.0

Those installed helpers accept only provenance schema 1. Since Efficiency 3.11.0, `provenance.json` is schema 2 so one document can name the Cursor, Codex, and OpenCode archives. The old helper requires `schema` to be 1, `targets` to be exactly `cursor` and `codex`, and `published_assets` to be exactly those two archives plus `RELEASE_NOTES.md`, `provenance.json`, and `SHA256SUMS`. It therefore rejects a current release before it replaces any files. The installation is left unchanged, and no backup is created.

OpenCode packages began at 3.11.0, so they already accept schema 2. Cursor and Codex installs from 3.11.0 through 4.0.3 do too, including a release that also ships `provenance.schema1.json`. Replacing `provenance.json` with a schema 1 document would make those OpenCode updates fail, so the schema 2 file stays in place.

Save the program below as `upgrade-from-schema1.mjs`. It downloads the latest stable release for one app, checks `SHA256SUMS`, the schema 2 receipt, and the selected archive hash, and only then runs the installer that is inside that archive. It does not run the helper already installed on disk. You can use it against the current schema 2 release; a newer tag is not required. Node.js 22 or newer is required, and `--download-dir` must be a directory that does not exist yet.

When the release includes `provenance.schema1.json`, the program also checks the last line of `RELEASE_NOTES.md`:

```text
schema-1 provenance sha256: <64 lowercase hex digits>
```

The schema 2 receipt covers that line through the release-notes hash. The schema 1 file repeats the Cursor and Codex archive hash, content hash, and file count. A mismatch is a hard stop. The file is an extra release asset. Fielded 3.11.0 through 4.0.3 updaters ignore it and keep reading schema 2 `provenance.json`.

Preview, using `codex` or `opencode` instead of `cursor` when that is the app:

```sh
node upgrade-from-schema1.mjs --host cursor --download-dir "$HOME/efficiency-release-upgrade"
```

The preview names the selected version and does not change the plugin. Install only when that version is the release you expect:

```sh
node upgrade-from-schema1.mjs --host cursor --release-dir "$HOME/efficiency-release-upgrade" --apply
```

If the preview says replacement requires approval, read the reason. Add `--replace-existing` to the install command only after you decide to drop that installed copy. Then reload Cursor, or refresh Codex and start a new task. Later updates can use the installed update skill.

An updater from this release accepts schemas 1 and 2. For a newer schema it installs only after `provenance.schema2.json` passes the schema 2 checks and the installer inside that verified archive reports the same archive hash. If either part fails, it stops with this manual command and does not install.

```javascript
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
```

## Finish installation

Follow the installer's reported next step:

| Result | What it means | What to do |
| --- | --- | --- |
| Cursor: `installed` | The verified plugin files are in place. | Reload Cursor, confirm the skill in Customize, then try `/efficiency`. |
| Codex: `installed` | The source and the app's installed cache copy were checked. | Restart the app if needed, confirm the plugin is enabled, review any trust request, and start a new task. Then try `$geldmacher-efficiency:efficiency`. |
| Codex: `prepared` | Files are ready, but installation through Codex is still pending. | Follow the reported desktop steps in [Codex](#codex), then start a new task. |
| OpenCode: `installed` | The package, skills registration, and Efficiency commands are on disk. | Start a new OpenCode session, then try `@efficiency` or `/efficiency`. |
| `no_op: true` | This run changed no installation files. | No extra reload is needed solely for this run. Any previously unfinished activation step still applies. |

**Try it:** ask the skill to review current changes in a project. Seeing it available in the new or reloaded session checks discovery; the installer's file checks alone cannot show that a running task loaded it.

If the skill is missing, check the [installed layout](#verify-the-installed-layout), then follow the [Cursor](#cursor) or [Codex](#codex) activation steps. Cursor must allow local imports; a marketplace installation with the same name must not take precedence. For Codex, use the app's refresh or reinstall action if needed; do not delete its cache manually.

## Optional Codex response guidance

This adds Efficiency's guidance for concise responses and simple, in-scope code changes to your global Codex instructions, so it can apply across projects. Plugin installation leaves those global instructions unchanged. Cursor already includes the equivalent always-applied rule.

### Preview and configure

After installing the plugin, ask:

```text
$geldmacher-efficiency:response-simplicity-setup Check the current status and preview setup of persistent response guidance.
```

The skill reads the active global `AGENTS.override.md` or `AGENTS.md`, verifies the stable plugin source reported by `codex plugin list --json`, and shows the exact proposed patch. To apply it, approve that patch and request configuration. Then start a new task.

### How the reference works

The managed block tells Codex to read an absolute Markdown link to the installed package's `AGENTS.md` before the first response in each task. It uses an explicit read instruction; it does not rely on `@path` expansion. The package's `AGENTS.md` alone is not automatically global.

An update at the same stable installation path replaces the guidance without changing the global reference. Start a new task to use the updated text. Cache paths, `.build` output, temporary directories, and development checkouts are not supported reference targets.

A missing global file is valid for first setup. An unchanged legacy inline block can be migrated to the reference during an approved update. An intact reference needs no change. Modified blocks, duplicate or unpaired markers, equivalent unmarked rules, missing plugin files, and conflicting sources are reported without overwriting them. A configured reference is not proof that a fresh task has loaded it or followed it.

### Remove the guidance

```text
$geldmacher-efficiency:response-simplicity-setup Preview removal of the persistent response guidance.
```

After approval, the skill removes only its recognized managed block and preserves other instructions, including RTK imports. It can remove a broken reference even if the plugin source has disappeared.

Disabling the plugin does not remove this global block. If you no longer want the guidance, remove it separately; deleting the plugin first can leave a broken link.

## Conflicts and recovery

### When replacement needs a decision

The preview reports `previous_version`, the selected version, and `replacement_requires_approval` when the existing installation is newer, locally modified, or cannot be matched to the current release evidence.

**Example:** Your installed copy has edits that are not in the selected release. The agent must identify that copy and explain that replacement would remove those edits from the active installation. Only your explicit decision to replace it permits `--replace-existing`.

That flag removes the previous directory and does not retain a copy. It cannot bypass a wrong plugin identity, unsafe paths, a conflicting marketplace source, or failed release checks.

### Keep the current release evidence

The adjacent `.geldmacher-efficiency.release` directory holds evidence for the current installation. Keep it so future updates can recognize local modifications. Install and deploy do not copy the previous plugin directory, shared OpenCode files, or Marketplace bytes to disk.

### Recover after a failed install

Read the error report before retrying. It says what changed.

A failure before the plugin directory is replaced leaves the previous installation in place. A failure after that replacement stops. The new directory stays, and the previous directory is not retained. Shared OpenCode files that this same run already wrote are rewritten from the bytes kept in memory. The personal Marketplace is handled the same way when this run changed it. Neither rewrite copies those files to a second location.

If a native Codex operation failed, the report may say `native_installation: unverified_after_failure`. The cache may differ from the plugin directory. Reinstall the selected release through Codex and verify its installed cache. Never clear the cache directory manually.

An interrupted process may leave an `.install-lock` directory. Inspect its owner and recorded paths; remove only an abandoned lock after confirming that no installation is running.

### Roll back to a previous version

Rollback means installing an older GitHub release. Download that release, or reuse its directory, and run the helper with `--release-dir` or `--download-dir`. Preview the downgrade, approve replacement of the identified installation, and apply with `--replace-existing`. See [direct helper usage](#installed-skill-and-direct-helper-usage).

For a manual install, place the complete older package with the [Cursor](#cursor) or [Codex](#codex) procedure. Never merge files from different versions. In Codex, also refresh the native installation and verify the cache before treating rollback as complete.

## First installation without the skill

This section is the procedure for the agent receiving the first-install request above. It verifies the downloaded package before running its installer.

The command is included from release 3.3.0 onward, with `skills/install-new-release-from-repo/SKILL.md`. For older releases, use the manual installation sections below and report that the command is not part of the selected release.

The receiving agent performs these steps without requiring a development checkout:

1. Identify Cursor, Codex, or OpenCode 2.1.2 from the session, or ask the user if uncertain. OpenCode means `@opencode/cli` 2.1.2, not `opencode-ai`. When an older installed copy of this skill names only Cursor and Codex, follow this guide from the selected release tag for the host list. Check Node.js 22 or newer. Resolve `https://api.github.com/repos/geldmacher/efficiency/releases/latest` once; require a published, non-prerelease `vMAJOR.MINOR.PATCH` tag. Keep that exact version for all following downloads.
2. Download the matching `geldmacher-efficiency-<host>-v<version>.zip`, `SHA256SUMS`, and `provenance.json` from that release into a new temporary directory. The archive URL must be under `https://github.com/geldmacher/efficiency/releases/download/<tag>/`. Do not run downloaded code yet.
3. Verify exactly the selected ZIP and `provenance.json` using the checksum recipes below. Confirm provenance identifies `geldmacher-efficiency`, `geldmacher/efficiency`, the selected version/tag, and that selected archive. These checks establish consistency with assets obtained from the expected GitHub repository; they are not independent release signatures.
4. Inspect the ZIP with the agent's available archive inspection tools before extraction. Require one `geldmacher-efficiency/` root, regular files/directories only, and reject links, absolute paths, `..`, duplicate paths, backslashes, Windows drive/device paths, and double nesting. Extract only into another newly created temporary directory, never directly into an installed plugin. If safe archive inspection is unavailable, stop with that prerequisite rather than executing an unchecked installer.
5. Locate `skills/install-new-release-from-repo/scripts/install-release.mjs` inside the verified plugin directory for Cursor and Codex. For OpenCode, use `skills/efficiency-install-release/scripts/install-release.mjs`, or the original path in older archives. Invoke it with the selected host and `--release-dir` pointing at the downloaded ZIP/checksum/provenance directory, first with `--dry-run`. It revalidates the archive structure, receipt, manifest, file count and content hash before any installation. If the selected release predates the helper, follow the manual host procedure below instead.
6. Apply with the same helper, host and `--release-dir`, omitting `--dry-run`, under the user's installation request. Follow the helper's conflict and native permission messages, then clean up only the temporary download/extraction directories from this invocation. Finish with the reported host activation step. Roll back by installing an older GitHub release.

## Installed skill and direct helper usage

The skill resolves its helper relative to its own location, so it also works from a Codex cache and when the current working directory is another project. Paths containing spaces must be passed as quoted arguments.

```sh
node "/absolute/path/to/skill/scripts/install-release.mjs" --host cursor --download-dir "/new/temporary/release-directory"
node "/absolute/path/to/skill/scripts/install-release.mjs" --host cursor --release-dir "/new/temporary/release-directory" --dry-run
node "/absolute/path/to/skill/scripts/install-release.mjs" --host cursor --release-dir "/new/temporary/release-directory"
```

Substitute `codex` for Codex or `opencode` for OpenCode. These commands also work in PowerShell with actual absolute paths. `--download-dir` creates a new directory and performs only download/verification. `--release-dir` pins already downloaded assets and requires no network. A direct invocation without either option resolves and installs latest in one run. A dry run may download temporary files and inspect the native CLI, but changes no plugin, marketplace, or cache.

For Codex, the helper preserves the personal marketplace's existing name, interface and unrelated entries; an existing Efficiency entry must already point at the documented local source. It checks `codex plugin marketplace list --json` resolves the name to the intended personal root before calling `codex plugin add <plugin>@<actual-marketplace-name> --json`, then verifies `codex plugin list --json` plus the selected cache bytes. It respects the current `CODEX_HOME` for cache inspection. It does not manually create or delete cache copies. If the CLI is missing, `status: prepared` reports the exact desktop installation steps still needed. Other CLI errors stop the run.

## Manual verified download

Each Efficiency GitHub Release contains separate packages for Cursor, Codex, and OpenCode. Download only the archive for the intended host plus `SHA256SUMS` and `provenance.json` from the [latest GitHub Release](https://github.com/geldmacher/efficiency/releases/latest). You do not need the other host archives or `RELEASE_NOTES.md` to verify this selected download. Do not install an archive until both the selected archive and `provenance.json` match their entries in `SHA256SUMS`. Extra checksum lines for the other hosts are expected and are not a mismatch.

### Verify the download

On macOS or Linux, replace the example version and host when necessary, then verify exactly the two downloaded files that are covered by `SHA256SUMS`:

```sh
archive="geldmacher-efficiency-cursor-v4.1.0.zip"

verify_release_file() {
  file="$1"
  checksum_line="$(awk -v file="$file" '$2 == file { print; count++ } END { exit count == 1 ? 0 : 1 }' SHA256SUMS)" || {
    echo "SHA256SUMS must contain exactly one entry for $file" >&2
    exit 1
  }
  if command -v sha256sum >/dev/null 2>&1; then
    printf '%s\n' "$checksum_line" | sha256sum -c -
  else
    printf '%s\n' "$checksum_line" | shasum -a 256 -c -
  fi
}

verify_release_file "$archive" || exit 1
verify_release_file "provenance.json" || exit 1
```

On Windows PowerShell, the equivalent check selects the exact two entries before comparing their hashes:

```powershell
$archive = "geldmacher-efficiency-cursor-v4.1.0.zip"
$files = @($archive, "provenance.json")
$checksumLines = Get-Content -LiteralPath .\SHA256SUMS

foreach ($file in $files) {
  $pattern = '^(?<hash>[0-9a-fA-F]{64})\s+\*?' + [regex]::Escape($file) + '$'
  $matches = @($checksumLines | Select-String -Pattern $pattern)
  if ($matches.Count -ne 1) {
    throw "SHA256SUMS must contain exactly one entry for $file"
  }
  $expected = $matches[0].Matches[0].Groups['hash'].Value.ToLowerInvariant()
  $actual = (Get-FileHash -LiteralPath ".\$file" -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    throw "SHA-256 mismatch for $file"
  }
  Write-Host "$($file): OK"
}
```

`provenance.json` additionally identifies the exact version, tag, repository commit, Git tree, target content hashes, archive hashes, file counts, release-gate result, release-notes hash, and receipt. Confirm that its version, tag, repository, and selected archive name describe the intended release. A checksum or identity mismatch is a hard stop.

Schema 1 provenance lists exactly `cursor` and `codex` under `targets` and lists exactly those two archives, `RELEASE_NOTES.md`, `provenance.json`, and `SHA256SUMS` in `published_assets`. Schema 2 adds `opencode` and the OpenCode archive and keeps the same Cursor and Codex target fields. Installing one host reads `targets.<host>` for that host. `published_assets` may name the other host archives; verifying the selected archive does not require downloading them. Extra `SHA256SUMS` lines, including one for `provenance.schema1.json`, are not a mismatch. An installed Efficiency 3.6.0 through 3.10.0 helper rejects schema 2 before replacing files. Use the [one-time upgrade](#update-from-efficiency-360-through-3100) instead of that helper.

Every archive must expand to exactly one top-level `geldmacher-efficiency/` directory. Avoid an additional nesting level such as `geldmacher-efficiency/geldmacher-efficiency/`. Before installation, confirm that the host manifest is located at:

- Cursor: `geldmacher-efficiency/.cursor-plugin/plugin.json`
- Codex: `geldmacher-efficiency/.codex-plugin/plugin.json`
- OpenCode: `geldmacher-efficiency/.opencode-plugin/plugin.json`

## Cursor

Install the contents at the local Cursor plugin path:

- macOS/Linux: `~/.cursor/plugins/local/geldmacher-efficiency`
- Windows: `%USERPROFILE%\.cursor\plugins\local\geldmacher-efficiency`

For a first installation, extract the archive to a temporary directory and move its single `geldmacher-efficiency` directory to that destination. For an update, remove the current directory, place the new complete directory at the same path, and do not merge old and new files. Then reload Cursor. Installation on disk and live plugin discovery are separate checks.

To roll back, install an older GitHub release at the same path and reload Cursor. Keep that release's archive, `SHA256SUMS`, and `provenance.json` so the installed bytes remain verifiable.

## Codex

Install the contents at the personal Codex plugin path:

- macOS/Linux: `~/.codex/plugins/geldmacher-efficiency`
- Windows: `%USERPROFILE%\.codex\plugins\geldmacher-efficiency`

The personal Marketplace file is:

- macOS/Linux: `~/.agents/plugins/marketplace.json`
- Windows: `%USERPROFILE%\.agents\plugins\marketplace.json`

For a first installation, this is a complete personal Marketplace document. The `source.path` starts with `./` and is relative to the Marketplace root (the user home directory), not to the `.agents/plugins/` directory:

```json
{
  "name": "geldmacher-personal",
  "interface": {
    "displayName": "Geldmacher Plugins"
  },
  "plugins": [
    {
      "name": "geldmacher-efficiency",
      "source": {
        "source": "local",
        "path": "./.codex/plugins/geldmacher-efficiency"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Developer Tools"
    }
  ]
}
```

If `marketplace.json` already exists, preserve its top-level `name`, `interface`, and every unrelated item in `plugins`. Add or replace only the `geldmacher-efficiency` item shown above; do not replace the whole catalog merely to install this plugin.

Source placement is not installation or activation. After creating or changing the Marketplace entry or its source directory:

1. Fully quit and restart the ChatGPT/Codex desktop app; closing only its window is insufficient.
2. Open the **Plugins Directory**, choose **Geldmacher Plugins** (or the preserved display name of your existing personal Marketplace), and install Efficiency. For an update or rollback, use the available refresh or reinstall action there so the host materializes the selected source again.
3. Confirm that the installed copy exists below `~/.codex/plugins/cache/geldmacher-personal/geldmacher-efficiency/local/` on macOS/Linux or `%USERPROFILE%\.codex\plugins\cache\geldmacher-personal\geldmacher-efficiency\local\` on Windows. If an existing Marketplace keeps another top-level `name`, that name replaces `geldmacher-personal` in the cache path. Local Marketplace plugins run from this cache copy, not directly from `~/.codex/plugins/geldmacher-efficiency`.
4. Review any plugin trust request, then start a new Codex task. An already running task does not prove that the refreshed cache copy is active.

These Marketplace, cache, restart, Plugins Directory, and new-task boundaries follow the [official OpenAI plugin documentation](https://developers.openai.com/plugins/build/plugins).

For an update, replace the source with the complete verified directory from the new archive, keep the Marketplace entry pointed at the same path, and repeat all four activation steps above. The previous source directory is not retained. Verify the manifest version in the refreshed cache copy before starting the new task.

For rollback, install an older GitHub release at the same source path, keep the Marketplace entry unchanged, and repeat the same restart, Plugins Directory refresh or reinstall, cache-version check, and new-task steps. Do not combine files from different versions and do not treat the source bytes as proof that the cached installed copy changed.

## OpenCode

Install the package at:

- macOS/Linux: `~/.config/opencode/geldmacher-efficiency`
- Windows: `%USERPROFILE%\.config\opencode\geldmacher-efficiency`

OpenCode configuration and commands are shared. Merge only this plugin's entries and preserve all unrelated settings, skill paths, and commands. Keep originals in memory and create no backups. Roll back by installing an older GitHub release.

OpenCode 2.1.2 discovers skills from directories listed in the `skills` array of `opencode.json` or `opencode.jsonc`. Register this package's `skills/` directory with an absolute path. Relative paths in `skills` are resolved from the working directory, not from the config file, so do not use a relative entry. Leave `opencode.jsonc` unchanged. Preserve all existing keys and skill entries. Add the absolute `skills/` path only when that path is absent. The helper keeps the original bytes of `opencode.json` and Efficiency command files in memory only. If a write in the same run fails, it rewrites those files from that memory and does not copy them to disk. A second run that changes nothing does not write.

Skill ids are the directory names. `efficiency`, `context-optimization`, `rtk-setup`, and `rtk-filter-design` stay available for model auto-invocation. `rtk-update` and `efficiency-install-release` set `disable-model-invocation: true`, so OpenCode 2.1.2 leaves them out of the model list until you invoke them. `@efficiency` loads the skill. `/efficiency` runs the command that loads the same skill. The same pair works for every packaged skill. Commands live in the package and are installed to `~/.config/opencode/commands/<name>.md`. Stop if a destination file exists and its ownership cannot be verified. A skill name alone does not establish ownership.

The manifest's `opencodeCompatibility` value is `2.1.2`. Do not add `CLAUDE.md`, `opencode/slash`, or `opencode/autoinvoke: false`. Do not install this package into `~/.agents/skills` or `~/.claude/skills`.

For an update, replace the whole package directory. Keep the skills path. Replace only Efficiency command files. Use `/efficiency-install-release` or `@efficiency-install-release` to update from OpenCode. A leftover `/install-new-release-from-repo` from an older release is shared by name and may belong to another installation. Leave it in place unless you can identify its owner and no longer need it. Start a new session and check `@efficiency` and `/efficiency`.

To uninstall, run `npm run deploy:uninstall` from a development checkout, or remove only Efficiency's skills entries, Efficiency command files whose ownership can be verified, and `~/.config/opencode/geldmacher-efficiency`. Preserve all unrelated entries and commands and leave `opencode.jsonc` in place.

## Verify the installed layout

After copying, verify that the manifest sits directly below the destination, that its `name` is `geldmacher-efficiency`, and that its `version` matches the selected release. For OpenCode, also verify that the `skills` entry points at this package's `skills/` directory and that each packaged Efficiency command is present under `~/.config/opencode/commands/`. The archive checksum proves downloaded bytes; it does not prove that Cursor reloaded, the Codex Marketplace accepted the entry, a new Codex task loaded the package, or a new OpenCode session loaded the skills. Confirm those host-specific activation steps separately.
