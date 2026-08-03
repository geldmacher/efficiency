import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { validatePlugin, validateRepositoryPolicy } from "../scripts/validate-plugin.mjs";

async function write(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "efficiency-plugin-"));
  const manifest = {
    name: "fixture-plugin",
    displayName: "Fixture Plugin",
    description: "Validator fixture.",
    version: "1.0.0",
    author: { name: "Fixture", email: "fixture@example.com" },
    license: "MIT",
    logo: "assets/logo.svg",
    commands: "./commands/",
    agents: "./agents/",
    skills: "./skills/",
  };
  await write(join(root, ".cursor-plugin", "plugin.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await write(join(root, "package.json"), `${JSON.stringify({ name: "fixture-development", version: "1.0.0" }, null, 2)}\n`);
  await write(join(root, "package-lock.json"), "{}\n");
  await write(join(root, "README.md"), "# Fixture\n");
  await write(join(root, "CHANGELOG.md"), "# Changelog\n");
  await write(join(root, "LICENSE"), "Fixture license\n");
  await write(join(root, "assets", "logo.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"/>\n");
  await write(join(root, "commands", "sample-command.md"), "---\nname: sample-command\ndescription: Sample command.\n---\n\n# Sample\n");
  await write(join(root, "agents", "sample-auditor.md"), "---\nname: sample-auditor\ndescription: Sample auditor.\nmodel: inherit\nreadonly: true\n---\n\nReview.\n");
  await write(join(root, "skills", "sample-skill", "SKILL.md"), "---\nname: sample-skill\ndescription: Sample skill.\n---\n\n# Sample\n");
  return root;
}

async function withFixture(run) {
  const root = await createFixture();
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function updateJson(path, update) {
  const value = JSON.parse(await readFile(path, "utf8"));
  update(value);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

test("accepts a complete plugin fixture and repository policy", async () => {
  await withFixture(async (root) => {
    assert.deepEqual(validatePlugin(root), []);
    assert.deepEqual(validateRepositoryPolicy(root), []);
  });
});

test("accepts an official minimal manifest without optional components", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, ".cursor-plugin", "plugin.json"), "{\"name\":\"minimal-plugin\"}\n");
    assert.deepEqual(validatePlugin(root), []);
  });
});

test("accepts valid minClientVersions and rejects invalid client semver", async () => {
  await withFixture(async (root) => {
    const manifestPath = join(root, ".cursor-plugin", "plugin.json");
    await updateJson(manifestPath, (manifest) => { manifest.minClientVersions = { cursor: "3.14.7" }; });
    assert.deepEqual(validatePlugin(root), []);
    await updateJson(manifestPath, (manifest) => { manifest.minClientVersions.cursor = "3.14"; });
    assert.match(validatePlugin(root).join("\n"), /minClientVersions.*pattern/i);
  });
});

test("rejects invalid manifest JSON and unknown fields", async () => {
  await withFixture(async (root) => {
    const manifestPath = join(root, ".cursor-plugin", "plugin.json");
    await updateJson(manifestPath, (manifest) => { manifest.unknown = true; });
    assert.match(validatePlugin(root).join("\n"), /additional properties.*unknown/i);
    await writeFile(manifestPath, "{");
    assert.match(validatePlugin(root).join("\n"), /invalid JSON/);
  });
});

test("rejects component path traversal and missing targets", async () => {
  await withFixture(async (root) => {
    await updateJson(join(root, ".cursor-plugin", "plugin.json"), (manifest) => {
      manifest.commands = "../commands/";
      manifest.skills = "./missing-skills/";
    });
    const failures = validatePlugin(root).join("\n");
    assert.match(failures, /escapes plugin root/);
    assert.match(failures, /target does not exist/);
  });
});

test("validates components from declared paths instead of conventional folders", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, "commands", "sample-command.md"), "not frontmatter\n");
    await write(join(root, "custom-commands", "custom-command.md"), "---\nname: custom-command\ndescription: Custom command.\n---\n");
    await updateJson(join(root, ".cursor-plugin", "plugin.json"), (manifest) => {
      manifest.commands = "./custom-commands/";
    });
    assert.deepEqual(validatePlugin(root), []);
  });
});

test("rejects declared globs that match no targets", async () => {
  await withFixture(async (root) => {
    await updateJson(join(root, ".cursor-plugin", "plugin.json"), (manifest) => {
      manifest.rules = "./rules/*.mdc";
    });
    assert.match(validatePlugin(root).join("\n"), /rules: path or glob matches no targets/);
  });
});

test("validates rule frontmatter from declared rule paths", async () => {
  await withFixture(async (root) => {
    await write(join(root, "rules", "sample.mdc"), "---\ndescription: Sample rule.\nalwaysApply: true\n---\n\n# Sample\n");
    await updateJson(join(root, ".cursor-plugin", "plugin.json"), (manifest) => {
      manifest.rules = "./rules/";
    });
    assert.deepEqual(validatePlugin(root), []);
    await writeFile(join(root, "rules", "sample.mdc"), "---\ndescription: []\nalwaysApply: yes\n---\n");
    const failures = validatePlugin(root).join("\n");
    assert.match(failures, /missing non-empty string field description/);
    assert.match(failures, /alwaysApply must be boolean/);
  });
});

test("rejects a declared component symlink that escapes the plugin root", async () => {
  await withFixture(async (root) => {
    const outside = await mkdtemp(join(tmpdir(), "efficiency-outside-"));
    try {
      const target = join(outside, "escaped.mdc");
      await writeFile(target, "---\ndescription: Outside.\n---\n");
      await mkdir(join(root, "rules"));
      await symlink(target, join(root, "rules", "escaped.mdc"));
      await updateJson(join(root, ".cursor-plugin", "plugin.json"), (manifest) => {
        manifest.rules = "./rules/escaped.mdc";
      });
      assert.match(validatePlugin(root).join("\n"), /target resolves outside plugin root/);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

test("rejects invalid frontmatter and component names", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, "commands", "sample-command.md"), "---\nname: [\n---\n");
    await writeFile(join(root, "skills", "sample-skill", "SKILL.md"), "---\nname: wrong-skill\ndescription: Wrong.\n---\n");
    const failures = validatePlugin(root).join("\n");
    assert.match(failures, /invalid YAML/);
    assert.match(failures, /name must match parent folder/);
  });
});

test("rejects duplicate component names across declared paths", async () => {
  await withFixture(async (root) => {
    await write(join(root, "alternate", "sample-skill", "SKILL.md"), "---\nname: sample-skill\ndescription: Duplicate skill.\n---\n");
    await updateJson(join(root, ".cursor-plugin", "plugin.json"), (manifest) => {
      manifest.skills = ["./skills/", "./alternate/"];
    });
    assert.match(validatePlugin(root).join("\n"), /duplicate name sample-skill/);
  });
});

test("repository policy requires aligned versions and release files", async () => {
  await withFixture(async (root) => {
    await updateJson(join(root, "package.json"), (packageJson) => { packageJson.version = "2.0.0"; });
    assert.match(validateRepositoryPolicy(root).join("\n"), /does not match plugin\.json version/);
    await rm(join(root, "README.md"));
    assert.match(validateRepositoryPolicy(root).join("\n"), /README\.md is missing/);
  });
});
