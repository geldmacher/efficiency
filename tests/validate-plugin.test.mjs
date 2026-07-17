import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { validatePlugin } from "../scripts/validate-plugin.mjs";

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

test("accepts a complete plugin fixture", async () => {
  await withFixture(async (root) => assert.deepEqual(validatePlugin(root), []));
});

test("rejects invalid manifest JSON", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, ".cursor-plugin", "plugin.json"), "{");
    assert.match(validatePlugin(root).join("\n"), /invalid JSON/);
  });
});

test("rejects unknown manifest fields", async () => {
  await withFixture(async (root) => {
    await updateJson(join(root, ".cursor-plugin", "plugin.json"), (manifest) => { manifest.unknown = true; });
    assert.match(validatePlugin(root).join("\n"), /additional properties.*unknown/i);
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

test("rejects invalid frontmatter and duplicate component names", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, "commands", "sample-command.md"), "---\nname: [\n---\n");
    await write(join(root, "skills", "second-skill", "SKILL.md"), "---\nname: sample-skill\ndescription: Duplicate.\n---\n");
    const failures = validatePlugin(root).join("\n");
    assert.match(failures, /invalid YAML/);
    assert.match(failures, /duplicate name sample-skill/);
  });
});

test("rejects a skill name that differs from its folder", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, "skills", "sample-skill", "SKILL.md"), "---\nname: wrong-skill\ndescription: Wrong.\n---\n");
    assert.match(validatePlugin(root).join("\n"), /name must match parent folder/);
  });
});

test("requires auditor agents to be read-only", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, "agents", "sample-auditor.md"), "---\nname: sample-auditor\ndescription: Sample auditor.\nmodel: inherit\nreadonly: false\n---\n");
    assert.match(validatePlugin(root).join("\n"), /readonly must be boolean true/);
  });
});

test("requires package and manifest versions to agree", async () => {
  await withFixture(async (root) => {
    await updateJson(join(root, "package.json"), (packageJson) => { packageJson.version = "2.0.0"; });
    assert.match(validatePlugin(root).join("\n"), /does not match plugin\.json version/);
  });
});

test("requires repository documentation", async () => {
  await withFixture(async (root) => {
    await rm(join(root, "README.md"));
    assert.match(validatePlugin(root).join("\n"), /README\.md is missing/);
  });
});
