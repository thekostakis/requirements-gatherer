# requirements-gatherer

A Claude Code plugin marketplace for product design and project planning workflows.

## Skills

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

### requirements-organizer

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

### visual-design-consultant

Establishes a project's visual design system through plain-language interview or by extracting patterns from example websites. Produces `design-guidelines.md` (core tokens, permanently in CLAUDE.md context) and a component compendium (`design/components/`) with detailed per-component specs.

**Trigger phrases:** "design system", "visual design", "extract design from [site]", "I want it to look like [site]", "design guidelines"

**What it does:**
- Extracts design patterns from example sites (sitemap via WebFetch, CSS extraction + screenshots via Chrome, multi-site conflict resolution)
- Interviews in plain language — no design expertise needed
- Produces compact design-guidelines.md (under 500 lines) for permanent context
- Generates per-component spec files in design/components/
- Supports addendum mode to update existing design systems

### component-context

Loads the relevant component spec from the design compendium into context when implementing frontend components. Supports fuzzy matching — if no exact spec exists, suggests similar components ranked by relevance.

**Trigger phrases:** "load component spec", "component design spec", "what does the design say about [component]", "design spec for [component]"

### design-reviewer

Senior creative director quality gate. Verifies implemented components match the design system through live Chrome browser inspection — visual comparison, CSS token compliance, axe accessibility audits, motion verification, and responsive behavior checks.

**Trigger phrases:** "review component", "design review", "check against design system", "visual review", "run design tests", "implement epic", "implement milestone", "implement feature", "perform a design review of [requirements]"

**Two modes:**
- **Post-implementation gate** — reviews a single component/page after implementation (like superpowers:code-reviewer for visual work)
- **Requirements-driven review** — reads tickets/epics/requirements, inspects each visual requirement, fixes blocking issues, re-inspects

**What it does:**
- Inspects live pages via Chrome browser tools — no Storybook or Playwright dependency
- Injects axe-core at runtime for accessibility audits
- Reads computed CSS styles and compares against design tokens
- Tests responsive behavior at multiple viewports
- Categorizes issues as blocking (must fix) or low (informational)
- Fixes blocking issues directly and re-inspects up to 3 cycles, then escalates

### functional-tester

Generates and runs Playwright functional tests for pages and visual flows. Operates in a TDD-style loop: write tests, run them, fix failures, re-run.

**Trigger phrases:** "write functional tests", "create page tests", "playwright tests for this page", "test this page", "functional tests"

**What it does:**
- Discovers testable behaviors by inspecting the live page and cross-referencing requirements
- Presents a test plan for user confirmation before writing
- Writes Playwright test files matching project conventions
- Runs tests and classifies failures as test bugs vs implementation bugs
- Fixes source code to pass tests (never weakens assertions), up to 3 cycles

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
1. Run visual-design-consultant     →  design-guidelines.md + design/components/ + CLAUDE.md updated
2. Implement components              →  component-context skill loads specs automatically
3. Run design-reviewer               →  live Chrome inspection + fix loop
4. Run functional-tester             →  Playwright functional tests + TDD fix loop
```

## Installation

**Step 1:** Add the marketplace:

```
/plugin marketplace add thekostakis/requirements-gatherer
```

**Step 2:** Install plugins:

```
/plugin install requirements-gatherer@functional-design-tools
/plugin install visual-design@functional-design-tools
```

**Step 3:** Reload:

```
/reload-plugins
```

## Usage

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

The consultant produces `design-guidelines.md` and component specs in `design/components/`, and adds skill triggers to your CLAUDE.md. After that, the component-context skill loads specs when you implement components, and the design-reviewer skill runs quality gate tests.

## License

MIT
