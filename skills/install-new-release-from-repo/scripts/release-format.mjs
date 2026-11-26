import { createHash } from "node:crypto";

export const PLUGIN_NAME = "geldmacher-efficiency";
export const EXPECTED_REPOSITORY = "geldmacher/efficiency";
export const RELEASE_HOSTS = Object.freeze(["cursor", "codex", "opencode"]);
// provenance.json stays schema 2. Fielded 3.11.0–4.0.3 updaters reject any other
// document in that filename, and fielded 3.6.0–3.10.0 updaters accept only schema 1.
export const PROVENANCE_SCHEMA = 2;
export const SCHEMA1_PROVENANCE_NAME = "provenance.schema1.json";
export const SCHEMA2_ANCHOR_NAME = "provenance.schema2.json";
export const SCHEMA1_COMMITMENT_LABEL = "schema-1 provenance sha256:";
export const PROVENANCE_BOOTSTRAP_ENV = "EFFICIENCY_PROVENANCE_BOOTSTRAP";
const PROVENANCE_HOSTS = Object.freeze({
  1: Object.freeze(["cursor", "codex"]),
  2: RELEASE_HOSTS,
});

export function provenanceHosts(provenance) {
  const hosts = PROVENANCE_HOSTS[provenance?.schema];
  if (!hosts) throw new Error(unsupportedProvenanceSchemaError(provenance?.schema));
  return hosts;
}

export function supportedProvenanceSchema(schema) {
  return Object.hasOwn(PROVENANCE_HOSTS, schema);
}

export function unsupportedProvenanceSchemaError(schema, host = "cursor|codex|opencode") {
  const label = Number.isInteger(schema) ? String(schema) : "unrecognized";
  return [
    `provenance.json schema ${label} is not supported by this updater (supported schemas: 1, 2).`,
    "Verification was not skipped and nothing was installed.",
    "Efficiency 3.6.0 through 3.10.0 accept only schema 1, so they reject schema 2 provenance.json before replacing files.",
    "Verify SHA256SUMS, then run the installer from the verified archive instead of the installed copy:",
    `node upgrade-from-schema1.mjs --host ${host} --download-dir <new-directory>.`,
    'See docs/installation.md, section "Update from Efficiency 3.6.0 through 3.10.0".',
  ].join(" ");
}

export function publishedAssetNames(version, hosts = RELEASE_HOSTS) {
  return [...hosts.map((host) => assetName(host, version)), "RELEASE_NOTES.md", "provenance.json", "SHA256SUMS"];
}

export function releaseBundleNames(provenance) {
  if (!Array.isArray(provenance?.published_assets)) throw new Error("provenance published asset set is invalid");
  const names = [...provenance.published_assets];
  const extras = [];
  if (provenance.schema === 2 && !names.includes(SCHEMA1_PROVENANCE_NAME)) extras.push(SCHEMA1_PROVENANCE_NAME);
  if (Number.isInteger(provenance.schema) && provenance.schema > 2 && !names.includes(SCHEMA2_ANCHOR_NAME)) extras.push(SCHEMA2_ANCHOR_NAME);
  if (extras.length === 0) return names;
  const checksum = names.indexOf("SHA256SUMS");
  if (checksum === -1) names.push(...extras);
  else names.splice(checksum, 0, ...extras);
  return names;
}

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

export function buildSchema1Artifact(schema2, notesPrefix) {
  if (schema2?.schema !== 2) throw new Error("schema-1 artifact requires schema 2 provenance");
  if (typeof notesPrefix !== "string" || !notesPrefix.endsWith("\n") || notesPrefix.includes(SCHEMA1_COMMITMENT_LABEL)) {
    throw new Error("release notes prefix is invalid");
  }
  const document = {
    schema: 1,
    kind: schema2.kind,
    plugin: schema2.plugin,
    version: schema2.version,
    tag: schema2.tag,
    repository: schema2.repository,
    source: structuredClone(schema2.source),
    release_gate: structuredClone(schema2.release_gate),
    release_notes_sha256: sha256(notesPrefix),
    targets: {
      cursor: structuredClone(schema2.targets.cursor),
      codex: structuredClone(schema2.targets.codex),
    },
    published_assets: publishedAssetNames(schema2.version, PROVENANCE_HOSTS[1]),
  };
  document.receipt_sha256 = receiptForProvenance(document);
  validateProvenance(document);
  const bytes = canonicalJson(document);
  return { document, bytes, notes: `${notesPrefix}${SCHEMA1_COMMITMENT_LABEL} ${sha256(bytes)}\n` };
}

export function assertSchema1Commitment({ notes, schema1Bytes, schema2 }) {
  const text = Buffer.isBuffer(notes) ? notes.toString("utf8") : String(notes);
  const artifact = Buffer.isBuffer(schema1Bytes) ? schema1Bytes.toString("utf8") : String(schema1Bytes);
  if (sha256(text) !== schema2?.release_notes_sha256) throw new Error("RELEASE_NOTES.md differs from provenance");
  const marker = `${SCHEMA1_COMMITMENT_LABEL} `;
  if (!text.endsWith("\n")) throw new Error("release notes must end with a newline");
  const commitment = text.slice(0, -1).split("\n").at(-1) ?? "";
  const digest = commitment.startsWith(marker) ? commitment.slice(marker.length) : "";
  if (!/^[0-9a-f]{64}$/.test(digest) || sha256(artifact) !== digest || text.indexOf(marker) !== text.length - commitment.length - 1) {
    throw new Error("schema-1 provenance commitment does not match");
  }
  const schema1 = JSON.parse(artifact);
  if (canonicalJson(schema1) !== artifact) throw new Error("provenance.schema1.json is not canonically encoded");
  validateProvenance(schema1);
  if (schema1.schema !== 1) throw new Error("schema-1 provenance identity is invalid");
  if (schema1.release_notes_sha256 !== sha256(text.slice(0, text.length - commitment.length - 1))) {
    throw new Error("schema-1 release notes hash differs");
  }
  if (receiptForProvenance(schema1) !== schema1.receipt_sha256) throw new Error("schema-1 receipt differs");
  if (receiptForProvenance(schema2) !== schema2.receipt_sha256) throw new Error("Release identity or receipt differs");
  for (const field of ["kind", "plugin", "version", "tag", "repository"]) {
    if (schema1[field] !== schema2[field]) throw new Error(`provenance ${field} differs across schemas`);
  }
  if (canonicalJson(schema1.source) !== canonicalJson(schema2.source)) throw new Error("provenance source differs across schemas");
  if (canonicalJson(schema1.release_gate) !== canonicalJson(schema2.release_gate)) throw new Error("provenance release gate differs across schemas");
  for (const host of PROVENANCE_HOSTS[1]) {
    if (canonicalJson(schema1.targets[host]) !== canonicalJson(schema2.targets[host])) {
      throw new Error(`${host} provenance target differs across schemas`);
    }
  }
  return schema1;
}

export function validateProvenance(provenance) {
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) throw new Error("provenance.json must be an object");
  if (!supportedProvenanceSchema(provenance.schema)) throw new Error(unsupportedProvenanceSchemaError(provenance.schema));
  exactKeys(provenance, [
    "kind", "plugin", "published_assets", "receipt_sha256", "release_gate", "release_notes_sha256",
    "repository", "schema", "source", "tag", "targets", "version",
  ], "provenance.json");
  if (provenance.kind !== "github-release-provenance" || provenance.plugin !== PLUGIN_NAME) {
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
  const hosts = provenanceHosts(provenance);
  exactKeys(provenance.targets, hosts, "provenance targets");
  for (const host of hosts) {
    const target = provenance.targets[host];
    exactKeys(target, ["archive", "archive_sha256", "content_sha256", "file_count", "root_directory"], `${host} provenance target`);
    if (target.archive !== assetName(host, provenance.version) || target.root_directory !== PLUGIN_NAME) {
      throw new Error(`${host} provenance archive identity is invalid`);
    }
    shaField(target.archive_sha256, `${host} archive hash`);
    shaField(target.content_sha256, `${host} content hash`);
    if (!Number.isSafeInteger(target.file_count) || target.file_count < 1) throw new Error(`${host} file count is invalid`);
  }
  const expectedAssets = publishedAssetNames(provenance.version, hosts);
  if (!Array.isArray(provenance.published_assets) || provenance.published_assets.join("\n") !== expectedAssets.join("\n")) {
    throw new Error("provenance published asset set is invalid");
  }
}
