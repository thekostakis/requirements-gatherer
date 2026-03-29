# Requirements: Defect Gatherer Plugin

_Version: v1_
_Date: 2026-03-28_
_Status: Draft — pending review_

## Problem Statement

When defects are discovered during development or QA, there is no structured workflow
for documenting them with reproducible steps, classifying them correctly (true defect vs
requirement drift), linking them to the original requirements, and submitting them to the
team's system of record. Teams waste time writing incomplete bug reports, misclassifying
issues, and manually translating between local notes and issue trackers. This plugin
automates that workflow.

## Solution Overview

A Claude Code plugin containing two interactive skills. The defect-reporter conducts a
structured interview when a user encounters a bug, automatically generates reproduction
steps using browser inspection (visual bugs) or code tracing (API bugs), cross-references
the project's requirements to identify what's violated, classifies the issue as a true
defect, story update, or feature request, and produces a temporary structured file. The defect-organizer
then takes those files, matches them to existing epics/milestones, formats them for the
target issue tracker (GitHub, Jira, Linear, or GitLab), submits them, and archives the
local files.

## Users

### Primary: Developer or QA Engineer
- Currently working in the codebase with Claude Code
- Has encountered a defect during development, testing, or review
- Technical sophistication: comfortable with CLI tools and code
- Needs: fast, structured defect documentation with minimal manual effort
- Success: defect is documented with reproducible steps, linked to requirements,
  and submitted to the system of record in under 5 minutes

### Secondary: Project Lead / Product Owner
- Reviews submitted defects in the system of record
- Needs: clear, well-categorized defects with requirement traceability
- Success: can triage defects without asking for more context

## User Stories

**As a** developer, **I want to** report a visual bug by describing what I see
**so that** the tool automatically inspects the page, captures evidence, and generates
reproduction steps I can verify.
**Acceptance criteria:**
- Given a running dev server and Chrome tools available, when I describe a visual bug,
  then the reporter navigates to the page, takes screenshots, inspects CSS/console/network,
  and proposes step-by-step reproduction
- Given I verify the steps are accurate, then a structured defect file is created

**As a** developer, **I want to** report an API or logic bug by describing the unexpected
behavior **so that** the tool traces the relevant code path and proposes reproduction steps.
**Acceptance criteria:**
- Given a codebase with identifiable routes/services, when I describe an API bug,
  then the reporter reads the relevant code, traces the logic, and proposes a reproduction
  sequence (e.g., "POST /api/X with payload Y returns Z instead of expected W")
- Given I verify the steps, then a structured defect file is created

**As a** developer, **I want to** report multiple bugs in one session **so that** I don't
have to re-invoke the skill for each defect.
**Acceptance criteria:**
- Given I finish reporting one defect, when prompted "Any other defects to report?",
  then I can describe another and the skill creates a separate file for each

**As a** developer, **I want** the issue to be classified as a defect, story update, or
feature **so that** the right action is taken (fix code, update requirements, or build
new functionality).
**Acceptance criteria:**
- Given a bug where code doesn't match the spec, then it's classified as "defect"
- Given a bug where the spec itself needs updating, then it's classified as "story-update"
  and the report notes which epic/story should be updated for consistency
- Given a report where no requirement or code exists for the expected functionality,
  then it's classified as "feature" and the report notes which epic/section it should
  be added under, with a note that requirements should be updated
- Given the classification, the user must confirm or override before the report is finalized

**As a** developer, **I want** defects submitted to my team's issue tracker in the
system-native format **so that** they look like proper issues, not pasted markdown.
**Acceptance criteria:**
- Given GitHub is detected, issues use labels, milestones, and issue references idiomatically
- Given Jira is detected, issues use proper issue types, priorities, story links
- Given Linear is detected, issues use Linear's priority levels and project structure
- Given GitLab is detected, issues use labels, milestones, and MR references
- Given no integration is available, the organizer fails gracefully and preserves bug files

**As a** developer, **I want** defects linked to the requirements they violate **so that**
there's full traceability from requirement to defect.
**Acceptance criteria:**
- Given requirements.md exists, the defect report identifies the violated requirement
  and acceptance criteria
- Given submission to a system of record, the issue body references the requirement
  and uses system-native linking where possible

## User Flows

### Flow 1: Report a Visual Defect
1. User invokes defect-reporter and describes a visual bug
2. Skill collects full intake: description, expected vs actual, environment, frequency,
   any user-provided screenshots or errors
3. Skill checks for Chrome browser tools and dev server
4. Skill navigates to the affected page, takes screenshots
5. Skill inspects: computed CSS, console errors, network requests, DOM structure
6. Skill reads requirements.md to identify violated requirement/acceptance criteria
7. Skill proposes: severity or priority, classification (defect vs story-update vs
   feature), steps to reproduce, requirement reference, root cause hypothesis
8. User verifies each proposed element, confirms or corrects
9. Skill writes temp file to `defects/defect-YYYY-MM-DD-NNN.md`
10. Skill asks "Any other defects to report?"

**Error case — Chrome tools unavailable:**
- Skill informs user Chrome tools are not available
- Asks user how to proceed (provide screenshots manually, retry after setup, or cancel)

**Error case — Bug not reproducible:**
- Skill informs user it could not reproduce the issue
- Asks user how to proceed (file anyway with "not reproduced" flag, provide more context,
  or cancel)

### Flow 2: Report an API / Non-Visual Defect
1. User invokes defect-reporter and describes an API or logic bug
2. Skill collects full intake (same as visual flow)
3. Skill identifies the relevant code path: route handler, service layer, data access
4. Skill reads requirements.md to identify violated requirement/acceptance criteria
5. Skill traces the code logic to propose reproduction steps
   (e.g., "1. POST /api/orders with {item: 'x', qty: 2}, 2. GET /api/orders/123,
   3. Observe: status is 'pending' but should be 'confirmed' per acceptance criteria")
6. Skill proposes: severity, classification, steps to reproduce, requirement reference,
   root cause hypothesis
7. User verifies, confirms or corrects
8. Skill writes temp file
9. Skill asks "Any other defects to report?"

### Flow 3: Submit Defects to System of Record
1. User invokes defect-organizer
2. Skill scans `defects/` directory for pending defect files
3. If no files found, informs user and stops
4. Skill auto-detects available integrations (CLI → MCP → API for each platform)
5. Presents detected platforms to user, asks which to use
6. If none detected, fails gracefully — does NOT delete bug files
7. Skill reads each defect file and matches to existing epics/milestones
8. For unmatched defects, proposes new epic/label
9. Presents submission plan to user with: defect → target epic → issue type → severity
10. **STOP gate**: User must approve before any issues are created
11. Skill creates issues in system-native format with requirement links
12. Skill moves submitted bug files to `defects/.archived/`
13. Skill reports: issues created, links, any failures

**Error case — Submission partially fails:**
- Successfully submitted files are archived
- Failed files remain in `defects/` with error noted
- Skill reports which succeeded and which failed

## Features

- **Full intake interview**: Collects description, expected vs actual behavior, environment,
  frequency, and user-provided evidence before investigation begins
- **Visual bug inspection**: Uses Chrome browser tools for screenshots, computed CSS,
  console errors, network requests, and DOM structure analysis
- **Code path tracing**: Reads route handlers, services, and data access layers to
  propose API/logic bug reproduction steps
- **Requirement cross-referencing**: Identifies violated requirements and acceptance
  criteria from requirements.md and addendums; proposes root cause
- **Three-way classification**: Distinguishes between code not matching spec (defect),
  spec needing to change (story-update), and missing functionality (feature). Story
  updates note which epic/story should be updated. Features note which epic/section the
  new functionality should be added under, with a note that requirements should be updated
- **Smart severity/priority inference**: Defects and story-updates use severity
  (Critical/High/Medium/Low). Features use priority (Must-have/Should-have/Nice-to-have).
  User confirms or overrides
- **Independent reproduction verification**: Attempts to reproduce the bug before filing.
  If unable to reproduce, informs user and asks how to proceed
- **Multi-bug sessions**: After completing one report, asks if there are more defects.
  Each gets its own file
- **Neutral intermediate file format**: Platform-agnostic structured markdown that the
  organizer translates per system
- **Multi-platform submission**: GitHub (gh CLI), Jira (MCP), Linear (CLI/MCP/API),
  GitLab (glab CLI/MCP/API) with CLI → MCP → API fallback chain
- **System-native formatting**: Each platform's issues use native fields, types, and
  conventions
- **Requirement linking**: System-native issue links (Jira) or references (GitHub/GitLab)
  plus body text reference
- **Epic/milestone matching**: Matches defects to existing epics/milestones from
  requirements-organizer. Creates new ones if no match
- **Distinct issue types**: True defects get bug/defect type. Story updates get
  story/task type. Features get story/feature type. Each has distinct labels
- **Archive after submission**: Submitted files move to `defects/.archived/`. Cleanup is
  manual
- **Fail-safe on no integration**: If no system of record is available, organizer fails
  and preserves all bug files

## Data Model (Conceptual)

- A **Defect Report** has one classification (defect, story-update, or feature), one
  severity (defects/story-updates) or one priority (features), one or more reproduction
  steps, zero or one requirement reference, and zero or one root cause hypothesis
- A **Defect Report** references zero or one violated Requirement from requirements.md
- A **Defect Report** may reference one or more Addendum items
- A **Defect Report** maps to exactly one Issue in the system of record after submission
- An **Issue** belongs to one Epic/Milestone in the system of record
- A **Story Update** references an existing Epic/Story that needs modification

## Integration Points

- **Chrome browser tools (MCP)**: Used for visual bug inspection — screenshots, CSS,
  console, network, DOM. If unavailable, visual bugs lose automated reproduction but
  the skill still functions with manual input
- **GitHub (gh CLI)**: Issue creation, label management, milestone assignment, issue
  linking. Primary integration method for GitHub
- **Jira (MCP tools)**: Issue creation with native types (Bug, Story, Task), priority
  fields, epic linking, story linking
- **Linear (CLI → MCP → API)**: Issue creation with priority levels, project assignment,
  label management
- **GitLab (glab CLI → MCP → API)**: Issue creation, label management, milestone
  assignment, MR references
- **Local filesystem**: Reads requirements.md and addendums. Writes temp files to `defects/`.
  Archives to `defects/.archived/`
- **Codebase (read-only)**: Reads source code for API bug code path tracing. Never modifies
  application code

## Non-Functional Requirements

- **Speed**: Single defect report should complete in under 5 minutes including verification
- **Reliability**: Submission failures must not delete local bug files
- **Graceful degradation**: Missing Chrome tools degrades visual inspection but doesn't
  block reporting. Missing requirements.md loses traceability but doesn't block reporting.
  Missing system of record integration fails explicitly

## Constraints

- Must follow the existing plugin authoring conventions (SKILL.md structure, plugin.json,
  marketplace.json)
- Must be installable via the same marketplace mechanism as other plugins
- Skills are prompt engineering artifacts (markdown), not application code
- Must work within Claude Code's tool ecosystem (MCP tools, CLI tools, file read/write)
- Version must be bumped in both plugin.json and marketplace.json

## Assumptions

- **Chrome MCP tools are installed for visual inspection**: Impact if wrong: visual bugs
  lose automated CSS/console/network inspection; skill must handle gracefully with clear
  messaging
- **requirements.md exists in the working directory**: Impact if wrong: no requirement
  traceability or root cause inference from acceptance criteria; skill still functions
  but produces less rich reports
- **A dev server is running for visual bug reproduction**: Impact if wrong: can't navigate
  to pages or capture screenshots; skill must ask for URL or accept manual description
- **The system of record has proper API/CLI access configured**: Impact if wrong: organizer
  can't submit; fails gracefully and preserves files
- **Existing epics/milestones exist from requirements-organizer**: Impact if wrong:
  organizer can't match; creates new epics or asks user

## Risks

- **Linear and GitLab integrations are less proven**: The existing plugin ecosystem only
  has battle-tested patterns for GitHub (gh CLI) and Jira (MCP). Linear and GitLab
  integrations may require more experimentation.
  Likelihood: Medium. Impact: Medium.
  Mitigation: Implement GitHub and Jira first, then add Linear and GitLab with explicit
  "experimental" status if tooling proves unreliable
- **Story update classification accuracy**: Distinguishing "code is wrong" from
  "spec is wrong" requires nuanced judgment.
  Likelihood: Medium. Impact: Medium.
  Mitigation: Always present classification to user for confirmation; never auto-file
  without user approval
- **Code path tracing depth**: For large codebases, tracing from route to data access
  may be slow or incomplete.
  Likelihood: Medium. Impact: Low.
  Mitigation: Set reasonable depth limits; present partial traces with "I traced as far
  as [X], does this look right?"

## Success Criteria

- A visual defect can be reported with auto-generated reproduction steps using Chrome
  inspection in a single skill invocation
- An API defect can be reported with auto-generated reproduction steps from code tracing
  in a single skill invocation
- The user verifies all reproduction steps, severity, and classification before a
  report is finalized
- Defect reports correctly identify the violated requirement from requirements.md
- Story updates are clearly distinguished from true defects with a note about which
  story needs updating
- The defect-organizer successfully submits to GitHub and Jira with system-native
  formatting
- The defect-organizer successfully submits to Linear and GitLab with system-native
  formatting
- Submitted issues link back to the violated requirement
- Bug files are archived after successful submission and preserved on failure
- The organizer fails explicitly when no integration is available

## Open Questions

- **Linear CLI availability**: Does the user's environment have the Linear CLI installed,
  or will MCP/API be the primary path? Who: User. Blocked: Linear integration implementation.
  Default: Try CLI first, fall back to MCP/API
- **GitLab API authentication**: How will GitLab API auth be handled if CLI and MCP are
  unavailable? Who: User. Blocked: GitLab API fallback. Default: Require glab CLI or
  MCP; skip API fallback for v1

## Glossary

- **True defect**: Code behavior that contradicts the documented requirements or acceptance
  criteria. The code needs to change.
- **Story update**: A case where the documented requirement itself is outdated or wrong,
  and the spec needs to change to reflect intended behavior. The requirement needs updating,
  not necessarily the code.
- **Feature**: Functionality that does not exist yet — not in the requirements and no code
  implements it. The user expected it, but it was never specified or built. Filed as a
  feature request under the appropriate epic, with a note that requirements should be updated.
- **System of record**: The team's authoritative issue tracking system (GitHub Issues,
  Jira, Linear, or GitLab)
- **Neutral intermediate format**: A platform-agnostic structured markdown file that the
  defect-organizer translates into system-native format at submission time
- **Full intake**: The complete set of information collected from the user before
  investigation: description, expected vs actual behavior, environment, frequency,
  and any evidence
