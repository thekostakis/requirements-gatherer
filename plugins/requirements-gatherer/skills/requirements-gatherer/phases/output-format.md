# Output Format Templates

---

## §NewMode — requirements.md Format

Write the file as `requirements.md` in the working directory root. Use exactly this structure:

```markdown
# Requirements: [Project Name]

_Version: v1_
_Date: [YYYY-MM-DD]_
_Status: Draft — pending review_

## Problem Statement
[What's broken or missing and the business impact. Be specific about who is affected
and what it costs them — time, money, risk, or opportunity.]

## Solution Overview
[One paragraph. What we're building and why. Technology-agnostic. Describe what it does
and the value it provides, not how it's built. A reader with no technical background
should understand this paragraph.]

## Users
[For each user type: who they are, their context, their technical level, what they
need from this system, and what success looks like for them.]

## User Stories
[For each story:]

**As a** [specific user role], **I want to** [concrete action] **so that** [measurable outcome]
**Acceptance criteria:**
- Given [specific context], when [specific action], then [specific expected result]

## User Flows
[Step-by-step flows for each primary use case. Describe what the user experiences and
decides at each step. Include error cases and edge cases. Do not describe UI elements —
describe actions and outcomes.]

## Features
[For each feature:]
- **[Feature name]**: [What it does, written as a capability]
  - User story reference: [if applicable]
  - Acceptance criteria: [testable conditions]
  - Dependencies: [other features this requires]

## Data Model (Conceptual)
[Entities and their relationships. Key attributes for each entity. Cardinality of
relationships. Do not include data types, field lengths, or schema notation. A sentence
like "A Project has many Tasks, each assigned to one User" is the right level.]

## Integration Points
[For each external system:]
- **[System name]**: [What data or capability is needed from this system. What triggers
  the integration. What happens if the integration is unavailable.]

## Non-Functional Requirements
[Specific, measurable targets:]
- Performance: [e.g., "Page loads under 2 seconds at P95"]
- Scale: [e.g., "Support 10,000 concurrent users"]
- Availability: [e.g., "99.9% uptime during business hours"]
- Security: [e.g., "All data encrypted at rest and in transit"]
- Accessibility: [e.g., "WCAG 2.1 AA compliance"]

## Regulatory & Compliance
[Specific regulations that apply, what compliance level is required, consequences of
non-compliance, and any certification requirements.]

## Constraints
[Preferences and limitations that constrain implementation decisions without making them.
Examples: "Team has Python expertise," "Must integrate with existing Salesforce instance,"
"Budget is $X/month for infrastructure," "Must launch by Q3."]

## Assumptions
[For each assumption:]
- [Assumption statement]: **Impact if wrong:** [What breaks, what changes, what gets
  re-scoped if this assumption turns out to be false]

## Risks
[For each risk:]
- **[Risk name]**: [Description of the risk and why it matters].
  Likelihood: [High/Medium/Low]. Impact: [High/Medium/Low].
  Mitigation: [Specific action to reduce likelihood or impact]

## Success Criteria
[Specific, testable outcomes that define "done." Each criterion should be verifiable
without subjective judgment. "Users can complete checkout in under 3 clicks" not
"checkout is easy."]

## Open Questions
[Items that need answers before or during build. For each: who needs to answer it,
what's blocked until it's answered, and any suggested default if no answer comes.]

## Glossary
[Terms that have specific meaning in this project's context:]
- **[Term]**: [Definition as it applies to THIS project, not the general definition]
```

---

## §AddendumMode — requirements-addendum Format

Write the file as `requirements-addendum-[YYYY-MM-DD].md` in the working directory root.
The datestamp allows multiple addendums to coexist.

Only include sections that have content. Omit empty sections entirely.

```markdown
# Requirements Addendum: [Project Name]

_Date: [YYYY-MM-DD]_
_Status: Draft — pending review_
_Baseline: requirements.md (v[N], [original date])_

## Summary of Changes
[One paragraph: what's being added or changed, and why. This should be readable as a
standalone summary of the delta.]

## New Features
[For each new feature:]
- **[Feature name]**: [What it does, written as a capability]
  - User story reference: [if applicable]
  - Acceptance criteria: [testable conditions]
  - Dependencies: [existing features or other new features this requires]

## Modified Features
[For each existing feature being changed:]
- **[Existing feature name]**: [What changed]
  - Original: [Brief summary of the feature as currently documented]
  - Changed to: [What it should be now]
  - Reason: [Why the change is needed]
  - Acceptance criteria: [Updated testable conditions]

## New User Stories
[Same format as the original requirements:]

**As a** [specific user role], **I want to** [concrete action] **so that** [measurable outcome]
**Acceptance criteria:**
- Given [specific context], when [specific action], then [specific expected result]

## New/Modified User Flows
[Only flows that are new or changed. For modified flows, note what step(s) changed
and reference the original flow by name.]

## Data Model Changes
[New entities, new relationships, or modifications to existing entities/relationships.
For modifications, state what exists now and what it should become.]

## New Integration Points
[Any new external systems, in the same format as the original.]

## Updated Non-Functional Requirements
[Only requirements that changed. State the old target and the new target.]

## New/Updated Assumptions
[For each:]
- [Assumption statement]: **Impact if wrong:** [what breaks]
[For updated assumptions, note what the original assumption was.]

## New/Updated Risks
[For each:]
- **[Risk name]**: [Description]. Likelihood: [H/M/L]. Impact: [H/M/L].
  Mitigation: [action]
[For updated risks, note what changed from the original assessment.]

## Impact on Existing Requirements
[This section is MANDATORY if any modifications exist. For each existing feature, flow,
assumption, or risk affected by these additions:]
- **[Existing item name]**: [What changes about it and what stays the same.
  Be specific enough that someone reading only this section understands the ripple effects.]

## New Open Questions
[Questions raised by the additions. For each: who needs to answer, what's blocked,
suggested default.]

## New Glossary Terms
- **[Term]**: [Definition in this project's context]
```

---

## §SourceSync — requirements-source-sync-[YYYY-MM-DD].md Format

Write under the working directory root. This file is the **review gate** before any change
to `requirements.md`.

Only include sections that have content. Omit empty sections entirely.

```markdown
# Requirements source sync: [Project or product name]

_Date: [YYYY-MM-DD]_
_Status: Draft — pending review_
_Sources: [short list]_

## Executive summary
[What was inferred from sources, how it compares to current `requirements.md` if one exists,
and the main gaps or drifts in 5-8 sentences.]

## Source inventory
| Source | Type | Trust | Notes |
|--------|------|-------|-------|

## Behavioral extraction
[Organize by Features, User flows, Users, NFRs, Integrations, Data concepts (conceptual only),
Compliance — as needed. Every substantive bullet should cite evidence: file path, URL, or
export reference.]

## Gap and drift analysis
### Gaps (missing from requirements.md)
- ...

### Drift (conflicts with requirements.md)
- ...

### Aligned (already documented)
- ...

## Conflicts and ambiguities
[Where sources disagree or evidence is weak. For each: options A/B, questions for the user,
and **leave unresolved** until the user answers — or note the resolution if already cleared
in-session.]

## Proposed edits to requirements.md
[Section-by-section. For each proposed change:]
- **Section:** [e.g. Features / User Flows / …]
- **Current (summary or short quote):** ...
- **Proposed:** ...
- **Rationale:** ...
- **Risk if wrong:** ...

## Confirmation checklist (for the user)
- [ ] I reviewed this sync artifact
- [ ] Conflicts were resolved (or listed as open questions)
- [ ] I approve creating or updating `requirements.md` as discussed (or I want an addendum only)

## Next step
[One sentence: e.g. "After you confirm, I will write requirements.md" or "apply section X
only."]
```
