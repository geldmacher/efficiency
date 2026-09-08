import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPluginTargets } from "../../scripts/build-plugin-targets.mjs";
import { inspectReleaseTarget } from "../../scripts/plugin-github-release.mjs";
import { PLUGIN_NAME, EXPECTED_REPOSITORY, RELEASE_HOSTS, assetName, canonicalJson, receiptForProvenance, sha256 } from "../../skills/install-new-release-from-repo/scripts/release-format.mjs";

export function fixtureRelease(root, version = "3.2.1", { full = false } = {}) {
  mkdirSync(root, { recursive: true });
  const directory = join(root, "release");
  mkdirSync(directory);
  const built = full ? buildPluginTargets(join(root, "targets")) : null;
  const targets = {};
  const notes = Buffer.from(`Release ${version}\n`);
  writeFileSync(join(directory, "RELEASE_NOTES.md"), notes);
  for (const host of RELEASE_HOSTS) {
    const source = join(root, host);
    if (built) cpSync(built[host].path, source, { recursive: true });
    const manifest = join(source, host === "cursor" ? ".cursor-plugin" : ".codex-plugin", "plugin.json");
    mkdirSync(join(source, host === "cursor" ? ".cursor-plugin" : ".codex-plugin"), { recursive: true });
    const metadata = built ? JSON.parse(readFileSync(manifest, "utf8")) : { name: PLUGIN_NAME };
    writeFileSync(manifest, canonicalJson({ ...metadata, version }));
    if (!built) {
      mkdirSync(join(source, "skills", "example"), { recursive: true });
      writeFileSync(join(source, "skills", "example", "SKILL.md"), `---\nname: example\ndescription: Test fixture.\n---\n\n${version}\n`);
    }
    const gitDirectory = join(root, `${host}.git`);
    execFileSync("git", ["init", "--bare", "--quiet", gitDirectory]);
    execFileSync("git", [`--git-dir=${gitDirectory}`, `--work-tree=${source}`, "-c", "core.autocrlf=false", "add", "--all", "--force"]);
    const tree = execFileSync("git", [`--git-dir=${gitDirectory}`, "write-tree"], { encoding: "utf8" }).trim();
    const archive = assetName(host, version);
    execFileSync("git", [`--git-dir=${gitDirectory}`, "archive", "--format=zip", `--prefix=${PLUGIN_NAME}/`, `--output=${join(directory, archive)}`, tree]);
    targets[host] = { archive, archive_sha256: sha256(readFileSync(join(directory, archive))), ...inspectReleaseTarget(source, host, version), root_directory: PLUGIN_NAME };
  }
  const provenance = {
    schema: 1, kind: "github-release-provenance", plugin: PLUGIN_NAME, repository: EXPECTED_REPOSITORY,
    version, tag: `v${version}`, source: { clean: true, commit_sha: "a".repeat(40), tree_sha: "b".repeat(40) },
    targets, release_gate: { command: "npm run release-check", result: "passed" },
    release_notes_sha256: sha256(notes), published_assets: [...RELEASE_HOSTS.map((host) => assetName(host, version)), "RELEASE_NOTES.md", "provenance.json", "SHA256SUMS"],
  };
  rewriteEvidence(directory, provenance);
  return { directory, provenance };
}

export function rewriteEvidence(directory, provenance) {
  provenance.receipt_sha256 = receiptForProvenance(provenance);
  writeFileSync(join(directory, "provenance.json"), canonicalJson(provenance));
  writeFileSync(join(directory, "SHA256SUMS"), provenance.published_assets.filter((name) => name !== "SHA256SUMS")
    .map((name) => `${sha256(readFileSync(join(directory, name)))}  ${name}\n`).join(""));
}

export function writeCodexDriver(home) {
  mkdirSync(home, { recursive: true });
  const path = join(home, "codex-driver.mjs");
  writeFileSync(path, `import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const home = dirname(fileURLToPath(import.meta.url));
const state = join(home, "native.json");
const fail = existsSync(join(home, "fail-add")) ? readFileSync(join(home, "fail-add"), "utf8") : "";
if (process.argv[3] === "list") {
  process.stdout.write(existsSync(state) ? readFileSync(state, "utf8") : JSON.stringify({ installed: [] }));
} else if (process.argv[3] === "marketplace") {
  const document = JSON.parse(readFileSync(join(home, ".agents", "plugins", "marketplace.json"), "utf8"));
  process.stdout.write(JSON.stringify({ marketplaces: [{ name: document.name, root: existsSync(join(home, "wrong-marketplace-root")) ? join(home, "wrong") : home }] }));
} else if (process.argv[3] === "add") {
  if (fail === "before") process.exit(2);
  const document = JSON.parse(readFileSync(join(home, ".agents", "plugins", "marketplace.json"), "utf8"));
  const source = join(home, ".codex", "plugins", "geldmacher-efficiency");
  const manifest = JSON.parse(readFileSync(join(source, ".codex-plugin", "plugin.json"), "utf8"));
  const cache = join(home, ".codex", "plugins", "cache", document.name, manifest.name, manifest.version);
  mkdirSync(dirname(cache), { recursive: true });
  cpSync(source, cache, { recursive: true });
  if (fail === "corrupt-cache") writeFileSync(join(cache, "extra.txt"), "corrupt");
  writeFileSync(state, JSON.stringify({ installed: [{ name: manifest.name, pluginId: manifest.name + "@" + document.name, marketplaceName: document.name, version: manifest.version, enabled: true, source: { source: "local", path: source } }] }));
  if (fail === "after") process.exit(3);
  process.stdout.write(JSON.stringify({ installed: true }));
} else process.exit(4);
`);
  return path;
}
