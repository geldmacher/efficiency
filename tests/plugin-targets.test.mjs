import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildPluginTargets, validateBuiltTarget } from "../scripts/build-plugin-targets.mjs";
import { checkLinks } from "../scripts/check-links.mjs";
import { defaultRoot } from "../scripts/validate-plugin.mjs";

const portableSkills = ["context-optimization", "efficiency", "rtk-filter-design", "rtk-setup"];

test("only explicitly selected documentation enters plugin and npm packages", () => {
  const temporary = mkdtempSync(join(tmpdir(), "efficiency-doc-boundary-"));
  try {
    const source = join(temporary, "source");
    cpSync(defaultRoot, source, {
      recursive: true,
      filter: (path) => ![".git", ".build", "node_modules"].includes(path.split(/[\\/]/).at(-1)),
    });
    writeFileSync(join(source, "docs", "future-guide.md"), "Additional documentation sentinel\n");
    const expectedDocs = JSON.parse(readFileSync(join(source, "package.json"), "utf8"))
      .files.filter((path) => path.startsWith("docs/"));
    const inspect = (snapshot) => {
      assert.deepEqual(Object.keys(snapshot).filter((path) => path.startsWith("docs/")).sort(), [...expectedDocs].sort());
      assert.equal(Object.hasOwn(snapshot, "docs/future-guide.md"), false);
      assert.ok(Object.hasOwn(snapshot, "docs/installation.md"));
    };
    const built = buildPluginTargets(join(temporary, "targets"), source);
    for (const target of ["agent-plugins", "cursor", "codex"]) inspect(directorySnapshot(built[target].path));
    const report = JSON.parse(execFileSync("npm", [
      "pack", "--dry-run", "--json", "--ignore-scripts", "--cache", join(temporary, "npm-cache"),
    ], { cwd: source, encoding: "utf8" }))[0];
    inspect(Object.fromEntries(report.files.map(({ path }) => [path, readFileSync(join(source, path))])));
    const npmRoot = join(temporary, "npm-package");
    for (const { path } of report.files) {
      cpSync(join(source, path), join(npmRoot, path), { recursive: true });
    }
    assert.deepEqual(checkLinks(npmRoot), []);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

function directorySnapshot(directory, prefix = "") {
  const snapshot = {};
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = prefix ? join(prefix, entry.name) : entry.name;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) Object.assign(snapshot, directorySnapshot(path, relativePath));
    else snapshot[relativePath] = readFileSync(path);
  }
  return snapshot;
}

test("deterministic allowlists isolate Agent Plugins, Cursor, and Codex bundles", () => {
  const output = mkdtempSync(join(tmpdir(), "efficiency-target-test-"));
  try {
    const first = buildPluginTargets(join(output, "first"));
    const second = buildPluginTargets(join(output, "second"));
    for (const target of ["agent-plugins", "cursor", "codex"]) {
      assert.equal(first[target].hash, second[target].hash);
    }

    const portableManifest = JSON.parse(readFileSync(join(first["agent-plugins"].path, "plugin.json")));
    assert.equal(portableManifest.name, "geldmacher-efficiency");
    assert.equal(portableManifest.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
    assert.equal(existsSync(join(first["agent-plugins"].path, "schemas", "agent-plugins", "1.0.0", "plugin.schema.json")), true);
    assert.equal(JSON.parse(readFileSync(join(first.cursor.path, ".cursor-plugin", "plugin.json"))).name, "geldmacher-efficiency");
    const codexManifest = JSON.parse(readFileSync(join(first.codex.path, ".codex-plugin", "plugin.json")));
    assert.equal(codexManifest.name, "geldmacher-efficiency");
    assert.equal(codexManifest.skills, "./skills/");

    for (const name of portableSkills) {
      assert.equal(existsSync(join(first["agent-plugins"].path, "skills", name, "SKILL.md")), true);
      assert.equal(existsSync(join(first.cursor.path, "skills", name, "SKILL.md")), true);
      assert.equal(existsSync(join(first.codex.path, "skills", name, "SKILL.md")), true);
      const portableSnapshot = directorySnapshot(join(first["agent-plugins"].path, "skills", name));
      assert.deepEqual(directorySnapshot(join(first.cursor.path, "skills", name)), portableSnapshot,
        `${name} differs between Agent Plugins and Cursor`);
      assert.deepEqual(directorySnapshot(join(first.codex.path, "skills", name)), portableSnapshot,
        `${name} differs between Agent Plugins and Codex`);
    }
    assert.deepEqual(readdirSync(join(first.cursor.path, "commands")).sort(), [
      "context-optimization.md",
      "efficiency.md",
      "rtk-filter-design.md",
      "rtk-setup.md",
    ]);
    for (const reference of ["human-communication.md", "change-communication.md"]) {
      for (const target of [first["agent-plugins"].path, first.cursor.path, first.codex.path]) {
        assert.equal(
          existsSync(join(target, "skills", "efficiency", "references", reference)),
          true,
          `${reference} missing from ${target}`,
        );
      }
    }
    assert.equal(existsSync(join(first["agent-plugins"].path, ".cursor-plugin")), false);
    assert.equal(existsSync(join(first["agent-plugins"].path, ".codex-plugin")), false);
    assert.equal(existsSync(join(first["agent-plugins"].path, "commands")), false);
    assert.equal(existsSync(join(first.cursor.path, "plugin.json")), false);
    assert.equal(existsSync(join(first.codex.path, "plugin.json")), false);
    assert.equal(existsSync(join(first.cursor.path, "skills", "response-simplicity-setup")), false);
    assert.equal(existsSync(join(first.codex.path, "skills", "response-simplicity-setup", "SKILL.md")), true);
    assert.deepEqual(readdirSync(join(first.codex.path, ".codex-plugin")), ["plugin.json"]);
    assert.equal(existsSync(join(first.codex.path, "commands")), false);
    for (const target of [first["agent-plugins"].path, first.cursor.path, first.codex.path]) {
      assert.equal(existsSync(join(target, "schemas", "agent-plugins", "1.0.0", "plugin.schema.json")), true);
    }

    for (const target of [first["agent-plugins"].path, first.cursor.path, first.codex.path]) {
      for (const developmentRoot of [".agents", ".build", ".cursor", ".git", "adapters", "node_modules", "tests"]) {
        assert.equal(existsSync(join(target, developmentRoot)), false, `${developmentRoot} leaked into ${target}`);
      }
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test("target builder rejects broad repository and temporary roots before mutation", () => {
  const packagePath = join(defaultRoot, "package.json");
  const packageBefore = readFileSync(packagePath);
  assert.throws(() => buildPluginTargets(defaultRoot), /repository \.build\/plugins directory or a strict temporary-directory descendant/);
  assert.throws(() => buildPluginTargets(join(defaultRoot, ".git")), /repository \.build\/plugins directory or a strict temporary-directory descendant/);
  assert.throws(() => buildPluginTargets(join(defaultRoot, "scripts")), /repository \.build\/plugins directory or a strict temporary-directory descendant/);
  assert.throws(() => buildPluginTargets(tmpdir()), /repository \.build\/plugins directory or a strict temporary-directory descendant/);
  assert.deepEqual(readFileSync(packagePath), packageBefore);
  assert.equal(existsSync(join(defaultRoot, ".git")), true);
  assert.equal(existsSync(join(defaultRoot, "scripts", "build-plugin-targets.mjs")), true);
});

test("target builder resets only owned plugin destinations", () => {
  const output = mkdtempSync(join(tmpdir(), "efficiency-target-owned-"));
  const rootSentinel = join(output, "keep.txt");
  const adjacentSentinel = join(output, "cursor", "another-plugin", "keep.txt");
  try {
    writeFileSync(rootSentinel, "root sentinel\n");
    mkdirSync(join(output, "cursor", "another-plugin"), { recursive: true });
    writeFileSync(adjacentSentinel, "adjacent plugin sentinel\n");
    for (const target of ["agent-plugins", "cursor", "codex"]) {
      const owned = join(output, target, "geldmacher-efficiency");
      mkdirSync(owned, { recursive: true });
      writeFileSync(join(owned, "stale.txt"), "stale\n");
    }

    const built = buildPluginTargets(output);
    assert.equal(readFileSync(rootSentinel, "utf8"), "root sentinel\n");
    assert.equal(readFileSync(adjacentSentinel, "utf8"), "adjacent plugin sentinel\n");
    for (const target of ["agent-plugins", "cursor", "codex"]) {
      assert.equal(existsSync(join(built[target].path, "stale.txt")), false);
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test("target builder rejects intermediate symlinks without touching their referent", () => {
  const output = mkdtempSync(join(tmpdir(), "efficiency-target-symlink-"));
  const referent = mkdtempSync(join(tmpdir(), "efficiency-target-referent-"));
  const sentinel = join(referent, "keep.txt");
  try {
    writeFileSync(sentinel, "referent sentinel\n");
    symlinkSync(referent, join(output, "linked"), "dir");
    symlinkSync(join(referent, "missing"), join(output, "dangling"), "dir");
    assert.throws(
      () => buildPluginTargets(join(output, "linked", "nested")),
      /symlink components|resolves outside the temporary directory/,
    );
    assert.throws(
      () => buildPluginTargets(join(output, "dangling", "nested")),
      /symlink components/,
    );
    assert.equal(readFileSync(sentinel, "utf8"), "referent sentinel\n");
    assert.equal(existsSync(join(referent, "nested")), false);
    assert.equal(existsSync(join(referent, "missing")), false);
  } finally {
    rmSync(output, { recursive: true, force: true });
    rmSync(referent, { recursive: true, force: true });
  }
});

test("built-target validation rejects host leaks and missing portable components", () => {
  const output = mkdtempSync(join(tmpdir(), "efficiency-target-negative-"));
  try {
    const built = buildPluginTargets(output);
    const portable = built["agent-plugins"].path;
    mkdirSync(join(portable, "commands"));
    assert.throws(() => validateBuiltTarget(portable, "agent-plugins", built.version), /non-portable component/);
    rmSync(join(portable, "commands"), { recursive: true });
    rmSync(join(portable, "skills", "rtk-setup"), { recursive: true });
    assert.throws(() => validateBuiltTarget(portable, "agent-plugins", built.version), /skills drifted/);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test("built Cursor validation fails closed on command-to-skill name drift", () => {
  const output = mkdtempSync(join(tmpdir(), "efficiency-target-command-parity-"));
  try {
    const built = buildPluginTargets(output);
    const commandPath = join(built.cursor.path, "commands", "rtk-setup.md");
    writeFileSync(commandPath, readFileSync(commandPath, "utf8").replace("name: rtk-setup", "name: rtk-setup-drift"));
    assert.throws(
      () => validateBuiltTarget(built.cursor.path, "cursor", built.version),
      /Cursor command names must exactly match portable skill names/,
    );
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test("built-target validation rejects broken bundle-local documentation links", () => {
  const output = mkdtempSync(join(tmpdir(), "efficiency-target-links-"));
  try {
    const built = buildPluginTargets(output);
    rmSync(join(built.cursor.path, "schemas"), { recursive: true, force: true });
    assert.throws(
      () => validateBuiltTarget(built.cursor.path, "cursor", built.version),
      /Markdown links are invalid.*missing link target/s,
    );
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});
