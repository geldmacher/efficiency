import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
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

import { portableSkills } from "./helpers/plugin-surface.mjs";

test("packages contain only user documentation, required artwork and target schemas", () => {
  const temporary = mkdtempSync(join(tmpdir(), "efficiency-doc-boundary-"));
  try {
    const source = join(temporary, "source");
    cpSync(defaultRoot, source, { recursive: true,
      filter: (path) => ![".git", ".build", "node_modules"].includes(path.split(/[\\/]/).at(-1)),
    });
    writeFileSync(join(source, "docs", "future-guide.md"), "Additional documentation sentinel\n");
    const built = buildPluginTargets(join(temporary, "targets"), source);
    for (const target of ["agent-plugins", "cursor", "codex"]) {
      const snapshot = directorySnapshot(built[target].path);
      assert.deepEqual(Object.keys(snapshot).filter((path) => path.startsWith("docs/")).sort(), [
        "docs/installation.md", "docs/migrations.md", "docs/usage.md",
      ]);
      assert.deepEqual(Object.keys(snapshot).filter((path) => path.startsWith("assets/")), ["assets/logo.svg"]);
      assert.equal(Object.keys(snapshot).some((path) => path.startsWith("schemas/")), target === "agent-plugins");
      assert.ok(Object.hasOwn(snapshot, "skills/install-new-release-from-repo/scripts/codex-install.mjs"));
      assert.deepEqual(checkLinks(built[target].path), []);
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});

function directorySnapshot(directory, prefix = "", includeDirectories = false) {
  const snapshot = {};
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = prefix ? join(prefix, entry.name) : entry.name;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (includeDirectories) snapshot[`${relativePath}/`] = null;
      Object.assign(snapshot, directorySnapshot(path, relativePath, includeDirectories));
    }
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
      "install-new-release-from-repo.md",
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
    assert.equal(existsSync(join(first.cursor.path, "AGENTS.md")), false);
    assert.equal(existsSync(join(first["agent-plugins"].path, "AGENTS.md")), false);
    const responseGuidance = readFileSync(join(first.codex.path, "AGENTS.md"), "utf8");
    assert.equal(responseGuidance, readFileSync(join(first.codex.path,
      "skills/response-simplicity-setup/references/response-simplicity.md"), "utf8"));
    const cursorRuleBody = readFileSync(join(first.cursor.path, "rules/response-simplicity.mdc"), "utf8")
      .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
    assert.equal(responseGuidance.trim(), cursorRuleBody);

    for (const target of [first["agent-plugins"].path, first.cursor.path, first.codex.path]) {
      for (const developmentRoot of [".agents", ".build", ".cursor", ".git", "adapters", "node_modules", "tests"]) {
        assert.equal(existsSync(join(target, developmentRoot)), false, `${developmentRoot} leaked into ${target}`);
      }
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test("built target validation rejects missing, changed or leaked Codex response guidance", () => {
  const output = mkdtempSync(join(tmpdir(), "efficiency-guidance-test-"));
  try {
    const built = buildPluginTargets(join(output, "targets"));
    const guidance = join(built.codex.path, "AGENTS.md");
    const original = readFileSync(guidance);
    rmSync(guidance);
    assert.throws(() => validateBuiltTarget(built.codex.path, "codex", built.version), /regular root AGENTS.md/);
    mkdirSync(guidance);
    assert.throws(() => validateBuiltTarget(built.codex.path, "codex", built.version), /regular root AGENTS.md/);
    rmSync(guidance, { recursive: true });
    writeFileSync(guidance, "Unrelated always-on workflow\n");
    assert.throws(() => validateBuiltTarget(built.codex.path, "codex", built.version), /differs from canonical/);
    writeFileSync(guidance, original);
    assert.doesNotThrow(() => validateBuiltTarget(built.codex.path, "codex", built.version));
    for (const target of ["cursor", "agent-plugins"]) {
      writeFileSync(join(built[target].path, "AGENTS.md"), original);
      assert.throws(() => validateBuiltTarget(built[target].path, target, built.version), /Codex-only AGENTS.md/);
    }
  } finally { rmSync(output, { recursive: true, force: true }); }
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

test("temporary source roots and their ancestors stay unchanged when rejected as output", () => {
  const work = mkdtempSync(join(tmpdir(), "efficiency-source-boundary-"));
  const source = join(work, "source");
  try {
    cpSync(defaultRoot, source, { recursive: true,
      filter: (path) => ![".git", ".build", "node_modules"].includes(path.split(/[\\/]/).at(-1)),
    });
    mkdirSync(join(source, ".git"));
    writeFileSync(join(source, ".git", "keep.txt"), "source sentinel\n");
    const before = directorySnapshot(work, "", true);
    for (const root of new Set([source, realpathSync(source)])) {
      for (const output of [root, join(root, ".git"), join(root, "scripts"), join(root, ".build", "plugins"), work]) {
        assert.throws(() => buildPluginTargets(output, root), /source|repository/);
        assert.deepEqual(directorySnapshot(work, "", true), before, `rejected output changed files: ${output}`);
      }
    }
    const built = buildPluginTargets(join(work, "targets"), source);
    assert.equal(built.cursor.files > 0, true);
  } finally { rmSync(work, { recursive: true, force: true }); }
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
    rmSync(join(built.cursor.path, "docs", "installation.md"));
    assert.throws(
      () => validateBuiltTarget(built.cursor.path, "cursor", built.version),
      /Markdown links are invalid.*missing link target/s,
    );
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});
