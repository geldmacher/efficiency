import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { parse as parseJsonc } from "jsonc-parser";
import { buildPluginTargets } from "../scripts/build-plugin-targets.mjs";
import { openCodeReleaseInstallerSkill } from "../scripts/plugin-components.mjs";
import { parseOpenCodeJsonc } from "../skills/install-new-release-from-repo/scripts/opencode-config.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function expectSameDocument(text) {
  const errors = [];
  const expected = parseJsonc(text, errors, { allowTrailingComma: true });
  assert.deepEqual(errors, [], text);
  assert.deepEqual(parseOpenCodeJsonc(text, "document"), expected);
}

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

test("local JSONC reader matches jsonc-parser on strings, escapes, trailing commas, and a BOM", () => {
  for (const text of [
    '{"skills":["a,]"]}',
    '{ "skills": ["a /* not a comment */ b", "https://example.com", "line // comment"] }',
    '{"quote":"say \\"hi\\" // still a string","block":"/* not */"}',
    '{\n  // leading comment\n  "skills": ["ok",],\n  "nested": { "values": [1, 2,], },\n}\n',
    '{"a":1,"b":[true,null,"x"]}',
    '{ /* note */ }',
    '{ /* keep // this */ "skills": ["a /* not a comment */ b"], }',
    '["a", // comment before the closer\n]',
    '["a", // line\n "b",]',
    '{"nested":{"k":[1,2,],},}',
    '{"escaped":"a\\"b","slashes":"// not comment"}',
    '{\n  // head\n  "skills": ["a\\"b", "c//d"],\n  /* block\n     // marker inside the block */\n  "commands": ["x",],\n}\n',
  ]) expectSameDocument(text);
  const bom = '\uFEFF{ "skills": ["bom",], }';
  const bomErrors = [];
  const bomDocument = parseJsonc(bom, bomErrors, { allowTrailingComma: true });
  assert.deepEqual(bomDocument, { skills: ["bom"] });
  assert.ok(bomErrors.length > 0, "jsonc-parser records the leading BOM and still returns the document");
  assert.deepEqual(parseOpenCodeJsonc(bom, "bom"), bomDocument);
  for (const [text, label] of [
    ['{ "skills": ["ok"] } /* unclosed', "unclosed"],
    ['{ "skills": [ /* never ends\n"ok"] }', "block"],
    ['{ "skills": ["ok"] ', "truncated"],
    ['{"skills": ["a",] "x": 1}', "comma-then-key"],
    ['{"skills": ["unterminated]}', "string"],
  ]) {
    const errors = [];
    parseJsonc(text, errors, { allowTrailingComma: true });
    assert.ok(errors.length > 0, label);
    assert.throws(() => parseOpenCodeJsonc(text, label), new RegExp(`invalid OpenCode JSONC: ${label}`));
  }
});

test("a built package parses OpenCode JSONC without a vendored parser", () => {
  const output = mkdtempSync(join(tmpdir(), "efficiency-jsonc-package-"));
  try {
    const built = buildPluginTargets(output);
    const scripts = join(built.opencode.path, "skills", openCodeReleaseInstallerSkill, "scripts");
    assert.equal(existsSync(join(scripts, "node_modules")), false);
    const script = join(scripts, "opencode-config.mjs");
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
      import { parseOpenCodeJsonc } from ${JSON.stringify(pathToFileURL(script).href)};
      const value = parseOpenCodeJsonc('{"skills":["a,]",],"nested":{"values":[1,],}}');
      if (value.skills[0] !== "a,]" || value.nested.values[0] !== 1) process.exit(2);
    `], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test("the release installer prints help from a skill copy with no installed packages", (t) => {
  const copy = mkdtempSync(join(tmpdir(), "efficiency-installer-help-"));
  t.after(() => rmSync(copy, { recursive: true, force: true }));
  const skill = join(copy, "install-new-release-from-repo");
  cpSync(join(root, "skills", "install-new-release-from-repo"), skill, { recursive: true });
  assert.equal(existsSync(join(skill, "scripts", "node_modules")), false);
  const env = { ...process.env };
  delete env.NODE_PATH;
  const result = spawnSync(process.execPath, [join(skill, "scripts", "install-release.mjs"), "--help"], {
    cwd: copy,
    encoding: "utf8",
    env,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /No Git or npm install required/);
});
