export const releaseInstallerSkill = "install-new-release-from-repo";
export const openCodeReleaseInstallerSkill = "efficiency-install-release";

export const portableSkills = Object.freeze([
  "context-optimization",
  "efficiency",
  releaseInstallerSkill,
  "rtk-filter-design",
  "rtk-setup",
  "rtk-update",
]);
// Cursor and OpenCode 2.1.2 omit these from automatic selection. Codex ignores the
// frontmatter flag, and the Agent Skills spec rejects it, so those bundles strip it.
export const userOnlySkills = Object.freeze([
  releaseInstallerSkill,
  "rtk-update",
]);
export const codexAdapterSkill = "response-simplicity-setup";

export const openCodePortableSkills = Object.freeze(portableSkills.map((name) => (
  name === releaseInstallerSkill ? openCodeReleaseInstallerSkill : name
)));
