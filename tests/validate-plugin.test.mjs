import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { validatePlugin } from "../scripts/validate-plugin.mjs";

async function write(path, contents) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, contents);
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "efficiency-plugin-"));
  await write(join(root, ".cursor-plugin", "plugin.json"), JSON.stringify({
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
    rules: "./rules/",
  }, null, 2));
  await write(join(root, "assets", "logo.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"/>");
  await write(join(root, "commands", "sample-command.md"), "---\nname: sample-command\ndescription: Sample command.\n---\n\n# Sample\n");
  await write(join(root, "agents", "sample-reviewer.md"), "---\nname: sample-reviewer\ndescription: Sample reviewer.\nreadonly: true\n---\n\nReview.\n");
  await write(join(root, "skills", "sample-skill", "SKILL.md"), "---\nname: sample-skill\ndescription: Sample skill.\n---\n\n# Sample\n");
  await write(join(root, "rules", "sample-rule.mdc"), "---\ndescription: Sample rule.\nalwaysApply: false\n---\n\n# Sample\n");
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

async function updateManifest(root, update) {
  const path = join(root, ".cursor-plugin", "plugin.json");
  const manifest = JSON.parse(await readFile(path, "utf8"));
  update(manifest);
  await writeFile(path, JSON.stringify(manifest, null, 2));
}

test("accepts a valid plugin fixture", async () => {
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
    await updateManifest(root, (manifest) => { manifest.unknown = true; });
    assert.match(validatePlugin(root).join("\n"), /additional properties.*unknown/i);
  });
});

test("rejects component path traversal", async () => {
  await withFixture(async (root) => {
    await updateManifest(root, (manifest) => { manifest.commands = "../commands/"; });
    assert.match(validatePlugin(root).join("\n"), /escapes plugin root/);
  });
});

test("rejects missing declared targets", async () => {
  await withFixture(async (root) => {
    await updateManifest(root, (manifest) => { manifest.rules = "./missing-rules/"; });
    assert.match(validatePlugin(root).join("\n"), /target does not exist/);
  });
});

test("rejects invalid frontmatter YAML", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, "commands", "sample-command.md"), "---\nname: [\n---\n");
    assert.match(validatePlugin(root).join("\n"), /invalid YAML/);
  });
});

test("rejects duplicate component names", async () => {
  await withFixture(async (root) => {
    await write(join(root, "commands", "second-command.md"), "---\nname: sample-command\ndescription: Duplicate.\n---\n");
    assert.match(validatePlugin(root).join("\n"), /duplicate name sample-command/);
  });
});

test("rejects a skill name that differs from its folder", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, "skills", "sample-skill", "SKILL.md"), "---\nname: wrong-skill\ndescription: Wrong.\n---\n");
    assert.match(validatePlugin(root).join("\n"), /name must match parent folder/);
  });
});

test("enforces the internal readonly agent policy", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, "agents", "sample-reviewer.md"), "---\nname: sample-reviewer\ndescription: Sample reviewer.\nreadonly: false\n---\n");
    assert.match(validatePlugin(root).join("\n"), /readonly must be boolean true/);
  });
});
