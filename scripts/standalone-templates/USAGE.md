# Usage: Defect and Requirements Tools

Four skills, four workflows. Each skill activates from natural trigger phrases, so you do
not need to remember a slash command. Start a Claude Code session in the project you want
to work in, then tell Claude what you want to do. The skills will ask follow-up questions
one at a time and always show you a plan before writing or submitting anything.

---

## 1. Define what to build (before writing code)

**Skill:** `requirements-gatherer`
**Trigger phrases:** "gather requirements", "let's do a requirements interview", "I want
to scope a new project", "build out requirements for X".

### What it does

Interviews you as a senior product consultant would — one question at a time. It does
not jump straight to features. It asks about the business problem, who the users are,
what success looks like, what could go wrong, and what constraints are non-negotiable
before it ever talks about user stories. The finished document is written to
`requirements.md` in your working directory.

The interview covers problem statement, solution overview, users and their context, user
stories with Given/When/Then acceptance criteria, user flows, features with dependencies,
a conceptual data model, integration points, non-functional requirements (performance,
scale, availability, security, accessibility), regulatory and compliance notes,
constraints, assumptions with "impact if wrong" analysis, risks with likelihood and
mitigation, success criteria, open questions, and a project-specific glossary.

### Modes

The skill detects which mode to use from your working directory:

- **New mode.** No `requirements.md` exists. The interview produces one from scratch.
- **Addendum mode.** A `requirements.md` exists and you want to add or change something.
  The skill writes `requirements-addendum-YYYY-MM-DD.md` with only the deltas — new
  features, modified features, impact on existing requirements — so the baseline file
  stays clean and reviewable.
- **Source-sync mode.** You already have code, docs, or an external URL and want
  `requirements.md` derived or reconciled against them. Say "sync requirements from the
  repo" or "extract requirements from these docs". The skill reads your sources,
  produces `requirements-source-sync-YYYY-MM-DD.md` with an inventory of sources, a
  behavioral extraction citing file paths, a gap/drift analysis against any existing
  `requirements.md`, and proposed edits. Nothing gets written to `requirements.md`
  until you explicitly approve.

### Example output (new mode, abbreviated)

```markdown
# Requirements: Merkle Digital Twin Platform

_Version: v1_
_Date: 2026-04-10_
_Status: Draft — pending review_

## Problem Statement
Merkle's analytics team rebuilds the same customer segmentation models for each new
engagement, costing roughly 40 hours per client and creating drift between how different
teams describe the same customer behaviors...

## Users
- **Analytics consultants** — build segmentation models for client engagements. Daily
  users, strong SQL, limited platform engineering...

## User Stories
**As an** analytics consultant, **I want to** fork a client's prior segmentation model
**so that** I can start a new engagement with validated behavioral groupings instead of
from scratch.
**Acceptance criteria:**
- Given an existing model tagged with a client ID, when I click "fork", then a new
  editable copy appears in my workspace with all groupings preserved.

## Features
- **Model fork and clone**: create a working copy of any segmentation model
  - User story reference: consultant fork story above
  - Acceptance criteria: fork preserves all groupings; original remains read-only
  - Dependencies: model storage, access control
```

The real file has fourteen more sections. The point is that it is written in plain
language, not jargon, and every requirement has measurable criteria you can test against
later.

---

## 2. Turn requirements into GitHub or Jira issues

**Skill:** `requirements-organizer`
**Trigger phrases:** "create issues from requirements", "organize requirements into
epics", "push requirements to GitHub", "push requirements to Jira".

### What it does

Reads `requirements.md` (and any addendum files), groups features and user stories into
epics, and creates issues on GitHub or Jira with links back to the requirement sections
that motivated them. It shows you the full plan — every epic, every story, every
parent/child relationship — and waits for your explicit confirmation before creating
anything. Nothing is submitted silently.

On GitHub it creates milestones (one per epic) and issues with labels. On Jira it
creates epics and stories under the configured project with proper parent links.

---

## 3. Report a bug you just found

**Skill:** `defect-reporter`
**Trigger phrases:** "I found a bug", "report a defect", "file an issue", "something's
broken", "this isn't working", "the layout is broken", "this endpoint returns 500", "the
button doesn't do anything", "wrong error message", "used to work".

### What it does

Conducts a structured intake interview and produces a defect file at
`defects/defect-YYYY-MM-DD-NNN.md`. It never modifies code and never edits requirements.
Its output is always documentation.

The reporter takes two different investigation paths depending on what kind of bug you
describe, and it will ask you to disambiguate if the classification is unclear.

### Visual path

Triggered when the bug is about something you can see: layout, styling, rendering,
responsive behavior, visual glitches. If headless Playwright is available, the reporter
will use it automatically to:

- Navigate to the page URL you provide and capture a full-page screenshot to
  `defects/evidence/`
- Produce an accessibility snapshot (a tree of roles and names for every element)
- Read computed styles for the affected element (color, padding, font, borders, and so
  on)
- Collect any JavaScript console errors and warnings after a reload
- Record the network requests the page made

Every captured file goes into the defect report's `## Attachments` block so the
organizer can later upload them to the ticket.

If Playwright is not installed, the reporter will offer to auto-install it. If you
decline or install fails, it falls back to asking you for screenshots and a description,
and builds the report from what you provide. It never silently skips the capture phase —
if it cannot inspect the page, it will tell you.

### API / non-visual path

Triggered when the bug is about data, logic, backend behavior, authentication, broken
business rules, wrong computations, or any non-visual failure. On this path the reporter
**analyzes your source code** instead of opening a browser. It:

- Searches for the affected route or function by name and usage
- Finds the handler or controller method
- Traces the full call chain — route to handler to service to data access
- Reads validation logic, business rules, and state transition code
- Identifies where the actual behavior diverges from what you described as expected
- Proposes specific, concrete reproduction steps based on what the code actually does

So if you say "orders stuck in pending status after payment confirms," the reporter will
actually read the payment handler, follow it through the order service, find the status
transition logic, and come back with reproduction steps like "POST `/api/orders` with a
test card number, then GET `/api/orders/{id}` — observe the status field is `pending`
but should be `confirmed` per the payment webhook handler at `services/payments.ts:147`."

It does this silently. It does not announce every file it reads. It comes back with
informed questions and a concrete root cause hypothesis grounded in what the code
actually does.

### Classification

After investigation, the reporter always asks you to confirm one of three
classifications. It will not file the report until you agree:

- **defect** — the code contradicts an existing documented requirement. The code should
  change.
- **story-update** — the requirement itself is outdated or wrong. The spec should change
  to match intended behavior.
- **feature** — no code implements this and no requirement specifies it. It's a gap,
  not a bug.

If a `requirements.md` exists in the working directory, the reporter reads it during
investigation and cross-references the affected behavior against the documented
acceptance criteria. This is how it can tell the difference between "the code is wrong"
and "the spec is wrong."

### Example: visual defect output (abbreviated)

```markdown
# Defect Report: Signup button unreadable on mobile homepage

_ID: defect-2026-04-10-004_
_Date: 2026-04-10_
_Status: Pending submission_
_Classification: defect_
_Severity: High_
_Reproduced: Yes_

## Description
On merkle.com the primary "Start a project" CTA on the homepage hero has white text on
a light grey background when viewed on viewports narrower than 768px. The same button is
clearly readable on desktop.

## Expected Behavior
Text contrast should meet WCAG 2.1 AA (4.5:1 for normal text) on all viewports. Per
Requirements.md §Non-Functional Requirements, the site must meet WCAG 2.1 AA compliance.

## Actual Behavior
Computed color #FFFFFF on computed background-color #E8E8E8. Measured contrast ratio
1.48:1. Well below the 4.5:1 threshold.

## Environment
Chromium 120 headless, viewport 375x667, dev server https://staging.merkle.com

## Frequency
Always

## Steps to Reproduce
1. Navigate to https://staging.merkle.com/ in a viewport narrower than 768px
2. Locate the hero section primary CTA
3. Observe the button text is effectively invisible against the background

## Evidence
- Screenshots: defects/evidence/visual-cta-contrast-mobile.png
- Console errors: none
- Network failures: none
- CSS issues: .hero__cta--primary color:#FFFFFF background:#E8E8E8 on viewport <768px

## Attachments
- defects/evidence/visual-cta-contrast-mobile.png
- defects/evidence/computed-styles-cta.json

## Requirement Reference
- **Requirement**: §Non-Functional Requirements — Accessibility
- **Acceptance Criteria**: WCAG 2.1 AA compliance
- **Source file**: requirements.md

## Root Cause Hypothesis
The mobile media query at components/Hero.module.css line 84 overrides the background
but leaves the text color inherited from the desktop variant. The dark-background color
value was never re-applied at the mobile breakpoint.
```

### Example: API defect output (abbreviated)

```markdown
# Defect Report: Campaign report export returns empty CSV for accounts with active segments

_ID: defect-2026-04-10-005_
_Classification: defect_
_Severity: High_
_Reproduced: Yes_

## Description
When a Merkle analytics consultant clicks "Export report" on a campaign that has any
active audience segment, the downloaded CSV contains only headers and zero rows. The
same export works for campaigns without segments.

## Expected Behavior
Per requirements.md §Features "Campaign report export", the CSV should contain one row
per impression in the report's date range regardless of whether segments are active.

## Actual Behavior
CSV contains headers only, zero data rows.

## Steps to Reproduce
1. POST /api/campaigns with payload { "segments": ["premium-users"] }
2. GET /api/campaigns/{id}/report?format=csv&from=2026-01-01&to=2026-03-31
3. Observe the CSV is empty below the header row

## Code References
- Handler: api/campaigns/[id]/report.ts:42 — CampaignReportHandler.exportCsv
- Service: services/reports/csv-builder.ts:118 — buildRowsForCampaign
- The bug: buildRowsForCampaign inner join filters impressions by segment_id, but
  segment_id is null for impressions pre-dating the segment's creation. The left join
  should include pre-segment impressions as well.

## Root Cause Hypothesis
Line 118 of csv-builder.ts uses an INNER JOIN between impressions and segment_memberships,
filtering out any impression that predates segment creation. Requirements.md §Features
says exports should include all impressions in the date range. The join should be a
LEFT JOIN with segment_memberships, and the segment filter should live in the WHERE
clause using COALESCE to handle null segment_ids.
```

Notice that the reporter traced real file paths and identified a specific line where
the logic diverges from the requirement. That level of detail comes from reading the
code, not from guessing.

---

## 4. Push defect files into tickets

**Skill:** `defect-organizer`
**Trigger phrases:** "push defects to GitHub", "submit the bugs", "create tickets from
defects", "file these with Jira".

### What it does

Reads every pending file in `defects/`, detects which issue trackers are available
(GitHub, Jira, Linear, GitLab), shows you the full submission plan, and waits for
confirmation. It groups defects into the right epics or milestones, sets the right
labels and severity, and links back to the originating defect file.

On GitHub it creates milestones, labels like `defect`, `story-update`, `feature`, and
severity labels, then one issue per defect file. On Jira it creates Bug, Story, or Task
issues with priority mapped from severity.

### Screenshots in tickets

If your defect files have entries in the `## Attachments` block (visual defects captured
by the reporter will), the organizer will upload them:

- **GitHub.** The organizer creates or reuses a shared release named `defect-evidence`
  in the target repository and uploads every attachment as a release asset, namespaced
  by defect ID (`defect-2026-04-10-004--visual-cta-contrast-mobile.png`). The issue body
  then embeds each image inline using the release's public download URL so screenshots
  render directly in GitHub's UI.
- **Jira.** Screenshots are uploaded as native Jira attachments and referenced in the
  issue description with `attachment://<filename>` so Jira renders them inline.
- **Linear and GitLab.** Attachment upload is not implemented in this version. The
  organizer lists attachment paths as text in the issue body with a note pointing to
  manual upload through the platform's UI.

If the upload tool is missing (say you picked GitHub but `gh` isn't authenticated), the
organizer will stop, tell you exactly what's missing, and ask whether to proceed with
text-only issues or abort. It will not silently skip uploads.

### Example: what the visual defect above looks like as a GitHub issue

```markdown
## Bug Report

**Severity:** High
**Reproduced:** Yes
**Frequency:** Always

## Description
On merkle.com the primary "Start a project" CTA on the homepage hero has white text on
a light grey background when viewed on viewports narrower than 768px. The same button is
clearly readable on desktop.

## Steps to Reproduce
1. Navigate to https://staging.merkle.com/ in a viewport narrower than 768px
2. Locate the hero section primary CTA
3. Observe the button text is effectively invisible against the background

## Expected Behavior
Text contrast should meet WCAG 2.1 AA (4.5:1 for normal text) on all viewports.

## Actual Behavior
Computed color #FFFFFF on computed background-color #E8E8E8. Measured contrast ratio
1.48:1. Well below the 4.5:1 threshold.

## Attachments
![visual-cta-contrast-mobile.png](https://github.com/merkle/platform/releases/download/defect-evidence/defect-2026-04-10-004--visual-cta-contrast-mobile.png)

[computed-styles-cta.json](https://github.com/merkle/platform/releases/download/defect-evidence/defect-2026-04-10-004--computed-styles-cta.json)

## Environment
Chromium 120 headless, viewport 375x667, dev server https://staging.merkle.com

## Root Cause Hypothesis
The mobile media query at components/Hero.module.css line 84 overrides the background
but leaves the text color inherited from the desktop variant. The dark-background color
value was never re-applied at the mobile breakpoint.

## Requirement Reference
Violates: §Non-Functional Requirements — Accessibility — WCAG 2.1 AA compliance
Source: requirements.md

_Filed via defect-gatherer plugin_
_Source: defect-2026-04-10-004_
```

The `![...]` line renders as the actual screenshot inline in GitHub. The `[...]` line
renders as a clickable link for the non-image attachment. No dead path text — real
rendered assets.

### Archiving and retries

Successfully submitted defect files are moved to `defects/.archived/`. Failures stay in
`defects/` so you can fix the problem and re-run the organizer. The session summary at
the end lists every created issue with its link, every archived file, every failure,
and any attachment upload failures in a separate table so you can see exactly what
landed and what didn't.

---

## What these skills will and won't do

**They WILL:**

- Conduct structured interviews and produce real markdown documents you can review.
- Analyze your actual source code when investigating API bugs — not guess from the
  description.
- Capture real browser evidence for visual bugs using headless Playwright when available.
- Create issues in the tracker you configure and upload screenshots to the ones that
  support it (GitHub, Jira).
- Always show you a plan and wait for explicit confirmation before taking any action
  that changes state (writing files, creating issues, modifying the release).
- Tell you explicitly when a tool is missing or a step cannot run the way it normally
  would.

**They WON'T:**

- Modify your application code. The reporter and organizer are strictly report-only.
- Invent defects or requirements you didn't describe. They never fabricate.
- Fix bugs. They classify, document, and file — fixing is a separate step you own.
- Proceed past a confirmation gate without your explicit approval.
- Silently skip steps when a tool is unavailable. If headless Playwright is missing
  they will tell you. If `gh` is not authenticated they will tell you. If your Jira MCP
  doesn't support attachments they will tell you.
- Overwrite `requirements.md` without your review. Source-sync mode always produces a
  separate review artifact first.

---

## Quick reference

| I want to... | Say to Claude Code | Produces |
|--------------|-------------------|----------|
| Scope a new project | "gather requirements for X" | `requirements.md` |
| Add to an existing spec | "add requirements for X" | `requirements-addendum-YYYY-MM-DD.md` |
| Derive requirements from code/docs | "sync requirements from the repo" | `requirements-source-sync-YYYY-MM-DD.md` then (after approval) `requirements.md` |
| Turn my requirements into tickets | "create issues from requirements" | GitHub milestones+issues or Jira epics+stories |
| Report a visual bug | "the layout is broken on ..." | `defects/defect-YYYY-MM-DD-NNN.md` + captures under `defects/evidence/` |
| Report an API/logic bug | "this endpoint returns 500 for ..." | `defects/defect-YYYY-MM-DD-NNN.md` with code references |
| File my defects as tickets | "push defects to GitHub" or "... to Jira" | Issues with inline screenshots (GitHub/Jira) or text paths (Linear/GitLab) |
