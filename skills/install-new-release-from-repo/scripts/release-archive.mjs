import { inflateRawSync } from "node:zlib";
import { PLUGIN_NAME, contentSummary } from "./release-format.mjs";

const maxArchive = 64 * 1024 * 1024;
const maxExpanded = 128 * 1024 * 1024;

// Read only the ordinary, single-disk ZIP format emitted by the release publisher.
// No archive-controlled path is passed to an external extractor.
export function readReleaseArchive(zip) {
  if (zip.length < 22 || zip.length > maxArchive) throw new Error("Archive size is invalid");
  let end = zip.length - 22;
  while (end >= Math.max(0, zip.length - 65557)) {
    if (zip.readUInt32LE(end) === 0x06054b50 && end + 22 + zip.readUInt16LE(end + 20) === zip.length) break;
    end--;
  }
  if (end < Math.max(0, zip.length - 65557)) throw new Error("ZIP end record is missing");
  const count = zip.readUInt16LE(end + 10);
  const centralSize = zip.readUInt32LE(end + 12);
  let offset = zip.readUInt32LE(end + 16);
  if (zip.readUInt16LE(end + 4) || zip.readUInt16LE(end + 6)
    || zip.readUInt16LE(end + 8) !== count || count === 0 || count > 10000
    || offset + centralSize !== end) throw new Error("Unsupported ZIP directory");
  const centralStart = offset;
  const names = new Map();
  const ranges = [];
  const entries = [];
  let expanded = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || zip.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid ZIP entry");
    const flags = zip.readUInt16LE(offset + 8);
    const method = zip.readUInt16LE(offset + 10);
    const compressed = zip.readUInt32LE(offset + 20);
    const size = zip.readUInt32LE(offset + 24);
    const nameLength = zip.readUInt16LE(offset + 28);
    const next = offset + 46 + nameLength + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
    const attributes = zip.readUInt32LE(offset + 38);
    const local = zip.readUInt32LE(offset + 42);
    if (next > end || zip.readUInt16LE(offset + 34) || (flags & ~0x0808) || ![0, 8].includes(method)) {
      throw new Error("Unsupported ZIP entry encoding");
    }
    const rawName = zip.subarray(offset + 46, offset + 46 + nameLength);
    const name = new TextDecoder("utf-8", { fatal: true }).decode(rawName);
    const directory = name.endsWith("/");
    const parts = (directory ? name.slice(0, -1) : name).split("/");
    if (parts[0] !== PLUGIN_NAME || parts.some((part) => !part || part === "." || part === ".."
      || /[\\:<>"|?*\x00-\x1f\x7f]/.test(part) || /[. ]$/.test(part)
      || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part))
      || (parts.length === 1 && !directory) || parts[1] === PLUGIN_NAME) throw new Error(`Unsafe archive path: ${name}`);
    const key = parts.join("/").normalize("NFC").toLowerCase();
    if (names.has(key)) throw new Error(`Duplicate archive path: ${name}`);
    names.set(key, directory);
    const unixMode = attributes >>> 16;
    const type = unixMode & 0o170000;
    if (![0, directory ? 0o040000 : 0o100000].includes(type)
      || (unixMode & 0o7000)) throw new Error(`Unsafe archive entry type: ${name}`);
    if (local + 30 > centralStart || zip.readUInt32LE(local) !== 0x04034b50
      || zip.readUInt16LE(local + 6) !== flags || zip.readUInt16LE(local + 8) !== method) throw new Error("Invalid ZIP local header");
    const localNameLength = zip.readUInt16LE(local + 26);
    const dataStart = local + 30 + localNameLength + zip.readUInt16LE(local + 28);
    const dataEnd = dataStart + compressed;
    if (dataEnd > centralStart || !zip.subarray(local + 30, local + 30 + localNameLength).equals(rawName)) {
      throw new Error("ZIP local path or size differs");
    }
    if (ranges.some(([start, stop]) => local < stop && dataEnd > start)) throw new Error("Overlapping ZIP entries");
    ranges.push([local, dataEnd]);
    expanded += size;
    if (size > maxArchive || expanded > maxExpanded) throw new Error("Expanded archive exceeds limit");
    const data = zip.subarray(dataStart, dataEnd);
    const bytes = method === 0 ? Buffer.from(data) : inflateRawSync(data, { maxOutputLength: Math.max(1, size) });
    if (bytes.length !== size || (directory && size !== 0)) throw new Error("ZIP expanded size differs");
    if (!directory) entries.push({ relativePath: parts.slice(1).join("/"), bytes, mode: (unixMode & 0o777) || 0o644 });
    offset = next;
  }
  if (offset !== end) throw new Error("ZIP directory size differs");
  for (const key of names.keys()) {
    const parts = key.split("/");
    while (parts.pop() && parts.length) {
      if (names.get(parts.join("/")) === false) throw new Error("Archive file used as a directory");
    }
  }
  return entries;
}

export function verifyArchive(zip, provenance, host) {
  const entries = readReleaseArchive(zip);
  const manifestName = host === "cursor" ? ".cursor-plugin/plugin.json" : ".codex-plugin/plugin.json";
  const manifestEntry = entries.find(({ relativePath }) => relativePath === manifestName);
  if (!manifestEntry) throw new Error(`Release is missing ${manifestName}`);
  const manifest = JSON.parse(manifestEntry.bytes.toString("utf8"));
  if (manifest.name !== PLUGIN_NAME || manifest.version !== provenance.version) throw new Error("Release manifest identity differs");
  const summary = contentSummary(entries);
  if (summary.content_sha256 !== provenance.targets[host].content_sha256
    || summary.file_count !== provenance.targets[host].file_count) throw new Error("Release content differs from provenance");
  const forbidden = new Set([".git", ".agents", ".cursor", ".build", "node_modules", "test", "tests", "plugin.json",
    host === "cursor" ? ".codex-plugin" : ".cursor-plugin"]);
  if (host === "codex") for (const name of ["commands", "agents", "rules"]) forbidden.add(name);
  if (entries.some(({ relativePath }) => forbidden.has(relativePath.split("/")[0]))) throw new Error("Release contains a foreign or development component");
  return entries;
}
