import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { buildPluginTargets } from "../scripts/build-plugin-targets.mjs";
import { parseOpenCodeJsonc } from "../skills/install-new-release-from-repo/scripts/opencode-config.mjs";

test("OpenCode JSONC keeps commas and comment markers inside strings", () => {
  const comma = parseOpenCodeJsonc('{"skills":["a,]"]}', "comma");
  assert.deepEqual(comma, { skills: ["a,]"] });
  const comments = parseOpenCodeJsonc('{ "skills": ["a /* not a comment */ b", "https://example.com", "line // comment"] }', "comments");
  assert.deepEqual(comments, { skills: ["a /* not a comment */ b", "https://example.com", "line // comment"] });
  const trailing = parseOpenCodeJsonc('{ "skills": ["ok",], }', "trailing");
  assert.deepEqual(trailing, { skills: ["ok"] });
});

test("OpenCode JSONC aborts on an unclosed comment", () => {
  assert.throws(() => parseOpenCodeJsonc('{ "skills": ["ok"] } /* unclosed', "unclosed"), /invalid OpenCode JSONC: unclosed/);
  assert.throws(() => parseOpenCodeJsonc('{ "skills": [ /* never ends\n"ok"] }', "block"), /invalid OpenCode JSONC: block/);
});

test("a built package resolves jsonc-parser beside the install skill", () => {
  const output = mkdtempSync(join(tmpdir(), "efficiency-jsonc-package-"));
  try {
    const built = buildPluginTargets(output);
    const script = join(built.opencode.path, "skills", "install-new-release-from-repo", "scripts", "opencode-config.mjs");
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
      import { parseOpenCodeJsonc } from ${JSON.stringify(pathToFileURL(script).href)};
      const value = parseOpenCodeJsonc('{"skills":["a,]"]}');
      if (value.skills[0] !== "a,]") process.exit(2);
    `], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});
