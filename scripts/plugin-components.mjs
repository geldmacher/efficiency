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
export const codexAdapterSkill = "response-simplicity-setup";

export const openCodePortableSkills = Object.freeze(portableSkills.map((name) => (
  name === releaseInstallerSkill ? openCodeReleaseInstallerSkill : name
)));
