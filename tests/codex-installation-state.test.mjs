import assert from "node:assert/strict";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { codexInstallationState } from "../scripts/local-plugin-deploy.mjs";

test("local deployment verifies cache files, identity, version and source", () => {
  const home = mkdtempSync(join(tmpdir(), "efficiency-cache-state-"));
  const plugin = "geldmacher-efficiency";
  const version = "3.3.2+local.codex.123456789abc";
  const source = join(home, ".codex", "plugins", plugin);
  const cache = join(home, ".codex", "plugins", "cache", "personal", plugin, version);
  const codexBinary = join(home, "codex-fixture.mjs");
  const statePath = join(home, "native.json");
  mkdirSync(join(source, ".codex-plugin"), { recursive: true });
  mkdirSync(join(source, "skills", "example"), { recursive: true });
  writeFileSync(join(source, ".codex-plugin", "plugin.json"), JSON.stringify({ name: plugin, version }));
  writeFileSync(join(source, "skills", "example", "SKILL.md"), "expected skill\n");
  writeFileSync(codexBinary, `#!${process.execPath}\nimport {readFileSync} from 'node:fs'; process.stdout.write(readFileSync(${JSON.stringify(statePath)}));\n`);
  chmodSync(codexBinary, 0o755);
  const installed = { name: plugin, pluginId: `${plugin}@personal`, version, source: { source: "local", path: source } };
  const reset = () => {
    rmSync(cache, { recursive: true, force: true });
    cpSync(source, cache, { recursive: true });
    writeFileSync(statePath, JSON.stringify({ installed: [installed] }));
  };
  const inspect = () => codexInstallationState({ home, plugin, version, codexBinary, marketplace: "personal", env: { ...process.env, CODEX_HOME: join(home, ".codex") } });
  try {
    reset(); assert.equal(inspect().current, true);
    rmSync(join(cache, "skills"), { recursive: true });
    assert.equal(inspect().current, false, "manifest-only cache is incomplete");
    reset(); writeFileSync(join(cache, "skills", "example", "SKILL.md"), "changed");
    assert.equal(inspect().current, false);
    reset(); writeFileSync(join(cache, "extra.txt"), "unexpected");
    assert.equal(inspect().current, false);
    for (const change of [{ name: "another-plugin" }, { version: "0.0.1" }]) {
      reset(); writeFileSync(join(cache, ".codex-plugin", "plugin.json"), JSON.stringify({ name: plugin, version, ...change }));
      assert.equal(inspect().current, false);
    }
    reset(); writeFileSync(statePath, JSON.stringify({ installed: [{ ...installed, source: { source: "local", path: join(home, "foreign") } }] }));
    assert.equal(inspect().current, false);
    reset();
    const localCache = join(home, ".codex", "plugins", "cache", "personal", plugin, "local");
    cpSync(source, localCache, { recursive: true });
    writeFileSync(statePath, JSON.stringify({ installed: [{ ...installed, version: "local" }] }));
    assert.equal(inspect().current, true, "host-managed local cache still requires the product manifest version");
    writeFileSync(join(localCache, ".codex-plugin", "plugin.json"), JSON.stringify({ name: plugin, version: "0.0.1" }));
    assert.equal(inspect().current, false);
    assert.equal(readFileSync(join(source, "skills", "example", "SKILL.md"), "utf8"), "expected skill\n");

    const checkout = join(home, "legacy-checkout");
    renameSync(source, checkout);
    symlinkSync(checkout, source, "dir");
    symlinkSync(join(home, "missing-dependencies"), join(checkout, "node_modules"), "dir");
    for (const entries of [[], [{ ...installed, version: "local" }], [installed]]) {
      writeFileSync(statePath, JSON.stringify({ installed: entries }));
      const state = inspect();
      assert.equal(state.current, false, "a legacy source always requires migration");
      assert.equal(state.error, undefined, "development files are not inspected before migration");
    }
    for (const [entries, error] of [
      [[{ ...installed, source: { source: "local", path: join(home, "foreign") } }], /another source/],
      [[{ ...installed, pluginId: `${plugin}@other` }], /another marketplace/],
      [[installed, installed], /Duplicate/],
    ]) {
      writeFileSync(statePath, JSON.stringify({ installed: entries }));
      assert.match(inspect().error, error);
    }
    writeFileSync(join(checkout, ".codex-plugin", "plugin.json"), JSON.stringify({ name: "foreign", version }));
    assert.match(inspect().error, /belongs to foreign/);
  } finally { rmSync(home, { recursive: true, force: true }); }
});
