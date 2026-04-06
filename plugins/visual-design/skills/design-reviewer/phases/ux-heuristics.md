# UX and Usability Review — Category F

This phase covers the creative director and UX expert evaluation layer. It goes beyond
tokens and checklists to evaluate the actual user experience using Nielsen's 10 Usability
Heuristics as a structured framework. When running under the design-reviewer agent, the
opus parent handles this phase directly. All browser interaction uses **headless Playwright**
via **`playwright-skill-bridge.mjs`** (`snapshot`, `screenshot`, `run`) — same stack as
mechanical inspection.

## Functional vs cosmetic (caller escalation)

**BLOCKING** and **LOW** describe review severity — they do **not** mean an implementer may change product behavior without approval.

- **Safe / cosmetic / token-level** — color, spacing, typography, non-interactive markup, alt text, ARIA that does not alter flows, motion tied to existing tokens. These may be implemented without escalating product behavior (still follow team process).
- **FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX** — any recommendation that would change how the system works for users: confirmations for destructive actions, modal dismiss rules, validation strategy (inline vs submit), navigation structure, feature discoverability that requires removing/hiding content, keyboard shortcuts, form multi-step flow, auth/session UX, empty/error state copy that changes obligations, or anything that could alter business rules or data shown. Tag the issue with this label and state briefly *what behavior would change*. The orchestrator MUST present these to the end user and get explicit approval before any fix is applied — **never auto-apply** from the review report alone.

Examples that are **functional** (escalate): adding a confirmation dialog, moving a primary action, changing when validation runs, consolidating screens, removing a navigation entry. Examples that are usually **safe**: fixing contrast with approved tokens, adding missing `aria-label`, correcting heading levels without hiding content.

## Reliability

- **Playwright retry:** If any bridge `node` command fails, retry up to 2 times with a
  3-second delay before escalating.
- **Bash timeout:** All bash commands must use a 30-second timeout.

## Progress log (opus parent, Category F)

If **`PROGRESS_LOG`** is set, append Category F lines per **`references/agent-progress.md`**
(opus parent: one line per H1–H10, then overall score line).

---

## Category F: UX and Usability Review

Run at both desktop (1280px) and mobile (375px) viewports. Use a **`run` module** with
`page.setViewportSize` to switch sizes and `page.screenshot` (or the `screenshot` bridge
command with width/height args) to capture state at each viewport.

### Nielsen's Heuristic Framework

Evaluate the page against each of Nielsen's 10 usability heuristics. Score each
heuristic 0-10 (0 = completely violated, 10 = exemplary). The overall UX score is
the average across all 10 heuristics, scaled to 0-100.

#### H1: Visibility of System Status

Does the system inform users about what's happening through timely feedback?

- Check: loading states, progress indicators, form submission feedback, active navigation state
- Test at both desktop (1280px) and mobile (375px)
- Screenshot current state after common actions via headless `screenshot` or `run` module
- Flag missing loading indicators for async operations as **BLOCKING**
- Flag missing active/selected state on navigation as **LOW**

#### H2: Match Between System and Real World

Does the system use familiar language, concepts, and conventions?

- Check: terminology, iconography, metaphors, logical information ordering
- Flag jargon or technical language in user-facing text
- Use `node "$BRIDGE" snapshot "$PAGE_URL"` (or `innerText` via `run` + `page.evaluate`) to read page text
- Flag developer-facing terms exposed to end users as **LOW**
- Flag confusing or misleading iconography as **BLOCKING**

#### H3: User Control and Freedom

Can users easily undo/redo, navigate back, cancel operations?

- Check: back button behavior, cancel/close buttons on modals, undo for destructive actions
- Flag irreversible actions without confirmation as **BLOCKING**
- Flag modals without close/cancel mechanism as **BLOCKING**
- Flag multi-step flows without back navigation as **LOW**

#### H4: Consistency and Standards

Does the interface follow platform conventions and internal consistency?

- Check: button styles, link behavior, icon meanings, header/footer patterns
- Cross-reference with design-guidelines.md tokens
- Maps to existing evaluation area: "Consistency between breakpoints"
- Flag inconsistent interactive patterns (e.g., some buttons are links, others are buttons) as **BLOCKING**
- Flag minor style inconsistencies not covered by tokens as **LOW**

#### H5: Error Prevention

Does the system prevent errors before they occur?

- Check: form validation (inline vs on-submit), disabled states for invalid actions, confirmation dialogs
- Flag forms that only validate on submit as **LOW**
- Flag destructive actions without confirmation dialog as **BLOCKING**
- Use a `run` module with `page.evaluate` / locator fills to test form validation behavior

#### H6: Recognition Rather Than Recall

Are options, actions, and information visible or easily retrievable?

- Check: visible navigation, labels on icons, contextual help, breadcrumbs
- Maps to existing evaluation areas: "Cognitive load" and "Navigation and task flow"
- Flag icon-only buttons without labels or tooltips as **LOW**
- Flag hidden navigation requiring memorization as **BLOCKING**

#### H7: Flexibility and Efficiency of Use

Does the system cater to both novice and expert users?

- Check: keyboard shortcuts, search functionality, bulk actions, customization
- Flag missing keyboard accessibility for primary actions as **BLOCKING**
- Flag missing search in content-heavy pages as **LOW**

#### H8: Aesthetic and Minimalist Design

Does the interface avoid irrelevant or rarely needed information?

- Check: information density, visual noise, whitespace usage
- Maps to existing evaluation areas: "Visual hierarchy" and "Cognitive load"
- Screenshot at both viewports to assess visual weight
- Flag overwhelming information density as **BLOCKING**
- Flag minor whitespace or density improvements as **LOW**

#### H9: Help Users Recognize, Diagnose, and Recover from Errors

Are error messages clear, specific, and constructive?

- Check: form error messages, 404 pages, empty states, failed action feedback
- Flag generic error messages ("Something went wrong") as **LOW**
- Flag missing error states for common failure scenarios as **BLOCKING**
- Flag empty states with no guidance as **LOW**

#### H10: Help and Documentation

Is help available and easy to find when needed?

- Check: tooltips, onboarding, FAQ links, contextual help icons
- Note if help is missing but not necessarily BLOCKING unless the feature is complex
- Flag missing help for complex workflows as **LOW**
- Flag completely absent documentation for critical features as **LOW**

---

## UX Scoring

For each heuristic, assign a score 0-10:

| Score Range | Meaning |
|-------------|---------|
| 0-3 | Major violations — likely produces BLOCKING issues |
| 4-6 | Minor issues — LOW severity |
| 7-8 | Acceptable with room for improvement |
| 9-10 | Exemplary |

**Overall UX Score** = sum of all 10 heuristic scores (range 0-100)

| Threshold | Rating | Implication |
|-----------|--------|-------------|
| 90-100 | Excellent | No blocking UX issues |
| 70-89 | Good | Minor improvements suggested |
| 50-69 | Needs work | Several UX issues that should be addressed |
| Below 50 | Poor | Significant usability problems — likely has BLOCKING UX issues |

---

## Existing Evaluation Areas (mapped to heuristics)

The following areas from the original skill are preserved and mapped to the heuristic
framework. Each area contributes to one or more heuristic scores.

### Visual Hierarchy Assessment → H8

Screenshot the page at each viewport. Evaluate whether the most important content and
actions are visually dominant. Check that the visual hierarchy guides the user's eye
correctly — heading sizes, contrast, whitespace, and color weight should draw attention
to primary content first. Flag unclear or competing hierarchy as **BLOCKING**.

### Information Architecture at Breakpoints → H6, H8

At mobile, evaluate whether the content reflow makes sense — is important information
still accessible without excessive scrolling? Are secondary elements appropriately
collapsed or hidden? At desktop, is the layout using the available space effectively or
is it stretched and sparse? Flag poor information reflow at mobile as **BLOCKING**.

### Navigation and Task Flow → H3, H6, H7

Evaluate whether primary actions are easily discoverable. On mobile, check that navigation
is thumb-friendly and critical CTAs are above the fold. On desktop, verify navigation
structure is intuitive and follows established patterns. Flag buried or hidden primary
actions as **BLOCKING**.

### Cognitive Load → H6, H8

Assess whether any single screen presents too much information, too many choices, or
unclear next steps. Look for: walls of text without hierarchy, too many equally-weighted
buttons, unclear form flows, missing progress indicators in multi-step processes. Flag
overwhelming screens as **BLOCKING**.

### Consistency Between Breakpoints → H4

Ensure the visual language — colors, spacing rhythm, typography scale, icon style —
remains consistent from desktop to mobile even though layout changes. Flag jarring visual
inconsistencies across breakpoints as **BLOCKING**.

### Interaction Feedback → H1

Check that interactive elements provide clear feedback: hover states on desktop, press
states on mobile, loading states for async actions, error states for forms. Use a **`run`**
module (`page.hover`, `page.click`, `page.screenshot`) to trigger interactions and capture
feedback. Flag silent interactions (click produces no visible change) as **BLOCKING**.

### Content Readability → H8

At each viewport, check font sizes against minimum readability standards (16px body
minimum on mobile, adequate line length of 45-75 characters). Check contrast not just for
WCAG compliance but for comfortable extended reading. Flag uncomfortable reading
experiences at any viewport as **BLOCKING**.

---

## Issue Classification (Category F)

**Blocking issues** (must fix before passing):
- Unclear visual hierarchy at any viewport
- Poor information reflow at mobile
- Primary actions not discoverable
- Overwhelming cognitive load on any screen
- Inconsistent visual language across breakpoints
- Interactive elements with no feedback
- Uncomfortable reading experience at any viewport
- Irreversible actions without confirmation
- Modals without close/cancel mechanism
- Missing loading indicators for async operations
- Hidden navigation requiring memorization
- Missing keyboard accessibility for primary actions
- Overwhelming information density
- Missing error states for common failure scenarios
- Inconsistent interactive patterns
- Confusing or misleading iconography

**Low issues** (reported, do not block):
- Minor visual hierarchy suggestions
- Opportunities for better mobile space utilization
- Navigation improvements not affecting core task completion
- Content organization suggestions
- Developer-facing terms in UI text
- Icon-only buttons without labels or tooltips
- Forms that only validate on submit
- Generic error messages
- Empty states with no guidance
- Missing help for complex workflows
- Missing search in content-heavy pages
- Multi-step flows without back navigation

---

## Diff Mode (Follow-up Reviews)

When the dispatch context indicates this is a follow-up review and a previous report
was found during Check 3 of the main SKILL.md:

### Step 1: Load Previous Report

Read the most recent `design-review-*.md` file found in Check 3.

### Step 2: Verify Previous Issues

For each previously-reported issue:

1. **BLOCKING issues:** Navigate to the location, re-inspect. Check if the fix has been
   applied correctly.
2. **LOW issues:** Check if they have been addressed. LOW issues that were not fixed are
   acceptable — they remain LOW.

### Step 3: Detect Regressions

Re-run the full Category F evaluation. Compare against the previous report to detect:

- **FIXED**: Issue was present before, now resolved
- **STILL OPEN**: Issue remains unchanged
- **REGRESSED**: Issue was fixed or was not present before, but is now present or worse
- **NEW**: Issue was not reported in the previous review

### Step 4: Re-score Heuristics

Re-score all 10 Nielsen's heuristics. Focus additional attention on heuristics that
scored below 7 in the previous review.

### Step 5: Present Diff

Include the diff table in the report:

~~~
### Diff from Previous Review

| Issue | Previous | Current | Status |
|-------|----------|---------|--------|
| [issue description] | BLOCKING | — | FIXED |
| [issue description] | BLOCKING | BLOCKING | STILL OPEN |
| [issue description] | LOW | BLOCKING | REGRESSED |
| [new issue description] | — | BLOCKING | NEW |

Previous UX Score: XX/100
Current UX Score: XX/100
Delta: +/-XX
~~~

If the delta is negative (score decreased), flag this prominently and list the
regressed items.
