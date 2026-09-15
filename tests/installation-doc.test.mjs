import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("documented shell checksum recipe stops at either damaged download", { skip: process.platform === "win32" }, () => {
  const guide = readFileSync(new URL("../docs/installation.md", import.meta.url), "utf8");
  const recipe = [...guide.matchAll(/```sh\n([\s\S]*?)```/g)].map((match) => match[1]).find((body) => body.startsWith("archive="));
  assert.ok(recipe, "the manual bootstrap must expose its executable checksum recipe");
  const archive = recipe.match(/archive="([^"]+)"/)[1];
  const root = mkdtempSync(join(tmpdir(), "efficiency-checksum-doc-"));
  const good = Buffer.from("verified fixture");
  const hash = createHash("sha256").update(good).digest("hex");
  try {
    for (const damaged of [null, archive, "provenance.json"]) {
      for (const file of [archive, "provenance.json"]) writeFileSync(join(root, file), file === damaged ? "damaged" : good);
      writeFileSync(join(root, "SHA256SUMS"), `${hash}  ${archive}\n${hash}  provenance.json\n`);
      const result = spawnSync("sh", [], { cwd: root, input: recipe, encoding: "utf8" });
      assert.ifError(result.error);
      if (damaged) {
        assert.notEqual(result.status, 0, `damaged ${damaged} must fail: ${result.stdout}`);
        if (damaged === archive) assert.doesNotMatch(result.stdout, /provenance.json: OK/);
      } else assert.equal(result.status, 0, result.stderr);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
