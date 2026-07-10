import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { budgetFailures, defaultRoot, measureContext } from "../scripts/measure-context.mjs";

test("the plugin stays within its context budget", () => {
  const measurement = measureContext(defaultRoot);
  assert.deepEqual(budgetFailures(measurement), []);
});

test("an oversized always-on rule exceeds the budget", async () => {
  const root = await mkdtemp(join(tmpdir(), "efficiency-context-"));
  try {
    const rule = join(root, "rules", "oversized.mdc");
    await mkdir(dirname(rule), { recursive: true });
    await writeFile(rule, `---\ndescription: Oversized rule.\nalwaysApply: true\n---\n\n${"x".repeat(1200)}\n`);
    const measurement = measureContext(root);
    assert.ok(budgetFailures(measurement).some((failure) => failure.startsWith("always-on rules:")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
