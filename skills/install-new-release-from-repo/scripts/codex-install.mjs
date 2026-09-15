import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { PLUGIN_NAME } from "./release-format.mjs";

export const present = (path) => { try { lstatSync(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } };

export function assertPath(root, path) {
  const tail = relative(root, path);
  if (!tail || tail === ".." || tail.startsWith(`..${sep}`) || isAbsolute(tail)) throw new Error(`Path escapes installation root: ${path}`);
  let current = root;
  for (const part of tail.split(sep)) {
    current = join(current, part);
    if (!present(current)) break;
    if (lstatSync(current).isSymbolicLink()) throw new Error(`Installation path contains a symlink: ${current}`);
  }
}

export function readTree(directory) {
  const entries = [];
  const walk = (folder, prefix = "") => {
    const stat = lstatSync(folder);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Unsafe installed directory: ${folder}`);
    for (const name of readdirSync(folder)) {
      const path = join(folder, name);
      const key = prefix ? `${prefix}/${name}` : name;
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`Installed tree contains a symlink: ${path}`);
      if (stat.isDirectory()) walk(path, key);
      else if (stat.isFile()) entries.push({ relativePath: key, bytes: readFileSync(path), mode: stat.mode & 0o777 });
      else throw new Error(`Installed tree contains a non-regular file: ${path}`);
    }
  };
  walk(directory);
  return entries;
}

export function sameTree(directory, entries) {
  if (!present(directory)) return false;
  const actual = readTree(directory);
  const expected = new Map(entries.map((entry) => [entry.relativePath, entry]));
  return actual.length === entries.length && actual.every((entry) => {
    const wanted = expected.get(entry.relativePath);
    return wanted && wanted.bytes.equals(entry.bytes) && (process.platform === "win32" || wanted.mode === entry.mode);
  });
}

export function marketplaceDocument(original, sourcePath, plugin = PLUGIN_NAME) {
  const document = original ? JSON.parse(original.toString("utf8")) : {
    name: "geldmacher-personal", interface: { displayName: "Geldmacher Plugins" }, plugins: [],
  };
  if (!/^[a-zA-Z0-9_-](?:[a-zA-Z0-9._-]*[a-zA-Z0-9_-])?$/.test(document?.name ?? "") || !Array.isArray(document.plugins)) throw new Error("Invalid personal marketplace");
  const matches = document.plugins.filter((entry) => entry?.name === plugin);
  if (matches.length > 1) throw new Error("Duplicate Efficiency marketplace entries");
  if (matches[0] && (matches[0].source?.source !== "local" || matches[0].source.path !== sourcePath)) {
    throw new Error("Efficiency marketplace points to another source; resolve this conflict first");
  }
  if (!matches.length) document.plugins.push({
    name: plugin, source: { source: "local", path: sourcePath },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }, category: "Developer Tools",
  });
  return { name: document.name, bytes: matches.length ? original : Buffer.from(`${JSON.stringify(document, null, 2)}\n`) };
}

export function defaultRunner(binary, args, { env = process.env } = {}) {
  return binary.endsWith(".mjs")
    ? spawnSync(process.execPath, [binary, ...args], { env, encoding: "utf8", timeout: 60000, maxBuffer: 8 * 1024 * 1024 })
    : spawnSync(binary, args, { env, encoding: "utf8", timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
}

export function codexList(binary, runner = defaultRunner, env = process.env) {
  const response = runner(binary, ["plugin", "list", "--json"], { env });
  if (response.error?.code === "ENOENT") return null;
  if (response.status !== 0) throw new Error(`Codex plugin inspection failed: ${response.stderr || response.error?.message || response.status}`);
  const result = JSON.parse(response.stdout);
  if (!Array.isArray(result.installed)) throw new Error("Unsupported Codex plugin list response");
  return result.installed;
}

export function codexSourceInstallation(installed, marketplace, source, plugin = PLUGIN_NAME) {
  const id = `${plugin}@${marketplace}`;
  if (installed.some((entry) => (entry.name === plugin || entry.pluginId?.startsWith(`${plugin}@`)) && entry.pluginId !== id)) {
    throw new Error("Efficiency is installed from another marketplace; resolve this conflict first");
  }
  const matches = installed.filter((entry) => entry.pluginId === id);
  if (matches.length > 1) throw new Error("Duplicate installed Codex plugin entries");
  const current = matches[0];
  if (!current) return null;
  const sourcePath = (path) => existsSync(path) ? realpathSync(path) : resolve(path);
  if (current.source?.source !== "local" || sourcePath(current.source.path || "/") !== sourcePath(source)) {
    throw new Error("Installed Codex plugin points to another source");
  }
  return current;
}

export function cacheState(installed, marketplace, source, codexHome, { plugin = PLUGIN_NAME, version, entries }) {
  const current = codexSourceInstallation(installed, marketplace, source, plugin);
  if (!current) return { current: false, installed: null };
  if (![version, "local"].includes(current.version)) return { current: false, installed: current };
  const cache = join(codexHome, "plugins", "cache", marketplace, plugin, current.version);
  assertPath(codexHome, cache);
  if (!entries) entries = present(source) ? readTree(source) : [];
  const manifestPath = join(cache, ".codex-plugin", "plugin.json");
  assertPath(codexHome, manifestPath);
  let cacheManifest = null;
  if (present(manifestPath)) {
    try { cacheManifest = JSON.parse(readFileSync(manifestPath, "utf8")); }
    catch (error) { if (!(error instanceof SyntaxError)) throw error; }
  }
  return {
    current: cacheManifest?.name === plugin && cacheManifest?.version === version && sameTree(cache, entries),
    installed: current, cache, cacheManifest, enabled: current.enabled,
  };
}

function assertCodexMarketplace(binary, runner, marketplace, home, env) {
  const result = runner(binary, ["plugin", "marketplace", "list", "--json"], { env });
  if (result.status !== 0) throw new Error(`Codex marketplace inspection failed: ${result.stderr || result.error?.message || result.status}`);
  const matches = JSON.parse(result.stdout).marketplaces?.filter((entry) => entry.name === marketplace);
  if (matches?.length !== 1 || !matches[0].root || !existsSync(matches[0].root) || realpathSync(matches[0].root) !== realpathSync(home)) {
    throw new Error("Codex does not resolve this marketplace to the intended home; refresh its local catalog before retrying");
  }
}

export function installCodex({ binary = "codex", runner = defaultRunner, marketplace, home, source, codexHome, plugin = PLUGIN_NAME, version, entries, env = process.env }) {
  assertCodexMarketplace(binary, runner, marketplace, home, env);
  try {
    const result = runner(binary, ["plugin", "add", `${plugin}@${marketplace}`, "--json"], { env });
    if (result.status !== 0) throw new Error(`Codex installation failed: ${result.stderr || result.error?.message || result.status}`);
    const state = cacheState(codexList(binary, runner, env) ?? [], marketplace, source, codexHome, { plugin, version, entries });
    if (!state.current) throw new Error("Codex installed cache differs from the selected source");
    return state;
  } catch (error) {
    error.nativeAttempted = true;
    throw error;
  }
}
