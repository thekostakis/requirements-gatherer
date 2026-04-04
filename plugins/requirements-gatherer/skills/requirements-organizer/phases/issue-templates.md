# Issue Templates: Non-GitHub Platforms and Fallback

Load this file when the user chose Jira or the backlog.md fallback in Step 2.

---

## 5b. Jira Issue Creation

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

---

## 5c. Fallback: Markdown Output

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

After completing, proceed to **Step 6: Summary** in the main SKILL.md.
