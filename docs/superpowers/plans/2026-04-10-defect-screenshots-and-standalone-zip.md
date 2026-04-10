# Defect Screenshots + Standalone Zip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed defect-reporter screenshots as real attachments in GitHub and Jira issues, and produce an offline zip of `defect-gatherer` + `requirements-gatherer` with install/usage docs.

**Architecture:** Add a machine-readable `## Attachments` block to the defect report format. In the organizer, parse that block and upload files to a shared `defect-evidence` GitHub release (pre-issue) or to the Jira issue via the attachment API (post-issue), then render inline-image / linked-file markdown in the ticket body. A new Step 4.5 STOP gate enforces upload-tool availability. A repo-root `scripts/package-standalone.sh` stages the two plugins plus `INSTALL.md` / `USAGE.md` into `dist/*.zip`.

**Tech Stack:** Markdown skill files, bash, `gh` CLI, Atlassian MCP tools, `zip`, `jq`.

**Spec:** [docs/superpowers/specs/2026-04-10-defect-screenshots-and-standalone-zip-design.md](../specs/2026-04-10-defect-screenshots-and-standalone-zip-design.md)

---

## File Structure

**Files created:**
- `scripts/package-standalone.sh` — packaging script
- `scripts/standalone-templates/INSTALL.md` — install doc template with `{{VERSION_*}}` placeholders
- `scripts/standalone-templates/USAGE.md` — usage doc template
- `docs/superpowers/plans/2026-04-10-defect-screenshots-and-standalone-zip.md` — this file

**Files modified:**
- `plugins/defect-gatherer/skills/defect-reporter/phases/investigation.md` — visual-path steps append to `## Attachments`; §OutputFormat adds the new block
- `plugins/defect-gatherer/skills/defect-reporter/SKILL.md` — no functional change, Step 11 mentions the new block
- `plugins/defect-gatherer/skills/defect-organizer/SKILL.md` — parser, Step 4.5 gate, GitHub upload flow (§5a), updated body templates, Step 7 summary section, new Hard Rule
- `plugins/defect-gatherer/skills/defect-organizer/phases/platform-submission.md` — Jira upload flow (§5b), Linear/GitLab text-fallback note
- `plugins/defect-gatherer/.claude-plugin/plugin.json` — version bump to 1.3.0
- `.claude-plugin/marketplace.json` — matching version bump
- `.gitignore` — add `dist/`

**Files NOT touched:** anything under `plugins/visual-design/`, `plugins/functional-tester/`, `plugins/requirements-gatherer/` (repackaged only, no code change).

---

## Task 1: Add `## Attachments` block to the defect report template

**Files:**
- Modify: `plugins/defect-gatherer/skills/defect-reporter/phases/investigation.md` (§OutputFormat, around lines 189-194 `## Evidence` section)

- [ ] **Step 1: Read the current §OutputFormat block**

Read lines 154-213 of `plugins/defect-gatherer/skills/defect-reporter/phases/investigation.md` to locate the exact `## Evidence` block.

- [ ] **Step 2: Add the `## Attachments` block after `## Evidence`**

Insert this immediately after the `## Evidence` bullet list and before `## Requirement Reference`:

```markdown
## Attachments
<!-- Machine-readable list for defect-organizer. One path per line, relative to repo root. Paths may point to any file type; images render inline in tickets, other files are linked. -->
- [path relative to repo root, e.g. defects/evidence/visual-login-button-2026-04-10.png]
```

When no captures were produced (API path, or visual with Playwright unavailable) leave the list empty (just the comment line).

- [ ] **Step 3: Verify the template parses as valid markdown**

Visually inspect the full §OutputFormat block. Confirm the new section sits between `## Evidence` and `## Requirement Reference`, and the HTML comment is on its own line.

- [ ] **Step 4: Commit**

```bash
git add plugins/defect-gatherer/skills/defect-reporter/phases/investigation.md
git commit -m "feat(defect-reporter): add machine-readable Attachments block to output template"
```

---

## Task 2: Teach the reporter visual path to append to `## Attachments`

**Files:**
- Modify: `plugins/defect-gatherer/skills/defect-reporter/phases/investigation.md` (§Visual, lines 5-104)

- [ ] **Step 1: Update §Visual step 2 (Screenshot) with append instruction**

After the existing `node "$BRIDGE" screenshot ...` bash block (around line 32), add:

```markdown
After capture, record the PNG path so it can be added to the defect file's `## Attachments`
list in Step 11. Track paths in a running list; do not write them anywhere on disk until
Step 11 assembles the final defect report.
```

- [ ] **Step 2: Update §Visual step 3 (Accessibility snapshot)**

After the `node "$BRIDGE" snapshot ...` usage (around line 34), add:

```markdown
If you save the snapshot output to a file under `defects/evidence/` (e.g. for later review),
record that path for the `## Attachments` list. If you only use the result in-session, do
not add it.
```

- [ ] **Step 3: Update §Visual step 4 (Computed styles) and step 5 (Console capture)**

Each of these steps uses a `defects/evidence/*.mjs` script plus a `node "$BRIDGE" run ...` invocation. After each bash invocation, add:

```markdown
Save any JSON output worth preserving under `defects/evidence/<descriptive-name>.json` and
record the path for the `## Attachments` list.
```

- [ ] **Step 4: Update §Visual "Playwright NOT available" fallback**

In the fallback block (around lines 106-121), add a closing sentence:

```markdown
In this path the `## Attachments` list in the defect report will be empty.
```

- [ ] **Step 5: Update §Visual closing instruction**

Where §Visual currently says "Use findings from these steps to build reproduction steps and evidence. Reference screenshot paths and JSON summaries in the report." (around line 102-103), replace with:

```markdown
Use findings from these steps to build reproduction steps and evidence. Reference screenshot
paths and JSON summaries in the human-readable `## Evidence` section of the report, and add
every produced file path to the machine-readable `## Attachments` list (see §OutputFormat).
```

- [ ] **Step 6: Commit**

```bash
git add plugins/defect-gatherer/skills/defect-reporter/phases/investigation.md
git commit -m "feat(defect-reporter): track visual-path capture paths for Attachments block"
```

---

## Task 3: Update reporter SKILL.md Step 11 to reference the Attachments block

**Files:**
- Modify: `plugins/defect-gatherer/skills/defect-reporter/SKILL.md` (Step 11, lines 362-389)

- [ ] **Step 1: Add a bullet to Step 11 before "Load `phases/investigation.md §OutputFormat`"**

Add before the "Output Format" subheading:

```markdown
### Attachments List

When writing the file, populate the `## Attachments` section with every capture path you
tracked during §Visual investigation. One path per line, relative to the repo root. If
you produced no captures (API path, or visual path with Playwright unavailable), leave the
list empty — the section header and comment must still be present so downstream tooling
sees a well-formed block.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/defect-gatherer/skills/defect-reporter/SKILL.md
git commit -m "docs(defect-reporter): Step 11 references the new Attachments block"
```

---

## Task 4: Update organizer Step 1 scan to parse `## Attachments`

**Files:**
- Modify: `plugins/defect-gatherer/skills/defect-organizer/SKILL.md` (Step 1, lines 30-45)

- [ ] **Step 1: Add parsing instruction to Step 1**

In Step 1, after the existing "Read each file and summarize" bullet, add:

```markdown
5. For each defect file, also parse its `## Attachments` section:
   - Find the section heading `## Attachments`.
   - Collect every line that begins with `- ` (a dash followed by a space) until the next
     `## ` heading or EOF.
   - For each collected line, strip the leading `- ` to get the raw path.
   - Validate each path:
     - Must start with `defects/` (prevents absolute paths and `..` escapes).
     - Must resolve to an existing file (check with `test -f <path>`).
   - If the path is invalid or missing, record a warning with the defect ID and path; do
     NOT add it to the attachment list for that defect.
   - Store the validated list as `attachments[<defect_id>] = [path1, path2, ...]`.
   - If the `## Attachments` section is missing, absent, or contains only the HTML comment,
     `attachments[<defect_id>]` is an empty list. This is not an error.
```

- [ ] **Step 2: Renumber subsequent bullets in Step 1**

The existing bullet currently numbered 5 ("Also check for requirements.md...") becomes 6.

- [ ] **Step 3: Commit**

```bash
git add plugins/defect-gatherer/skills/defect-organizer/SKILL.md
git commit -m "feat(defect-organizer): parse Attachments block from defect files"
```

---

## Task 5: Add organizer Step 4.5 tool-availability STOP gate

**Files:**
- Modify: `plugins/defect-gatherer/skills/defect-organizer/SKILL.md` (insert new step between current Step 4 ending line ~140 and current Step 5 heading line ~144)

- [ ] **Step 1: Insert the new step**

Insert this block between the existing Step 4 closing `STOP` line and the `## Step 5: Create Issues` heading:

~~~markdown
---

## Step 4.5: Attachment Upload Tool Check

**Trigger:** This step runs only if at least one defect in the submission plan has a
non-empty `## Attachments` list. If every defect has zero attachments, skip directly to
Step 5.

**Gate logic by platform:**

### GitHub
Verify the `release` subcommand is available:

~~~bash
gh release --help >/dev/null 2>&1 && echo "AVAILABLE" || echo "MISSING"
~~~

If MISSING, fall through to the "Upload unavailable" prompt below.

### Jira
Check whether any Atlassian MCP tool matching `addAttachment` or `createAttachment` is
exposed in the current session. If no such tool exists, fall through to the "Upload
unavailable" prompt below.

### Linear / GitLab
No attachment upload is implemented in this plugin version. Do NOT prompt. Instead, add
this line verbatim to every issue body for defects with attachments:

~~~
_Note: attachment upload is supported on GitHub and Jira in this plugin version. The
attachment paths below are listed for manual upload._
~~~

Then proceed directly to Step 5.

### Upload unavailable prompt (GitHub / Jira only)

If the gate fails for GitHub or Jira, tell the user exactly:

> "Attachment upload is unavailable on [platform]: [specific reason, e.g. 'gh release
> subcommand not found' or 'no Atlassian MCP attachment tool exposed']. You can either:
> (1) proceed with text-only issues (screenshot paths listed but not uploaded), or
> (2) abort and fix the tooling before re-running.
> Which would you like?"

**STOP. Wait for explicit user choice.**

- "proceed" / "text only" / "skip attachments" / "1" → set session flag
  `attachments_disabled = true`, continue to Step 5.
- "abort" / "cancel" / "2" → stop without creating any issues. All files remain in
  `defects/`.
- Anything else → re-present the prompt.

**This gate is NON-NEGOTIABLE.** Never silently skip attachment upload.

---
~~~

- [ ] **Step 2: Commit**

```bash
git add plugins/defect-gatherer/skills/defect-organizer/SKILL.md
git commit -m "feat(defect-organizer): add Step 4.5 attachment upload tool gate"
```

---

## Task 6: Implement GitHub shared-release upload flow in §5a

**Files:**
- Modify: `plugins/defect-gatherer/skills/defect-organizer/SKILL.md` (§5a, lines ~146-306)

- [ ] **Step 1: Insert "Sub-step 5a.0: Ensure evidence release exists"**

Immediately before the existing `**Sub-step 5a.1: Create labels (if they don't exist)**` line, insert:

~~~markdown
**Sub-step 5a.0: Ensure evidence release exists**

Run this ONCE per session, before any issue creation. Skip entirely if `attachments_disabled`
is true or if every defect has an empty attachment list.

~~~bash
gh release view defect-evidence --repo OWNER/REPO >/dev/null 2>&1 || \
  gh release create defect-evidence \
    --repo OWNER/REPO \
    --title "Defect evidence" \
    --notes "Screenshots and capture artifacts from the defect-gatherer plugin. Not a product release." \
    --target "$(gh api repos/OWNER/REPO --jq .default_branch)"
~~~

The release is published (not a draft) so assets render for anyone who can read the repo.
If this command fails, treat it as "upload tool unavailable" — go back to Step 4.5 and
prompt the user to proceed text-only or abort.
~~~

- [ ] **Step 2: Insert "Sub-step 5a.2b: Upload defect attachments to shared release"**

Between the existing Sub-step 5a.2 (milestones) and Sub-step 5a.3 (create issues), insert:

~~~markdown
**Sub-step 5a.2b: Upload defect attachments to shared release**

For each defect with a non-empty attachments list (and `attachments_disabled` is false),
upload each file to the shared release using the defect ID as a filename prefix:

~~~bash
gh release upload defect-evidence \
  --repo OWNER/REPO \
  --clobber \
  "<local-path>#<defect-id>--<basename>"
~~~

Rules:
- `<defect-id>` is the filename stem of the defect file without the `defect-` prefix and
  `.md` extension — e.g. `defect-2026-04-10-001.md` → `2026-04-10-001`.
- `<basename>` is the basename of the local path.
- Full asset name format: `defect-<defect-id>--<basename>`.
- `--clobber` replaces any existing asset with the same name (safe for re-runs).
- If the local file is missing at upload time (should not happen because Step 1 validated,
  but defensively re-check), warn with defect ID and path, record in session
  `upload_failures` list, skip that one entry, continue.
- On network/permission error, retry once. On second failure, record in session
  `upload_failures`, continue.

For each successful upload, record
`uploaded_assets[<defect_id>].append({filename: "<asset-name>", url: "https://github.com/OWNER/REPO/releases/download/defect-evidence/<asset-name>", basename: "<basename>"})`.
~~~

- [ ] **Step 3: Replace free-text `## Evidence` with `## Attachments` in all three issue body templates**

In §5a.3, three templates have an `## Evidence` block:
- Defect template: `## Evidence\n[Screenshots, console errors, network failures, CSS issues]`
- Story-update template: no `## Evidence` block currently — skip.
- Feature template: no `## Evidence` block currently — skip.

Replace the defect template's `## Evidence` block with:

~~~markdown
## Attachments
[ATTACHMENTS_BLOCK]
~~~

Then add the following paragraph immediately after the three templates, before "Sub-step 5a.4: Verify":

~~~markdown
**Building `[ATTACHMENTS_BLOCK]`:**

For the defect being submitted, look up its entry in `uploaded_assets`. Build the block
as follows:

- If `attachments_disabled` is true OR the entry is empty OR does not exist, substitute
  the original free-text Evidence content from the defect file's human-readable `## Evidence`
  section. This preserves backward compatibility with defects filed before the Attachments
  block existed.
- Otherwise, for each uploaded asset:
  - If the basename ends with `.png`, `.jpg`, `.jpeg`, `.gif`, or `.webp` (case-insensitive),
    emit `![<basename>](<url>)`.
  - Otherwise, emit `[<basename>](<url>)`.
  - One entry per line, separated by blank lines so GitHub renders each inline image
    cleanly.

If any uploads for this defect ended up in `upload_failures`, append a final line to the
block:

~~~
_Upload failures: <count>. See session summary for details._
~~~
~~~

- [ ] **Step 4: Update Sub-step 5a.4 (Verify) to diff uploaded assets**

Append to the existing Sub-step 5a.4:

~~~markdown
Additionally, if any attachments were uploaded in Sub-step 5a.2b, verify them now:

~~~bash
gh release view defect-evidence --repo OWNER/REPO --json assets \
  --jq '.assets[].name' | sort > /tmp/actual-assets.txt
~~~

Diff against the expected asset names collected during upload. Any missing names are
added to session `upload_failures` with reason "not found on release after upload".
~~~

- [ ] **Step 5: Commit**

```bash
git add plugins/defect-gatherer/skills/defect-organizer/SKILL.md
git commit -m "feat(defect-organizer): GitHub shared-release attachment upload flow"
```

---

## Task 7: Implement Jira upload flow in platform-submission.md

**Files:**
- Modify: `plugins/defect-gatherer/skills/defect-organizer/phases/platform-submission.md` (§5b, lines 8-29)

- [ ] **Step 1: Replace existing §5b with expanded flow**

Replace the current §5b content (everything between `## 5b. Jira Issue Creation` and `---` before `## 5c. Linear Issue Creation`) with:

~~~markdown
## 5b. Jira Issue Creation

Use Jira MCP tools. This section runs AFTER Step 4.5 has confirmed an Atlassian
attachment MCP tool is available (or confirmed `attachments_disabled = true`).

### 5b.1 Create issue with placeholder Attachments block

1. **Issue type:**
   - True defects: "Bug"
   - Story updates: "Story" or "Task"
   - Features: "Story"

2. **Priority field:**
   - Defects/story-updates (severity mapping): Critical → Blocker, High → Critical,
     Medium → Major, Low → Minor
   - Features (priority mapping): Must-have → Critical, Should-have → Major,
     Nice-to-have → Minor

3. **Link to parent epic.** Add issue link to the requirement story (if found):
   "is blocked by" or "relates to".

4. **Issue description.** Build the description from the same structure as the GitHub
   templates in SKILL.md §5a.3, with the Attachments section as PLACEHOLDERS:

~~~markdown
## Attachments
_Uploading: <basename-1>_
_Uploading: <basename-2>_
~~~

If `attachments_disabled` is true, omit the placeholders and substitute the original
text-only `## Evidence` content from the defect file instead.

5. **Create the issue** and record the returned `issueKey`.

### 5b.2 Upload attachments

Skip this sub-step entirely if `attachments_disabled` is true or this defect has no
attachments.

For each path in the defect's attachment list:

~~~
POST /rest/api/3/issue/{issueKey}/attachments
Headers: X-Atlassian-Token: no-check
Body: multipart/form-data file=@<path>
~~~

Call the Atlassian MCP attachment tool (discovered in Step 4.5) with the issue key and
file path. On network/permission error, retry once. On second failure, record in session
`upload_failures`, continue.

Record each successful upload as
`uploaded_assets[<defect_id>].append({filename: "<basename>", issue_key: "<key>"})`.

### 5b.3 Update issue description with inline references

Skip if `attachments_disabled` is true or no attachments were uploaded for this defect.

Build the final Attachments block:

- For each uploaded attachment, if the basename ends with `.png`, `.jpg`, `.jpeg`,
  `.gif`, or `.webp` (case-insensitive), emit
  `![<basename>](attachment://<basename>)`.
- Otherwise emit `[<basename>](attachment://<basename>)`.
- One per line, blank line between each.

Call the Jira update-issue MCP tool to replace the placeholder `## Attachments` block in
the description with the final block.

**Fallback when description update is unavailable:** If the MCP in use does not expose a
description-update tool (or the update call fails), instead post a single comment on the
issue whose body is the final `## Attachments` block. Jira renders attachment references
inside comments identically. The placeholder stays in the description in this case — do
not treat that as a failure.

### 5b.4 Verify

For each created issue, call the Jira get-issue MCP tool and confirm the attachment count
equals the expected count for that defect. Mismatches go to session `upload_failures`.
~~~

- [ ] **Step 2: Update Linear (§5c) and GitLab (§5d) sections with a fallback note**

At the end of §5c (Linear), before the `---` separator, append:

~~~markdown

**Attachments:** Attachment upload is not implemented for Linear in this plugin version.
Defect attachment paths from the `## Attachments` block are included in the issue
description as text paths, prefixed by the note added in Step 4.5. Manual upload is
supported via the Linear UI.
~~~

At the end of §5d (GitLab), before EOF, append the same paragraph with "Linear" → "GitLab".

- [ ] **Step 3: Commit**

```bash
git add plugins/defect-gatherer/skills/defect-organizer/phases/platform-submission.md
git commit -m "feat(defect-organizer): Jira attachment upload flow + Linear/GitLab text fallback"
```

---

## Task 8: Add "Upload failures" section to organizer Step 7 summary

**Files:**
- Modify: `plugins/defect-gatherer/skills/defect-organizer/SKILL.md` (Step 7, lines ~334-367)

- [ ] **Step 1: Insert "Upload Failures" subsection into the summary template**

In the existing Step 7 summary markdown template, add this block between the `### Failed
Submissions` table and the `### Files Archived` bullet list:

~~~markdown
### Attachment Upload Failures (if any)
| Defect ID | Attachment | Reason |
|-----------|------------|--------|
| [id] | [basename or path] | [error description] |

(Empty table or "None" if `upload_failures` is empty.)
~~~

- [ ] **Step 2: Commit**

```bash
git add plugins/defect-gatherer/skills/defect-organizer/SKILL.md
git commit -m "feat(defect-organizer): report upload failures in Step 7 summary"
```

---

## Task 9: Add new Hard Rule and restrict attachment paths

**Files:**
- Modify: `plugins/defect-gatherer/skills/defect-organizer/SKILL.md` (Hard Rules, lines ~370-392)

- [ ] **Step 1: Append two Hard Rules**

Add as items 10 and 11 at the end of the Hard Rules list:

~~~markdown
10. **NEVER silently skip attachment upload.** If the upload path is unavailable on the
    selected platform, the Step 4.5 gate must fire and the user must explicitly choose
    to proceed text-only or abort.
11. **NEVER upload files outside `defects/`.** Attachment paths parsed from the
    `## Attachments` block must be validated to start with `defects/` before upload.
    Absolute paths, `..` escapes, and paths outside `defects/` are warn-skipped.
~~~

- [ ] **Step 2: Commit**

```bash
git add plugins/defect-gatherer/skills/defect-organizer/SKILL.md
git commit -m "feat(defect-organizer): add hard rules for attachment upload safety"
```

---

## Task 10: Bump defect-gatherer version to 1.3.0

**Files:**
- Modify: `plugins/defect-gatherer/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Bump plugin.json**

Change `"version": "1.2.3"` → `"version": "1.3.0"` in `plugins/defect-gatherer/.claude-plugin/plugin.json`.

- [ ] **Step 2: Bump the matching marketplace.json entry**

Find the `defect-gatherer` entry in `.claude-plugin/marketplace.json` and change its version field from `1.2.3` to `1.3.0`.

- [ ] **Step 3: Verify both JSON files are valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('plugins/defect-gatherer/.claude-plugin/plugin.json'))"
node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json'))"
```

Expected: no output (silent success).

- [ ] **Step 4: Commit**

```bash
git add plugins/defect-gatherer/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore(defect-gatherer): bump to 1.3.0 for attachment upload feature"
```

---

## Task 11: Add `dist/` to `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Append `dist/`**

Append to `.gitignore`:

```
dist/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore dist/ output directory for standalone zip"
```

---

## Task 12: Write the INSTALL.md template

**Files:**
- Create: `scripts/standalone-templates/INSTALL.md`

- [ ] **Step 1: Create scripts/standalone-templates directory**

```bash
mkdir -p scripts/standalone-templates
```

- [ ] **Step 2: Write INSTALL.md**

Create `scripts/standalone-templates/INSTALL.md` with this content:

~~~markdown
# Install: Defect and Requirements Tools

This zip contains two Claude Code plugins:

- **defect-gatherer v{{VERSION_DEFECT_GATHERER}}** — defect reporting and submission.
  Skills: `defect-reporter` (structured bug intake with optional headless Playwright
  screenshots) and `defect-organizer` (push defect files to GitHub, Jira, Linear, or
  GitLab).
- **requirements-gatherer v{{VERSION_REQUIREMENTS_GATHERER}}** — requirements interview
  and issue creation. Skills: `requirements-gatherer` (senior-product-consultant
  interview that produces `requirements.md`) and `requirements-organizer` (convert
  requirements into GitHub milestones/issues or Jira epics/stories).

See `USAGE.md` in this same zip for task walkthroughs once installed.

## Prerequisites

- **Claude Code** installed and working.
- **Node.js** (v18+) — required by the headless Playwright bridge used by
  `defect-reporter`'s visual-bug path. Not required for API-only bug reports.
- **`gh` CLI** — required if you want `defect-organizer` to upload screenshots to
  GitHub issues. Authenticate with `gh auth login` before use.
- **Atlassian MCP server** — required if you want `defect-organizer` to upload
  screenshots to Jira issues. Configure in your Claude Code settings.

Linear and GitLab are supported for issue creation but not for screenshot upload in
this version; attachment paths come through as text.

## Install (offline, local plugins)

1. **Unzip** this archive to a scratch location.

2. **Copy each plugin directory** into your Claude Code local plugins directory:
   - Unix / macOS: `~/.claude/plugins/`
   - Windows: `%USERPROFILE%\.claude\plugins\`

   For example, on Unix:

   ~~~bash
   cp -R defect-gatherer ~/.claude/plugins/
   cp -R requirements-gatherer ~/.claude/plugins/
   ~~~

   The destination should now contain `~/.claude/plugins/defect-gatherer/` and
   `~/.claude/plugins/requirements-gatherer/`.

3. **Reload plugins in Claude Code.** In any Claude Code session, run:

   ~~~
   /reload-plugins
   ~~~

## Verify the install

Open a Claude Code session in any project and say:

- "Let's gather requirements for a new project" — should activate `requirements-gatherer`.
- "Create issues from requirements.md" — should activate `requirements-organizer`.
- "I want to report a bug" — should activate `defect-reporter`.
- "Push the defects to GitHub" — should activate `defect-organizer`.

If none of these activate, re-run `/reload-plugins` or restart Claude Code.

## Uninstall

Delete the two plugin directories:

~~~bash
rm -rf ~/.claude/plugins/defect-gatherer ~/.claude/plugins/requirements-gatherer
~~~

Then run `/reload-plugins`.

## Notes

- Screenshot upload to tickets is supported on GitHub and Jira only in this version.
  Linear and GitLab fall back to listing paths as text in the issue body.
- The `defect-reporter` visual path will auto-install Playwright and Chromium the first
  time it runs if they are not already present. This takes ~2 minutes on first run.
~~~

- [ ] **Step 3: Commit**

```bash
git add scripts/standalone-templates/INSTALL.md
git commit -m "feat(packaging): add INSTALL.md template for standalone zip"
```

---

## Task 13: Write the USAGE.md template

**Files:**
- Create: `scripts/standalone-templates/USAGE.md`

- [ ] **Step 1: Write USAGE.md**

Create `scripts/standalone-templates/USAGE.md` with this content:

~~~markdown
# Usage: Defect and Requirements Tools

Four skills, four workflows. Each skill activates from natural trigger phrases — you do
not need to remember a slash command. Start a Claude Code session in the project you want
to work in, then tell Claude what you want to do.

## 1. Define what to build (before writing code)

**Trigger phrases:** "gather requirements", "let's do a requirements interview", "I want
to scope a new project", "build out requirements for X".

**What happens:** The `requirements-gatherer` skill interviews you as a senior product
consultant would — one question at a time, covering users, goals, constraints, scope,
and success criteria. It produces a `requirements.md` file in your working directory.

**Adding to an existing requirements.md later:** Just say "add requirements for X" in a
session where `requirements.md` already exists. The skill detects the existing file and
switches to addendum mode instead of starting over.

**Source-sync mode:** If you already have a codebase or docs and want to derive or
reconcile a `requirements.md` from them, say "sync requirements from the repo" or "extract
requirements from these docs". The skill will analyze the source material, propose a
requirements document, and require your explicit approval before overwriting anything.

## 2. Turn requirements into GitHub or Jira issues

**Trigger phrases:** "create issues from requirements", "organize requirements into
epics", "push requirements to GitHub", "push requirements to Jira".

**Prerequisites:** You must have a `requirements.md` file in the working directory, and
`gh` / an Atlassian MCP must be configured.

**What happens:** The `requirements-organizer` skill reads `requirements.md`, groups items
into epics and stories, shows you the full plan, and waits for your explicit confirmation
before creating anything. Created issues link back to the requirement sections.

## 3. Report a bug you just found

**Trigger phrases:** "I found a bug", "report a defect", "file an issue", "something's
broken", "this isn't working".

**What to tell the skill:**
- The page URL (for visual bugs) or the API endpoint (for non-visual bugs).
- What you saw happen.
- What you expected to happen instead.

**What happens:** The `defect-reporter` skill conducts a structured intake interview,
classifies the issue as a defect / story-update / feature, and writes a defect file to
`defects/defect-YYYY-MM-DD-NNN.md`.

On the visual path, when headless Playwright is available, the skill automatically
captures screenshots, a DOM snapshot, computed styles, and console messages into
`defects/evidence/`, and records those paths in the defect file's `## Attachments`
section. If Playwright is not available, the skill falls back to your description plus
any screenshots you can paste manually.

The skill will never modify code or requirements — it only documents.

## 4. Push defect files into tickets

**Trigger phrases:** "push defects to GitHub", "submit the bugs", "create tickets from
defects", "file these with Jira".

**Prerequisites:** You have defect files in `defects/` (from workflow 3) and the target
platform's CLI or MCP is configured.

**What happens:** The `defect-organizer` skill reads all pending defect files, detects the
available platforms, shows you the full submission plan, and waits for confirmation
before creating anything.

**Screenshots in tickets:**
- **GitHub:** Screenshots and capture artifacts are uploaded to a shared release named
  `defect-evidence` in the target repo, with per-defect filename namespacing. The issue
  body embeds images inline so they render in the GitHub UI.
- **Jira:** Screenshots are uploaded as native Jira attachments and referenced inline in
  the issue description.
- **Linear / GitLab:** Attachment paths are listed as text in the issue body. Upload the
  files manually through the platform's UI if needed.

If the upload tool is missing on the selected platform, the skill will explicitly ask
whether to proceed with text-only issues or abort. It will never silently skip.

Successfully submitted defect files are moved to `defects/.archived/`. Failed ones remain
in `defects/` for you to retry.

## What these skills will and won't do

**They WILL:**
- Conduct structured interviews and produce markdown documents.
- Investigate bugs by tracing code or capturing pages headlessly.
- Create issues and upload screenshots to your configured tracker.
- Always show you a plan and wait for confirmation before taking destructive actions.

**They WON'T:**
- Modify your application code. The reporter and organizer are report-only.
- Invent defects or requirements you didn't describe.
- Fix bugs. They classify and document.
- Proceed past a confirmation gate without your explicit approval.
- Silently skip steps when a tool is unavailable — they always tell you.
~~~

- [ ] **Step 2: Commit**

```bash
git add scripts/standalone-templates/USAGE.md
git commit -m "feat(packaging): add USAGE.md template for standalone zip"
```

---

## Task 14: Write the packaging script

**Files:**
- Create: `scripts/package-standalone.sh`

- [ ] **Step 1: Write package-standalone.sh**

Create `scripts/package-standalone.sh` with this content:

~~~bash
#!/usr/bin/env bash
# Build an offline-install zip of defect-gatherer + requirements-gatherer plugins.
# Output: dist/defect-and-requirements-tools-YYYY-MM-DD.zip
#
# Usage: bash scripts/package-standalone.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Tool check
for tool in zip jq; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "ERROR: required tool '$tool' is not installed." >&2
    echo "Install it and re-run." >&2
    exit 1
  fi
done

# Read plugin versions
VERSION_DEFECT_GATHERER=$(jq -r .version plugins/defect-gatherer/.claude-plugin/plugin.json)
VERSION_REQUIREMENTS_GATHERER=$(jq -r .version plugins/requirements-gatherer/.claude-plugin/plugin.json)

if [[ -z "$VERSION_DEFECT_GATHERER" || -z "$VERSION_REQUIREMENTS_GATHERER" ]]; then
  echo "ERROR: could not read plugin versions from plugin.json files." >&2
  exit 1
fi

DATE=$(date +%Y-%m-%d)
OUTPUT_NAME="defect-and-requirements-tools-v${DATE}.zip"
OUTPUT_PATH="dist/${OUTPUT_NAME}"
STAGING="dist/.staging"

echo "Packaging standalone zip..."
echo "  defect-gatherer:        ${VERSION_DEFECT_GATHERER}"
echo "  requirements-gatherer:  ${VERSION_REQUIREMENTS_GATHERER}"
echo "  output:                 ${OUTPUT_PATH}"

# Clean staging and output
rm -rf "$STAGING"
rm -f "$OUTPUT_PATH"
mkdir -p "$STAGING" dist

# Copy plugins with exclusions
EXCLUDE_ARGS=(
  --exclude='.agent-progress'
  --exclude='.agent-progress/*'
  --exclude='node_modules'
  --exclude='node_modules/*'
  --exclude='.DS_Store'
  --exclude='*.log'
)

# rsync is more portable for excludes than cp -R, but we can't assume rsync.
# Use cp -R then find/delete excluded patterns.
cp -R plugins/defect-gatherer "$STAGING/defect-gatherer"
cp -R plugins/requirements-gatherer "$STAGING/requirements-gatherer"

find "$STAGING" \( \
  -name '.agent-progress' -o \
  -name 'node_modules' -o \
  -name '.DS_Store' -o \
  -name '*.log' \
\) -prune -exec rm -rf {} + 2>/dev/null || true

# Render templates with version substitution
sed \
  -e "s|{{VERSION_DEFECT_GATHERER}}|${VERSION_DEFECT_GATHERER}|g" \
  -e "s|{{VERSION_REQUIREMENTS_GATHERER}}|${VERSION_REQUIREMENTS_GATHERER}|g" \
  scripts/standalone-templates/INSTALL.md > "$STAGING/INSTALL.md"

sed \
  -e "s|{{VERSION_DEFECT_GATHERER}}|${VERSION_DEFECT_GATHERER}|g" \
  -e "s|{{VERSION_REQUIREMENTS_GATHERER}}|${VERSION_REQUIREMENTS_GATHERER}|g" \
  scripts/standalone-templates/USAGE.md > "$STAGING/USAGE.md"

# Create the zip
(cd "$STAGING" && zip -r "../../${OUTPUT_PATH}" . >/dev/null)

# Clean up staging
rm -rf "$STAGING"

# Report
SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
echo ""
echo "Done."
echo "  ${OUTPUT_PATH} (${SIZE})"
~~~

- [ ] **Step 2: Make the script executable**

```bash
chmod +x scripts/package-standalone.sh
```

- [ ] **Step 3: Commit**

```bash
git add scripts/package-standalone.sh
git commit -m "feat(packaging): add package-standalone.sh script"
```

---

## Task 15: Run the packaging script and verify output

**Files:** none modified; verification only.

- [ ] **Step 1: Run the script**

```bash
bash scripts/package-standalone.sh
```

Expected output (approximate):

```
Packaging standalone zip...
  defect-gatherer:        1.3.0
  requirements-gatherer:  1.2.0
  output:                 dist/defect-and-requirements-tools-v2026-04-10.zip

Done.
  dist/defect-and-requirements-tools-v2026-04-10.zip (XXK)
```

- [ ] **Step 2: Verify zip contents**

```bash
unzip -l dist/defect-and-requirements-tools-v*.zip | head -30
```

Expected top-level entries: `INSTALL.md`, `USAGE.md`, `defect-gatherer/`, `requirements-gatherer/`.
Must NOT contain: `marketplace.json`, `.agent-progress/`, `node_modules/`, `visual-design/`, `functional-tester/`.

- [ ] **Step 3: Verify version substitution in rendered docs**

```bash
unzip -p dist/defect-and-requirements-tools-v*.zip INSTALL.md | grep -i "defect-gatherer v"
unzip -p dist/defect-and-requirements-tools-v*.zip INSTALL.md | grep -i "requirements-gatherer v"
```

Expected: both lines show the correct version strings (e.g. `defect-gatherer v1.3.0` and `requirements-gatherer v1.2.0`). No `{{VERSION_*}}` placeholders anywhere in the output.

- [ ] **Step 4: Verify `dist/` is ignored by git**

```bash
git status --porcelain | grep -E "^\?\? dist/" && echo "PROBLEM: dist/ is untracked and visible" || echo "OK: dist/ is ignored"
```

Expected: "OK: dist/ is ignored".

- [ ] **Step 5: Verify plugin.json files in the zip are valid JSON**

```bash
unzip -p dist/defect-and-requirements-tools-v*.zip defect-gatherer/.claude-plugin/plugin.json | node -e "JSON.parse(require('fs').readFileSync(0))"
unzip -p dist/defect-and-requirements-tools-v*.zip requirements-gatherer/.claude-plugin/plugin.json | node -e "JSON.parse(require('fs').readFileSync(0))"
```

Expected: silent success for both.

- [ ] **Step 6: No commit**

This task is verification-only. Nothing new to commit.

---

## Task 16: Unit-test the organizer attachment parser (skill-level smoke)

**Files:** none modified; manual smoke test.

Skills are prompt-engineering artifacts, not application code — there is no traditional unit-test harness. This task verifies the parser rules defined in Task 4 by hand against representative defect file fixtures.

- [ ] **Step 1: Create three test defect fixtures**

```bash
mkdir -p /tmp/defect-parser-test/defects/evidence
touch /tmp/defect-parser-test/defects/evidence/foo.png
touch /tmp/defect-parser-test/defects/evidence/bar.json
```

Fixture A (`/tmp/defect-parser-test/defects/defect-2026-04-10-001.md`) — full block, all paths exist:

```markdown
# Defect Report: Test A

## Attachments
- defects/evidence/foo.png
- defects/evidence/bar.json

## Requirement Reference
N/A
```

Fixture B (`/tmp/defect-parser-test/defects/defect-2026-04-10-002.md`) — empty block:

```markdown
# Defect Report: Test B

## Attachments
<!-- Machine-readable list for defect-organizer. -->

## Requirement Reference
N/A
```

Fixture C (`/tmp/defect-parser-test/defects/defect-2026-04-10-003.md`) — one bad path (absolute), one good:

```markdown
# Defect Report: Test C

## Attachments
- /etc/passwd
- defects/evidence/foo.png

## Requirement Reference
N/A
```

- [ ] **Step 2: Manually trace the parser rules from Task 4 against each fixture**

Expected results:

- Fixture A: `attachments[2026-04-10-001] = ["defects/evidence/foo.png", "defects/evidence/bar.json"]`
- Fixture B: `attachments[2026-04-10-002] = []`
- Fixture C: `attachments[2026-04-10-003] = ["defects/evidence/foo.png"]` (with a warning about `/etc/passwd` failing the `defects/` prefix check)

If any of the three diverges from the rules in Task 4, fix the rules in the organizer SKILL.md before moving on.

- [ ] **Step 3: Clean up fixtures**

```bash
rm -rf /tmp/defect-parser-test
```

- [ ] **Step 4: No commit**

Verification-only.

---

## Task 17: Manual end-to-end verification on a throwaway repo

**Files:** none modified; manual integration test.

- [ ] **Step 1: Create a throwaway GitHub repo for testing**

Use any sandbox GitHub repo you control. Note its `OWNER/REPO`.

- [ ] **Step 2: Create a fake defect with a real screenshot**

In any working directory:

```bash
mkdir -p defects/evidence
# Create a tiny valid PNG (1x1 transparent pixel)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82' > defects/evidence/visual-test.png
```

Create `defects/defect-2026-04-10-999.md`:

```markdown
# Defect Report: Manual e2e test

_ID: defect-2026-04-10-999_
_Date: 2026-04-10_
_Status: Pending submission_
_Classification: defect_
_Severity: Low_
_Priority: N/A_
_Reproduced: Yes_

## Description
Manual end-to-end test of screenshot upload flow.

## Expected Behavior
Screenshot uploads cleanly.

## Actual Behavior
n/a (test fixture).

## Environment
Test.

## Frequency
Once

## Steps to Reproduce
1. Run organizer.

## Evidence
- See Attachments.

## Attachments
- defects/evidence/visual-test.png

## Requirement Reference
- **Requirement**: N/A
- **Acceptance Criteria**: N/A
- **Source file**: N/A

## Root Cause Hypothesis
N/A

## Story Impact
N/A

## Code References
N/A
```

- [ ] **Step 3: Run the organizer in Claude Code against the throwaway repo**

In a Claude Code session: "Push these defects to GitHub at OWNER/REPO."

Walk the skill through Step 1 (scan), Step 2 (platform detect — GitHub), Step 3 (epic match), Step 4 (plan), Step 4.5 (should fire because attachments are non-empty; expect proceed), Step 5 (upload and create issue).

- [ ] **Step 4: Verify in GitHub UI**

- Open the target repo's Releases page. Confirm `defect-evidence` release exists and contains an asset named `defect-2026-04-10-999--visual-test.png`.
- Open the created issue. Confirm the body contains an inline image that renders as the test PNG. The image URL should be `https://github.com/OWNER/REPO/releases/download/defect-evidence/defect-2026-04-10-999--visual-test.png`.
- Confirm the defect file has been moved to `defects/.archived/`.

- [ ] **Step 5: Clean up the throwaway repo**

Delete the test issue and the `defect-evidence` release from the sandbox repo.

- [ ] **Step 6: No commit**

Verification-only.

---

## Task 18: Manual end-to-end verification of the zip install

**Files:** none modified; manual smoke test.

- [ ] **Step 1: Re-run the packaging script**

```bash
bash scripts/package-standalone.sh
```

- [ ] **Step 2: Install the zip into a scratch Claude Code plugins directory**

```bash
mkdir -p /tmp/claude-plugins-test
cd /tmp/claude-plugins-test
unzip ~/path/to/repo/dist/defect-and-requirements-tools-v*.zip
ls
```

Expected: `INSTALL.md`, `USAGE.md`, `defect-gatherer/`, `requirements-gatherer/`.

- [ ] **Step 3: Read the rendered INSTALL.md and USAGE.md end-to-end**

Confirm:
- Version strings are real (not `{{VERSION_*}}`).
- Install commands look right for your OS.
- Trigger phrases match the actual skill descriptions.
- No broken references or dangling placeholders.

- [ ] **Step 4: (Optional) Actually install and test one skill trigger**

If you have a second Claude Code profile / scratch install, copy the two plugin directories into its `~/.claude/plugins/`, run `/reload-plugins`, and confirm one trigger phrase activates (e.g. "I want to report a bug" should activate `defect-reporter`).

- [ ] **Step 5: Clean up**

```bash
rm -rf /tmp/claude-plugins-test
```

- [ ] **Step 6: No commit**

Verification-only.

---

## Self-Review Checklist (completed while writing)

**Spec coverage:**
- Section 1 (Reporter format) → Tasks 1, 2, 3. ✓
- Section 2 (GitHub flow) → Task 6 (plus Task 4 parser, Task 5 gate, Task 8 summary). ✓
- Section 3 (Jira flow) → Task 7 (plus Task 4, Task 5, Task 8). ✓
- Section 4 (Step 4.5 gate) → Task 5. ✓
- Section 5 (Unified body templates) → Task 6 step 3. ✓
- Section 6 (Standalone zip) → Tasks 11-15. ✓
- Hard Rules additions → Task 9. ✓
- Version bumps → Task 10. ✓
- Error handling from spec (missing file, retry, tool unavailable, missing release, Jira description update fallback, reporter Playwright fallback, packaging script tool check) → all covered in Tasks 4, 5, 6, 7, 14. ✓
- Testing from spec → Tasks 15, 16, 17, 18. ✓

**Placeholder scan:** No TBDs. No "add error handling" hand-waves. Every step has concrete code or commands.

**Type / name consistency:** Session state variables used consistently — `attachments_disabled`, `uploaded_assets[<defect_id>]`, `upload_failures`. Asset naming format `defect-<defect-id>--<basename>` consistent across Tasks 6, 8, 17. Attachment block markdown format consistent across reporter (Task 1) and organizer (Tasks 4, 6, 7). Step 4.5 referred to the same way in Tasks 4, 5, 6, 7, 9.
