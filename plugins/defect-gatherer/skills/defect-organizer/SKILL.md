---
name: defect-organizer
description: >
  This skill should be used when the user has defect report files in the defects/ directory
  and wants to submit them to an issue tracker (bugs, story-updates, and feature
  requests are all submitted from those files). Trigger phrases: "submit defects",
  "push defects", "submit issues", "push issues", "sync defects to GitHub", "sync to Jira",
  "create defect issues", "create tickets from defects", "file the bugs", "file the issues",
  "submit bug reports", "submit pending reports", "push bugs to GitHub", "push bugs to Jira",
  "push story updates", "push change requests", "organize defects", "upload defects",
  "import defects into Linear", "create GitLab issues from defects". Also trigger when the
  user has defect files in defects/ and wants them on GitHub, Jira, Linear, or GitLab.
  Do NOT trigger for defect reporting or investigation — that is the defect-reporter skill.
version: 1.2.2
---

# Defect Organizer

You read defect report files from the `defects/` directory and submit them as structured
issues to the user's system of record (GitHub, Jira, Linear, or GitLab). You are a
submission engine — you don't modify defect reports, re-classify severity, or invent
new defects. You submit what exists in the defect files, with correct labels, milestones,
and requirement references.

This skill has 7 steps. You MUST execute them in exact order. Each step has a STOP gate.
You may NOT proceed past a STOP gate until the condition is met.

---

## Step 1: Scan for Pending Defect Files

1. Check for a `defects/` directory in the working directory.
2. If the directory doesn't exist or is empty: tell the user "No pending defect files
   found in defects/. Run the defect-reporter skill first to document defects." **STOP.**
3. List all `defect-*.md` files. Exclude the `.archived/` subdirectory.
4. Read each file and summarize:
   - Total defects found
   - For each defect: ID, title, classification (defect, story-update, or feature),
     severity (defects/story-updates) or priority (features)
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
6. Also check for `requirements.md` in the working directory — if it exists, read it
   for context (requirement references, feature areas, acceptance criteria).

**STOP: Confirm the defect list with the user before proceeding.**

---

## Step 2: Auto-Detect Platform and Confirm

Detect available integrations in this order:

### GitHub
1. Check for GitHub MCP tools (tool names containing `mcp__github`).
2. If no MCP: run `gh --version` via Bash to check for the CLI.
3. If found: note "GitHub available via [MCP/gh CLI]".

### Jira
1. Check for Jira/Atlassian MCP tools (tool names containing `mcp__jira` or `mcp__atlassian`).
2. If found: note "Jira available via MCP".

### Linear
1. Check for Linear MCP tools (tool names containing `mcp__linear`).
2. If no MCP: run `linear --version` via Bash to check for the CLI.
3. If no CLI: note "Linear may be available via API if configured".
4. If found: note "Linear available via [MCP/CLI/API]".

### GitLab
1. Check for GitLab MCP tools (tool names containing `mcp__gitlab`).
2. If no MCP: run `glab --version` via Bash to check for the CLI.
3. If no CLI: note "GitLab may be available via API if configured".
4. If found: note "GitLab available via [MCP/CLI/API]".

Present detected platforms to the user. Ask:
1. "Which platform should I submit to?" (list detected options)
2. "Which repository/project?" (e.g., owner/repo for GitHub, project key for Jira)

**If NO platforms are detected:** Tell the user: "No supported issue tracking integrations
found. I checked for GitHub (gh CLI, MCP), Jira (MCP), Linear (CLI, MCP), and GitLab
(glab CLI, MCP). Install one of these and try again. Your defect files in defects/ are
preserved." **STOP. Do NOT delete or archive any files.**

**STOP: Do not proceed until the user has confirmed the platform and target.**

---

## Step 3: Match Defects to Existing Epics/Milestones

1. Fetch existing milestones/epics from the system of record:
   - GitHub: `gh api repos/OWNER/REPO/milestones --jq '.[] | "\(.number) \(.title)"'`
   - Jira: Use MCP to list epics in the project
   - Linear: Use CLI/MCP to list projects
   - GitLab: `glab api projects/ID/milestones`

2. Fetch existing issues/labels:
   - GitHub: `gh issue list --repo OWNER/REPO --state open --limit 200 --json number,title,labels,milestone`
   - Similar for other platforms

3. For each defect report, determine:
   - Which epic/milestone it belongs to (match by requirement reference, feature area,
     or component)
   - If the defect has a requirement reference, find the issue that implements that
     requirement

4. For unmatched defects: propose a new epic/milestone or suggest the closest match.

**STOP: Complete the full matching internally first, then proceed to Step 4.**

---

## Step 4: Prepare Submission Plan

Present the submission plan in EXACTLY this format:

```
## Defect Submission Plan

### Platform: [GitHub/Jira/Linear/GitLab] ([repo/project])

| # | Title | Classification | Severity/Priority | Target Epic/Milestone | Issue Type | Linked Requirement |
|---|-------|---------------|-------------------|----------------------|------------|-------------------|
| 1 | [title] | defect | High | Epic 2: [Name] | Bug | #[issue] |
| 2 | [title] | story-update | Medium | Epic 1: Foundations | Story/Task | #[issue] |
| 3 | [title] | feature | Must-have | Epic 3: [Name] | Story/Feature | — |

### New Epics/Milestones Required
- [Name] — [reason]
(or "None — all items matched to existing epics")

### Actions Summary
- Issues to create: [count]
- Bug-type issues: [count]
- Story-update issues: [count]
- Feature issues: [count]
- New milestones/epics: [count]
```

Then ask: **"Does this look right? Any changes before I create the issues?"**

**STOP: Do NOT create any issues until the user explicitly confirms. "Looks good", "yes",
"go ahead", "do it", "confirmed" = proceed. Anything else = discuss and re-present.
This gate is NON-NEGOTIABLE.**

---

## Step 4.5: Attachment Upload Tool Check

**Trigger:** This step runs only if at least one defect in the submission plan has a
non-empty `## Attachments` list. If every defect has zero attachments, skip directly to
Step 5.

**Gate logic by platform:**

### GitHub
Verify the `release` subcommand is available:

```bash
gh release --help >/dev/null 2>&1 && echo "AVAILABLE" || echo "MISSING"
```

If MISSING, fall through to the "Upload unavailable" prompt below.

### Jira
Check whether any Atlassian MCP tool matching `addAttachment` or `createAttachment` is
exposed in the current session. If no such tool exists, fall through to the "Upload
unavailable" prompt below.

### Linear / GitLab
No attachment upload is implemented in this plugin version. Do NOT prompt. Instead, add
this line verbatim to every issue body for defects with attachments:

```
_Note: attachment upload is supported on GitHub and Jira in this plugin version. The
attachment paths below are listed for manual upload._
```

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

## Step 5: Create Issues

Only after explicit user confirmation, create everything in this EXACT order.
Do not skip or reorder these sub-steps. Verify each sub-step before moving to the next.

### 5a. GitHub Issue Creation

**Sub-step 5a.0: Ensure evidence release exists**

Run this ONCE per session, before any issue creation. Skip entirely if `attachments_disabled`
is true or if every defect has an empty attachment list.

```bash
gh release view defect-evidence --repo OWNER/REPO >/dev/null 2>&1 || \
  gh release create defect-evidence \
    --repo OWNER/REPO \
    --title "Defect evidence" \
    --notes "Screenshots and capture artifacts from the defect-gatherer plugin. Not a product release." \
    --target "$(gh api repos/OWNER/REPO --jq .default_branch)"
```

The release is published (not a draft) so assets render for anyone who can read the repo.
If this command fails, treat it as "upload tool unavailable" — go back to Step 4.5 and
prompt the user to proceed text-only or abort.

**Sub-step 5a.1: Create labels (if they don't exist)**

Create these labels if they don't already exist:
- `defect` label (red color, e.g., D73A4A)
- `story-update` label (yellow color, e.g., FEF2C0)
- `feature` label (green color, e.g., 0E8A16)
- Severity labels: `severity-critical` (dark red, e.g., B60205), `severity-high` (red, e.g., D73A4A), `severity-medium` (orange, e.g., E99695), `severity-low` (yellow, e.g., FEF2C0)

Check if each label exists first: `gh label list --repo OWNER/REPO`

**Sub-step 5a.2: Create new milestones (only if needed)**

If the submission plan includes new milestones:
```
gh api repos/OWNER/REPO/milestones -f title="[Name]" -f description="[desc]" -f state="open"
```

**Sub-step 5a.2b: Upload defect attachments to shared release**

For each defect with a non-empty attachments list (and `attachments_disabled` is false),
upload each file to the shared release using the defect ID as a filename prefix:

```bash
gh release upload defect-evidence \
  --repo OWNER/REPO \
  --clobber \
  "<local-path>#<defect-id>--<basename>"
```

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

**Sub-step 5a.3: Create issues (one at a time, in order)**

For **true defects**:
```
gh issue create --repo OWNER/REPO \
  --title "[Defect title]" \
  --milestone "[Epic N: Name]" \
  --label "defect,severity-[level]" \
  --body "BODY"
```

Issue body template for defects:

```
## Bug Report

**Severity:** [Critical/High/Medium/Low]
**Reproduced:** [Yes/No]
**Frequency:** [Always/Sometimes/Once/Unknown]

## Description
[Description from defect report]

## Steps to Reproduce
1. [Step]
2. [Step]

## Expected Behavior
[From defect report]

## Actual Behavior
[From defect report]

## Attachments
[ATTACHMENTS_BLOCK]

## Environment
[Browser, OS, dev server URL]

## Root Cause Hypothesis
[From defect report]

## Requirement Reference
Violates: [requirement section] — [acceptance criteria]
Related issue: #[number] (if linked)
Source: [requirements.md or addendum file]

_Filed via defect-gatherer plugin_
_Source: [defect file ID]_
```

For **story updates**:
```
gh issue create --repo OWNER/REPO \
  --title "Story update: [title]" \
  --milestone "[Epic N: Name]" \
  --label "story-update,severity-[level]" \
  --body "BODY"
```

Issue body template for story updates:

```
## Story Update Required

**Severity:** [Critical/High/Medium/Low]

## Description
[Description from defect report]

## Current Behavior vs Specification
- **Specification says:** [expected behavior from requirements]
- **Actual behavior:** [what the code does]
- **Recommendation:** Update the specification to match intended behavior

## Story Impact
[From defect report — which Epic/Story needs updating]

## Steps to Verify
1. [Step]
2. [Step]

## Requirement Reference
Affects: [requirement section] — [acceptance criteria]
Related issue: #[number] (if linked)

_This is NOT a code bug. The requirement/story needs updating for consistency._
_Filed via defect-gatherer plugin_
_Source: [defect file ID]_
```

For **features**:
```
gh issue create --repo OWNER/REPO \
  --title "Feature: [title]" \
  --milestone "[Epic N: Name]" \
  --label "feature" \
  --body "BODY"
```

Issue body template for features:

```
## Feature Request

**Priority:** [Must-have / Should-have / Nice-to-have]

## Description
[Description from defect report]

## User Expectation
[What the user expected to be able to do]

## Current State
[What actually exists — nothing, or partial implementation]

## Suggested Behavior
[How the feature should work based on user's description and existing patterns]

## Requirements Impact
This feature should be added to requirements under [Epic/Section].
Requirements.md should be updated to include this functionality.

## Requirement Reference
Related epic: [Epic N: Name]
Related area: [requirement section, if identifiable]

_Filed via defect-gatherer plugin_
_Source: [defect file ID]_
```

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

```
_Upload failures: <count>. See session summary for details._
```

**Sub-step 5a.4: Verify**

```
gh issue list --repo OWNER/REPO --state open --limit 100
```

Confirm all issues have milestones and correct labels.

Additionally, if any attachments were uploaded in Sub-step 5a.2b, verify them now:

```bash
gh release view defect-evidence --repo OWNER/REPO --json assets \
  --jq '.assets[].name' | sort > /tmp/actual-assets.txt
```

Diff against the expected asset names collected during upload. Any missing names are
added to session `upload_failures` with reason "not found on release after upload".

### 5b/5c/5d. Jira, Linear, GitLab Issue Creation

Load `phases/platform-submission.md` and follow the relevant section for the detected platform.

---

## Step 6: Archive Submitted Files

After ALL issues are successfully created:

1. Create `defects/.archived/` directory if it doesn't exist.
2. Move each successfully submitted defect file to `defects/.archived/`.
3. Files that FAILED to submit remain in `defects/` — do NOT move or delete them.

Use Bash for the move operations:
```bash
mkdir -p defects/.archived
mv defects/defect-YYYY-MM-DD-NNN.md defects/.archived/
```

**If ANY submission fails:**
- Archive only the successful ones.
- Leave failed ones in `defects/`.
- Report which failed and why.

---

## Step 7: Summary Report

After all issues are created, archived, and verified, output this summary:

```
## Defect Submission Summary

**Platform:** [GitHub/Jira/Linear/GitLab] ([repo/project])
**Defects submitted:** [count]
**Defects failed:** [count] (if any)

### Created Issues
| Defect ID | Title | Type | Severity/Priority | Issue Link | Epic/Milestone |
|-----------|-------|------|-------------------|------------|----------------|
| [id] | [title] | defect | High | [link] | [epic] |

### Failed Submissions (if any)
| Defect ID | Title | Error |
|-----------|-------|-------|
| [id] | [title] | [error description] |

### Attachment Upload Failures (if any)
| Defect ID | Attachment | Reason |
|-----------|------------|--------|
| [id] | [basename or path] | [error description] |

### Files Archived
- [list of files moved to defects/.archived/]

### Files Remaining (failures)
- [list of files still in defects/]

### Next Steps
1. Review created issues in [platform]
2. [If failures] Resolve issues and re-run defect-organizer
3. Story-update issues require updating the corresponding requirement/story
4. Feature issues require adding the feature to requirements.md
```

---

## Hard Rules

These rules override everything else. If you catch yourself violating any of these, STOP
and correct before continuing.

1. **NEVER skip the approval gate (Step 4).** User must confirm the submission plan
   before any issues are created.
2. **NEVER delete defect files.** Only move successfully submitted files to
   `defects/.archived/`. Failed files stay in `defects/`.
3. **NEVER create issues without confirming the target platform and repo/project.**
4. **NEVER proceed if no platform is detected.** Fail explicitly, preserve all files,
   and tell the user what integrations to install.
5. **NEVER modify requirements.md or addendum files.** Story-update issues note what
   needs changing, but the organizer doesn't make the change.
6. **NEVER add defects that aren't in the defect files.** You submit what exists, you
   don't invent.
7. **Verify after creation.** Always confirm issues were created with correct labels,
   milestones, and types.
8. **Use distinct issue types/labels for defects vs story-updates vs features.** They must
   be clearly distinguishable in the system of record.
9. **Always link to requirements.** Every submitted issue must reference the violated
   requirement (if one was identified in the defect report).
