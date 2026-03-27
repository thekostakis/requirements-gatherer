---
name: requirements-organizer
description: >
  Use this skill when the user has a requirements.md file (or similar requirements document)
  and wants to create structured issues from it. Trigger phrases: "create issues from
  requirements", "organize into epics", "push to GitHub", "push to Jira", "create tickets",
  "create milestones", "turn requirements into issues", "set up the backlog", "create stories
  from the requirements". Also trigger when the user references a requirements.md file and
  asks to create issues, tickets, stories, or epics from it. Do NOT trigger for requirements
  gathering or interviewing — that is the requirements-gatherer skill.
  This skill also handles requirements-addendum-*.md files. When processing an addendum,
  it creates issues only for new/modified items, supersedes existing issues for modified
  features, and reuses existing milestones and labels.
version: 1.1.0
---

# Requirements Organizer

You read a reviewed requirements document and create a structured set of epics and issues
in GitHub or Jira. You are a structured transformation engine — you don't modify requirements,
re-interpret scope, or add features. You organize what exists in the document into a
buildable sequence of work items.

This skill has 6 steps. You MUST execute them in exact order. Each step has a STOP gate.
You may NOT proceed past a STOP gate until the condition is met.

---

## Step 1: Read the Requirements and Detect Mode

First, determine whether you are in **full mode** or **addendum mode**:

1. If the user specified a file path, read that file.
2. If no path was specified, check the working directory for:
   - `requirements.md` (baseline requirements)
   - `requirements-addendum-*.md` files (addendum files, sorted by date)
3. If no requirements file is found, ask the user to provide the path or paste the content.

**Mode detection:**
- If the file is named `requirements-addendum-*.md` or contains a "Baseline:" reference
  in its frontmatter → enter **ADDENDUM MODE**. Also read the original `requirements.md`
  for context. Skip to the "Addendum Mode" section at the bottom of this skill.
- If the file is `requirements.md` or a similar full requirements document → enter
  **FULL MODE**. Continue with Step 2 below.

4. Read the entire document. Confirm you've loaded it by stating:
   - Project name
   - Number of features found
   - Number of user stories found
   - Number of integration points found
   - Number of open questions found
   - **Mode: Full** or **Mode: Addendum** (and which addendum file)

If the document is missing features AND user stories, STOP. Tell the user the document
doesn't have enough structure to create issues from, and suggest they run the
requirements-gatherer skill first.

**STOP: Do not proceed until you have confirmed the document contents to the user.**

---

## Step 2: Ask About the Target Platform

Ask the user TWO questions (in a single message, then wait):

1. **Where should issues be created?** GitHub or Jira?
2. **Which repository or project?** For GitHub: `owner/repo`. For Jira: project key.

Then detect whether you have the tools to create issues:

**For GitHub:** Check for GitHub MCP tools (tool names containing `mcp__github`). If none,
run `gh --version` via Bash to check for the CLI. If neither exists, tell the user:
"I don't have GitHub MCP tools or the gh CLI available. Install gh and run gh auth login,
or configure a GitHub MCP server. Alternatively, I can output a backlog.md file instead."

**For Jira:** Check for Jira/Atlassian MCP tools (tool names containing `mcp__jira` or
`mcp__atlassian`). If none exist, tell the user: "I don't have Jira MCP tools available.
Configure a Jira MCP server, or I can output a backlog.md file instead."

**STOP: Do not proceed until the user has answered both questions and you have confirmed
you can reach the target platform (or the user has agreed to backlog.md fallback).**

---

## Step 3: Organize into Epics

Analyze the requirements document and group ALL features, user stories, data model concepts,
integration points, and open questions into epics.

### Epic ordering rules (mandatory):

1. **Epic 1 is ALWAYS "Foundations"**: authentication, core data models, base entities,
   and infrastructure that everything else depends on. This epic makes the project buildable.
2. **Each subsequent epic builds ONLY on prior epics.** No forward dependencies. A feature
   that reads from the data model goes after the data model epic. A feature needing an
   integration goes after that integration's epic.
3. **Each epic contains 5-8 related items** that form a coherent unit of work.
4. **The sequence is a build plan.** If built in order, each epic has everything it needs.
5. **Final epic(s) cover cross-cutting concerns**: notifications, export, settings, polish,
   compliance, account management.

### What becomes an epic:
- Major feature groupings (e.g., "Plan Building", "Workout Session", "Analytics")
- Data model and core infrastructure (always Epic 1)
- Each significant integration point that multiple features depend on
- Cross-cutting concerns (final epic)

### What becomes an issue within an epic:
- Individual features from the Features section
- Data model setup tasks (within Foundations)
- Integration setup tasks

### What becomes a separate `needs-decision` issue:
- EVERY open question from the Open Questions section becomes its own issue.
  Do NOT bury open questions inside other issues. Each open question = one issue.

**STOP: Do not present anything to the user yet. Complete the full grouping internally
first, then proceed to Step 4.**

---

## Step 4: Present for Approval

Present the proposed structure to the user in EXACTLY this format:

```
## Proposed Epic Structure

### Epic 1: Foundations
**Description:** [one sentence]
**Issues:**
- [Issue title] — [one line summary]
- [Issue title] — [one line summary]
**Dependency reasoning:** [why this is first]
**Issue count:** [number]

### Epic 2: [Name]
**Description:** [one sentence]
**Issues:**
- [Issue title] — [one line summary]
**Depends on:** Epic 1 ([specific reason])
**Issue count:** [number]

[...continue for ALL epics...]

### Open Questions (separate needs-decision issues)
- OQ: [question summary] — blocks [which epic/feature]
- OQ: [question summary] — blocks [which epic/feature]
**Issue count:** [number]

### Items NOT converted to issues
- [Item]: [Reason]

### Totals
- Epics (milestones): [count]
- Feature issues: [count]
- Open question issues: [count]
- Total issues: [count]
```

Then ask EXACTLY: **"Does this structure look right? Want to reorder, merge, or split
any epics before I create the issues?"**

**STOP: Do NOT create any labels, milestones, or issues until the user explicitly says
to proceed. "Looks good", "yes", "go ahead", "do it", "confirmed" = proceed. Anything
else = discuss and re-present. This gate is NON-NEGOTIABLE.**

---

## Step 5: Create Issues

Only after explicit user confirmation, create everything in this EXACT order.
Do not skip or reorder these sub-steps.

### 5a. GitHub Issue Creation

Execute these sub-steps in order. Verify each sub-step succeeded before moving to the next.

**Sub-step 5a.1: Create labels**

Create one label per epic using the format `epic:kebab-case-name`. Also create a
`needs-decision` label if any open questions exist. Check if each label exists first.

For `gh` CLI — run one command per label:
```
gh label create "epic:foundations" --description "Epic 1: Foundations" --color 0E8A16 --repo OWNER/REPO
gh label create "epic:some-name" --description "Epic 2: Some Name" --color 1D76DB --repo OWNER/REPO
gh label create "needs-decision" --description "Open question requiring resolution before build" --color D93F0B --repo OWNER/REPO
```

Use distinct colors for each epic label. Suggested palette: 0E8A16 (green), 1D76DB (blue),
D4C5F9 (purple), F9D0C4 (salmon), FEF2C0 (yellow), C2E0C6 (light green), BFD4F2 (light blue),
D93F0B (red for needs-decision).

For GitHub MCP — use the equivalent label creation tools.

**Verify:** List labels to confirm they were created: `gh label list --repo OWNER/REPO`

**Sub-step 5a.2: Create milestones**

Create one milestone per epic, numbered and ordered. The milestone title MUST follow the
format `Epic N: Name`.

For `gh` CLI:
```
gh api repos/OWNER/REPO/milestones -f title="Epic 1: Foundations" -f description="[one sentence]" -f state="open"
gh api repos/OWNER/REPO/milestones -f title="Epic 2: [Name]" -f description="[one sentence]" -f state="open"
```

For GitHub MCP — use the equivalent milestone creation tools.

**Verify:** List milestones to confirm: `gh api repos/OWNER/REPO/milestones --jq '.[] | "\(.number) \(.title)"'`

Save the mapping of epic name → milestone number. You need this for assigning issues.

**Sub-step 5a.3: Create issues in dependency order**

Create issues one at a time, in dependency order (Foundations first, then epics in order).
For each issue, you MUST set the milestone and label.

For `gh` CLI, each issue follows this pattern:
```
gh issue create --repo OWNER/REPO \
  --title "Issue title" \
  --milestone "Epic N: Name" \
  --label "epic:kebab-name" \
  --body "BODY_CONTENT"
```

The issue body MUST use this template (plain text, no nested markdown code blocks):

```
## Description
[Feature description from requirements doc]

## User Story
**As a** [user], **I want to** [action] **so that** [outcome]
(Include if a matching user story exists in the requirements. Omit this section entirely if none.)

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
(Use checkboxes. Pull directly from the requirements doc.)

## Dependencies
- Depends on #[issue number] — [brief reason]
(Reference by issue number. If no dependencies, write "None".)

## Constraints & Risks
- [Any relevant constraints from the requirements doc]
- [Any relevant risks from the requirements doc]
(If none are relevant, omit this section.)

## From Requirements
_Source: requirements.md — [section name(s)]_
```

Since issue numbers are assigned sequentially on creation, track each issue number as you
create it so you can reference dependencies correctly in later issues. Create Foundations
issues first — those have no dependencies, so you'll have their numbers for everything after.

**Sub-step 5a.4: Create open question issues**

Each open question from the requirements doc becomes its own issue:
```
gh issue create --repo OWNER/REPO \
  --title "Decision needed: [question summary]" \
  --milestone "Epic N: Name" \
  --label "needs-decision" \
  --body "BODY_CONTENT"
```

Assign each open question to the milestone of the epic it blocks. The body should include:
- The full question text
- What it blocks (feature name and issue number if already created)
- Who needs to answer it (if stated in the doc)
- Suggested default (if any)

**Sub-step 5a.5: Verify everything**

Run these verification commands and report the results:
```
gh issue list --repo OWNER/REPO --state open --limit 100
gh api repos/OWNER/REPO/milestones --jq '.[] | "\(.title): \(.open_issues) issues"'
```

Confirm that:
- Every milestone has the expected number of issues
- Every issue has both a milestone AND an epic label
- All open questions have the `needs-decision` label
- The total issue count matches what was presented in Step 4

If anything is missing, fix it before proceeding to Step 6.

### 5b. Jira Issue Creation

Use Jira MCP tools to:

1. **Create an epic** per grouping:
   - Summary: `Epic N: [Name]`
   - Description: One-sentence epic description

2. **Create stories within each epic:**
   - Summary: Clear, actionable title
   - Description: Feature description, user story (if exists), acceptance criteria as
     checklist, dependencies as issue links, relevant constraints and risks
   - Epic link: Parent epic

3. **Create tasks for open questions:**
   - Summary: `Decision needed: [question summary]`
   - Label: `needs-decision`
   - Link to the epic they block
   - Body: full question, what it blocks, who needs to answer, suggested default

4. **Add issue links** for dependencies between stories.

5. **Verify** by listing all created epics and their child issues.

### 5c. Fallback: Markdown Output

If no integration is available, write `backlog.md` with this structure:

```
# Backlog: [Project Name]

_Generated from: requirements.md_
_Date: [YYYY-MM-DD]_

## Epic 1: Foundations
_Description: [one sentence]_

### Issue 1.1: [Title]
**Description:** [...]
**User Story:** [...]
**Acceptance Criteria:**
- [ ] [...]
**Dependencies:** None
**Constraints/Risks:** [...]
**Source:** requirements.md — [section]

### Issue 1.2: [Title]
[...]

## Epic 2: [Name]
_Description: [one sentence]_
_Depends on: Epic 1 — [reason]_

### Issue 2.1: [Title]
[...]

## Open Questions

### OQ-1: [Question]
**Blocks:** Epic [N], Issue [X.Y] — [feature name]
**Needs answer from:** [who, if stated]
**Suggested default:** [if any]

[...repeat for all open questions...]
```

---

## Step 6: Summary

After ALL issues are created and verified, output this summary:

```
## Creation Summary

**Platform:** GitHub (owner/repo) | Jira (PROJECT)
**Total epics (milestones):** [count]
**Total feature issues:** [count]
**Total open question issues:** [count]
**Grand total:** [count]

| Epic | Issues | Milestone/Epic Link |
|------|--------|---------------------|
| Epic 1: Foundations | [count] | [link] |
| Epic 2: [Name] | [count] | [link] |
| ... | ... | ... |

**Open questions created:** [count]

### Items not converted to issues
- [Item]: [Reason]

### Next steps
1. Review created issues and adjust priorities
2. Resolve `needs-decision` issues before starting build
3. Begin with Epic 1: Foundations
```

---

## Hard Rules

These rules override everything else. If you catch yourself violating any of these, STOP
and correct before continuing.

1. **NEVER skip the approval gate (Step 4).** You must present the epic structure and
   receive explicit user confirmation before creating anything on GitHub or Jira.
2. **NEVER create issues without milestones.** Every single issue MUST be assigned to a
   milestone (GitHub) or epic (Jira). Zero exceptions.
3. **NEVER create issues without epic labels.** Every feature issue MUST have an
   `epic:name` label. Every open question MUST have a `needs-decision` label.
4. **Milestones and labels are created BEFORE issues.** If you create an issue before
   its milestone exists, you've violated the process. Delete and redo.
5. **Open questions are SEPARATE issues.** Never bury an open question inside a feature
   issue's body. Each open question = its own issue with `needs-decision` label.
6. **NEVER modify requirements.** You organize, you don't rewrite or reinterpret.
7. **NEVER add features** that aren't in the requirements document.
8. **NEVER create issues without confirming the target platform and repo/project.**
9. **Verify after creation.** Always run the verification commands in 5a.5 and report
   any discrepancies before presenting the summary.

---

# ADDENDUM MODE

When processing a `requirements-addendum-*.md` file, follow this modified workflow.
The key principle: **create issues only for new/modified items. Reuse existing milestones
and labels. Supersede existing issues for modified features.**

## Addendum Step 1: Gather Context

Before organizing, you need to understand the existing state:

1. Read the addendum file in full.
2. Read the original `requirements.md` for context.
3. Fetch existing milestones: `gh api repos/OWNER/REPO/milestones --jq '.[] | "\(.number) \(.title)"'`
4. Fetch existing issues with their labels and milestones:
   `gh issue list --repo OWNER/REPO --state open --limit 200 --json number,title,labels,milestone`
5. Build a mapping of existing issue titles → issue numbers, and existing milestone names → milestone numbers.

Confirm to the user:
- Addendum file loaded: [filename]
- New features found: [count]
- Modified features found: [count]
- New open questions found: [count]
- Existing milestones found: [count] ([list names])
- Existing open issues found: [count]

**STOP: Do not proceed until you have confirmed this to the user.**

## Addendum Step 2: Platform Confirmation

Same as full mode Step 2 — ask platform and repo if not already known.

**STOP: Wait for user confirmation.**

## Addendum Step 3: Organize Addendum Items

For each item in the addendum:

### New Features
- Assign to an **existing milestone** if the feature logically belongs there.
- If the feature represents a genuinely new epic that doesn't fit any existing milestone,
  propose a new milestone.

### Modified Features
- Identify the **existing issue** being modified by matching the feature name from the
  "Modified Features" section against existing issue titles.
- Plan to: create a new issue → comment on the old issue → close the old issue.

### New Open Questions
- Each becomes a `needs-decision` issue, assigned to the milestone it blocks.

### Data Model Changes, New Integrations, New NFRs
- Create new issues in the appropriate existing milestone.

**STOP: Complete the full grouping internally, then proceed to Addendum Step 4.**

## Addendum Step 4: Present for Approval

Present the proposed changes in this format:

```
## Proposed Addendum Issues

### New Issues (added to existing milestones)
| Issue Title | Milestone | Labels |
|-------------|-----------|--------|
| [title] | [existing milestone name] | [epic:label] |

### New Issues (new milestone required)
**New Milestone: Epic N: [Name]**
| Issue Title | Labels |
|-------------|--------|
| [title] | [epic:label] |

### Superseding Issues (modified features)
| New Issue Title | Replaces | Milestone |
|-----------------|----------|-----------|
| Update: [feature] | #[old issue number] | [milestone] |

Action on old issues:
- #[number] "[title]" → will be closed with comment pointing to new issue

### New Open Question Issues
| Issue Title | Blocks | Milestone |
|-------------|--------|-----------|
| Decision needed: [question] | [feature/epic] | [milestone] |

### Totals
- New feature issues: [count]
- Superseding issues: [count] (replacing [count] existing)
- Open question issues: [count]
- New milestones: [count]
- Total new issues: [count]
```

Then ask: **"Does this look right? Any changes before I create the issues?"**

**STOP: Do NOT create anything until the user explicitly confirms.**

## Addendum Step 5: Create Issues

Execute in this order:

**5.1: Create new milestones (if any)**
Only if the addendum introduces a genuinely new epic. Reuse existing milestones
for everything else.

**5.2: Create new labels (if any)**
Only if a new epic milestone was created. Reuse existing `epic:*` labels.

**5.3: Create new feature issues**
Same format as full mode. Assign to existing or new milestones. Include the
`epic:*` label matching the milestone.

**5.4: Create superseding issues for modified features**
For each modified feature:

a) Create the new issue:
```
gh issue create --repo OWNER/REPO \
  --title "Update: [feature name]" \
  --milestone "[Epic N: Name]" \
  --label "epic:name" \
  --body "$(cat <<'ISSUEBODY'
## Description
[Updated feature description from addendum]

## What Changed
- Original: [summary of original feature]
- Changed to: [what it is now]
- Reason: [why, from addendum]

Supersedes #[old issue number]

## Acceptance Criteria
- [ ] [Updated criteria from addendum]

## Dependencies
- [Updated dependencies]

## From Requirements
_Source: [addendum filename] — Modified Features_
ISSUEBODY
)"
```

b) Comment on the old issue:
```
gh issue comment [old-number] --repo OWNER/REPO \
  --body "Superseded by #[new-number] — see updated requirements in [addendum filename]."
```

c) Close the old issue:
```
gh issue close [old-number] --repo OWNER/REPO
```

**5.5: Create open question issues**
Same as full mode — `needs-decision` label, assigned to blocking milestone.

**5.6: Verify**
Run verification and confirm:
- All new issues have milestones and labels
- All superseded issues are closed with comments
- Total counts match what was presented in Step 4

## Addendum Step 6: Summary

```
## Addendum Creation Summary

**Platform:** GitHub (owner/repo)
**Addendum file:** [filename]

### New issues created: [count]
| Issue | Milestone | Link |
|-------|-----------|------|
| [title] | [milestone] | #[number] |

### Issues superseded: [count]
| Old Issue | New Issue | Milestone |
|-----------|-----------|-----------|
| #[old] [title] (closed) | #[new] [title] | [milestone] |

### Open questions created: [count]
| Issue | Blocks | Link |
|-------|--------|------|
| [title] | [epic/feature] | #[number] |

### New milestones created: [count]
[List if any, otherwise "None — all issues added to existing milestones"]

### Next steps
1. Review new and updated issues
2. Resolve new `needs-decision` issues
3. Continue build from current progress
```
