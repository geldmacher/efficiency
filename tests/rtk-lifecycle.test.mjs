import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import test from "node:test";
import { applyRtk, findExecutable, inspectRtk, previewRtk, releaseVersion, sourceContext } from "../skills/rtk-setup/scripts/rtk-lifecycle.mjs";
import { writeCargoTools, writeRtkTools } from "./helpers/rtk-lifecycle-fixture.mjs";

const metadata = (version = "0.50.0") => ({ tag_name: `v${version}`, draft: false, prerelease: false, html_url: `https://github.com/rtk-ai/rtk/releases/tag/v${version}` });
const ok = (stdout = "") => ({ status: 0, stdout, stderr: "" });
function fixture(t, { version = "0.49.0", present = true, wrong = false, manager = "homebrew", pinned = false, fail = false, noChange = false, development = false } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "efficiency-rtk-unit-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = join(root, manager === "cargo" ? "cargo/bin" : manager === "winget" ? "Microsoft/WinGet/Packages/rtk-ai.rtk_test" : "brew/bin");
  mkdirSync(bin, { recursive: true });
  let installed = present, current = version;
  const calls = [];
  const binary = join(bin, manager === "winget" ? "rtk.exe" : "rtk");
  const options = {
    releaseMetadata: metadata(), platform: manager === "winget" ? "win32" : "darwin", env: { CARGO_HOME: join(root, "cargo"), LOCALAPPDATA: root },
    locate: (name) => name === "rtk" ? installed ? binary : null : name === (manager === "homebrew" ? "brew" : manager) && manager !== "unknown" ? join(root, name) : null,
    runner: (exe, args) => {
      calls.push({ exe, args });
      if (exe === "git") return { status: 1, stdout: "", stderr: "" };
      if (exe === binary) return ok(args[0] === "--version" ? `rtk ${current}\n` : wrong ? "Unknown command gain" : "Usage: rtk gain. Show token savings");
      if (args[0] === "info") return ok(JSON.stringify({ formulae: [{ name: "rtk", tap: "rtk-ai/tap", versions: { stable: "0.50.0" }, installed: installed ? [{ version: current }] : [], pinned }] }));
      if (args[0] === "--prefix") return ok(join(root, "brew"));
      if (args.join(" ") === "install --list") return ok(installed ? `rtk v${current} (https://github.com/rtk-ai/rtk?${development ? "branch=master" : `tag=v${current}`}#abcd):\n    rtk\n` : "");
      if (args[0] === "list") return ok(installed ? `RTK rtk-ai.rtk ${current} winget\n` : "No installed packages");
      if (args[0] === "pin") return ok(pinned ? "RTK rtk-ai.rtk\n" : "No pinned packages");
      if (args[0] === "show") return ok("https://github.com/rtk-ai/rtk/releases/download/v0.50.0/rtk.zip");
      if (fail) return { status: 2, stdout: "", stderr: "Controlled update failed" };
      if (!noChange) { installed = true; current = "0.50.0"; }
      return ok();
    },
  };
  return { root, binary, options, calls, setVersion: (value) => { current = value; } };
}

test("reports absent, current, outdated and newer stable states without package mutations", async (t) => {
  for (const [config, state] of [[{ present: false }, "absent"], [{ version: "0.50.0" }, "current"], [{}, "update_available"], [{ version: "0.51.0" }, "newer_than_stable"], [{ version: "0.51.0-dev" }, "newer_than_stable"]]) {
    const f = fixture(t, config), report = await inspectRtk(f.options);
    assert.equal(report.state, state);
    const preview = previewRtk(report, "0.50.0");
    assert.equal(preview.operation, state === "absent" ? "install" : state === "update_available" ? "update" : "none");
    assert.ok(f.calls.every(({ args }) => !["upgrade", "install"].includes(args[0])));
  }
});

test("wrong RTK, unknown owner, manager pins and development installs cannot be replaced", async (t) => {
  for (const config of [{ wrong: true }, { manager: "unknown" }, { pinned: true }, { manager: "cargo", development: true }, { manager: "winget", pinned: true }]) {
    const f = fixture(t, config);
    const preview = previewRtk(await inspectRtk(f.options), "0.50.0");
    assert.equal(preview.operation, "none");
    const mutations = f.calls.filter(({ args }) => args[0] === "upgrade" || args[0] === "install" && args[1] !== "--list");
    assert.equal(mutations.length, 0);
  }
});

test("manager ownership requires matching binary path and official Cargo source", async (t) => {
  const f = fixture(t);
  f.options.locate = (name) => name === "rtk" ? "/foreign/rtk" : name === "brew" ? "/brew" : null;
  const runner = f.options.runner;
  f.options.runner = (binary, args) => binary === "/foreign/rtk" ? ok(args[0] === "--version" ? "rtk 0.49.0" : "rtk gain token savings") : runner(binary, args);
  assert.equal((await inspectRtk(f.options)).manager.kind, "unknown");
  const c = fixture(t, { manager: "cargo" }), cargoRunner = c.options.runner;
  c.options.runner = (binary, args) => args.join(" ") === "install --list" ? ok("rtk v0.49.0 (registry+https://github.com/rust-lang/crates.io-index):\n    rtk\n") : cargoRunner(binary, args);
  assert.equal((await inspectRtk(c.options)).manager.kind, "unknown");
});

test("official metadata rejects prereleases, drafts, malformed versions and foreign sources", () => {
  for (const value of [{ ...metadata(), prerelease: true }, { ...metadata(), draft: true }, metadata("0.50.0;evil"), { ...metadata(), html_url: "https://foreign/rtk" }]) assert.throws(() => releaseVersion(value));
});

test("network or malformed release results stay unknown and cannot produce an update", async (t) => {
  for (const fetcher of [async () => { throw new Error("Network unavailable"); }, async () => ({ ok: false, status: 429 }), async () => ({ ok: true, json: async () => ({}) })]) {
    const f = fixture(t); delete f.options.releaseMetadata; f.options.fetcher = fetcher;
    const report = await inspectRtk(f.options);
    assert.equal(report.state, "unknown"); assert.equal(report.latest_stable_version, null);
    assert.throws(() => previewRtk(report, "0.50.0"));
  }
});

test("preview binds exact target and fresh installation state before any update", async (t) => {
  const f = fixture(t), inspection = await inspectRtk(f.options);
  assert.throws(() => previewRtk(inspection, "0.49.0"));
  const preview = previewRtk(inspection, "0.50.0");
  f.setVersion("0.48.0");
  await assert.rejects(applyRtk(preview, f.options), /changed since preview/);
  assert.equal(f.calls.filter(({ args }) => args[0] === "upgrade").length, 0);
});

test("package commands are precise and success requires verified resulting binary", async (t) => {
  for (const manager of ["homebrew", "cargo", "winget"]) {
    const f = fixture(t, { manager });
    const preview = previewRtk(await inspectRtk(f.options), "0.50.0");
    const result = await applyRtk(preview, f.options);
    assert.equal(result.status, "binary_verified");
    assert.equal(result.after.binary, f.binary);
    if (manager === "cargo") assert.deepEqual(preview.command.args, ["install", "--git", "https://github.com/rtk-ai/rtk", "--tag", "v0.50.0", "--locked", "--force", "rtk"]);
    if (manager === "winget") assert.ok(preview.command.args.includes("--exact"));
  }
  for (const config of [{ fail: true }, { noChange: true }]) {
    const f = fixture(t, config);
    assert.equal((await applyRtk(previewRtk(await inspectRtk(f.options), "0.50.0"), f.options)).status, "failed");
  }
});

test("empty Homebrew installation uses install; mismatched catalog or a hidden installation blocks it", async (t) => {
  const f = fixture(t, { present: false }), report = await inspectRtk(f.options);
  assert.deepEqual(previewRtk(report, "0.50.0").command.args, ["install", "rtk-ai/tap/rtk"]);
  assert.equal((await applyRtk(previewRtk(report, "0.50.0"), f.options)).status, "binary_verified");
  for (const manager of [{ ...report.manager, available_version: "0.49.0" }, { ...report.manager, installed_without_path: true }]) assert.equal(previewRtk({ ...report, manager }, "0.50.0").operation, "none");
});

test("source reconciliation uses positive development/Git evidence, never an installed package or foreign repo", (t) => {
  const f = fixture(t), root = f.root;
  const runner = () => ok(root);
  assert.equal(sourceContext(root, runner), null);
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "geldmacher-efficiency-plugin-development", private: true, scripts: { "build:targets": "node scripts/build-plugin-targets.mjs" } }));
  for (const host of ["cursor", "codex"]) { mkdirSync(join(root, `.${host}-plugin`)); writeFileSync(join(root, `.${host}-plugin/plugin.json`), JSON.stringify({ name: "geldmacher-efficiency" })); }
  assert.equal(sourceContext(root, runner), null);
  mkdirSync(join(root, "scripts")); mkdirSync(join(root, "tests")); writeFileSync(join(root, "scripts/build-plugin-targets.mjs"), "");
  assert.deepEqual(sourceContext(root, runner), { root, reconciliation_required: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "foreign", private: true }));
  assert.equal(sourceContext(root, runner), null);
});

test("Cargo's rustup symlink preserves proxy invocation for both first install and update", async (t) => {
  for (const version of [null, "0.49.0"]) {
    const f = fixture(t), tools = writeCargoTools(join(f.root, "proxy"), { version });
    assert.equal(realpathSync(tools.cargo), tools.rustup);
    assert.equal(findExecutable("cargo", tools.env), tools.cargo);
    const options = { env: tools.env, releaseMetadata: metadata(), cwd: f.root };
    const before = await inspectRtk(options), preview = previewRtk(before, "0.50.0");
    assert.equal(before.manager.kind, "cargo");
    assert.equal(preview.command.binary, tools.cargo);
    assert.equal(preview.operation, version ? "update" : "install");
    assert.equal(existsSync(tools.mutations), false);
    const after = await applyRtk(preview, options);
    assert.equal(after.status, "binary_verified");
    assert.equal(after.after.binary, realpathSync(tools.rtk));
    assert.equal(after.after.installed_version, "0.50.0");
    assert.equal(readFileSync(tools.mutations, "utf8").trim().split("\n").length, 1);
  }
});

test("missing RTK tap retains Homebrew preference and requires separate preparation and install previews", async (t) => {
  for (const alsoCargo of [false, true]) {
    const f = fixture(t), tools = writeRtkTools(join(f.root, "untapped"), { tapRegistered: false });
    const cargo = alsoCargo ? writeCargoTools(join(f.root, "cargo-alternative")) : null;
    const env = cargo ? { ...tools.env, CARGO_HOME: cargo.env.CARGO_HOME, PATH: [tools.env.PATH, cargo.env.PATH].join(delimiter) } : tools.env;
    const options = { env, releaseMetadata: metadata(), cwd: f.root };
    const before = await inspectRtk(options), preparation = previewRtk(before, "0.50.0");
    assert.equal(before.manager.kind, "homebrew");
    assert.equal(before.manager.tap_registered, false);
    assert.equal(preparation.operation, "prepare");
    assert.deepEqual(preparation.command.args, ["tap", "rtk-ai/tap", "https://github.com/rtk-ai/homebrew-tap"]);
    assert.equal(existsSync(tools.mutations), false);
    const prepared = await applyRtk(preparation, options);
    assert.equal(prepared.status, "prepared");
    assert.equal(existsSync(tools.rtk), false);
    assert.equal(prepared.next_preview.operation, "install");
    assert.equal(JSON.parse(readFileSync(tools.state, "utf8")).tapRegistered, true);
    assert.equal((await applyRtk(prepared.next_preview, options)).status, "binary_verified");
    assert.deepEqual(readFileSync(tools.mutations, "utf8").trim().split("\n").map(JSON.parse), [preparation.command.args, ["install", "rtk-ai/tap/rtk"]]);
    if (cargo) assert.equal(existsSync(cargo.mutations), false);
  }
});

test("tap failure or a post-registration catalog mismatch never installs RTK or switches managers", async (t) => {
  for (const config of [{ failTap: true }, { catalogVersion: "0.51.0" }]) {
    const f = fixture(t), tools = writeRtkTools(join(f.root, "blocked-tap"), { tapRegistered: false, ...config });
    const options = { env: tools.env, releaseMetadata: metadata(), cwd: f.root };
    const preview = previewRtk(await inspectRtk(options), "0.50.0");
    const result = await applyRtk(preview, options);
    assert.equal(result.status, config.failTap ? "failed" : "prepared");
    if (!config.failTap) {
      assert.equal(result.next_preview.operation, "none");
      assert.equal(result.next_preview.reason, "package_catalog_does_not_match_target");
    }
    assert.equal(existsSync(tools.rtk), false);
    const mutations = readFileSync(tools.mutations, "utf8").trim().split("\n").map(JSON.parse);
    assert.equal(mutations.length, 1);
    assert.equal(mutations[0][0], "tap");
  }
});
