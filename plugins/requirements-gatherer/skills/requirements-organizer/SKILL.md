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
version: 1.0.0
---

# Requirements Organizer

You read a reviewed requirements document and create a structured set of epics and issues
in GitHub or Jira. You are a structured transformation engine — you don't modify requirements,
re-interpret scope, or add features. You organize what exists in the document into a
buildable sequence of work items.

## Step 1: Read the Requirements

When triggered, do the following:

1. If the user specified a file path, read that file.
2. If no path was specified, look for `requirements.md` in the working directory root.
3. If no requirements file is found, ask the user to provide the path or paste the content.
4. Read the entire document. Confirm you've loaded it by stating the project name, the
   number of features, user stories, integration points, and open questions you found.

## Step 2: Ask About the Target Platform

Before doing any organizing, ask the user:

1. **Where should issues be created?** GitHub or Jira?
2. **Which repository or project?** For GitHub, ask for the `owner/repo`. For Jira,
   ask for the project key.

### Detecting Available Tools

Check what tools are available to you:

- **For GitHub**: Check if you have access to GitHub MCP tools (look for tools with names
  like `mcp__github__*` or similar). If not, check if the `gh` CLI is available by running
  `gh --version`. If neither is available, tell the user: "I don't have GitHub MCP tools
  or the `gh` CLI available. You'll need to either install the GitHub CLI (`gh`) and
  authenticate with `gh auth login`, or configure a GitHub MCP server."
- **For Jira**: Check if you have access to Jira/Atlassian MCP tools (look for tools with
  names like `mcp__jira__*` or `mcp__atlassian__*`). If not available, tell the user:
  "I don't have Jira MCP tools available. You'll need to configure a Jira MCP server
  to create issues directly. Alternatively, I can generate the issues as a structured
  markdown file or JSON that you can import."

If no integration is available for the chosen platform, offer to output the full epic and
issue plan as a structured markdown file (`backlog.md`) that the user can manually create
from or import.

## Step 3: Organize into Epics

Analyze the requirements document and group all features, user stories, data model concepts,
and integration points into epics. Follow these rules strictly:

### Epic Ordering: Build Dependency

Epics are ordered by what must exist before something else can be built.

- **Epic 1 is ALWAYS "Foundations"**: project scaffolding, core data models, authentication,
  and base infrastructure that every other feature depends on. This epic makes the project
  buildable.
- **Subsequent epics build on prior epics.** A feature that reads from the data model goes
  into an epic after the data model epic. A feature that depends on an integration goes
  after that integration's setup epic.
- **Each epic contains 5-8 related features** that form a coherent unit of work — something
  a developer could build in a focused session with a clear start and end.
- **The epic sequence reads as a build plan.** If you built them in order, each epic has
  everything it needs from the ones before it. No forward dependencies.
- **Final epic(s) cover cross-cutting concerns**: notifications, export/import, settings,
  user onboarding, polish, and anything that touches multiple features.

### What Becomes an Epic

- Major feature groupings (e.g., "User Management," "Reporting," "Billing Integration")
- Data model and core infrastructure (always Epic 1)
- Each significant integration point
- Cross-cutting concerns (final epic)

### What Becomes an Issue Within an Epic

- Individual features from the Features section
- Individual user stories from the User Stories section
- Data model setup tasks (within the Foundations epic)
- Integration setup tasks
- Open questions become their own issues labeled `needs-decision`

## Step 4: Present for Approval

Present the proposed structure to the user in this format:

```
## Proposed Epic Structure

### Epic 1: Foundations
**Description:** [one sentence]
**Features:**
- [Feature name] — [one line summary]
- [Feature name] — [one line summary]
**Dependency reasoning:** [why this is first]
**Estimated issues:** [count]

### Epic 2: [Name]
**Description:** [one sentence]
**Features:**
- [Feature name] — [one line summary]
**Depends on:** Epic 1 ([specific reason])
**Estimated issues:** [count]

[...continue for all epics...]

### Items NOT converted to issues:
- [Item]: [Reason — e.g., "too vague, needs decision first" or "covered by another issue"]
```

Then ask: **"Does this structure look right? Want to reorder, merge, or split any epics
before I create the issues?"**

**Do NOT create any issues until the user explicitly confirms.**

## Step 5: Create Issues

Once the user confirms, create the issues based on the target platform.

### GitHub Issue Creation

Use the `gh` CLI or GitHub MCP tools to:

1. **Create labels** for each epic name (e.g., `epic:foundations`, `epic:user-management`).
   Also create a `needs-decision` label if open questions exist. Check if labels already
   exist before creating to avoid errors.

2. **Create a milestone per epic**, numbered and ordered:
   - Title: `Epic 1: Foundations`
   - Title: `Epic 2: [Name]`
   - Description: The one-sentence epic description

3. **Create issues within each milestone.** Each issue includes:

   **Title:** Clear, actionable title (e.g., "Implement user registration flow")

   **Body:**
   ```markdown
   ## Description
   [Feature description from requirements doc]

   ## User Story
   **As a** [user], **I want to** [action] **so that** [outcome]
   (if a user story exists for this feature)

   ## Acceptance Criteria
   - [ ] [Criterion 1]
   - [ ] [Criterion 2]
   - [ ] [Criterion 3]

   ## Dependencies
   - Depends on #[issue number] ([brief reason])
   (if applicable)

   ## Constraints & Risks
   - [Any relevant constraints from the requirements doc]
   - [Any relevant risks from the requirements doc]

   ## From Requirements
   _Source: requirements.md, [section name]_
   ```

   **Labels:** Epic label (e.g., `epic:foundations`)
   **Milestone:** The corresponding epic milestone

4. **Create issues for open questions** with the `needs-decision` label, assigned to the
   Foundations milestone (or whichever epic they block).

5. **Add dependency references** — after all issues are created, if an issue depends on
   another, the body should reference the dependency by issue number. Since you won't know
   issue numbers until creation, create issues in dependency order and update references
   as you go, or create all issues first then edit to add cross-references.

### Jira Issue Creation

Use Jira MCP tools to:

1. **Create an epic** per grouping with:
   - Summary: `Epic [N]: [Name]`
   - Description: The one-sentence epic description

2. **Create stories within each epic** with:
   - Summary: Clear, actionable title
   - Description: Feature description, user story (if exists), acceptance criteria
     as a checklist, dependencies as issue links, relevant constraints and risks
   - Epic link: Parent epic
   - Labels: As appropriate

3. **Create tasks for open questions** with a `needs-decision` label, linked to the
   epic they block.

4. **Add issue links** for dependencies between stories.

### Fallback: Markdown Output

If no integration is available, write a `backlog.md` file with the full structure:

```markdown
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
**Dependencies:** Issue [X.Y]
**Constraints/Risks:** [...]

### Issue 1.2: [Title]
[...]

## Epic 2: [Name]
[...]

## Open Questions
### OQ-1: [Question]
**Blocks:** Epic [N], Issue [X.Y]
**Needs answer from:** [who]
**Suggested default:** [if any]
```

## Step 6: Summary

After creating all issues, output a summary:

```
## Creation Summary

**Platform:** GitHub (owner/repo) | Jira (PROJECT)
**Total epics:** [count]
**Total issues:** [count]

| Epic | Issues | Milestone/Epic Link |
|------|--------|-------------------|
| Epic 1: Foundations | [count] | [link] |
| Epic 2: [Name] | [count] | [link] |
| ... | ... | ... |

**Open questions created:** [count]

### Items not converted to issues:
- [Item]: [Reason]

### Next steps:
1. Review the created issues and adjust priorities
2. Resolve open questions labeled `needs-decision`
3. Begin with Epic 1: Foundations
```

## Important Boundaries

- **NEVER modify the requirements.** You organize and structure, you don't rewrite or
  re-interpret what the user documented.
- **NEVER add features** that aren't in the requirements document.
- **NEVER skip the approval step.** Always present the epic structure and wait for
  explicit confirmation.
- **NEVER create issues without confirming the target platform and repo/project.**
- If a requirement is ambiguous, create the issue with the ambiguity noted and add a
  `needs-decision` label — don't resolve the ambiguity yourself.
- If the requirements document is missing critical sections (no features, no user stories),
  tell the user and suggest they run the requirements-gatherer skill first.
