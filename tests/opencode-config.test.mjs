import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { applyOpenCodeChanges, openCodeCommand, openCodePaths, planOpenCodeChanges, rollbackOpenCodeChanges, uninstallOpenCodeDeployment } from "../skills/install-new-release-from-repo/scripts/opencode-config.mjs";

const plugin = "geldmacher-efficiency";
const command = openCodeCommand("efficiency", "Review changes.");
const previousCommand = openCodeCommand("efficiency", "Previous description.");

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "efficiency-opencode-config-test-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const home = join(root, "home");
  const paths = openCodePaths(home, plugin);
  mkdirSync(paths.commands, { recursive: true });
  const original = JSON.stringify({ model: "keep", skills: ["/workflow/skills"] });
  writeFileSync(paths.config, original, { mode: 0o600 });
  const commandPath = join(paths.commands, "efficiency.md");
  writeFileSync(commandPath, previousCommand, { mode: 0o640 });
  const plan = planOpenCodeChanges({ home, plugin, env: {}, commandSources: [{ name: "efficiency.md", text: command }] });
  return { root, home, paths, original, commandPath, plan };
}

test("OpenCode refuses shared files changed since planning before backing up or writing", async (t) => {
  for (const target of ["config", "command"]) await t.test(target, (t) => {
    const item = fixture(t);
    const destination = target === "config" ? item.paths.config : item.commandPath;
    const foreign = target === "config"
      ? JSON.stringify({ model: "new-model", skills: ["/workflow/skills", "/design/skills"] })
      : "A concurrently replaced user command\n";
    writeFileSync(destination, foreign);
    const applied = {};
    assert.throws(() => applyOpenCodeChanges(item.plan, applied), /changed concurrently/);
    rollbackOpenCodeChanges(applied, item);
    assert.equal(readFileSync(destination, "utf8"), foreign);
    assert.equal(readFileSync(target === "config" ? item.commandPath : item.paths.config, "utf8"), target === "config" ? previousCommand : item.original);
    assert.equal(existsSync(item.paths.backups), false);
  });
});

test("OpenCode rollback leaves a concurrent command replacement intact after its config write", (t) => {
  const item = fixture(t);
  const applied = {};
  const foreign = "User command written after backup\n";
  assert.throws(() => applyOpenCodeChanges(item.plan, applied, {
    afterConfig() { writeFileSync(item.commandPath, foreign); },
  }), /changed concurrently/);
  rollbackOpenCodeChanges(applied, { home: item.home, plugin });
  assert.equal(readFileSync(item.paths.config, "utf8"), item.original);
  assert.equal(readFileSync(item.commandPath, "utf8"), foreign);
});

test("OpenCode rollback reports a conflict instead of overwriting later config changes", (t) => {
  const item = fixture(t);
  const applied = {};
  applyOpenCodeChanges(item.plan, applied);
  const foreign = JSON.stringify({ ...JSON.parse(readFileSync(item.paths.config, "utf8")), theme: "later-theme" });
  writeFileSync(item.paths.config, foreign);
  assert.throws(() => rollbackOpenCodeChanges(applied, { home: item.home, plugin }), /changed concurrently/);
  assert.equal(readFileSync(item.paths.config, "utf8"), foreign);
});

test("OpenCode rechecks parent symlinks introduced after planning", (t) => {
  const item = fixture(t);
  const outside = join(item.root, "outside");
  mkdirSync(outside);
  rmSync(item.paths.commands, { recursive: true });
  symlinkSync(outside, item.paths.commands, "dir");
  assert.throws(() => applyOpenCodeChanges(item.plan, {}), /symlink/);
  assert.equal(existsSync(join(outside, "efficiency.md")), false);
  assert.equal(readFileSync(item.paths.config, "utf8"), item.original);
});

test("OpenCode retains shared file permissions through deploy, rollback and uninstall", { skip: process.platform === "win32" }, (t) => {
  const item = fixture(t);
  chmodSync(item.paths.config, 0o600);
  chmodSync(item.commandPath, 0o640);
  const mode = (path) => statSync(path).mode & 0o777;
  const applied = {};
  applyOpenCodeChanges(item.plan, applied);
  assert.equal(mode(item.paths.config), 0o600);
  assert.equal(mode(item.commandPath), 0o640);
  rollbackOpenCodeChanges(applied, { home: item.home, plugin });
  assert.equal(readFileSync(item.paths.config, "utf8"), item.original);
  assert.equal(readFileSync(item.commandPath, "utf8"), previousCommand);
  assert.equal(mode(item.paths.config), 0o600);
  assert.equal(mode(item.commandPath), 0o640);
  applyOpenCodeChanges(item.plan, {});
  mkdirSync(join(item.paths.packageDir, ".opencode-plugin"), { recursive: true });
  mkdirSync(join(item.paths.packageDir, "commands"));
  writeFileSync(join(item.paths.packageDir, ".opencode-plugin/plugin.json"), JSON.stringify({ name: plugin }));
  writeFileSync(join(item.paths.packageDir, "commands/efficiency.md"), command);
  uninstallOpenCodeDeployment({ home: item.home, plugin, env: {} });
  assert.equal(mode(item.paths.config), 0o600);
  assert.equal(existsSync(item.commandPath), false);
});
