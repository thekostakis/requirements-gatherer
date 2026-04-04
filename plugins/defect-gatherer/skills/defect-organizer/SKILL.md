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
5. Also check for `requirements.md` in the working directory — if it exists, read it
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

## Step 5: Create Issues

Only after explicit user confirmation, create everything in this EXACT order.
Do not skip or reorder these sub-steps. Verify each sub-step before moving to the next.

### 5a. GitHub Issue Creation

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

## Evidence
[Screenshots, console errors, network failures, CSS issues]

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

**Sub-step 5a.4: Verify**

```
gh issue list --repo OWNER/REPO --state open --limit 100
```

Confirm all issues have milestones and correct labels.

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
