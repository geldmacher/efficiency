import { createHash } from "node:crypto";

export const PLUGIN_NAME = "geldmacher-efficiency";
export const EXPECTED_REPOSITORY = "geldmacher/efficiency";
export const RELEASE_HOSTS = Object.freeze(["cursor", "codex"]);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function contentSummary(entries) {
  const sorted = [...entries].sort((a, b) => {
    const left = a.relativePath.split("/");
    const right = b.relativePath.split("/");
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      const order = left[i].localeCompare(right[i]);
      if (order) return order;
    }
    return left.length - right.length;
  });
  const digest = createHash("sha256");
  for (const entry of sorted) digest.update(`${entry.relativePath}\0${entry.mode.toString(8).padStart(3, "0")}\0${sha256(entry.bytes)}\n`);
  return { content_sha256: digest.digest("hex"), file_count: entries.length };
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonicalValue(value), null, 2)}\n`;
}

export function assetName(host, version) {
  return `${PLUGIN_NAME}-${host}-v${version}.zip`;
}

function receiptPayload(provenance) {
  const value = structuredClone(provenance);
  delete value.receipt_sha256;
  return value;
}

export function receiptForProvenance(provenance) {
  return sha256(canonicalJson(receiptPayload(provenance)));
}

export function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.join("\n") !== wanted.join("\n")) throw new Error(`${label} fields differ: ${actual.join(", ")}`);
}

export function shaField(value, label, lengths = [64]) {
  if (!lengths.some((length) => new RegExp(`^[0-9a-f]{${length}}$`).test(value ?? ""))) throw new Error(`${label} must be a lowercase hexadecimal digest`);
}

export function validateProvenance(provenance) {
  exactKeys(provenance, [
    "kind", "plugin", "published_assets", "receipt_sha256", "release_gate", "release_notes_sha256",
    "repository", "schema", "source", "tag", "targets", "version",
  ], "provenance.json");
  if (provenance.schema !== 1 || provenance.kind !== "github-release-provenance" || provenance.plugin !== PLUGIN_NAME) {
    throw new Error("provenance.json identity is invalid");
  }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(provenance.version ?? "") || provenance.tag !== `v${provenance.version}`) {
    throw new Error("provenance.json version and tag are inconsistent");
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(provenance.repository ?? "")) throw new Error("provenance.json repository is invalid");
  exactKeys(provenance.source, ["clean", "commit_sha", "tree_sha"], "provenance source");
  if (provenance.source.clean !== true) throw new Error("provenance source must be clean");
  shaField(provenance.source.commit_sha, "provenance commit", [40, 64]);
  shaField(provenance.source.tree_sha, "provenance tree", [40, 64]);
  exactKeys(provenance.release_gate, ["command", "result"], "provenance release gate");
  if (provenance.release_gate.command !== "npm run release-check" || provenance.release_gate.result !== "passed") {
    throw new Error("provenance release gate must record a passed npm run release-check");
  }
  shaField(provenance.release_notes_sha256, "release notes hash");
  shaField(provenance.receipt_sha256, "release receipt");
  exactKeys(provenance.targets, RELEASE_HOSTS, "provenance targets");
  for (const host of RELEASE_HOSTS) {
    const target = provenance.targets[host];
    exactKeys(target, ["archive", "archive_sha256", "content_sha256", "file_count", "root_directory"], `${host} provenance target`);
    if (target.archive !== assetName(host, provenance.version) || target.root_directory !== PLUGIN_NAME) {
      throw new Error(`${host} provenance archive identity is invalid`);
    }
    shaField(target.archive_sha256, `${host} archive hash`);
    shaField(target.content_sha256, `${host} content hash`);
    if (!Number.isSafeInteger(target.file_count) || target.file_count < 1) throw new Error(`${host} file count is invalid`);
  }
  const expectedAssets = [
    assetName("cursor", provenance.version),
    assetName("codex", provenance.version),
    "RELEASE_NOTES.md",
    "provenance.json",
    "SHA256SUMS",
  ];
  if (!Array.isArray(provenance.published_assets) || provenance.published_assets.join("\n") !== expectedAssets.join("\n")) {
    throw new Error("provenance published asset set is invalid");
  }
}
