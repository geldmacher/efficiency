# Install and update Efficiency

[Back to Efficiency](../README.md) · [Usage and examples](usage.md)

Install and update Efficiency from the latest stable [GitHub Release](https://github.com/geldmacher/efficiency/releases/latest). Choose the manual steps or copy a prompt for your agent. Both paths use the released package for Cursor or Codex; no repository checkout or build is needed.

- Install for the first time: [manually](#manual-installation) or [with your agent](#installation-prompt)
- Update Efficiency: [manually](#manual-update) or [with the update skill](#update-with-your-agent)
- [Finish installation or find a missing skill](#finish-installation)
- [Set up optional Codex response guidance](#optional-codex-response-guidance)
- [Resolve a conflict or roll back](#conflicts-backups-and-recovery)
- Reference: [download verification](#manual-verified-download), [agent bootstrap procedure](#first-installation-without-the-skill), and [direct helper usage](#installed-skill-and-direct-helper-usage)

## Before you start

You need **Cursor or Codex with plugin support**, **Node.js 22 or newer**, and GitHub HTTPS access. Git, npm packages, RTK, and the GitHub CLI are not required for release installation.

The installer has packages for Cursor and Codex and defaults to the app in which you make the request. The same helper supports macOS, Linux, and Windows; this does not mean every app and OS combination has been tested. Other Agent Plugins clients have no supported release archive.

## Install for the first time

### Manual installation

1. Open the [latest stable GitHub Release](https://github.com/geldmacher/efficiency/releases/latest) and note its version.
2. Download the package for your app: `geldmacher-efficiency-cursor-v<version>.zip` or `geldmacher-efficiency-codex-v<version>.zip`. Download `SHA256SUMS` and `provenance.json` from that same release into the same new directory. GitHub's **Source code** archives are development sources, not installable plugin packages.
3. [Verify the download](#manual-verified-download) before extracting it into a temporary directory.
4. Follow the [Cursor](#cursor) or [Codex](#codex) procedure to place the complete package at its installation path and finish the app's installation steps.
5. [Confirm activation](#finish-installation) in the reloaded app or a new task. Keep the downloaded release files with the version so they are available for later recovery.

### Installation prompt

Paste this request into Cursor or Codex:

```text
Install the latest stable Efficiency release from
https://github.com/geldmacher/efficiency for my current app.
Follow https://github.com/geldmacher/efficiency/blob/main/docs/installation.md,
section "First installation without the skill".
Verify the release before installing and tell me whether a reload or new task is needed.
```

Your agent identifies the app, downloads and verifies one release, previews the installation, and applies it under your request. It reports the installed version, any backup, and the next activation step. If the existing installation contains local changes or a newer version, it asks before replacing that specific installation.

You do not need to run the technical steps later in this guide yourself when the agent completes them for you. Continue with [Finish installation](#finish-installation).

## Update Efficiency

### Manual update

1. Download the latest stable package for your app, `SHA256SUMS`, and `provenance.json` together, then [verify the download](#manual-verified-download).
2. Keep the current complete plugin directory and its matching release files as a backup before replacing it. Preserve any local changes you want to keep separately.
3. Extract the new archive into a temporary directory. Replace the installed source with its complete `geldmacher-efficiency` directory at the same path; do not merge files from different versions.
4. Finish the update for your app: [reload Cursor](#cursor), or [refresh/reinstall Efficiency in Codex](#codex) and verify the refreshed cache version before starting a new task. For Codex, preserve the existing Marketplace entry and its source path.

If an update fails, follow [recovery and rollback](#conflicts-backups-and-recovery). To have download checks, backups, and installation handled for you, use the update skill below.

### Update with your agent

If you already have Efficiency 3.3.0 or newer, use its installed update skill.

**Cursor:**

```text
/install-new-release-from-repo Update Efficiency to the latest stable GitHub Release for Cursor.
```

**Codex:**

```text
$geldmacher-efficiency:install-new-release-from-repo Update Efficiency to the latest stable GitHub Release for Codex.
```

The skill downloads and verifies the selected release, previews the update, applies it under your request, and retains a backup when replacing an installation. It reports any remaining activation step.

For an older installation or a missing update skill, use the [installation prompt](#installation-prompt) instead.

To inspect an update without installing it, replace the request with “Preview the latest stable Efficiency update for this app. Preview only.” The preview may download temporary files, but it does not change your plugin, marketplace, cache, or retained backup. A normal update request authorizes the ordinary installation after preview; app permission prompts still apply.

## Finish installation

Follow the installer's reported next step:

| Result | What it means | What to do |
| --- | --- | --- |
| Cursor: `installed` | The verified plugin files are in place. | Reload Cursor, confirm the skill in Customize, then try `/efficiency`. |
| Codex: `installed` | The source and the app's installed cache copy were checked. | Restart the app if needed, confirm the plugin is enabled, review any trust request, and start a new task. Then try `$geldmacher-efficiency:efficiency`. |
| Codex: `prepared` | Files are ready, but installation through Codex is still pending. | Follow the reported desktop steps in [Codex](#codex), then start a new task. |
| `no_op: true` | This run changed no installation files. | No extra reload is needed solely for this run. Any previously unfinished activation step still applies. |

**Try it:** ask the skill to review current changes in a project. Seeing it available in the new or reloaded session checks discovery; the installer's file checks alone cannot show that a running task loaded it.

If the skill is missing, check the [installed layout](#verify-the-installed-layout), then follow the [Cursor](#cursor) or [Codex](#codex) activation steps. Cursor must allow local imports; a marketplace installation with the same name must not take precedence. For Codex, use the app's refresh or reinstall action if needed; do not delete its cache manually.

## Optional Codex response guidance

This adds Efficiency's concise-response guidance to your global Codex instructions, so it can apply across projects. Plugin installation leaves those global instructions unchanged. Cursor already includes the equivalent always-applied rule.

### Preview and configure

After installing the plugin, ask:

```text
$geldmacher-efficiency:response-simplicity-setup Check the current status and preview setup of persistent response guidance.
```

The skill reads the active global `AGENTS.override.md` or `AGENTS.md`, verifies the stable plugin source reported by `codex plugin list --json`, and shows the exact proposed patch. To apply it, approve that patch and request configuration. Then start a new task.

### How the reference works

The managed block tells Codex to read an absolute Markdown link to the installed package's `AGENTS.md` before the first response in each task. It uses an explicit read instruction; it does not rely on `@path` expansion. The package's `AGENTS.md` alone is not automatically global.

An update at the same stable installation path replaces the guidance without changing the global reference. Start a new task to use the updated text. Cache paths, `.build` output, temporary directories, and development checkouts are not supported reference targets.

A missing global file is valid for first setup. An unchanged legacy inline block can be migrated to the reference during an approved update. An intact reference needs no change. Modified blocks, duplicate or unpaired markers, equivalent unmarked rules, missing plugin files, and conflicting sources are reported without overwriting them. A configured reference is not proof that a fresh task has loaded it or followed it.

### Remove the guidance

```text
$geldmacher-efficiency:response-simplicity-setup Preview removal of the persistent response guidance.
```

After approval, the skill removes only its recognized managed block and preserves other instructions, including RTK imports. It can remove a broken reference even if the plugin source has disappeared.

Disabling the plugin does not remove this global block. If you no longer want the guidance, remove it separately; deleting the plugin first can leave a broken link.

## Conflicts, backups, and recovery

### When replacement needs a decision

The preview reports `previous_version`, the selected version, and `replacement_requires_approval` when the existing installation is newer, locally modified, or cannot be matched to retained release evidence.

**Example:** Your installed copy has edits that are not in the selected release. The agent must identify that copy and explain that replacement would remove those edits from the active installation. Only your explicit decision to replace it permits `--replace-existing`.

That flag retains the previous directory. It cannot bypass a wrong plugin identity, unsafe paths, a conflicting marketplace source, or failed release checks.

### Keep the backup and release evidence

A successful update retains the previous complete plugin in the reported backup directory, along with its release files when available, `marketplace.before.json` when applicable, and `recovery.json`.

The adjacent `.geldmacher-efficiency.release` directory holds evidence for the current installation. Keep it so future updates can recognize local modifications.

### Recover after a failed install

The helper attempts to restore its previous source and marketplace changes after an ordinary failure. Read its error report before retrying.

If a native Codex operation failed, the report may say `native_installation: unverified_after_failure`. The cache may differ even if source restoration succeeded. Inspect the retained evidence, reinstall the restored source through Codex, and verify its installed cache. For a failed first installation, inspect and, if necessary, remove only this plugin through the app. Never clear the cache directory manually.

An interrupted process may leave an `.install-lock` directory. Inspect its owner and recorded paths; remove only an abandoned lock after confirming that no installation is running.

### Roll back to a previous version

With retained release files, use the prior release directory with `--release-dir`, preview the downgrade, approve replacement of the identified installation, and apply with `--replace-existing`. See [direct helper usage](#installed-skill-and-direct-helper-usage).

For a backup made before the installer was used, restore the complete saved source using the manual [Cursor](#cursor) or [Codex](#codex) procedure. Never merge files from different versions. In Codex, also refresh the native installation and verify the cache before treating rollback as complete.

## First installation without the skill

This section is the procedure for the agent receiving the first-install request above. It verifies the downloaded package before running its installer.

The command is included from release 3.3.0 onward, with `skills/install-new-release-from-repo/SKILL.md`. For older releases, use the manual installation sections below and report that the command is not part of the selected release.

The receiving agent performs these steps without requiring a development checkout:

1. Identify Cursor or Codex from the session, or ask the user if uncertain. Check Node.js 22 or newer. Resolve `https://api.github.com/repos/geldmacher/efficiency/releases/latest` once; require a published, non-prerelease `vMAJOR.MINOR.PATCH` tag. Keep that exact version for all following downloads.
2. Download the matching `geldmacher-efficiency-<host>-v<version>.zip`, `SHA256SUMS`, and `provenance.json` from that release into a new temporary directory. The archive URL must be under `https://github.com/geldmacher/efficiency/releases/download/<tag>/`. Do not run downloaded code yet.
3. Verify exactly the selected ZIP and `provenance.json` using the checksum recipes below. Confirm provenance identifies `geldmacher-efficiency`, `geldmacher/efficiency`, the selected version/tag, and that selected archive. These checks establish consistency with assets obtained from the expected GitHub repository; they are not independent release signatures.
4. Inspect the ZIP with the agent's available archive inspection tools before extraction. Require one `geldmacher-efficiency/` root, regular files/directories only, and reject links, absolute paths, `..`, duplicate paths, backslashes, Windows drive/device paths, and double nesting. Extract only into another newly created temporary directory, never directly into an installed plugin. If safe archive inspection is unavailable, stop with that prerequisite rather than executing an unchecked installer.
5. Locate `geldmacher-efficiency/skills/install-new-release-from-repo/scripts/install-release.mjs` inside the verified extracted package. Invoke it with the selected host and `--release-dir` pointing at the downloaded ZIP/checksum/provenance directory, first with `--dry-run`. It revalidates the archive structure, receipt, manifest, file count and content hash before any installation. If the selected release predates the helper, follow the manual host procedure below instead.
6. Apply with the same helper, host and `--release-dir`, omitting `--dry-run`, under the user's installation request. Follow the helper's conflict and native permission messages. Retain reported backups and recovery evidence, then clean up only the temporary download/extraction directories from this invocation. Finish with the reported host activation step.

## Installed skill and direct helper usage

The skill resolves its helper relative to its own location, so it also works from a Codex cache and when the current working directory is another project. Paths containing spaces must be passed as quoted arguments.

```sh
node "/absolute/path/to/skill/scripts/install-release.mjs" --host cursor --download-dir "/new/temporary/release-directory"
node "/absolute/path/to/skill/scripts/install-release.mjs" --host cursor --release-dir "/new/temporary/release-directory" --dry-run
node "/absolute/path/to/skill/scripts/install-release.mjs" --host cursor --release-dir "/new/temporary/release-directory"
```

Substitute `codex` for Codex. These commands also work in PowerShell with actual absolute paths. `--download-dir` creates a new directory and performs only download/verification. `--release-dir` pins already downloaded assets and requires no network. A direct invocation without either option resolves and installs latest in one run. A dry run may download temporary files and inspect the native CLI, but changes no plugin, marketplace, cache, or retained backup.

For Codex, the helper preserves the personal marketplace's existing name, interface and unrelated entries; an existing Efficiency entry must already point at the documented local source. It checks `codex plugin marketplace list --json` resolves the name to the intended personal root before calling `codex plugin add <plugin>@<actual-marketplace-name> --json`, then verifies `codex plugin list --json` plus the selected cache bytes. It respects the current `CODEX_HOME` for cache inspection. It does not manually create or delete cache copies. If the CLI is missing, `status: prepared` reports the exact desktop installation steps still needed. Other CLI errors stop the run.

## Manual verified download

Each Efficiency GitHub Release contains separate packages for Cursor and Codex. Download only the archive for the intended host plus `SHA256SUMS` and `provenance.json` from the [latest GitHub Release](https://github.com/geldmacher/efficiency/releases/latest). You do not need the other host archive or `RELEASE_NOTES.md` to verify this selected download. Do not install an archive until both the selected archive and `provenance.json` match their entries in `SHA256SUMS`.

### Verify the download

On macOS or Linux, replace the example version and host when necessary, then verify exactly the two downloaded files that are covered by `SHA256SUMS`:

```sh
archive="geldmacher-efficiency-cursor-v3.4.2.zip"

verify_release_file() {
  file="$1"
  checksum_line="$(awk -v file="$file" '$2 == file { print; count++ } END { exit count == 1 ? 0 : 1 }' SHA256SUMS)" || {
    echo "SHA256SUMS must contain exactly one entry for $file" >&2
    exit 1
  }
  if command -v sha256sum >/dev/null 2>&1; then
    printf '%s\n' "$checksum_line" | sha256sum -c -
  else
    printf '%s\n' "$checksum_line" | shasum -a 256 -c -
  fi
}

verify_release_file "$archive" || exit 1
verify_release_file "provenance.json" || exit 1
```

On Windows PowerShell, the equivalent check selects the exact two entries before comparing their hashes:

```powershell
$archive = "geldmacher-efficiency-cursor-v3.4.2.zip"
$files = @($archive, "provenance.json")
$checksumLines = Get-Content -LiteralPath .\SHA256SUMS

foreach ($file in $files) {
  $pattern = '^(?<hash>[0-9a-fA-F]{64})\s+\*?' + [regex]::Escape($file) + '$'
  $matches = @($checksumLines | Select-String -Pattern $pattern)
  if ($matches.Count -ne 1) {
    throw "SHA256SUMS must contain exactly one entry for $file"
  }
  $expected = $matches[0].Matches[0].Groups['hash'].Value.ToLowerInvariant()
  $actual = (Get-FileHash -LiteralPath ".\$file" -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    throw "SHA-256 mismatch for $file"
  }
  Write-Host "$($file): OK"
}
```

`provenance.json` additionally identifies the exact version, tag, repository commit, Git tree, target content hashes, archive hashes, file counts, release-gate result, release-notes hash, and receipt. Confirm that its version, tag, repository, and selected archive name describe the intended release. A checksum or identity mismatch is a hard stop.

Every archive must expand to exactly one top-level `geldmacher-efficiency/` directory. Avoid an additional nesting level such as `geldmacher-efficiency/geldmacher-efficiency/`. Before installation, confirm that the host manifest is located at:

- Cursor: `geldmacher-efficiency/.cursor-plugin/plugin.json`
- Codex: `geldmacher-efficiency/.codex-plugin/plugin.json`

## Cursor

Install the contents at the local Cursor plugin path:

- macOS/Linux: `~/.cursor/plugins/local/geldmacher-efficiency`
- Windows: `%USERPROFILE%\.cursor\plugins\local\geldmacher-efficiency`

For a first installation, extract the archive to a temporary directory and move its single `geldmacher-efficiency` directory to that destination. For an update, keep the current directory as a backup, place the new complete directory at the same path, and do not merge old and new files. Then reload Cursor. Installation on disk and live plugin discovery are separate checks.

To roll back, move the current directory aside, restore the previously retained complete directory, and reload Cursor. Keep the matching old archive, `SHA256SUMS`, and `provenance.json` so the restored bytes remain verifiable.

## Codex

Install the contents at the personal Codex plugin path:

- macOS/Linux: `~/.codex/plugins/geldmacher-efficiency`
- Windows: `%USERPROFILE%\.codex\plugins\geldmacher-efficiency`

The personal Marketplace file is:

- macOS/Linux: `~/.agents/plugins/marketplace.json`
- Windows: `%USERPROFILE%\.agents\plugins\marketplace.json`

For a first installation, this is a complete personal Marketplace document. The `source.path` starts with `./` and is relative to the Marketplace root (the user home directory), not to the `.agents/plugins/` directory:

```json
{
  "name": "geldmacher-personal",
  "interface": {
    "displayName": "Geldmacher Plugins"
  },
  "plugins": [
    {
      "name": "geldmacher-efficiency",
      "source": {
        "source": "local",
        "path": "./.codex/plugins/geldmacher-efficiency"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Developer Tools"
    }
  ]
}
```

If `marketplace.json` already exists, preserve its top-level `name`, `interface`, and every unrelated item in `plugins`. Add or replace only the `geldmacher-efficiency` item shown above; do not replace the whole catalog merely to install this plugin.

Source placement is not installation or activation. After creating or changing the Marketplace entry or its source directory:

1. Fully quit and restart the ChatGPT/Codex desktop app; closing only its window is insufficient.
2. Open the **Plugins Directory**, choose **Geldmacher Plugins** (or the preserved display name of your existing personal Marketplace), and install Efficiency. For an update or rollback, use the available refresh or reinstall action there so the host materializes the selected source again.
3. Confirm that the installed copy exists below `~/.codex/plugins/cache/geldmacher-personal/geldmacher-efficiency/local/` on macOS/Linux or `%USERPROFILE%\.codex\plugins\cache\geldmacher-personal\geldmacher-efficiency\local\` on Windows. If an existing Marketplace keeps another top-level `name`, that name replaces `geldmacher-personal` in the cache path. Local Marketplace plugins run from this cache copy, not directly from `~/.codex/plugins/geldmacher-efficiency`.
4. Review any plugin trust request, then start a new Codex task. An already running task does not prove that the refreshed cache copy is active.

These Marketplace, cache, restart, Plugins Directory, and new-task boundaries follow the [official OpenAI plugin documentation](https://developers.openai.com/plugins/build/plugins).

For an update, retain the current source directory and its matching release files as a backup, replace the source with the complete verified directory from the new archive, keep the Marketplace entry pointed at the same path, and repeat all four activation steps above. Verify the manifest version in the refreshed cache copy before starting the new task.

For rollback, restore the retained complete old source directory and its verified release files, keep the Marketplace entry unchanged, and repeat the same restart, Plugins Directory refresh or reinstall, cache-version check, and new-task steps. Do not combine files from different versions and do not treat restored source bytes as proof that the cached installed copy changed.

## Verify the installed layout

After copying, verify that the manifest sits directly below the destination, that its `name` is `geldmacher-efficiency`, and that its `version` matches the selected release. The archive checksum proves downloaded bytes; it does not prove that Cursor reloaded, the Codex Marketplace accepted the entry, or a new Codex task loaded the package. Confirm those host-specific activation steps separately.
