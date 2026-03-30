# requirements-gatherer

A Claude Code plugin marketplace for product design, project planning, and testing workflows.

## Plugins

### requirements-gatherer

A senior product consultant that interviews you to understand what you want to build, then produces a structured `requirements.md` file. It defines WHAT and WHY, never HOW — no architecture, no tech recommendations, no implementation details.

Supports two modes:

**New mode** — when no `requirements.md` exists, runs a full requirements interview from scratch.

**Addendum mode** — when `requirements.md` already exists, reads it first, then interviews you about what's new or changing. Produces a separate `requirements-addendum-[date].md` file. The original is never modified.

**Trigger phrases:**
- New: "gather requirements", "requirements interview", "what should we build", "help me define the requirements", "I want to build [something]"
- Addendum: "add requirements", "update requirements", "I want to add a feature", "add to requirements"

**What it does:**
- Asks 1-2 questions at a time, pushes back on vagueness, names patterns
- Silently researches your domain to ask informed questions
- Proactively surfaces gaps you haven't considered
- Challenges scope creep and helps find the MVP
- In addendum mode, flags contradictions with existing requirements and traces ripple effects
- Produces a structured document after a narrative playback and confirmation step

#### requirements-organizer

Reads a reviewed `requirements.md` or `requirements-addendum-*.md` and creates structured epics and issues in GitHub or Jira. You trigger this after reviewing and editing the requirements document.

Supports two modes:

**Full mode** — reads `requirements.md`, groups features into dependency-ordered epics, creates milestones, labels, and issues from scratch.

**Addendum mode** — reads a `requirements-addendum-*.md` file, fetches existing milestones and issues, then creates only what's new or changed:
- New features become new issues in existing milestones (or new milestones if needed)
- Modified features create a new issue that supersedes the old one (old issue is closed with a link to the replacement)
- New open questions become separate `needs-decision` issues
- Existing milestones and labels are reused, not duplicated

**Trigger phrases:** "create issues from requirements", "organize into epics", "push to GitHub", "push to Jira", "create tickets"

**What it does:**
- Groups features into dependency-ordered epics (Epic 1 is always Foundations)
- Presents the epic structure for your approval before creating anything
- Creates milestones + issues (GitHub) or epics + stories (Jira)
- Falls back to a `backlog.md` file if no GitHub/Jira integration is available
- Open questions become `needs-decision`-labeled issues
- Verifies everything was created correctly before reporting the summary

### visual-design

#### visual-design-consultant

Establishes a project's visual design system through plain-language interview or by extracting patterns from example websites. Produces `design-guidelines.md` (core tokens, permanently in CLAUDE.md context) and a component compendium (`design/components/`) with detailed per-component specs.

**Trigger phrases:** "design system", "visual design", "extract design from [site]", "I want it to look like [site]", "design guidelines"

**What it does:**
- Extracts design patterns from example sites (sitemap via WebFetch, CSS extraction + screenshots via Chrome, multi-site conflict resolution)
- Interviews in plain language — no design expertise needed
- Produces compact design-guidelines.md (under 500 lines) for permanent context
- Generates per-component spec files in design/components/
- Supports addendum mode to update existing design systems

#### component-context (skill + **`visual-design:component-context`** agent)

**Off-thread** lookup with three behaviors: **(1)** exact or high-confidence (~90%) fuzzy → the **entire** matched component spec file (full markdown) + **motion guidance**, no long briefing; **(2)** ambiguous fuzzy → **auto top 3** full specs + **pattern synthesis** + **motion**; **(3)** no match → inferred guidance + motion from guidelines. Further candidates stay one-line only — never the whole compendium.

**Trigger phrases:** see the skill `description` in the plugin (e.g. "load component spec", "which component should I use", "no spec for", "map this UI to components"). Prefer **dispatching the agent** when implementing so the main session stays lean.

#### design-reviewer

Senior creative director quality gate. Verifies implemented UI against the design system through **chrome-devtools-mcp** (live browser inspection): visual appearance, CSS/token compliance, accessibility (axe), motion, responsive behavior, and **Nielsen’s 10 usability heuristics** with a **0–100 UX score**. Supports **diff mode** (compare to a prior `design-review-*.md` report) and can consume **`design/review-checklist.md`** from the consultant.

**Trigger phrases:** "review component", "design review", "check against design system", "visual review", "run design tests", "implement epic", "implement milestone", "implement feature", "perform a design review of [requirements]"

**Modes (high level):**
- **Post-implementation gate** — standard review after a component or page is built
- **Follow-up / diff** — re-review after fixes, compared to the last saved report
- **Requirements-driven** — trace tickets/epics/requirements to what is implemented in the UI

**What it does (report-only):**
- Produces a structured report with **blocking** vs **low** issues and fix suggestions — it does **not** apply code or design changes
- Tags suggestions that would **change product behavior** (flows, confirmations, validation, navigation, etc.) so the **human approves before implementation** — see `docs/REVIEWER-FUNCTIONAL-CHANGE-PLAN.md`
- Uses an opus + haiku agent split: mechanical inspection vs UX/heuristics synthesis (see `CLAUDE.md`)

### functional-tester

Generates and runs **Playwright** functional tests for pages and visual flows. **TDD-style loop:** write tests, run, fix failures (implementation or test bugs), re-run — with Playwright AI agents, **accessibility-tree selectors**, **@axe-core/playwright**, **visual regression** (`toHaveScreenshot`), and optional **Lighthouse budget** files. After tests, runs **Lighthouse**, **axe**, and a **performance deep-dive** (network waterfall, API trace-back, DB hints) via **chrome-devtools-mcp**.

**Trigger phrases:** "write functional tests", "create page tests", "playwright tests for this page", "test this page", "functional tests"

**What it does:**
- Auto-installs Playwright, Lighthouse, and @axe-core/playwright when possible
- Discovers testable behaviors from the live page and requirements context
- Presents a test plan for user confirmation before writing tests
- **Steps 2–5:** writes/runs/fixes tests (never weakens assertions), limited fix cycles then escalate
- **Steps 6–8 (report-only):** Lighthouse, axe, and performance suggestions — **no automatic application** of those audit fixes; behavior-changing items need **explicit user approval** (same escalation idea as design-reviewer, `docs/REVIEWER-FUNCTIONAL-CHANGE-PLAN.md`)
- Skips misleading SEO Lighthouse category on pages behind authentication

### defect-gatherer

Structured **defect intake** and **issue-tracker submission**. The reporter skill interviews (or uses a dispatch contract), classifies work as **defect**, **story-update**, or **feature request**, and writes report files. The organizer pushes to **GitHub, Jira, Linear, or GitLab**.

**Reporter triggers (examples):** bugs and issues ("report an issue", "file a bug", "regression", "doesn't work"); problems ("problem with", "something's wrong"); spec and story changes ("change request", "update the story", "spec is wrong", "AC is wrong"); concrete feature adds ("feature request", "missing capability"). See the skill `description` in the plugin for the full phrase list. Not for greenfield requirements interviews — use **requirements-gatherer** for those.

**Organizer triggers (examples):** "submit defects", "push issues to GitHub", "sync defects to Jira", "create tickets from defects", "push story updates"

**Dispatch note:** For orchestrators calling the reporter, supply a **page URL** for visual bugs or **API endpoint identity** (method, path, base URL) for non-visual issues.

## Workflow

```
1. Run requirements-gatherer      →  requirements.md
2. Review and edit the document    →  (human review gate)
3. Run requirements-organizer      →  GitHub milestones/issues or Jira epics/stories

Later, when scope changes:

4. Run requirements-gatherer again →  requirements-addendum-[date].md
5. Review and edit the addendum    →  (human review gate)
6. Run requirements-organizer      →  New/updated issues, old issues superseded
```

## Visual Design Workflow

```
1. Run visual-design-consultant     →  design-guidelines.md + design/components/
2. Implement components              →  dispatch **visual-design:component-context** (minimal one spec + motion, or top-3 + synthesis + motion, or gap — see skill) (or run the skill)
3. Run design-reviewer               →  live inspection report; you (or your agent) apply fixes; optional re-run for diff
```

## Functional Testing Workflow

```
1. Implement pages/routes            →  functional-tester fits after meaningful UI flows exist
2. Run functional-tester             →  Playwright TDD loop + report-only Lighthouse / axe / performance sections
```

## Defect Workflow

```
1. Run defect-reporter               →  structured defect file under defects/ (or equivalent)
2. Run defect-organizer              →  issues filed in GitHub / Jira / Linear / GitLab
```

## End-to-end flow (how plugins fit together)

Typical order for a new product UI — adjust to your process:

```
requirements-gatherer     →  requirements.md
requirements-organizer    →  backlog (GitHub / Jira / …)
visual-design-consultant  →  design-guidelines.md + design/components/
        ↓ implement UI (component-context helps load specs)
design-reviewer           →  design-review report → human/agent applies fixes
        ↓
functional-tester         →  Playwright tests + audit reports
        ↓ ship / iterate
defect-reporter           →  defect files
defect-organizer          →  tracker tickets
```

Skills are also useful standalone (e.g. only functional-tester on an existing app).

## Installation

**Step 1:** Add the marketplace:

```
/plugin marketplace add thekostakis/requirements-gatherer
```

**Step 2:** Install plugins:

```
/plugin install requirements-gatherer@functional-design-tools
/plugin install visual-design@functional-design-tools
/plugin install functional-tester@functional-design-tools
/plugin install defect-gatherer@functional-design-tools
```

**Step 3:** Reload:

```
/reload-plugins
```

## Usage

Example prompts below are natural-language triggers; exact wording can vary as long as the intent matches the skill descriptions above.

### Requirements

Start a new requirements interview:

```
> I want to build a project management tool for small teams
```

After reviewing and editing the generated `requirements.md`:

```
> create issues from requirements.md
```

Later, when you want to add or change requirements:

```
> I want to add a reporting feature
```

After reviewing the generated `requirements-addendum-[date].md`:

```
> create issues from the addendum
```

### Visual Design

Extract a design system from an existing site:

```
> I want it to look like stripe.com
```

Or extract from multiple sites and merge the best of each:

```
> extract design from linear.app and notion.so
```

Start a design interview from scratch (no example sites):

```
> let's set up a design system
```

Update an existing design system with new components or changes:

```
> add a pricing table component to the design system
```

The consultant produces `design-guidelines.md` and component specs in `design/components/`. After that, **component-context** loads specs when you implement components, and **design-reviewer** runs the visual quality gate (report-only).

**Component context** (while implementing — **obvious match** → one full spec + motion only; **ambiguous** → up to 3 full specs + patterns + motion):

```
> load the design spec for the primary button
> what does the design say about the data table component?
> which design-system component should I use for a filterable list with row actions?
> there's no spec for JobCard — infer from guidelines and closest components
```

**Design review** (after a page or component is built — dev server running, chrome-devtools-mcp connected):

```
> design review the dashboard page
> check the login form against the design system
> re-review the settings page — follow-up after fixes
> perform a design review of epic 3 against the requirements
```

### Functional testing

With the app running locally and chrome-devtools-mcp available:

```
> write functional tests for the checkout page
> test this page with Playwright — cover the empty cart and error states
> run functional tests on the onboarding flow
```

### Defects

**Reporter** (intake + investigation; produces files under `defects/`):

```
> I found a bug: the save button does nothing on the profile page
> report a defect — the API returns 500 on POST /api/invoices
> there's an issue with checkout — wrong total when a coupon is applied
> the story for notifications is wrong; we need to update acceptance criteria
> feature request: export the report as CSV from the dashboard
> something is broken: the modal won't close on mobile
```

**Organizer** (after defect files exist):

```
> submit defects to GitHub
> push the bug reports in defects/ to Jira
> push these issues to Linear — they're in defects/
> create tickets from the defect files
```

## License

MIT
