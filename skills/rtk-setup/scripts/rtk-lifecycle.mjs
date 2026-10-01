#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const RELEASE_API = "https://api.github.com/repos/rtk-ai/rtk/releases/latest";
const REPOSITORY = "https://github.com/rtk-ai/rtk";
const TAP_REPOSITORY = "https://github.com/rtk-ai/homebrew-tap";
const stable = (value) => /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value ?? "");
const inside = (parent, child) => { const path = relative(parent, child); return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path)); };
const compare = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return 0; };

export function findExecutable(name, env = process.env, platform = process.platform) {
  for (const directory of (env.PATH ?? "").split(delimiter).filter(Boolean)) {
    for (const suffix of platform === "win32" ? [".exe"] : [""]) {
      const path = resolve(directory, name + suffix);
      // Invocation names matter for multicall tools such as rustup's cargo proxy.
      try { accessSync(path, platform === "win32" ? constants.F_OK : constants.X_OK); return path; } catch { /* Next PATH entry. */ }
    }
  }
  return null;
}

function identityPath(path) {
  try { return realpathSync(path); } catch { return resolve(path); } // A vanished path is rejected by command identification.
}

export function runCommand(binary, args, { env = process.env, cwd = process.cwd() } = {}) {
  const result = spawnSync(binary, args, { env, cwd, encoding: "utf8", shell: false, timeout: 300000, maxBuffer: 8 * 1024 * 1024 });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", error: result.error?.message };
}

export function sourceContext(cwd = process.cwd(), runner = runCommand) {
  const git = runner("git", ["-C", cwd, "rev-parse", "--show-toplevel"]);
  if (git.status !== 0) return null;
  const root = git.stdout.trim();
  try {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    if (pkg.name !== "geldmacher-efficiency-plugin-development" || pkg.private !== true || !pkg.scripts?.["build:targets"]) return null;
    for (const host of ["cursor", "codex"]) {
      if (JSON.parse(readFileSync(join(root, `.${host}-plugin/plugin.json`), "utf8")).name !== "geldmacher-efficiency") return null;
    }
    if (!existsSync(join(root, "scripts/build-plugin-targets.mjs")) || !existsSync(join(root, "tests"))) return null;
    return { root, reconciliation_required: true };
  } catch { return null; }
}

export function releaseVersion(metadata) {
  const version = metadata?.tag_name?.replace(/^v/, "");
  if (metadata?.draft !== false || metadata?.prerelease !== false || !stable(version) || metadata.html_url !== `${REPOSITORY}/releases/tag/${metadata.tag_name}`) {
    throw new Error("Official stable RTK release metadata is invalid");
  }
  return version;
}

async function latestVersion(fetcher) {
  const response = await fetcher(RELEASE_API, { headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Stable release lookup failed: HTTP ${response.status}`);
  return releaseVersion(await response.json());
}

function managerState(binary, installed, { runner, env, platform, locate }) {
  const exec = (path, args) => runner(path, args, { env: { ...env, HOMEBREW_NO_AUTO_UPDATE: "1" } });
  const brew = platform !== "win32" && locate("brew");
  if (brew) {
    const result = exec(brew, ["info", "--json=v2", "rtk-ai/tap/rtk"]);
    try {
      const formula = JSON.parse(result.stdout).formulae?.find((f) => f.name === "rtk" && f.tap === "rtk-ai/tap");
      const prefix = exec(brew, ["--prefix", "rtk-ai/tap/rtk"]);
      const owned = binary && prefix.status === 0 && existsSync(prefix.stdout.trim()) && inside(realpathSync(prefix.stdout.trim()), binary);
      if (result.status === 0 && formula && (!binary || (owned && formula.installed?.some((entry) => entry.version === installed)))) {
        return { kind: "homebrew", executable: brew, package: "rtk-ai/tap/rtk", pinned: formula.pinned === true, available_version: formula.versions?.stable ?? null, installed_without_path: !binary && formula.installed?.length > 0, tap_registered: true };
      }
    } catch { /* Not proven to be this formula's installation. */ }
    if (!binary) {
      const taps = exec(brew, ["tap"]); // Listing taps is read-only, including when RTK's tap is absent.
      return { kind: "homebrew", executable: brew, package: "rtk-ai/tap/rtk", pinned: null, available_version: null, installed_without_path: false,
        tap_registered: taps.status === 0 ? taps.stdout.split(/\r?\n/).includes("rtk-ai/tap") : null,
        catalog_error: result.error || result.stderr.trim() || "Homebrew formula metadata unavailable" };
    }
  }
  const winget = platform === "win32" && locate("winget");
  if (winget) {
    const list = exec(winget, ["list", "--id", "rtk-ai.rtk", "--exact", "--disable-interactivity"]);
    if (!binary) return { kind: "winget", executable: winget, package: "rtk-ai.rtk", pinned: false, installed_without_path: /\brtk-ai\.rtk\b/.test(list.stdout) };
    const pins = exec(winget, ["pin", "list", "--id", "rtk-ai.rtk", "--exact", "--disable-interactivity"]);
    const packages = env.LOCALAPPDATA && join(env.LOCALAPPDATA, "Microsoft", "WinGet", "Packages");
    const owner = packages && inside(packages, binary) && relative(packages, binary).split(sep)[0].startsWith("rtk-ai.rtk_");
    if (owner && list.status === 0 && new RegExp(`\\brtk-ai\\.rtk\\s+${installed.replaceAll(".", "\\.")}(?:\\s|$)`).test(list.stdout) && pins.status === 0) {
      return { kind: "winget", executable: winget, package: "rtk-ai.rtk", pinned: /\brtk-ai\.rtk\b/.test(pins.stdout) };
    }
  }
  const cargo = locate("cargo");
  if (cargo) {
    const list = exec(cargo, ["install", "--list"]);
    if (!binary && list.status === 0) return { kind: "cargo", executable: cargo, package: REPOSITORY, pinned: false, installed_without_path: /^rtk v/m.test(list.stdout) };
    const cargoBin = join(env.CARGO_HOME || join(homedir(), ".cargo"), "bin");
    const entry = list.stdout.match(/^rtk v([^\s]+) \((https:\/\/github\.com\/rtk-ai\/rtk(?:\?[^)]*)?#[a-f0-9]+)\):\r?\n\s+rtk(?:\.exe)?(?:\r?\n|$)/m);
    if (binary && list.status === 0 && entry && entry[1] === installed && binary === identityPath(join(cargoBin, platform === "win32" ? "rtk.exe" : "rtk"))) {
      return { kind: "cargo", executable: cargo, package: REPOSITORY, pinned: false, development_install: !entry[2].includes(`?tag=v${installed}#`) };
    }
  }
  return { kind: "unknown", executable: null, package: null, pinned: null };
}

export async function inspectRtk(options = {}) {
  const runner = options.runner ?? runCommand, env = options.env ?? process.env, platform = options.platform ?? process.platform;
  const locate = options.locate ?? ((name) => findExecutable(name, env, platform));
  const executable = locate("rtk"), binary = executable ? identityPath(executable) : null;
  const report = { schema: 1, binary, executable, installed_version: null, latest_stable_version: null, identity: binary ? "unknown" : "absent", state: "unknown", manager: { kind: "unknown" }, source_context: sourceContext(options.cwd ?? process.cwd(), runner), issues: [] };
  if (binary) {
    const version = runner(executable, ["--version"], { env });
    const gain = runner(executable, ["gain", "--help"], { env });
    const parsed = version.stdout.trim().match(/^rtk (\d+\.\d+\.\d+(?:[-+][\w.-]+)?)$/);
    if (version.status === 0 && parsed && gain.status === 0 && /(?:token|savings)/i.test(gain.stdout) && /gain/i.test(gain.stdout)) {
      report.identity = "rust-token-killer";
      report.installed_version = parsed[1];
    } else report.issues.push("RTK identity could not be verified; do not replace this binary");
  }
  try { report.latest_stable_version = options.releaseMetadata ? releaseVersion(options.releaseMetadata) : await latestVersion(options.fetcher ?? fetch); }
  catch (error) { report.issues.push(error.message); }
  if (report.identity !== "unknown") report.manager = managerState(binary, report.installed_version, { runner, env, platform, locate });
  if (report.latest_stable_version && report.identity !== "unknown") {
    const installed = report.installed_version;
    const order = installed ? compare(installed.split(/[-+]/)[0], report.latest_stable_version) : null;
    report.state = !binary ? "absent" : !stable(installed) ? (order > 0 ? "newer_than_stable" : "unknown") : order === 0 ? "current" : order < 0 ? "update_available" : "newer_than_stable";
    if (binary && !stable(installed)) report.issues.push("Development/prerelease version retained; no automatic replacement");
  }
  return report;
}

export function previewRtk(inspection, target) {
  if (!stable(target) || target !== inspection.latest_stable_version) throw new Error("Target must equal the inspected latest stable release");
  const manager = inspection.manager;
  const preview = { schema: 1, operation: "none", target_version: target, inspection, command: null, reason: null };
  if (inspection.state === "current") { preview.reason = "already_current"; return preview; }
  if (!["absent", "update_available"].includes(inspection.state)) { preview.reason = "unverified_or_newer_installation"; return preview; }
  if (manager.pinned || manager.development_install) { preview.reason = "pinned_or_development_installation"; return preview; }
  if (manager.installed_without_path) { preview.reason = "existing_manager_installation_missing_from_path"; return preview; }
  if (manager.kind === "unknown") { preview.reason = "manual_installation_requires_instructions"; return preview; }
  const installing = inspection.state === "absent";
  let args;
  if (manager.kind === "homebrew") {
    if (installing && manager.tap_registered === false) {
      preview.operation = "prepare";
      preview.command = { binary: manager.executable, args: ["tap", "rtk-ai/tap", TAP_REPOSITORY] };
      preview.reason = "homebrew_tap_missing";
      return preview;
    }
    if (manager.available_version !== target) { preview.reason = "package_catalog_does_not_match_target"; return preview; }
    args = [installing ? "install" : "upgrade", "rtk-ai/tap/rtk"];
  } else if (manager.kind === "cargo") {
    args = ["install", "--git", REPOSITORY, "--tag", `v${target}`, "--locked", ...(installing ? [] : ["--force"]), "rtk"];
  } else if (manager.kind === "winget") {
    args = [installing ? "install" : "upgrade", "--id", "rtk-ai.rtk", "--exact", "--source", "winget", "--version", target, "--disable-interactivity"];
  } else throw new Error("Unsupported package manager");
  preview.operation = installing ? "install" : "update";
  preview.command = { binary: manager.executable, args };
  return preview;
}

const binding = (preview) => JSON.stringify({ target: preview.target_version, operation: preview.operation, binary: preview.inspection.binary, executable: preview.inspection.executable, installed: preview.inspection.installed_version, manager: preview.inspection.manager, command: preview.command, reason: preview.reason });

export async function applyRtk(approvedPreview, options = {}) {
  const fresh = await inspectRtk(options);
  const current = previewRtk(fresh, approvedPreview.target_version);
  if (binding(current) !== binding(approvedPreview)) throw new Error("RTK state or target changed since preview; inspect and preview again");
  if (current.operation === "none") return { status: "unchanged", preview: current, integration: "unverified", source_reconciliation: fresh.source_context ? "pending" : "not_applicable" };
  const runner = options.runner ?? runCommand, env = options.env ?? process.env;
  if (fresh.manager.kind === "winget") {
    const metadata = runner(fresh.manager.executable, ["show", "--id", "rtk-ai.rtk", "--exact", "--source", "winget", "--version", current.target_version, "--disable-interactivity"], { env });
    if (metadata.status !== 0 || !metadata.stdout.includes(`${REPOSITORY}/releases/download/v${current.target_version}/`)) throw new Error("Winget installer provenance could not be verified");
  }
  const result = runner(current.command.binary, current.command.args, { env: { ...env, HOMEBREW_NO_AUTO_UPDATE: "1" } });
  const after = await inspectRtk(options);
  if (current.operation === "prepare") {
    const prepared = result.status === 0 && after.manager.kind === "homebrew" && after.manager.tap_registered === true && after.binary === fresh.binary;
    return { status: prepared ? "prepared" : "failed", before: fresh, after, command: current.command, exit: result.status,
      error: result.error ?? (result.status !== 0 ? result.stderr : null),
      next_preview: prepared && after.latest_stable_version === current.target_version ? previewRtk(after, current.target_version) : null,
      integration: "unverified", source_reconciliation: after.source_context ? "pending" : "not_applicable" };
  }
  const verified = result.status === 0 && after.identity === "rust-token-killer" && after.installed_version === current.target_version && after.manager.kind === fresh.manager.kind;
  return { status: verified ? "binary_verified" : "failed", before: fresh, after, command: current.command, exit: result.status, error: result.error ?? (result.status !== 0 ? result.stderr : null), integration: "unverified", source_reconciliation: after.source_context ? "pending" : "not_applicable" };
}

export async function main(args) {
  if (args.length === 0 || args.includes("--help")) return { usage: "node rtk-lifecycle.mjs inspect | preview --target VERSION | apply --preview FILE [--release-metadata FILE]", note: "Read-only inspection/preview. Apply requires a retained preview and explicit user authorization. Metadata files are retained official release responses (offline use), not authenticity proof." };
  const [operation, ...rest] = args;
  if (!["inspect", "preview", "apply"].includes(operation)) throw new Error("Unknown operation");
  const values = {};
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i];
    if (!["--target", "--preview", "--release-metadata"].includes(key) || !rest[i + 1] || values[key]) throw new Error("Invalid or duplicate option");
    values[key] = rest[i + 1];
  }
  if ((operation !== "preview" && values["--target"]) || (operation !== "apply" && values["--preview"])) throw new Error("Option does not apply to this operation");
  const options = values["--release-metadata"] ? { releaseMetadata: JSON.parse(readFileSync(resolve(values["--release-metadata"]), "utf8")) } : {};
  if (operation === "apply") {
    if (!values["--preview"]) throw new Error("Apply requires --preview FILE");
    return applyRtk(JSON.parse(readFileSync(resolve(values["--preview"]), "utf8")), options);
  }
  const report = await inspectRtk(options);
  return operation === "inspect" ? report : previewRtk(report, values["--target"]);
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).then((report) => { process.stdout.write(`${JSON.stringify(report, null, 2)}\n`); if (report.status === "failed") process.exitCode = 1; })
    .catch((error) => { process.stderr.write(`${JSON.stringify({ status: "failed", error: error.message })}\n`); process.exitCode = 1; });
}
