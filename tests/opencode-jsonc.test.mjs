import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { buildPluginTargets } from "../scripts/build-plugin-targets.mjs";
import { parseOpenCodeJsonc } from "../skills/install-new-release-from-repo/scripts/opencode-config.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let reference = null;
try {
  ({ parse: reference } = await import("jsonc-parser"));
} catch {
  reference = null;
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

test("OpenCode JSONC handles nested comments, escapes and trailing commas", () => {
  const text = `{
    // leading comment
    "skills": ["a\\"b", "c//d", "single ignored"],
    /* block
       // nested marker */
    "commands": [ "x", ],
  }`;
  assert.deepEqual(parseOpenCodeJsonc(text), { skills: ['a"b', "c//d", "single ignored"], commands: ["x"] });
  assert.deepEqual(parseOpenCodeJsonc('{ /* only */ }'), {});
  assert.deepEqual(parseOpenCodeJsonc('["a", // trailing\n]'), ["a"]);
  assert.throws(() => parseOpenCodeJsonc('{"skills": ["a",] "x": 1}', "comma-then-key"), /invalid OpenCode JSONC: comma-then-key/);
  assert.throws(() => parseOpenCodeJsonc('{"skills": ["unterminated]}', "string"), /invalid OpenCode JSONC: string/);
});

test("OpenCode JSONC matches jsonc-parser on the supported subset", { skip: reference === null && "jsonc-parser is not installed" }, () => {
  const samples = [
    '{"a":1,"b":[true,null,"x"]}',
    '{"skills":["a,]"]}',
    '{ /* c */ "skills": ["a /* not a comment */ b"], }',
    '["a", // line\n "b",]',
    '{"nested":{"k":[1,2,],},}',
    '{"escaped":"a\\"b","slashes":"// not comment"}',
  ];
  for (const sample of samples) {
    const errors = [];
    const expected = reference(sample, errors, { allowTrailingComma: true });
    assert.deepEqual(errors, [], sample);
    assert.deepEqual(parseOpenCodeJsonc(sample), expected, sample);
  }
});

test("a built package parses OpenCode JSONC without bundled node_modules", () => {
  const output = mkdtempSync(join(tmpdir(), "efficiency-jsonc-package-"));
  try {
    const built = buildPluginTargets(output);
    const scripts = join(built.opencode.path, "skills", "install-new-release-from-repo", "scripts");
    assert.equal(existsSync(join(scripts, "node_modules")), false);
    const script = join(scripts, "opencode-config.mjs");
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

test("the installer starts from a checkout without node_modules", (t) => {
  const copy = mkdtempSync(join(tmpdir(), "efficiency-installer-checkout-"));
  t.after(() => rmSync(copy, { recursive: true, force: true }));
  cpSync(join(root, "skills", "install-new-release-from-repo"), copy, { recursive: true });
  const installer = join(copy, "scripts", "install-release.mjs");
  const result = spawnSync(process.execPath, [installer, "--help"], { encoding: "utf8", cwd: copy });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /--host/);
});
