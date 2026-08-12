import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  activeGlobalAgentsPath,
  guidanceEndMarker,
  guidanceStartMarker,
  guidanceState,
  installGuidance,
  removeGuidance,
} from "../scripts/codex-guidance.mjs";

const guidance = "# Response Simplicity\n\n- Lead with the answer, result, or decision.\n- Preserve relevant evidence.";

test("selects a non-empty override and otherwise falls back to AGENTS.md", async () => {
  const codexHome = await mkdtemp(join(tmpdir(), "efficiency-codex-home-"));
  try {
    assert.equal(activeGlobalAgentsPath(codexHome), join(codexHome, "AGENTS.md"));
    await writeFile(join(codexHome, "AGENTS.override.md"), "\n");
    assert.equal(activeGlobalAgentsPath(codexHome), join(codexHome, "AGENTS.md"));
    await writeFile(join(codexHome, "AGENTS.override.md"), "# Override\n");
    assert.equal(activeGlobalAgentsPath(codexHome), join(codexHome, "AGENTS.override.md"));
  } finally {
    await rm(codexHome, { recursive: true, force: true });
  }
});

test("installation preserves an existing RTK import and is idempotent", () => {
  const original = "@/Users/example/.codex/RTK.md\n\n# Existing guidance\n";
  const installed = installGuidance(original, guidance);
  assert.ok(installed.startsWith(original));
  assert.ok(installed.includes(guidanceStartMarker));
  assert.ok(installed.includes(guidanceEndMarker));
  assert.equal(guidanceState(installed, guidance), "current");
  assert.equal(installGuidance(installed, guidance), installed);
});

test("installation updates a marked block instead of duplicating it", () => {
  const outdated = `${guidanceStartMarker}\n# Response Simplicity\n\n- Old text.\n${guidanceEndMarker}\n`;
  const updated = installGuidance(outdated, guidance);
  assert.equal(updated.match(new RegExp(guidanceStartMarker, "g"))?.length, 1);
  assert.equal(updated.match(new RegExp(guidanceEndMarker, "g"))?.length, 1);
  assert.ok(updated.includes("Lead with the answer"));
  assert.equal(guidanceState(updated, guidance), "current");
});

test("removal deletes only the marked block", () => {
  const before = "@/Users/example/.codex/RTK.md\n\n# Existing guidance\n";
  const after = "\n# Tail\n";
  const contents = `${before}${installGuidance("", guidance).trim()}${after}`;
  const removed = removeGuidance(contents);
  assert.ok(removed.startsWith(before));
  assert.ok(removed.endsWith(after));
  assert.ok(removed.includes("@/Users/example/.codex/RTK.md"));
  assert.equal(removed.includes("Lead with the answer"), false);
});

test("unmarked similar guidance stops installation", () => {
  const unmanaged = "# Response Simplicity\n\n- Keep answers brief but complete.\n";
  assert.equal(guidanceState(unmanaged, guidance), "unmanaged-equivalent");
  assert.throws(() => installGuidance(unmanaged, guidance), /similar response guidance/);
});

test("malformed or duplicate markers stop all operations", () => {
  const malformed = `${guidanceStartMarker}\ntext\n`;
  const duplicate = `${guidanceStartMarker}\na\n${guidanceEndMarker}\n${guidanceStartMarker}\nb\n${guidanceEndMarker}`;
  for (const contents of [malformed, duplicate]) {
    assert.throws(() => guidanceState(contents, guidance), /missing, duplicated, or malformed/);
    assert.throws(() => installGuidance(contents, guidance), /missing, duplicated, or malformed/);
    assert.throws(() => removeGuidance(contents), /missing, duplicated, or malformed/);
  }
});
