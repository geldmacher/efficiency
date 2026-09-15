import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { defaultRoot } from "../scripts/validate-plugin.mjs";
import { writeCodexDriver } from "./helpers/release-install-fixture.mjs";

function snapshot(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) return { link: readlinkSync(path) };
  if (stat.isFile()) return { bytes: readFileSync(path), mode: stat.mode & 0o777 };
  return Object.fromEntries(readdirSync(path).sort().map((name) => [name, snapshot(join(path, name))]));
}

// Exercise standard deployment here; run --full outside this suite to avoid recursion.
test("local CLI previews, deploys, repairs cache, updates and reports native rollback uncertainty", { timeout: 180000 }, () => {
  const work = mkdtempSync(join(tmpdir(), "efficiency-local-cli-"));
  const root = join(work, "repository");
  const home = join(work, "home");
  const plugin = "geldmacher-efficiency";
  const marketplacePath = join(home, ".agents", "plugins", "marketplace.json");
  try {
    cpSync(defaultRoot, root, { recursive: true,
      filter: (path) => ![".git", ".build", "node_modules"].includes(path.split(/[\\/]/).at(-1)),
    });
    symlinkSync(join(defaultRoot, "node_modules"), join(root, "node_modules"), "junction");
    for (const args of [["init", "--quiet"], ["add", "--all"], ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "Fixture"]]) {
      execFileSync("git", args, { cwd: root, stdio: "pipe" });
    }
    const binary = writeCodexDriver(home);
    const globalGuidance = {
      "AGENTS.md": "# Existing global guidance\n@RTK.md\n",
      "AGENTS.override.md": "# Existing override\nPreserve this text.\n",
    };
    mkdirSync(join(home, ".codex"), { recursive: true });
    for (const [name, content] of Object.entries(globalGuidance)) writeFileSync(join(home, ".codex", name), content);
    mkdirSync(dirname(marketplacePath), { recursive: true });
    const original = '{ "name": "colleagues", "interface": {"displayName":"Team"}, "plugins": [{"name":"unrelated","source":{"source":"local","path":"./other"}}] }\n';
    writeFileSync(marketplacePath, original);
    const env = { ...process.env, HOME: home, LOCAL_PLUGIN_HOME: home, CODEX_HOME: join(home, ".codex"), CODEX_BIN: binary,
      npm_config_cache: join(work, "npm-cache") };
    delete env.NODE_TEST_CONTEXT;
    delete env.NODE_NO_WARNINGS;
    const failingTest = join(work, "failure.test.mjs");
    writeFileSync(failingTest, 'import test from "node:test"; test("execution sentinel", () => { throw new Error("expected subprocess test failure"); });\n');
    const failure = spawnSync(process.execPath, ["--test", failingTest], { env, encoding: "utf8" });
    assert.ifError(failure.error);
    assert.equal(failure.status, 1, "a failing subprocess test must run and fail");
    assert.match(failure.stdout + failure.stderr, /expected subprocess test failure/);
    const drive = (args, expected = 0) => {
      const result = spawnSync(process.execPath, [join(root, "scripts", "local-plugin-deploy.mjs"), ...args], {
        cwd: work, env, encoding: "utf8", timeout: 60000, maxBuffer: 8 * 1024 * 1024,
      });
      assert.ifError(result.error);
      assert.equal(result.status, expected, result.stderr || result.stdout);
      for (const [name, content] of Object.entries(globalGuidance)) {
        assert.equal(readFileSync(join(home, ".codex", name), "utf8"), content,
          `${args.join(" ")} must preserve global ${name}`);
      }
      const text = expected === 0 ? result.stdout : result.stderr;
      return JSON.parse(text.slice(text.lastIndexOf("\n{") + 1));
    };
    const source = (host) => host === "cursor" ? join(home, ".cursor", "plugins", "local", plugin) : join(home, ".codex", "plugins", plugin);
    const receipt = (host) => readFileSync(join(source(host), ".local-deploy.json"), "utf8");
    const cache = (version) => join(home, ".codex", "plugins", "cache", "colleagues", plugin, version);
    const invalidSkill = join(root, "skills", "context-optimization", "SKILL.md");
    const validSkillBytes = readFileSync(invalidSkill);
    const homeBeforePreparation = snapshot(home);
    writeFileSync(invalidSkill, Buffer.concat([validSkillBytes, Buffer.from("\n[Broken fixture link](missing-prepare.md)\n")]));
    const preparationFailure = spawnSync(process.execPath, [join(root, "scripts", "local-plugin-deploy.mjs"), "deploy", "--cursor-only"], {
      cwd: work, env, encoding: "utf8", timeout: 60000,
    });
    assert.ifError(preparationFailure.error);
    assert.equal(preparationFailure.status, 1);
    assert.match(preparationFailure.stdout + preparationFailure.stderr, /missing-prepare\.md/);
    assert.deepEqual(snapshot(home), homeBeforePreparation, "failed preparation must leave host state unchanged");
    writeFileSync(invalidSkill, validSkillBytes);
    const preview = drive(["deploy", "--dry-run"]);
    assert.equal(preview.dry_run, true);
    assert.equal(existsSync(source("cursor")), false);
    assert.equal(existsSync(source("codex")), false);
    assert.equal(readFileSync(marketplacePath, "utf8"), original);
    assert.equal(existsSync(join(home, "native.json")), false);

    const first = drive(["deploy"]);
    assert.equal(first.no_op, false);
    assert.deepEqual(readFileSync(join(source("codex"), "AGENTS.md")),
      readFileSync(join(root, "adapters/codex/skills/response-simplicity-setup/references/response-simplicity.md")));
    assert.equal(existsSync(join(source("cursor"), "AGENTS.md")), false);
    const document = JSON.parse(readFileSync(marketplacePath, "utf8"));
    assert.equal(document.name, "colleagues");
    assert.deepEqual(document.interface, { displayName: "Team" });
    assert.deepEqual(document.plugins[0], JSON.parse(original).plugins[0]);
    assert.equal(drive(["status"]).current, true);
    const initialReceipt = receipt("codex");
    assert.equal(drive(["deploy"]).no_op, true);
    assert.equal(receipt("codex"), initialReceipt);

    writeFileSync(join(cache(first.targets.codex.local_version), "unexpected.txt"), "corrupt");
    assert.equal(drive(["status"]).current, false);
    const repaired = drive(["deploy"]);
    assert.equal(repaired.no_op, false);
    assert.equal(repaired.targets.codex.change, false, "repair native cache without replacing unchanged source");
    assert.equal(existsSync(join(cache(first.targets.codex.local_version), "unexpected.txt")), false);
    assert.equal(drive(["status"]).current, true);

    const old = Object.fromEntries(["cursor", "codex"].map((host) => [host, receipt(host)]));
    const marketplaceBefore = readFileSync(marketplacePath, "utf8");
    const skill = join(root, "skills", "context-optimization", "SKILL.md");
    writeFileSync(skill, readFileSync(skill, "utf8") + "\nFixture update.\n");
    writeFileSync(join(home, "fail-add"), "after");
    const failed = drive(["deploy"], 1);
    assert.equal(failed.source_rollback, "completed_or_not_needed");
    assert.equal(failed.native_installation, "unverified_after_failure");
    for (const host of ["cursor", "codex"]) assert.equal(receipt(host), old[host]);
    assert.equal(readFileSync(marketplacePath, "utf8"), marketplaceBefore);
    const nativeAfterFailure = JSON.parse(readFileSync(join(home, "native.json"))).installed[0];
    assert.notEqual(nativeAfterFailure.version, JSON.parse(old.codex).local_version, "native side effect remains distinct from restored source");
    rmSync(join(home, "fail-add"));
    const update = drive(["deploy"]);
    assert.equal(update.no_op, false);
    assert.equal(drive(["status"]).current, true);

    writeFileSync(join(cache(update.targets.codex.local_version), "unexpected.txt"), "corrupt");
    writeFileSync(join(home, "wrong-marketplace-root"), "wrong");
    const nativeBefore = readFileSync(join(home, "native.json"), "utf8");
    const wrongRoot = drive(["deploy"], 1);
    assert.match(wrongRoot.error, /intended home/);
    assert.equal(wrongRoot.native_installation, "not_changed");
    assert.equal(readFileSync(join(home, "native.json"), "utf8"), nativeBefore);

    rmSync(join(home, "wrong-marketplace-root"));
    const legacy = {};
    const snapshots = {};
    const dependencies = join(work, "legacy-dependencies");
    mkdirSync(dependencies);
    writeFileSync(join(dependencies, "keep.txt"), "preserve dependency content");
    const dependencySnapshot = snapshot(dependencies);
    for (const host of ["cursor", "codex"]) {
      legacy[host] = join(work, `legacy-${host}`);
      cpSync(source(host), legacy[host], { recursive: true });
      symlinkSync(dependencies, join(legacy[host], "node_modules"), "dir");
      mkdirSync(join(legacy[host], ".git"));
      writeFileSync(join(legacy[host], ".git", "HEAD"), "legacy checkout sentinel");
      snapshots[host] = snapshot(legacy[host]);
      rmSync(source(host), { recursive: true });
      symlinkSync(legacy[host], source(host), "dir");
    }
    const installed = JSON.parse(nativeBefore);
    installed.installed[0].version = "local";
    writeFileSync(join(home, "native.json"), JSON.stringify(installed));
    cpSync(legacy.codex, cache("local"), { recursive: true });
    assert.equal(drive(["status"]).current, false, "linked sources still need migration");
    const migrationPreview = drive(["deploy", "--dry-run"]);
    for (const host of ["cursor", "codex"]) {
      assert.equal(migrationPreview.targets[host].change, true);
      assert.equal(readlinkSync(source(host)), legacy[host]);
    }
    writeFileSync(join(home, "fail-add"), "after");
    const migrationFailure = drive(["deploy"], 1);
    assert.equal(migrationFailure.source_rollback, "completed_or_not_needed");
    assert.equal(migrationFailure.native_installation, "unverified_after_failure");
    for (const host of ["cursor", "codex"]) {
      assert.equal(readlinkSync(source(host)), legacy[host]);
      assert.deepEqual(snapshot(legacy[host]), snapshots[host]);
    }
    assert.deepEqual(snapshot(dependencies), dependencySnapshot);
    rmSync(join(home, "fail-add"));
    const migrated = drive(["deploy"]);
    assert.equal(migrated.no_op, false);
    for (const host of ["cursor", "codex"]) {
      assert.equal(lstatSync(source(host)).isSymbolicLink(), false);
      assert.deepEqual(snapshot(legacy[host]), snapshots[host]);
      assert.equal(existsSync(join(source(host), "node_modules")), false);
      assert.equal(existsSync(join(source(host), ".git")), false);
    }
    assert.deepEqual(snapshot(dependencies), dependencySnapshot);
    assert.equal(drive(["status"]).current, true);
    assert.equal(drive(["deploy"]).no_op, true);
  } finally { rmSync(work, { recursive: true, force: true }); }
});
