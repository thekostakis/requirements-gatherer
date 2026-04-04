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
