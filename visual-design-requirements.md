# Requirements: Visual Design System Toolkit

_Version: v1_
_Date: 2026-03-27_
_Status: Draft — pending review_

## Problem Statement

When Claude Code builds frontend features, it has no persistent understanding of the project's visual identity. Every session starts from zero — colors get picked inconsistently, spacing varies between components, typography doesn't follow a system, and animations feel random. Developers who aren't designers can't articulate what they want in design terms, and even when a design system exists informally (in an example site, a Figma file, or the developer's head), there's no structured way to capture it so Claude uses it consistently. The result is visually inconsistent interfaces that require expensive manual design review and rework.

## Solution Overview

A set of Claude Code skills and agents that establish, document, and enforce a project's visual design system. A consultant skill interviews the user (in plain, non-technical language) and/or extracts design patterns from example websites to produce a compact design guidelines document and a detailed per-component compendium. A context agent automatically supplies relevant component specs when frontend work is being done. A reviewer agent acts as a creative director quality gate — maintaining a Storybook test harness, writing Playwright visual and accessibility tests, and running in a loop with the implementing agent until the output meets the design standard.

## Users

### Developer (Primary)
A developer using Claude Code to build frontend features. May have no design training or vocabulary. Knows what they like when they see it but can't articulate "I want 8px spacing scale with a modular type ramp." Needs Claude to handle visual consistency without requiring design expertise. Success: builds interfaces that look intentional and cohesive without thinking about design.

### Developer with Design Sense (Secondary)
A developer who has opinions about design and can provide direction ("I want it to feel like Linear — clean, minimal, fast animations"). Can review and edit the generated guidelines. Success: their design taste is captured and enforced consistently across the codebase.

## User Stories

**As a** developer, **I want to** describe what I like in plain language or point at example sites **so that** Claude extracts a design system I can use without learning design terminology.
**Acceptance criteria:**
- Given I provide a URL to an example site, when the consultant runs, then it extracts colors, typography, spacing, component patterns, and motion and presents them for my review.
- Given I say "I want it to look clean and modern," when the consultant asks follow-up questions, then the questions use plain language with visual examples, not design jargon.

**As a** developer, **I want to** point at multiple example sites and pick the best parts from each **so that** I can combine inspiration from different sources.
**Acceptance criteria:**
- Given I provide 3 example URLs, when extraction completes, then the consultant presents findings side-by-side with conflicts highlighted and asks me to choose for each conflict.

**As a** developer, **I want to** have my design guidelines automatically available to Claude when writing frontend code **so that** every component follows the same visual system without me reminding Claude each time.
**Acceptance criteria:**
- Given design-guidelines.md exists, when it is referenced from CLAUDE.md, then Claude has color, typography, spacing, and motion tokens in context for every frontend task.

**As a** developer, **I want to** get detailed component specs loaded automatically when I'm implementing a specific component **so that** I have exact measurements, states, animations, and variants without loading the entire compendium.
**Acceptance criteria:**
- Given I'm implementing a modal component, when the component-context agent detects this, then it loads only the modal spec from the compendium into context.

**As a** developer, **I want to** have my frontend code visually reviewed and tested automatically **so that** design inconsistencies, visual bugs, and accessibility issues are caught before they ship.
**Acceptance criteria:**
- Given I've implemented a component, when the design reviewer runs, then it checks against guidelines, evaluates visual appeal, runs accessibility audits, and reports issues.
- Given the reviewer finds issues, when the implementing agent fixes them, then the reviewer re-checks until zero issues remain or escalates unresolvable issues to me.

**As a** developer, **I want to** be told clearly when a required tool is missing **so that** I can fix it and retry rather than getting a silently degraded experience.
**Acceptance criteria:**
- Given Playwright is not installed, when the design reviewer tries to run, then it stops, explains what's missing, suggests how to install it, offers workarounds, and provides an option to retry.
- Given the user chooses a workaround, when the reviewer proceeds, then it uses only the approach the user approved.

**As a** developer, **I want to** update my design system over time **so that** the guidelines and compendium evolve with the project.
**Acceptance criteria:**
- Given design-guidelines.md already exists, when I run the consultant again, then it enters addendum mode, asks what's changing, and produces an updated guidelines file without losing prior decisions.

## User Flows

### Site Extraction Flow
1. User provides one or more URLs to example sites.
2. For each site, the consultant reads the sitemap to discover page types.
3. Consultant navigates to representative pages of each type using Chrome browser tools.
4. For each page, consultant extracts via JavaScript injection: CSS custom properties, computed styles for key elements, font stacks, color values, spacing patterns, border radii, shadows, transitions, animations, keyframes.
5. Consultant compiles findings per site: color palette, typography scale, spacing system, component inventory, motion patterns.
6. If multiple sites: consultant presents findings side-by-side, highlights conflicts, asks user to choose for each conflict in plain language.
7. Anything that could not be extracted (intent behind choices, brand voice, content tone, edge case behaviors, motion philosophy) triggers follow-up interview questions in plain language.
8. User reviews and confirms the compiled design system.
9. Consultant writes design-guidelines.md and component compendium files.
10. Consultant suggests adding a reference to design-guidelines.md in CLAUDE.md.

### Interview-Only Flow
1. User describes what they want in their own words.
2. Consultant asks plain-language questions to establish visual preferences. No design jargon — instead of "what's your type scale ratio?" ask "do you want your headings to be much bigger than body text, or just a little bigger?"
3. Consultant uses visual references where possible: "something like the spacing on [well-known site] — tight and dense, or open and airy?"
4. Consultant covers: colors (mood, brand associations), typography (readability priorities, personality), spacing (density preference), component style (rounded vs sharp, flat vs elevated, minimal vs detailed), motion (fast and snappy vs smooth and deliberate), accessibility requirements.
5. Consultant summarizes and confirms.
6. Writes design-guidelines.md and component compendium files.

### Design Review Loop Flow
1. Implementing agent completes a frontend component.
2. Design reviewer agent is triggered automatically.
3. Reviewer reads design-guidelines.md and the relevant component spec from the compendium.
4. Reviewer ensures Storybook has a story for the component (creates one if missing).
5. Reviewer writes/updates Playwright visual tests: screenshot baselines, CSS property assertions, animation/transition verification, axe accessibility audit.
6. Reviewer runs the tests.
7. If issues found: reviewer categorizes as blocking (must fix) or low (reported, doesn't block). Reports all issues with specifics — what's wrong, where, what it should be, and a screenshot if applicable.
8. Blocking issues are sent back to the implementing agent for fixing.
9. Implementing agent fixes and re-submits.
10. Reviewer re-checks. Loop continues until zero blocking issues.
11. If the implementing agent cannot resolve an issue after repeated attempts, reviewer escalates: reports remaining issues to the user with full context.
12. Low issues are reported in the final summary but do not block.
13. On pass: reviewer confirms, logs results.

### Tool Unavailability Flow
1. Skill or agent detects a required tool is not available (Playwright, Storybook, Chrome extension, axe-core, etc.).
2. Immediately STOPS. Does not proceed with degraded functionality.
3. Presents the user with:
   - What tool is missing and why it's needed.
   - How to install or configure it (specific commands).
   - Possible workarounds (if any exist) with tradeoffs explained.
   - An option to retry after fixing.
4. If partial work was done before the tool was found missing, offers to rollback.
5. Waits for user decision before proceeding.

### Addendum Flow
1. User runs the consultant when design-guidelines.md already exists.
2. Consultant reads existing guidelines, summarizes current state.
3. Asks what's changing — new site to extract from? Preference changes? New components?
4. For modifications: tracks what changed vs what stayed the same.
5. Updates design-guidelines.md in place (unlike requirements-gatherer which creates a separate addendum file — design guidelines are a living document, not a historical record).
6. Updates affected component compendium files.
7. Design reviewer agent detects guideline changes and re-runs visual tests to flag any components that now violate updated guidelines.

## Features

- **Site Design Extraction**: Navigate example websites using Chrome browser tools, read sitemap for page type discovery, extract colors, typography, spacing, component patterns, shadows, borders, and motion/animation from computed styles and CSS. Supports multiple sites with side-by-side conflict resolution.
  - Acceptance criteria: Extracts a usable design system from any publicly accessible website. Presents findings for user confirmation before writing anything.
  - Dependencies: Chrome browser tools (mcp__claude-in-chrome).

- **Plain-Language Design Interview**: Conversational interview that establishes visual preferences without requiring design knowledge. Uses analogies, references to well-known sites, and simple choices instead of technical terminology.
  - Acceptance criteria: A user with zero design vocabulary can complete the interview and produce a coherent design system. No question uses terms like "kerning," "leading," "HSL," "modular scale," or "easing function" without a plain-language explanation.
  - Dependencies: None.

- **Design Guidelines Document**: A compact `design-guidelines.md` covering core tokens and principles — color system, typography, spacing, motion primitives, accessibility standards. Small enough to be permanently referenced from CLAUDE.md.
  - Acceptance criteria: File is under 500 lines. Contains all information needed for Claude to make consistent visual decisions. Technology-agnostic by default, includes framework-specific guidance when tech stack is known.
  - Dependencies: Site Design Extraction or Plain-Language Design Interview.

- **Component Compendium**: One markdown file per component in a `design/components/` directory. Each file covers: visual specs (dimensions, colors, typography, spacing), states (default, hover, active, disabled, focus, error), variants, animations and transitions (with durations, easing, and triggers), interaction patterns, and accessibility requirements.
  - Acceptance criteria: Each component file contains enough detail to implement the component without any other design reference. Files are generated from site extraction or interview.
  - Dependencies: Design Guidelines Document.

- **Component-Context Agent**: An agent that automatically fires when frontend component implementation is detected. Reads the component compendium and supplies only the relevant component spec into context.
  - Acceptance criteria: When a developer is implementing a button component, only the button spec is loaded — not the entire compendium. Agent detects component work by file patterns, import statements, and component creation patterns.
  - Dependencies: Component Compendium.

- **Storybook Test Harness**: Maintains a Storybook instance as the visual testing foundation. Creates stories for ALL components found in the project, not just those with explicit guideline coverage. Storybook is checked into the repository and kept up to date.
  - Acceptance criteria: Every component has at least one Storybook story covering its primary states. Storybook runs and renders correctly. If Storybook doesn't exist in the project, the skill offers to scaffold it (after asking the user).
  - Dependencies: None (but Storybook must be compatible with the project's framework).

- **Playwright Visual Tests**: Automated visual tests written and maintained by the design reviewer. Includes: screenshot comparison against baselines, CSS property assertions for design token compliance, transition/animation verification, and axe-core accessibility audits.
  - Acceptance criteria: Tests run via Playwright. Screenshot baselines are stored and versioned. Failing tests produce clear output showing expected vs actual with diffs.
  - Dependencies: Storybook Test Harness, Playwright.

- **Design Review Quality Gate**: The design reviewer agent runs in a loop with the implementing agent. Catches guideline violations, visual appeal issues, and accessibility failures. Reports blocking issues for fixing and low issues for awareness. Escalates to the user when the implementing agent can't resolve something.
  - Acceptance criteria: Zero blocking issues = pass. Low issues are reported but don't block. The loop terminates either on pass or on escalation. Never loops infinitely.
  - Dependencies: Playwright Visual Tests, Design Guidelines Document, Component Compendium.

- **Axe Accessibility Audits**: Every component is tested for accessibility using axe-core via Playwright. Covers WCAG compliance, color contrast, focus management, ARIA attributes, keyboard navigation.
  - Acceptance criteria: axe violations are reported as blocking issues. Each violation includes the specific rule, the element, and how to fix it.
  - Dependencies: Playwright, Storybook Test Harness.

- **Tool Availability Checks**: Before any skill or agent proceeds, verify all required tools are available. On failure: stop, explain, suggest fixes, offer workarounds with tradeoffs, provide retry option, offer rollback of partial work.
  - Acceptance criteria: No skill or agent ever silently degrades. Every missing tool triggers an explicit user decision point.
  - Dependencies: None.

- **Design System Addendum/Update**: The consultant skill supports re-running against existing guidelines. Updates design-guidelines.md in place and updates affected component compendium files. Triggers re-validation of existing visual tests.
  - Acceptance criteria: Updating guidelines does not lose prior decisions that weren't changed. Component files are only updated if their relevant guidelines changed.
  - Dependencies: Design Guidelines Document, Component Compendium.

## Data Model (Conceptual)

A **Design System** is the top-level concept for a project. It has one **Design Guidelines** document containing core tokens: a **Color System** (palette, semantic colors, light/dark mode mappings), a **Typography System** (font families, size scale, weight scale, line heights), a **Spacing System** (base unit, scale), a **Motion System** (duration tokens, easing tokens, animation patterns), and **Accessibility Standards** (contrast targets, focus behavior).

A Design System has many **Component Specs**, one per component. Each Component Spec has a name, a description, **Visual Properties** (dimensions, colors, typography, spacing, borders, shadows), many **States** (default, hover, active, disabled, focus, error, loading), many **Variants** (primary, secondary, outline, ghost, etc.), many **Animations** (with trigger, duration, easing, and description), and **Accessibility Requirements** (ARIA roles, keyboard behavior, screen reader expectations).

A Design System has one **Storybook Harness** containing many **Stories**, each linked to a Component Spec. Each Story renders one or more states/variants.

A Design System has many **Visual Tests**, each linked to a Story. A Visual Test has a type (screenshot, assertion, accessibility), an expected result, and a status (pass, fail, skipped).

An **Extraction Session** captures findings from one or more **Source Sites**. Each Source Site has a URL, a **Sitemap** with many **Page Types**, and many **Extracted Patterns** (colors, fonts, spacing, components, animations). Multiple Extraction Sessions can contribute to a single Design System.

## Integration Points

- **Chrome Browser Tools (mcp__claude-in-chrome)**: Required for site extraction. Used to navigate pages, read sitemaps, execute JavaScript to extract computed styles, and capture visual state. If unavailable, site extraction mode is blocked (interview-only still works).

- **Playwright**: Required for visual testing. Used to render Storybook stories, capture screenshots, assert CSS properties, verify animations, and run axe-core audits. If unavailable, the design reviewer cannot function — user must install before proceeding.

- **Storybook**: Required as the test harness for rendering components in isolation. The design reviewer creates and maintains stories. If not present, the reviewer offers to scaffold it after confirming with the user. Must be compatible with the project's framework.

- **axe-core**: Required for accessibility testing. Integrated via Playwright's axe injection. Reports WCAG violations as blocking issues.

- **CLAUDE.md**: The design guidelines file is referenced from CLAUDE.md so it's always in Claude's context during frontend work. The consultant skill suggests this reference after generating guidelines.

## Non-Functional Requirements

- **Extraction speed**: Site extraction should complete within 2 minutes per site for typical sites (under 20 page types).
- **Guidelines file size**: design-guidelines.md must stay under 500 lines to be practical as permanent context.
- **Component spec size**: Each component spec file should be under 200 lines.
- **Visual test execution**: Full visual test suite should complete within 5 minutes for up to 50 components.
- **Context efficiency**: The component-context agent should add less than 200 lines of context per component lookup.
- **Review loop termination**: The design review loop must terminate — either on pass or escalation. Maximum 3 fix-and-recheck cycles before escalation to user.
- **No silent degradation**: Every tool dependency failure must result in an explicit user decision point before any alternative approach is used.

## Regulatory & Compliance

- **WCAG 2.1 AA**: The design reviewer must verify WCAG 2.1 AA compliance for all components via axe-core. This is a blocking check, not advisory.
- **Color contrast**: Minimum 4.5:1 for normal text, 3:1 for large text, verified automatically.
- **Keyboard accessibility**: All interactive components must be keyboard navigable, verified via Playwright tests.

## Constraints

- Chrome browser tools (mcp__claude-in-chrome) are required for site extraction but not for the interview flow.
- Playwright must be installable in the project environment.
- Storybook must be compatible with the project's framework (React, Vue, Svelte, Angular, Web Components, HTML).
- The consultant interview must be completable by someone with zero design vocabulary.
- Design-guidelines.md must be technology-agnostic by default but should include framework-specific guidance when the project's tech stack is known to Claude (via CLAUDE.md or project files).
- The design reviewer never silently falls back. Missing tools = stop and ask.

## Assumptions

- **Users have Chrome with the Claude-in-Chrome extension for site extraction.** Impact if wrong: site extraction is unavailable. Interview-only mode still works but loses the most powerful feature.
- **Example sites are publicly accessible.** Impact if wrong: authenticated site extraction would need credential handling, which is out of scope.
- **Playwright is available or installable in the project.** Impact if wrong: visual testing is blocked. The skill must stop, explain, and wait — not fall back.
- **Storybook is compatible with the project's framework.** Impact if wrong: need user input on an alternative component playground or static HTML harness.
- **The component compendium is maintained by the consultant skill.** Impact if wrong: if components are expected to self-update from code changes, that's a different feature requiring code analysis.
- **The design review loop integrates with existing agent workflows.** Impact if wrong: needs its own orchestration mechanism.
- **A single design system per project is sufficient.** Impact if wrong: multi-brand or white-label projects would need multiple guideline files with a selection mechanism.

## Risks

- **Site extraction reliability**: Websites vary wildly in structure and CSS architecture. Computed style extraction is noisy — many values are inherited, overridden, or framework-generated. Likelihood: High. Impact: Medium. Mitigation: Heavy filtering and normalization. Present raw findings to user for curation. Anything that can't be extracted triggers interview questions.

- **Subjective visual appeal judgments**: The design reviewer makes aesthetic calls that reasonable people could disagree on. Likelihood: Medium. Impact: Medium. Mitigation: Always report with explanation and evidence. Classify subjective concerns as low (non-blocking) unless they violate explicit guidelines. Let the user override.

- **Storybook compatibility**: Not all frameworks have mature Storybook support. Likelihood: Low. Impact: High. Mitigation: Ask about framework first. If Storybook won't work, stop and present alternatives — don't silently degrade.

- **Review loop infinite cycling**: The implementing agent might keep producing code that the reviewer keeps rejecting. Likelihood: Low. Impact: Medium. Mitigation: Hard cap at 3 cycles before escalation to user with full context.

- **Context bloat**: The component compendium could grow large in projects with many components. Likelihood: Medium. Impact: Medium. Mitigation: The component-context agent loads only the relevant spec. Guideline file stays under 500 lines.

- **Playwright environment issues**: Playwright requires browser binaries, which may not be available in all environments (CI containers, restricted machines). Likelihood: Medium. Impact: High. Mitigation: Detect early, present specific install commands, offer retry.

## Success Criteria

- A developer with no design training can go from "here are 3 sites I like" to a complete, documented design system in under 30 minutes.
- The design-guidelines.md file is referenced from CLAUDE.md and Claude uses it consistently across all frontend tasks in the project.
- When implementing a component, the component-context agent automatically loads the right spec without the developer asking.
- Every component in the project has Storybook stories and passing visual + accessibility tests.
- The design review loop catches guideline violations, visual inconsistencies, and accessibility failures before code is committed.
- No tool ever silently degrades — every missing dependency results in a clear prompt with options.
- The design system can be updated over time without losing prior decisions.

## Open Questions

- **Sitemap availability**: Not all sites have a sitemap. When a sitemap is missing, should the skill fall back to crawling links from the homepage? Should it ask the user to provide key URLs manually? Blocks: site extraction implementation.
- **Screenshot baseline storage**: Where should Playwright screenshot baselines live? In the repo (versioned but increases repo size) or in a separate artifact store? Blocks: visual test implementation.
- **Multi-theme support**: If the project needs light and dark mode (or multiple brand themes), should the guidelines capture both? Should visual tests run in all themes? Blocks: design guidelines structure.
- **Storybook framework detection**: Should the skill auto-detect the project's framework for Storybook configuration, or always ask the user? Blocks: Storybook scaffolding.
- **Animation testing precision**: Playwright can screenshot mid-animation, but timing-based assertions can be flaky. What level of animation testing is acceptable? Keyframe presence? Duration within tolerance? Full visual comparison of animation frames? Blocks: motion testing implementation.

## Glossary

- **Design tokens**: Named values representing visual design decisions (colors, spacing, typography, motion). Example: `color-primary: #1a73e8`, `spacing-md: 16px`, `duration-fast: 150ms`.
- **Component compendium**: A collection of per-component specification files detailing visual properties, states, variants, animations, and accessibility requirements.
- **Design guidelines**: A compact document capturing the project's core visual identity — tokens, principles, and patterns. Referenced from CLAUDE.md for persistent context.
- **Visual regression test**: An automated test that compares a component's rendered appearance against a known-good baseline screenshot, flagging any visual differences.
- **axe-core**: An open-source accessibility testing engine that checks web content against WCAG rules.
- **Storybook**: A tool for developing UI components in isolation. Used here as the rendering harness for visual testing.
- **Quality gate**: An automated checkpoint that code must pass before proceeding. The design reviewer acts as a quality gate in the implementation loop.
- **Blocking issue**: A problem found by the reviewer that must be fixed before the component passes. Contrasted with a low issue, which is reported but does not block.
- **Escalation**: When the implementing agent cannot resolve a blocking issue after repeated attempts, the issue is reported to the user for manual decision.
