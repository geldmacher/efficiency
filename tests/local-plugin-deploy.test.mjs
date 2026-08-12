import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  contentHash,
  deployPreparedTargets,
  deploymentPaths,
  deploymentReceipt,
  isInside,
  localVersion,
  updateMarketplaceDocument,
  validateBundle,
} from "../scripts/local-plugin-deploy.mjs";

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
  for (const host of ["cursor", "codex"]) {
    const bundle = join(repository, ".build", "plugins", host, plugin);
    const manifestDir = host === "cursor" ? ".cursor-plugin" : ".codex-plugin";
    json(join(bundle, manifestDir, "plugin.json"), { name: plugin, version: baseVersion });
    writeFileSync(join(bundle, "payload.txt"), "first\n");
    mkdirSync(join(bundle, "hooks"));
    writeFileSync(join(bundle, "hooks", `${host}.json`), `${host}-hook\n`);
  }
  const marketplace = deploymentPaths(home, plugin).marketplace;
  json(marketplace, {
    name: "personal",
    plugins: [
      { name: "unrelated", source: { source: "local", path: "./other" } },
      { name: plugin, source: { source: "local", path: "./legacy" }, policy: { installation: "AVAILABLE" } },
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
  };
}

const neverCurrent = () => ({ current: false, installed: null, cachePath: null });
const alwaysCurrent = () => ({ current: true, installed: { version: "current" }, cachePath: "/cache" });
const successfulInstaller = ({ version, cache }) => ({ current: true, installed: { version }, cachePath: cache });

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

test("Marketplace updates preserve every unrelated entry", () => {
  const document = {
    name: "personal",
    plugins: [
      { name: "alpha", source: { source: "local", path: "./alpha" } },
      { name: plugin, source: { source: "local", path: "./old" }, extra: "preserve" },
    ],
  };
  const result = updateMarketplaceDocument(document, plugin, `./.codex/plugins/${plugin}`);
  assert.equal(result.plugins[0].source.path, "./alpha");
  assert.equal(result.plugins[1].source.path, `./.codex/plugins/${plugin}`);
  assert.equal(result.plugins[1].extra, "preserve");
  const created = updateMarketplaceDocument(null, plugin, `./.codex/plugins/${plugin}`);
  assert.equal(created.name, "personal");
  assert.equal(created.plugins[0].name, plugin);
  assert.equal(created.plugins[0].source.path, `./.codex/plugins/${plugin}`);
  assert.throws(() => updateMarketplaceDocument({ name: "other", plugins: [] }, plugin, "./x"), /named personal/);
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
    assert.equal(readFileSync(join(paths.codex, ".codex-plugin", "plugin.json"), "utf8").includes("+local.codex."), true);
    const marketplace = JSON.parse(readFileSync(paths.marketplace, "utf8"));
    assert.equal(marketplace.name, "personal");
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
    }), /deployment rolled back/);
    assert.equal(readFileSync(join(paths.cursor, ".local-deploy.json"), "utf8"), oldCursor);
    assert.equal(readFileSync(join(paths.codex, ".local-deploy.json"), "utf8"), oldCodex);
    assert.equal(readFileSync(item.marketplace, "utf8"), oldMarketplace);
    assert.equal(readFileSync(join(paths.cursor, "payload.txt"), "utf8"), "first\n");
    assert.equal(readFileSync(join(paths.codex, "payload.txt"), "utf8"), "first\n");
  } finally {
    rmSync(item.root, { recursive: true, force: true });
  }
});

