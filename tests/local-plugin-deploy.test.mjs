import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  contentHash,
  deployPreparedTargets,
  deploymentPaths,
  deploymentReceipt,
  isInside,
  localVersion,
  preparationScripts,
  uninstallOpenCodeDeployment,
  validateBundle,
} from "../scripts/local-plugin-deploy.mjs";
import { openCodeCommand, openCodeSkillsPath, updateOpenCodeDocument } from "../skills/install-new-release-from-repo/scripts/opencode-config.mjs";
import { defaultRoot } from "../scripts/validate-plugin.mjs";

import { marketplaceDocument } from "../skills/install-new-release-from-repo/scripts/codex-install.mjs";

test("full deployment validates plugin output once inside release-check", () => {
  const scripts = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts;
  assert.deepEqual(preparationScripts(false), ["deploy:prepare"]);
  assert.deepEqual(preparationScripts(true), ["build:targets", "release-check"]);
  const expanded = preparationScripts(true).map((name) => scripts[name]).join(" && ");
  assert.equal(expanded.split("npm run validate").length - 1, 1);
});

const plugin = "geldmacher-test";
const baseVersion = "1.2.3";
const gitHead = "0123456789abcdef0123456789abcdef01234567";

function json(path, value) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "local-plugin-deploy-test-"));
  const repository = join(root, "repository");
  const home = join(root, "home");
  for (const host of ["cursor", "codex", "opencode"]) {
    const bundle = join(repository, ".build", "plugins", host, plugin);
    const manifestDir = host === "cursor" ? ".cursor-plugin" : host === "codex" ? ".codex-plugin" : ".opencode-plugin";
    json(join(bundle, manifestDir, "plugin.json"), { name: plugin, version: baseVersion });
    writeFileSync(join(bundle, "payload.txt"), "first\n");
    if (host === "opencode") {
      mkdirSync(join(bundle, "commands"));
      writeFileSync(join(bundle, "commands", "efficiency.md"), openCodeCommand("efficiency", "Review."));
    } else {
      mkdirSync(join(bundle, "hooks"));
      writeFileSync(join(bundle, "hooks", `${host}.json`), `${host}-hook\n`);
    }
  }
  const marketplace = deploymentPaths(home, plugin).marketplace;
  json(marketplace, {
    name: "personal",
    plugins: [
      { name: "unrelated", source: { source: "local", path: "./other" } },
      { name: plugin, source: { source: "local", path: `./.codex/plugins/${plugin}` }, policy: { installation: "AVAILABLE" } },
    ],
  });
  return { root, repository, home, marketplace };
}

function metadata(root) {
  return {
    root,
    plugin,
    baseVersion,
    gitHead,
    gitDirty: true,
    // Isolate OpenCode config from the runner's XDG_CONFIG_HOME and OPENCODE_CONFIG_DIR.
    env: {},
  };
}

const neverCurrent = () => ({ current: false, installed: null, cachePath: null });
const alwaysCurrent = () => ({ current: true, installed: { version: "current" }, cachePath: "/cache" });
const successfulInstaller = ({ version, cache }) => ({ current: true, installed: { version }, cachePath: cache });

test("local deployment rejects conflicting catalog sources before changing hosts", () => {
  const item = fixture();
  try {
    const document = JSON.parse(readFileSync(item.marketplace));
    document.plugins[1].source.path = "./foreign";
    json(item.marketplace, document);
    const original = readFileSync(item.marketplace);
    assert.throws(() => deployPreparedTargets({ ...metadata(item.repository), home: item.home,
      codexStateReader: neverCurrent, codexInstaller: successfulInstaller }), /another source/);
    assert.deepEqual(readFileSync(item.marketplace), original);
    const paths = deploymentPaths(item.home, plugin);
    assert.equal(existsSync(paths.cursor), false);
    assert.equal(existsSync(paths.codex), false);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test("rollback preserves a concurrent marketplace edit and reports incomplete recovery", () => {
  const item = fixture();
  try {
    rmSync(item.marketplace);
    const concurrent = JSON.stringify({ name: "new-owner", plugins: [] });
    assert.throws(() => deployPreparedTargets({ ...metadata(item.repository), home: item.home,
      codexStateReader: neverCurrent, codexInstaller: () => {
        writeFileSync(item.marketplace, concurrent);
        throw Object.assign(new Error("native failure"), { nativeAttempted: true });
      } }), (error) => {
      assert.equal(error.result.source_rollback, "incomplete");
      assert.equal(error.result.native_installation, "unverified_after_failure");
      assert.match(error.result.recovery_errors[0], /Concurrent marketplace change preserved/);
      return true;
    });
    assert.equal(readFileSync(item.marketplace, "utf8"), concurrent);
    const paths = deploymentPaths(item.home, plugin);
    assert.equal(existsSync(paths.cursor), false);
    assert.equal(existsSync(paths.codex), false);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test("local versions are host-specific and content-addressed", () => {
  const hash = "a".repeat(64);
  assert.equal(localVersion("5.3.0", "cursor", hash), "5.3.0+local.cursor.aaaaaaaaaaaa");
  assert.equal(localVersion("5.3.0", "codex", hash), "5.3.0+local.codex.aaaaaaaaaaaa");
  assert.throws(() => localVersion("5.3", "cursor", hash), /product version/);
});

test("content hashes are stable across receipts and deployed manifest versions", () => {
  const item = fixture();
  try {
    const bundle = join(item.repository, ".build", "plugins", "cursor", plugin);
    const first = contentHash(bundle, { host: "cursor", baseVersion });
    json(join(bundle, ".cursor-plugin", "plugin.json"), { name: plugin, version: localVersion(baseVersion, "cursor", first) });
    json(join(bundle, ".local-deploy.json"), { deployed_at: "tomorrow", content_sha256: first });
    assert.equal(contentHash(bundle, { host: "cursor", baseVersion }), first);
  } finally {
    rmSync(item.root, { recursive: true, force: true });
  }
});

test("dirty provenance is explicit in deployment receipts", () => {
  const hash = "b".repeat(64);
  const receipt = deploymentReceipt({
    plugin,
    host: "codex",
    baseVersion,
    hash,
    gitHead,
    gitDirty: true,
    sourceRoot: "/tmp/source",
    deployedAt: "2026-08-10T12:00:00.000Z",
  });
  assert.equal(receipt.git_dirty, true);
  assert.equal(receipt.git_head, gitHead);
  assert.equal(receipt.local_version, "1.2.3+local.codex.bbbbbbbbbbbb");
  assert.equal(receipt.source_path, "/tmp/source");
});

test("path boundaries, symlinks, development roots, and wrong manifests fail closed", () => {
  const item = fixture();
  try {
    const cursor = join(item.repository, ".build", "plugins", "cursor", plugin);
    assert.equal(isInside(item.repository, cursor), true);
    assert.equal(isInside(item.repository, join(item.repository, "..", "escape")), false);
    json(join(cursor, ".cursor-plugin", "plugin.json"), { name: "wrong-plugin", version: baseVersion });
    assert.throws(() => validateBundle(cursor, { plugin, host: "cursor", allowedVersions: [baseVersion] }), /unexpected cursor plugin manifest/);
    json(join(cursor, ".cursor-plugin", "plugin.json"), { name: plugin, version: baseVersion });
    mkdirSync(join(cursor, "tests"));
    assert.throws(() => validateBundle(cursor, { plugin, host: "cursor", allowedVersions: [baseVersion] }), /development surface/);
    rmSync(join(cursor, "tests"), { recursive: true });
    symlinkSync("payload.txt", join(cursor, "payload-link"));
    assert.throws(() => validateBundle(cursor, { plugin, host: "cursor", allowedVersions: [baseVersion] }), /contains a symlink/);
    assert.equal(readlinkSync(join(cursor, "payload-link")), "payload.txt");
  } finally {
    rmSync(item.root, { recursive: true, force: true });
  }
});

test("Marketplace updates preserve existing names, entries and unchanged bytes", () => {
  const original = Buffer.from(JSON.stringify({ name: "colleagues", interface: { displayName: "Team" }, plugins: [
    { name: "alpha", source: { source: "local", path: "./alpha" } },
  ] }));
  const source = `./.codex/plugins/${plugin}`;
  const result = marketplaceDocument(original, source, plugin);
  const document = JSON.parse(result.bytes);
  assert.equal(result.name, "colleagues");
  assert.deepEqual(document.interface, { displayName: "Team" });
  assert.deepEqual(document.plugins[0], JSON.parse(original).plugins[0]);
  assert.deepEqual(marketplaceDocument(result.bytes, source, plugin).bytes, result.bytes);
  assert.equal(marketplaceDocument(null, source, plugin).name, "geldmacher-personal");
  assert.throws(() => marketplaceDocument(result.bytes, "./foreign", plugin), /another source/);
  document.plugins.push(document.plugins[1]);
  assert.throws(() => marketplaceDocument(Buffer.from(JSON.stringify(document)), source, plugin), /Duplicate/);
});

test("Cursor-only first install needs neither Codex nor a personal Marketplace", () => {
  const item = fixture();
  try {
    rmSync(item.marketplace, { force: true });
    const result = deployPreparedTargets({
      ...metadata(item.repository),
      home: item.home,
      hosts: ["cursor"],
      codexStateReader: () => { throw new Error("Cursor-only deploy must not inspect Codex"); },
      codexInstaller: () => { throw new Error("Cursor-only deploy must not install Codex"); },
    });
    const paths = deploymentPaths(item.home, plugin);
    assert.deepEqual(result.selected_hosts, ["cursor"]);
    assert.equal(result.marketplace, null);
    assert.equal(result.codex, null);
    assert.equal(readFileSync(join(paths.cursor, ".cursor-plugin", "plugin.json"), "utf8").includes("+local.cursor."), true);
    assert.equal(existsSync(paths.codex), false);
    assert.equal(existsSync(paths.marketplace), false);
    assert.equal(existsSync(paths.opencode), false);
    assert.equal(existsSync(paths.opencodeConfig), false);
    assert.equal(existsSync(paths.opencodeCommands), false);
  } finally {
    rmSync(item.root, { recursive: true, force: true });
  }
});

test("Codex-only first install creates its Marketplace entry without touching Cursor", () => {
  const item = fixture();
  try {
    rmSync(item.marketplace, { force: true });
    const result = deployPreparedTargets({
      ...metadata(item.repository),
      home: item.home,
      hosts: ["codex"],
      codexStateReader: neverCurrent,
      codexInstaller: successfulInstaller,
    });
    const paths = deploymentPaths(item.home, plugin);
    assert.deepEqual(result.selected_hosts, ["codex"]);
    assert.equal(existsSync(paths.cursor), false);
    assert.equal(existsSync(paths.opencode), false);
    assert.equal(readFileSync(join(paths.codex, ".codex-plugin", "plugin.json"), "utf8").includes("+local.codex."), true);
    const marketplace = JSON.parse(readFileSync(paths.marketplace, "utf8"));
    assert.equal(marketplace.name, "geldmacher-personal");
    assert.equal(marketplace.plugins[0].source.path, `./.codex/plugins/${plugin}`);
  } finally {
    rmSync(item.root, { recursive: true, force: true });
  }
});

test("first install is physical and a second identical deploy is a no-op", () => {
  const item = fixture();
  try {
    const first = deployPreparedTargets({
      ...metadata(item.repository),
      home: item.home,
      deployedAt: "2026-08-10T12:00:00.000Z",
      codexStateReader: neverCurrent,
      codexInstaller: successfulInstaller,
    });
    assert.equal(first.no_op, false);
    const paths = deploymentPaths(item.home, plugin);
    assert.equal(JSON.parse(readFileSync(join(paths.cursor, ".cursor-plugin", "plugin.json"))).version, first.targets.cursor.local_version);
    assert.equal(JSON.parse(readFileSync(join(paths.codex, ".codex-plugin", "plugin.json"))).version, first.targets.codex.local_version);
    assert.equal(JSON.parse(readFileSync(item.marketplace)).plugins[1].source.path, `./.codex/plugins/${plugin}`);
    const receiptBefore = readFileSync(join(paths.cursor, ".local-deploy.json"), "utf8");
    const second = deployPreparedTargets({
      ...metadata(item.repository),
      home: item.home,
      deployedAt: "2026-08-11T12:00:00.000Z",
      codexStateReader: alwaysCurrent,
      codexInstaller: () => { throw new Error("no-op must not reinstall"); },
    });
    assert.equal(second.no_op, true);
    assert.equal(readFileSync(join(paths.cursor, ".local-deploy.json"), "utf8"), receiptBefore);
  } finally {
    rmSync(item.root, { recursive: true, force: true });
  }
});

test("changed bundles replace both targets", () => {
  const item = fixture();
  try {
    const options = {
      ...metadata(item.repository),
      home: item.home,
      codexStateReader: neverCurrent,
      codexInstaller: successfulInstaller,
    };
    const first = deployPreparedTargets({ ...options, deployedAt: "2026-08-10T12:00:00.000Z" });
    for (const host of ["cursor", "codex"]) {
      writeFileSync(join(item.repository, ".build", "plugins", host, plugin, "payload.txt"), "second\n");
    }
    const second = deployPreparedTargets({ ...options, deployedAt: "2026-08-10T12:01:00.000Z" });
    assert.notEqual(first.targets.cursor.content_sha256, second.targets.cursor.content_sha256);
    assert.equal(readFileSync(join(deploymentPaths(item.home, plugin).cursor, "payload.txt"), "utf8"), "second\n");
    assert.equal(readFileSync(join(deploymentPaths(item.home, plugin).codex, "payload.txt"), "utf8"), "second\n");
  } finally {
    rmSync(item.root, { recursive: true, force: true });
  }
});

test("a failure after both swaps restores both targets and Marketplace", () => {
  const item = fixture();
  try {
    const options = {
      ...metadata(item.repository),
      home: item.home,
      codexStateReader: neverCurrent,
      codexInstaller: successfulInstaller,
    };
    deployPreparedTargets({ ...options, deployedAt: "2026-08-10T12:00:00.000Z" });
    const paths = deploymentPaths(item.home, plugin);
    const oldCursor = readFileSync(join(paths.cursor, ".local-deploy.json"), "utf8");
    const oldCodex = readFileSync(join(paths.codex, ".local-deploy.json"), "utf8");
    const oldMarketplace = readFileSync(item.marketplace, "utf8");
    for (const host of ["cursor", "codex"]) {
      writeFileSync(join(item.repository, ".build", "plugins", host, plugin, "payload.txt"), "rollback-candidate\n");
    }
    assert.throws(() => deployPreparedTargets({
      ...options,
      deployedAt: "2026-08-10T12:02:00.000Z",
      simulateFailure: "after-codex-add",
    }), (error) => {
      assert.match(error.message, /deployment rolled back/);
      assert.equal(error.result.source_rollback, "completed_or_not_needed");
      assert.equal(error.result.native_installation, "unverified_after_failure");
      return true;
    });
    assert.equal(readFileSync(join(paths.cursor, ".local-deploy.json"), "utf8"), oldCursor);
    assert.equal(readFileSync(join(paths.codex, ".local-deploy.json"), "utf8"), oldCodex);
    assert.equal(readFileSync(item.marketplace, "utf8"), oldMarketplace);
    assert.equal(readFileSync(join(paths.cursor, "payload.txt"), "utf8"), "first\n");
    assert.equal(readFileSync(join(paths.codex, "payload.txt"), "utf8"), "first\n");
  } finally {
    rmSync(item.root, { recursive: true, force: true });
  }
});

test("fixture deployments ignore inherited OpenCode and XDG config paths", () => {
  const parent = mkdtempSync(join(tmpdir(), "efficiency-deploy-environment-"));
  try {
    const opencode = join(parent, "host-opencode");
    const xdg = join(parent, "host-xdg");
    const env = { ...process.env, OPENCODE_CONFIG_DIR: opencode, XDG_CONFIG_HOME: xdg };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, [
      "--test",
      "--test-reporter=tap",
      "--test-name-pattern=^first install is physical and a second identical deploy is a no-op$",
      join(defaultRoot, "tests/local-plugin-deploy.test.mjs"),
    ], { cwd: parent, env, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /^# pass 1$/m);
    assert.equal(existsSync(opencode), false);
    assert.equal(existsSync(xdg), false);
  } finally { rmSync(parent, { recursive: true, force: true }); }
});

function isolatedOpenCodeEnv(home) {
  return { XDG_CONFIG_HOME: join(home, ".config") };
}

function backupDirectories(root) {
  return readdirSync(root).filter((name) => !name.startsWith(".")).sort();
}

test("OpenCode deploy merges a shared config under an isolated XDG_CONFIG_HOME, backs it up, and uninstalls only its entries", () => {
  const item = fixture();
  try {
    const env = isolatedOpenCodeEnv(item.home);
    const paths = deploymentPaths(item.home, plugin);
    const skillsPath = openCodeSkillsPath(item.home, plugin);
    const leaked = join(homedir(), ".config", "opencode", ".local-deploy-backups", plugin);
    assert.equal(existsSync(leaked), false);
    const foreignSkills = ["./workflow/skills", "~/.config/opencode/design/skills"];
    const originalDocument = { model: "keep-me", plugin: ["workflow"], skills: [...foreignSkills] };
    const mergedOnce = updateOpenCodeDocument(originalDocument, skillsPath, item.home);
    const mergedTwice = updateOpenCodeDocument(mergedOnce, skillsPath, item.home);
    assert.deepEqual(originalDocument.skills, foreignSkills);
    assert.equal(mergedOnce.model, "keep-me");
    assert.deepEqual(mergedOnce.plugin, ["workflow"]);
    assert.deepEqual(mergedOnce.skills, [...foreignSkills, skillsPath]);
    assert.deepEqual(mergedTwice, mergedOnce);
    const tilde = `~/.config/opencode/${plugin}/skills`;
    assert.deepEqual(updateOpenCodeDocument({ theme: "dark", skills: [tilde, tilde] }, skillsPath, item.home), { theme: "dark", skills: [tilde, tilde] });

    mkdirSync(paths.opencodeCommands, { recursive: true });
    const foreignCommand = "workflow command\n";
    writeFileSync(join(paths.opencodeCommands, "plan-work.md"), foreignCommand);
    const original = `${JSON.stringify(originalDocument, null, 2)}\n`;
    writeFileSync(paths.opencodeConfig, original);
    const jsonc = "{\n  // other plugin\n  \"skills\": [\"./design/skills\"]\n}\n";
    writeFileSync(paths.opencodeConfigComments, jsonc);

    const first = deployPreparedTargets({
      ...metadata(item.repository),
      home: item.home,
      hosts: ["opencode"],
      env,
      deployedAt: "2026-08-10T12:00:00.000Z",
    });
    const installed = JSON.parse(readFileSync(paths.opencodeConfig, "utf8"));
    assert.equal(first.no_op, false);
    assert.equal(first.opencode.config_change, true);
    assert.equal(installed.model, "keep-me");
    assert.deepEqual(installed.plugin, ["workflow"]);
    assert.deepEqual(installed.skills, [...foreignSkills, skillsPath]);
    assert.equal(readFileSync(join(paths.opencodeCommands, "plan-work.md"), "utf8"), foreignCommand);
    assert.match(readFileSync(join(paths.opencodeCommands, "efficiency.md"), "utf8"), /Load the `efficiency` skill/);
    assert.equal(readFileSync(paths.opencodeConfigComments, "utf8"), jsonc);
    const backups = backupDirectories(paths.opencodeBackups);
    assert.equal(backups.length, 1);
    assert.equal(isInside(item.home, join(paths.opencodeBackups, backups[0])), true);
    const deployBackup = JSON.parse(readFileSync(join(paths.opencodeBackups, backups[0], "manifest.json"), "utf8"));
    assert.equal(deployBackup.plugin, plugin);
    assert.equal(deployBackup.reason, "deploy");
    assert.equal(readFileSync(join(paths.opencodeBackups, backups[0], "opencode.json"), "utf8"), original);
    assert.equal(first.opencode.backup, join(paths.opencodeBackups, backups[0]));

    const installedBytes = readFileSync(paths.opencodeConfig);
    const second = deployPreparedTargets({
      ...metadata(item.repository),
      home: item.home,
      hosts: ["opencode"],
      env,
      deployedAt: "2026-08-10T12:05:00.000Z",
    });
    assert.equal(second.no_op, true);
    assert.equal(second.opencode.backup, null);
    assert.ok(readFileSync(paths.opencodeConfig).equals(installedBytes));
    assert.deepEqual(backupDirectories(paths.opencodeBackups), backups);
    assert.equal(readFileSync(join(paths.opencodeCommands, "plan-work.md"), "utf8"), foreignCommand);

    installed.skills.push(skillsPath);
    installed.skills.push("~/.config/opencode/later/skills");
    installed.theme = "dark";
    writeFileSync(paths.opencodeConfig, `${JSON.stringify(installed, null, 2)}\n`);
    const removed = uninstallOpenCodeDeployment({ plugin, home: item.home, env, deployedAt: "2026-08-10T13:00:00.000Z" });
    assert.equal(removed.no_op, false);
    assert.deepEqual(removed.opencode.skills_removed, [skillsPath, skillsPath]);
    assert.deepEqual(removed.opencode.commands_removed, ["efficiency.md"]);
    assert.equal(removed.opencode.package_removed, true);
    const after = JSON.parse(readFileSync(paths.opencodeConfig, "utf8"));
    assert.equal(after.model, "keep-me");
    assert.equal(after.theme, "dark");
    assert.deepEqual(after.plugin, ["workflow"]);
    assert.deepEqual(after.skills, [...foreignSkills, "~/.config/opencode/later/skills"]);
    assert.equal(existsSync(join(paths.opencodeCommands, "efficiency.md")), false);
    assert.equal(readFileSync(join(paths.opencodeCommands, "plan-work.md"), "utf8"), foreignCommand);
    assert.equal(existsSync(paths.opencode), false);
    assert.equal(readFileSync(paths.opencodeConfigComments, "utf8"), jsonc);
    const afterBackups = backupDirectories(paths.opencodeBackups);
    assert.equal(afterBackups.length, 2);
    const uninstallBackup = afterBackups.find((name) => name !== backups[0]);
    const uninstallManifest = JSON.parse(readFileSync(join(paths.opencodeBackups, uninstallBackup, "manifest.json"), "utf8"));
    assert.equal(uninstallManifest.reason, "uninstall");
    assert.ok(JSON.parse(readFileSync(join(paths.opencodeBackups, uninstallBackup, "opencode.json"), "utf8")).skills.includes(skillsPath));
    const afterBytes = readFileSync(paths.opencodeConfig);
    const again = uninstallOpenCodeDeployment({ plugin, home: item.home, env, deployedAt: "2026-08-10T14:00:00.000Z" });
    assert.equal(again.no_op, true);
    assert.equal(again.backup, null);
    assert.ok(readFileSync(paths.opencodeConfig).equals(afterBytes));
    assert.deepEqual(backupDirectories(paths.opencodeBackups), afterBackups);
    assert.equal(existsSync(leaked), false);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test("OpenCode deploy preserves JSONC and refuses an unrelated command", () => {
  const item = fixture();
  try {
    const paths = deploymentPaths(item.home, plugin);
    mkdirSync(paths.opencodeCommands, { recursive: true });
    const jsonc = "{\n  // keep this comment\n  \"skills\": [\"./team\"]\n}\n";
    writeFileSync(paths.opencodeConfigComments, jsonc);
    writeFileSync(join(paths.opencodeCommands, "efficiency.md"), "user command\n");
    assert.throws(() => deployPreparedTargets({
      ...metadata(item.repository),
      home: item.home,
      hosts: ["opencode"],
    }), /not an Efficiency command/);
    assert.equal(readFileSync(paths.opencodeConfigComments, "utf8"), jsonc);
    assert.equal(existsSync(paths.opencodeConfig), false);
    assert.equal(existsSync(paths.opencode), false);
    assert.equal(existsSync(paths.opencodeBackups), false);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test("failed OpenCode deploy restores the shared config from its persistent backup", () => {
  const item = fixture();
  try {
    const env = isolatedOpenCodeEnv(item.home);
    const paths = deploymentPaths(item.home, plugin);
    mkdirSync(paths.opencodeCommands, { recursive: true });
    const foreignCommand = "workflow command\n";
    const previousCommand = "Load the `efficiency` skill and apply it to the current request.\nprevious\n";
    writeFileSync(join(paths.opencodeCommands, "plan-work.md"), foreignCommand);
    writeFileSync(join(paths.opencodeCommands, "efficiency.md"), previousCommand);
    const original = `${JSON.stringify({ model: "keep", skills: ["./workflow/skills"] }, null, 2)}\n`;
    writeFileSync(paths.opencodeConfig, original);
    assert.throws(() => deployPreparedTargets({
      ...metadata(item.repository),
      home: item.home,
      hosts: ["opencode"],
      env,
      deployedAt: "2026-08-10T12:00:00.000Z",
      simulateFailure: "after-opencode-commands",
    }), /deployment rolled back/);
    assert.equal(readFileSync(paths.opencodeConfig, "utf8"), original);
    assert.equal(readFileSync(join(paths.opencodeCommands, "efficiency.md"), "utf8"), previousCommand);
    assert.equal(readFileSync(join(paths.opencodeCommands, "plan-work.md"), "utf8"), foreignCommand);
    assert.equal(existsSync(paths.opencode), false);
    const backups = backupDirectories(paths.opencodeBackups);
    assert.equal(backups.length, 1);
    assert.equal(readFileSync(join(paths.opencodeBackups, backups[0], "opencode.json"), "utf8"), original);
    const manifest = JSON.parse(readFileSync(join(paths.opencodeBackups, backups[0], "manifest.json"), "utf8"));
    assert.equal(manifest.files.find((file) => file.kind === "opencode-command" && file.path.endsWith("efficiency.md")).existed, true);
    assert.equal(readFileSync(join(paths.opencodeBackups, backups[0], "commands", "efficiency.md"), "utf8"), previousCommand);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test("OpenCode uninstall CLI removes only this plugin under an isolated XDG_CONFIG_HOME", () => {
  const parent = mkdtempSync(join(tmpdir(), "efficiency-opencode-uninstall-cli-"));
  try {
    const script = join(defaultRoot, "scripts/local-plugin-deploy.mjs");
    const alias = join(parent, "deploy.mjs");
    symlinkSync(script, alias);
    const home = join(parent, "home");
    const pluginName = JSON.parse(readFileSync(join(defaultRoot, ".cursor-plugin/plugin.json"), "utf8")).name;
    const paths = deploymentPaths(home, pluginName);
    const skills = openCodeSkillsPath(home, pluginName);
    const leaked = join(homedir(), ".config", "opencode", ".local-deploy-backups", pluginName);
    const leakedBefore = existsSync(leaked);
    mkdirSync(join(paths.opencode, "commands"), { recursive: true });
    mkdirSync(join(paths.opencode, ".opencode-plugin"), { recursive: true });
    writeFileSync(join(paths.opencode, ".opencode-plugin/plugin.json"), `${JSON.stringify({ name: pluginName, version: "1.0.0" })}\n`);
    const command = "Load the `efficiency` skill and apply it to the current request.\n";
    writeFileSync(join(paths.opencode, "commands", "efficiency.md"), command);
    mkdirSync(paths.opencodeCommands, { recursive: true });
    writeFileSync(join(paths.opencodeCommands, "efficiency.md"), command);
    writeFileSync(join(paths.opencodeCommands, "plan-work.md"), "leave me\n");
    writeFileSync(join(paths.opencodeCommands, "context-optimization.md"), "Load the `context-optimization` skill and apply it to the current request.\n");
    writeFileSync(paths.opencodeConfig, `${JSON.stringify({ model: "keep", skills: ["./workflow/skills", skills] }, null, 2)}\n`);
    const env = { ...process.env, LOCAL_PLUGIN_HOME: home, XDG_CONFIG_HOME: join(home, ".config") };
    delete env.OPENCODE_CONFIG_DIR;
    delete env.NODE_TEST_CONTEXT;
    for (const path of [script, alias]) {
      const invalid = spawnSync(process.execPath, [path, "uninstall", "--cursor-only"], { env, encoding: "utf8" });
      assert.equal(invalid.status, 1, invalid.stderr);
      assert.match(invalid.stderr, /use --opencode-only/);
      assert.equal(invalid.stdout, "");
    }
    const removed = spawnSync(process.execPath, [script, "uninstall", "--opencode-only"], { env, encoding: "utf8" });
    assert.equal(removed.status, 0, removed.stderr);
    const payload = JSON.parse(removed.stdout);
    assert.equal(payload.no_op, false);
    assert.deepEqual(JSON.parse(readFileSync(paths.opencodeConfig, "utf8")).skills, ["./workflow/skills"]);
    assert.equal(JSON.parse(readFileSync(paths.opencodeConfig, "utf8")).model, "keep");
    assert.equal(existsSync(join(paths.opencodeCommands, "efficiency.md")), false);
    assert.equal(readFileSync(join(paths.opencodeCommands, "plan-work.md"), "utf8"), "leave me\n");
    assert.match(readFileSync(join(paths.opencodeCommands, "context-optimization.md"), "utf8"), /Load the `context-optimization` skill/);
    assert.equal(existsSync(paths.opencode), false);
    assert.equal(backupDirectories(paths.opencodeBackups).length, 1);
    const again = spawnSync(process.execPath, [alias, "uninstall"], { env, encoding: "utf8" });
    assert.equal(again.status, 0, again.stderr);
    assert.equal(JSON.parse(again.stdout).no_op, true);
    assert.equal(backupDirectories(paths.opencodeBackups).length, 1);
    assert.equal(existsSync(leaked), leakedBefore);
  } finally { rmSync(parent, { recursive: true, force: true }); }
});

test("OpenCode config directory diagnostics reach the deploy CLI before any install", () => {
  const parent = mkdtempSync(join(tmpdir(), "efficiency-opencode-cli-"));
  try {
    const script = join(defaultRoot, "scripts/local-plugin-deploy.mjs");
    const home = join(parent, "home");
    for (const variable of ["OPENCODE_CONFIG_DIR", "XDG_CONFIG_HOME"]) {
      const env = { ...process.env, LOCAL_PLUGIN_HOME: home };
      delete env.OPENCODE_CONFIG_DIR;
      delete env.XDG_CONFIG_HOME;
      delete env.NODE_TEST_CONTEXT;
      env[variable] = join(home, "custom-config");
      for (const args of [["deploy", "--dry-run", "--opencode-only"], ["status", "--opencode-only"]]) {
        const result = spawnSync(process.execPath, [script, ...args], { env, encoding: "utf8" });
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, /unsupported OpenCode configuration directory/);
        assert.match(result.stderr, new RegExp(variable));
        assert.equal(result.stdout, "");
        assert.equal(existsSync(home), false);
      }
    }
  } finally { rmSync(parent, { recursive: true, force: true }); }
});

test("OpenCode custom config directories stop deploy without writes", () => {
  const item = fixture();
  try {
    const paths = deploymentPaths(item.home, plugin);
    for (const variable of ["OPENCODE_CONFIG_DIR", "XDG_CONFIG_HOME"]) {
      const custom = join(item.home, variable);
      const env = { [variable]: custom };
      const options = { ...metadata(item.repository), home: item.home, hosts: ["opencode"], env };
      for (const dryRun of [true, false]) assert.throws(() => deployPreparedTargets({ ...options, dryRun }), /unsupported OpenCode configuration directory/, variable);
      assert.equal(existsSync(custom), false, variable);
      assert.equal(existsSync(paths.opencode), false, variable);
      assert.equal(existsSync(paths.opencodeConfig), false, variable);
      assert.deepEqual(deployPreparedTargets({ ...options, hosts: ["cursor"], dryRun: true }).selected_hosts, ["cursor"]);
    }
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});
