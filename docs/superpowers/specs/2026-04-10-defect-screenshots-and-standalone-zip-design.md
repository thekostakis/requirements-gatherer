# Defect Screenshots in Tickets + Standalone Zip Package

_Date: 2026-04-10_
_Scope: defect-gatherer plugin (defect-reporter + defect-organizer skills) and a new repo-root packaging script_

## Context and Goals

Three related changes to `functional-design-tools`:

1. **Confirm screenshot capture is already in place.** The defect-reporter's visual path already captures PNGs via the headless Playwright bridge (`node "$BRIDGE" screenshot ...` at `plugins/defect-gatherer/skills/defect-reporter/phases/investigation.md` §Visual step 2). No changes needed on the capture side.
2. **Embed captured screenshots in the created tickets.** Today the defect-organizer stringifies the free-text `## Evidence` section into the issue body, so screenshot paths appear as literal text and do not render. We want real attachments rendered inline in GitHub and Jira issues.
3. **Ship a standalone offline zip.** Package `defect-gatherer` + `requirements-gatherer` as a single zip with install and usage docs so the plugins can be handed to someone and installed into Claude Code locally without a marketplace.

**In scope:** GitHub and Jira attachment upload. A new `## Attachments` block in the defect report format. A new STOP gate in the organizer for upload-tool availability. A repo-root `scripts/package-standalone.sh` and `dist/` output directory.

**Out of scope:** Linear and GitLab attachment upload (they keep today's text-path behavior with a note). Auto-upload / CI integration for the zip. Cross-platform installers. Any changes to `visual-design` or `functional-tester`. Any changes to the defect-reporter's screenshot capture code.

## Design

### 1. Defect Report Format Change

Add a new machine-readable block to the defect report template, appended to the `§OutputFormat` section of `plugins/defect-gatherer/skills/defect-reporter/phases/investigation.md`. The block sits after the existing `## Evidence` section and before `## Requirement Reference`:

~~~markdown
## Attachments
<!-- Machine-readable list for defect-organizer. One path per line, relative to repo root. Paths may point to any file type; images render inline in tickets, other files are linked. -->
- defects/evidence/visual-login-button-2026-04-10.png
- defects/evidence/console-capture.json
~~~

**Reporter behavior:** The visual-path steps in §Visual that currently capture screenshots, snapshots, computed styles, and console captures must each append the produced file's path to the `## Attachments` list when the reporter writes the file in Step 11. If no captures were produced (API path, or visual path with Playwright unavailable), the `## Attachments` section is written as an empty list:

~~~markdown
## Attachments
<!-- Machine-readable list for defect-organizer. One path per line, relative to repo root. -->
~~~

**Organizer contract:**
- Read each defect's `## Attachments` block. Lines beginning with `- ` are paths.
- Paths are resolved relative to the current working directory (repo root).
- Images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`) are embedded inline in the issue body using `![alt](url)`.
- Non-image files are uploaded and linked using `[filename](url)`.
- If a listed path does not exist on disk, warn and skip that one entry. Do not fail the submission.
- If `## Attachments` is missing or empty, the defect proceeds normally with no attachment handling.

The existing human-readable `## Evidence` section stays untouched.

### 2. Organizer: GitHub Attachment Flow

Applies when the detected platform is GitHub. Adds behavior to `plugins/defect-gatherer/skills/defect-organizer/SKILL.md` Step 5a.

**Shared release setup (once per session, before any issue creation).** The organizer ensures a single published release named `defect-evidence` exists in the target repo and uses it as the asset store for all defects in this session:

~~~bash
gh release view defect-evidence --repo OWNER/REPO >/dev/null 2>&1 || \
  gh release create defect-evidence \
    --repo OWNER/REPO \
    --title "Defect evidence" \
    --notes "Screenshots and capture artifacts from the defect-gatherer plugin. Not a product release." \
    --target "$(gh api repos/OWNER/REPO --jq .default_branch)"
~~~

The release is **published**, not a draft, so assets render for anyone who can read the repo (unauthenticated for public repos, authenticated for private). A single shared release keeps the releases list uncluttered regardless of how many defects are filed over time.

**Per-defect upload (before issue creation for that defect).** For each path in the defect's `## Attachments` list:

~~~bash
gh release upload defect-evidence \
  --repo OWNER/REPO \
  --clobber \
  "<path>#<defect-id>--<basename>"
~~~

- `--clobber` replaces an existing asset with the same name, so re-running the organizer after a correction is safe.
- The `#<rename>` syntax namespaces the uploaded asset by defect ID to prevent collisions across defects. Example uploaded name: `defect-2026-04-10-001--visual-login-button-2026-04-10.png`.
- If the local file is missing, the organizer prints a warning with the defect ID and the missing path, skips that one entry, and continues with the next attachment.
- Upload errors (network, permissions, rate-limit) are retried once. If the retry fails, the attachment is recorded in the session's upload-failures list and the issue is still created without that attachment.

**Issue body rewriting.** Before calling `gh issue create`, the organizer replaces the free-text `## Evidence` block in the issue body template with a new `## Attachments` block built from the successfully uploaded assets:

~~~markdown
## Attachments
![visual-login-button-2026-04-10.png](https://github.com/OWNER/REPO/releases/download/defect-evidence/defect-2026-04-10-001--visual-login-button-2026-04-10.png)
[console-capture.json](https://github.com/OWNER/REPO/releases/download/defect-evidence/defect-2026-04-10-001--console-capture.json)
~~~

Rules for body rewriting:
- Images use `![basename](url)` and render inline.
- Non-images use `[basename](url)` as a clickable link.
- If no attachments were uploaded (either the list was empty or all uploads failed), the section is omitted entirely and the original text-only Evidence section from the defect file is included instead as a fallback.
- The three issue body templates (defect, story-update, feature) in `SKILL.md` §5a.3 all get the same replacement.

**Verification.** After all issues for the session are created, the organizer runs one call:

~~~bash
gh release view defect-evidence --repo OWNER/REPO --json assets
~~~

It diffs the expected uploaded asset names against the returned list. Any missing ones are recorded under "Upload failures" in the Step 7 summary.

### 3. Organizer: Jira Attachment Flow

Applies when the detected platform is Jira. Adds behavior to the Jira section of `plugins/defect-gatherer/skills/defect-organizer/phases/platform-submission.md`.

Jira's attachment model requires the issue to exist before attachments can be uploaded, which inverts the GitHub order.

**Phase A — Create the issue with placeholder Attachments block.** When assembling the Jira issue body, the organizer writes the `## Attachments` section with one placeholder line per attachment:

~~~markdown
## Attachments
_Uploading: visual-login-button-2026-04-10.png_
_Uploading: console-capture.json_
~~~

The placeholders make the section visible in the issue's initial revision. If uploads succeed the section is rewritten in Phase C; if they fail the placeholders stay and an error note is added.

**Phase B — Upload attachments.** After the issue is created and its key is returned, the organizer calls the Jira attachment endpoint for each path in the defect's `## Attachments` list. The exact Atlassian MCP tool name is discovered at runtime following the same pattern as the existing Step 2 platform detection — typical names are `addAttachmentToIssue` or `createAttachment`. The underlying REST call is:

~~~
POST /rest/api/3/issue/{issueKey}/attachments
Headers: X-Atlassian-Token: no-check
Body: multipart/form-data file=@<path>
~~~

- Missing local files are warned-and-skipped (same as GitHub).
- Upload errors are retried once, then recorded under the session's upload-failures list.
- No filename namespacing — Jira attachments are scoped to one issue, so cross-defect collisions cannot happen.

**Phase C — Update the issue description with inline references.** After uploads complete, the organizer updates the issue description to replace the placeholder `## Attachments` section with the final block:

~~~markdown
## Attachments
![visual-login-button-2026-04-10.png](attachment://visual-login-button-2026-04-10.png)
[console-capture.json](attachment://console-capture.json)
~~~

Jira's ADF renderer resolves `attachment://<filename>` to the previously uploaded attachment with matching filename. Images render inline; other files are linked.

**Fallback when description update is unavailable.** If the Atlassian MCP in use does not expose a description-update tool, the organizer instead posts a single comment on the issue containing the final `## Attachments` block. Jira renders attachment references inside comments identically. The placeholder text remains in the description in this case.

**Verification.** After all uploads for the session are complete, for each created issue the organizer calls the Jira get-issue MCP tool and confirms the attachment count matches the expected count. Mismatches are recorded under "Upload failures" in the Step 7 summary.

### 4. Organizer: New Tool-Availability STOP Gate

A new STOP gate is inserted into `SKILL.md` as **Step 4.5**, between the existing Step 4 submission-plan approval and Step 5 issue creation.

**Trigger condition:** At least one defect in the session has a non-empty `## Attachments` list.

**Gate logic:**
1. For the selected platform, check that the attachment upload tool is actually available:
   - **GitHub:** `gh release --help` succeeds. (The existing Step 2 platform detection already confirmed `gh` is installed; this additionally confirms the `release` subcommand is present.)
   - **Jira:** An Atlassian MCP tool matching the addAttachment / createAttachment pattern is exposed in the current session.
   - **Linear / GitLab:** No attachment upload path exists in this version. Skip the gate and proceed to Step 5, but add a one-line note to the issue body template: "Attachment upload is supported on GitHub and Jira in this plugin version; paths are listed below for manual attachment."
2. If the upload tool is missing for GitHub or Jira, prompt the user:

   > "Attachment upload is unavailable on this platform: [specific reason]. Options: (1) proceed with text-only issues, (2) abort and fix the tooling."

3. Wait for explicit user choice. "proceed" / "text only" / "skip attachments" → continue to Step 5 with attachments disabled for this session. "abort" / "cancel" → stop without creating any issues.

**Hard rule addition to the end of SKILL.md:**

> 10. **NEVER silently skip attachment upload.** If the upload path is unavailable on the selected platform, the user must be told explicitly and must choose whether to proceed with text-only issues or abort.

### 5. Unified Issue-Body Templates

The three GitHub issue body templates in `SKILL.md` §5a.3 (defect, story-update, feature) each currently have a free-text `## Evidence` section. Replace it in all three with the following block, which the organizer populates at submission time:

~~~markdown
## Attachments
<!-- Rendered by defect-organizer from the defect file's Attachments list. -->
[ATTACHMENTS_BLOCK]
~~~

`[ATTACHMENTS_BLOCK]` is substituted with the inline-image / linked-file markdown built in Section 2 (GitHub) or Section 3 (Jira). When the defect has zero attachments, the substitution is the original text-only Evidence content from the defect file, unchanged.

### 6. Standalone Zip Package

A new packaging script at `scripts/package-standalone.sh` (repo root) produces a single offline-install zip containing the two selected plugins plus install and usage docs.

**Zip layout:**

~~~
defect-and-requirements-tools-vYYYY-MM-DD.zip
├── INSTALL.md
├── USAGE.md
├── defect-gatherer/
│   ├── .claude-plugin/plugin.json
│   ├── skills/
│   │   ├── defect-reporter/
│   │   └── defect-organizer/
│   └── scripts/
└── requirements-gatherer/
    ├── .claude-plugin/plugin.json
    └── skills/
        ├── requirements-gatherer/
        └── requirements-organizer/
~~~

Not included: `visual-design/`, `functional-tester/`, `.claude-plugin/marketplace.json`, `.agent-progress/`, `node_modules/`, `.DS_Store`, `*.log`.

**INSTALL.md contents:**
- One-paragraph description of what the two plugins do and the four skills they expose: `defect-reporter`, `defect-organizer`, `requirements-gatherer`, `requirements-organizer`.
- Prerequisites: Claude Code installed. Node.js for the headless Playwright bridge used by defect-reporter's visual path. `gh` CLI (for GitHub) or an Atlassian MCP (for Jira) for defect-organizer attachment upload.
- Offline install steps: unzip to a scratch location, copy each plugin directory into the Claude Code local plugins directory (`~/.claude/plugins/` on Unix / `%USERPROFILE%\.claude\plugins\` on Windows), then run `/reload-plugins` in Claude Code. Path placeholders to be confirmed against current Claude Code docs at script-authoring time.
- Verification: trigger phrases for each skill that should cause activation.
- Uninstall: delete the two plugin directories from the local plugins directory and reload.
- One-line note: screenshot upload to tickets is supported on GitHub and Jira in this version; Linear and GitLab fall back to text paths.

**USAGE.md contents:** Task-oriented walkthroughs, four sections:
1. _"I want to define what to build before writing code."_ — `requirements-gatherer` trigger, interview flow, `requirements.md` as output, how to add to it later, brief mention of source-sync mode.
2. _"I want to turn my requirements into issues in GitHub or Jira."_ — `requirements-organizer` trigger, prerequisite of an existing `requirements.md`, confirmation gate, output location.
3. _"I found a bug and want to file it."_ — `defect-reporter` trigger, what to tell it (URL, observed, expected), note that screenshots are captured automatically on the visual path when Playwright is available, `defects/` directory contents.
4. _"I want to push my defect files into tickets."_ — `defect-organizer` trigger, the two supported attachment platforms and how screenshots land in each, one-line note about Linear/GitLab text fallback.
Plus a short "What these skills will and won't do" section mirroring the Hard Rules in plain language.

**Packaging script (`scripts/package-standalone.sh`) behavior:**
1. Read plugin versions from `plugins/defect-gatherer/.claude-plugin/plugin.json` and `plugins/requirements-gatherer/.claude-plugin/plugin.json`.
2. Create a temp staging directory under `dist/.staging/`.
3. `cp -R` each plugin directory into staging, excluding `.agent-progress/`, `node_modules/`, `.DS_Store`, `*.log`.
4. Write `INSTALL.md` and `USAGE.md` from templates (kept alongside the script), substituting plugin version strings.
5. `zip -r dist/defect-and-requirements-tools-$(date +%Y-%m-%d).zip` against the staging directory.
6. Clean up the staging directory.
7. Print the output path and size.

Idempotent: re-running overwrites the same-date zip without touching `plugins/`. `dist/` is added to `.gitignore`.

## Components and Boundaries

| Unit | Purpose | Interface | Dependencies |
|------|---------|-----------|--------------|
| Reporter `## Attachments` block | Machine-readable list of capture artifacts per defect | Written as part of the defect file during Step 11 | None beyond existing capture steps |
| Organizer attachment reader | Parses `## Attachments` from each defect file | Returns list of `(defect_id, path)` tuples | Filesystem read only |
| GitHub shared-release uploader | Ensures `defect-evidence` release exists and uploads assets | Input: list of `(defect_id, path)`. Output: list of `(defect_id, filename, url)` | `gh` CLI |
| Jira attachment uploader | Uploads files to an already-created issue | Input: `(issue_key, path[])`. Output: list of `(filename, attachment_id)` | Atlassian MCP attachment tool |
| Issue-body attachments renderer | Builds markdown block from uploaded assets | Input: list of `(filename, url_or_ref)`. Output: markdown string | None |
| Step 4.5 tool-availability gate | Blocks Step 5 if upload tool missing | Input: selected platform + whether any defect has attachments. Output: proceed / abort | Runtime tool introspection |
| `scripts/package-standalone.sh` | Produces offline install zip | Input: repo state. Output: `dist/*.zip` | `zip`, `bash`, Node (for reading JSON via `jq` or a short node script) |
| `INSTALL.md` / `USAGE.md` templates | Recipient-facing docs shipped in the zip | Substituted with plugin version strings at package time | None |

## Data Flow

**Reporter writes a defect (visual path, headless bridge available):**
1. User reports a visual bug.
2. Reporter runs the existing §Visual investigation steps, producing PNGs and JSON files under `defects/evidence/`.
3. Reporter writes `defects/defect-YYYY-MM-DD-NNN.md` including the new `## Attachments` block listing every file produced in step 2.

**Organizer submits to GitHub:**
1. Scan `defects/` for pending files, parse each file's `## Attachments` block.
2. Step 4 plan confirmation.
3. Step 4.5 tool-availability gate (new). Verify `gh release` works.
4. Once per session: ensure `defect-evidence` release exists.
5. Per defect:
   a. Upload each listed file to the shared release with a namespaced asset name.
   b. Build the `## Attachments` markdown block from successful uploads.
   c. Substitute the block into the issue body template.
   d. Call `gh issue create`.
6. Step 6 archive, Step 7 summary (new "Upload failures" section if applicable).

**Organizer submits to Jira:**
1. Steps 1-4.5 same as GitHub, checking the Jira attachment MCP tool instead.
2. Per defect:
   a. Create the issue with a placeholder `## Attachments` block.
   b. Upload each listed file via the Jira attachment MCP.
   c. Update the issue description (or post a comment, if description update is unavailable) with the final `## Attachments` block using `attachment://<filename>` references.
3. Verification call per issue, then archive and summary.

**Packaging:**
1. User runs `bash scripts/package-standalone.sh` at the repo root.
2. Script reads the two plugin versions, stages into `dist/.staging/`, writes docs, zips, cleans up.
3. User sends the resulting `dist/defect-and-requirements-tools-vYYYY-MM-DD.zip` to the recipient.

## Error Handling

**Missing local attachment file.** Warn with defect ID and path, skip that entry, continue. Not a failure.

**Upload network error.** One retry. On second failure, record under session upload-failures, create the issue without that attachment, surface in Step 7 summary.

**Upload tool completely unavailable on selected platform.** Step 4.5 gate prompts the user to proceed text-only or abort. Never silently skip.

**Shared GitHub release creation fails.** Report the error, ask the user to proceed with text-only issues or abort. The gate logic treats this the same as "upload tool unavailable."

**Jira description update fails.** Fall back to posting a comment with the `## Attachments` block. This is a normal path, not an error.

**Reporter's visual capture unavailable.** Existing §Visual fallback path applies unchanged: reporter proceeds with a user-described evidence path, and writes an empty `## Attachments` section. The organizer then has nothing to upload and proceeds text-only — no gate prompt because no attachments were expected.

**Packaging script cannot find `zip` or `jq`.** Script exits with a clear "please install X" message. No partial output.

## Testing

**Reporter format change.**
- Unit: given a defect file with a populated `## Attachments` block, the parser returns the expected list of paths.
- Unit: given a defect file with an empty `## Attachments` block, the parser returns an empty list.
- Unit: given a defect file with no `## Attachments` section at all, the parser returns an empty list (backward compatible with existing defects/archived files).
- Manual: run defect-reporter end-to-end on a real page, confirm the produced defect file contains the block with the captured PNG path.

**GitHub upload flow.**
- Integration against a throwaway test repo: create a defect with a real PNG, run the organizer, confirm the `defect-evidence` release is created, the asset is uploaded with the namespaced name, and the issue body contains the expected inline image markdown that renders in the GitHub UI.
- Error case: point at a path that doesn't exist on disk. Confirm warn-and-skip behavior and that the issue is still created.
- Error case: revoke the `gh` token mid-session. Confirm retry-then-record behavior.
- Re-run case: run the organizer twice on the same defect. Confirm `--clobber` replaces the asset cleanly.

**Jira upload flow.**
- Integration against a sandbox Jira project: same shape as GitHub — confirm issue creation, attachment upload, description rewrite, and inline rendering.
- Error case: MCP exposes no attachment tool. Confirm Step 4.5 gate fires and the user can proceed text-only.
- Error case: description update unavailable. Confirm comment fallback.

**Step 4.5 gate.**
- Unit: session with zero attachments on any defect → gate skipped, no prompt.
- Unit: session with attachments + unavailable upload tool → prompt shown.
- Unit: user chooses "proceed text-only" → issues created without attachments.
- Unit: user chooses "abort" → no issues created, files remain in `defects/`.

**Packaging script.**
- Run the script on a clean checkout. Confirm the output zip exists, has the expected top-level entries, and INSTALL.md and USAGE.md contain the current plugin version strings.
- Extract into a scratch location and verify `plugin.json` files are valid JSON and match the repo copies byte-for-byte (modulo excluded directories).
- Manual: install the zip contents into a fresh Claude Code local plugins directory and confirm all four skills activate on their trigger phrases.

## Versioning

Per repo convention (CLAUDE.md), bump version in both places:
- `plugins/defect-gatherer/.claude-plugin/plugin.json`: `1.2.3` → `1.3.0` (new organizer feature, backward-compatible reporter format addition).
- `.claude-plugin/marketplace.json`: matching bump.
- `plugins/requirements-gatherer/`: no version bump required — it is only repackaged, not modified.

## What's Explicitly Not in Scope

- Linear and GitLab attachment upload. They fall through to text paths in this version with a clear note.
- Automatic asset cleanup when issues are closed. The `defect-evidence` release grows over time; manual cleanup is fine.
- Signing, checksums, or any provenance on the zip.
- CI integration for the packaging script.
- Any changes to `visual-design` or `functional-tester`.
- Changes to the defect-reporter's existing screenshot capture (the capture path is confirmed working and untouched).

## Hard Rules Added

1. Reporter: every captured artifact on the visual path must be appended to `## Attachments`. No silent drops.
2. Organizer: never silently skip attachment upload. Step 4.5 gate is mandatory when any defect has a non-empty `## Attachments` list.
3. Organizer: never upload files outside the `defects/evidence/` subtree. Listed paths are validated to start with `defects/` before upload; paths that escape (absolute, `..`) are warn-skipped.
4. Packaging: the zip must never include `marketplace.json`, `.agent-progress/`, or any other repo-internal artifacts. The exclusion list is enforced by the script, not documented-only.
