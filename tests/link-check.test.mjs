import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { checkLinks } from "../scripts/check-links.mjs";

test("accepts valid relative and external Markdown links", async () => {
  const root = await mkdtemp(join(tmpdir(), "efficiency-links-"));
  try {
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "README.md"), "[guide](docs/guide.md) [external](https://cursor.com)\n");
    await writeFile(join(root, "docs", "guide.md"), "# Guide\n");
    assert.deepEqual(checkLinks(root), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("rejects missing and escaping Markdown links", async () => {
  const root = await mkdtemp(join(tmpdir(), "efficiency-links-"));
  try {
    await writeFile(join(root, "README.md"), "[missing](docs/missing.md) [outside](../outside.md)\n");
    const failures = checkLinks(root).join("\n");
    assert.match(failures, /missing link target/);
    assert.match(failures, /link escapes plugin root/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("source link checks ignore persisted build output", async () => {
  const root = await mkdtemp(join(tmpdir(), "efficiency-links-build-"));
  try {
    await mkdir(join(root, ".build", "plugins", "stale"), { recursive: true });
    await writeFile(join(root, "README.md"), "# Source\n");
    await writeFile(join(root, ".build", "plugins", "stale", "README.md"), "[missing](missing.md)\n");
    assert.deepEqual(checkLinks(root), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
