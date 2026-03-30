# axe Accessibility Audit — Step 7

This phase runs WCAG accessibility checks through @axe-core/playwright, providing deeper
integration with the Playwright test framework than a standalone CLI tool. It is
**report-only** — produce categorized fix suggestions but do NOT apply any changes.

---

## Step 7: axe Accessibility Audit (via @axe-core/playwright)

After the Lighthouse audit, run a dedicated WCAG accessibility scan for deeper coverage.
axe and Lighthouse overlap on some checks but each catches issues the other misses.
Running axe through Playwright (instead of CLI) provides:

- Same browser context as functional tests (auth state, cookies, SPA navigation handled)
- Per-page results integrated with the Playwright test reporter
- Ability to scope scans to specific page regions via `include`/`exclude`

### 7a: Run axe via Playwright

Create or append to the test file a dedicated accessibility test. If the functional test
file from Step 4 already includes an axe test, use those results instead of running a
duplicate.

If a standalone axe test is needed (e.g., for a page not covered in the functional tests):

~~~typescript
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Accessibility Audit', () => {
  test('should have no WCAG 2.0 A or AA violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/route`);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const violations = results.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.slice(0, 5).map(n => ({
        html: n.html?.slice(0, 200),
        target: n.target
      }))
    }));
    const passes = results.passes?.length || 0;

    console.log(JSON.stringify({ violations, passes, total: violations.length }, null, 2));
  });
});
~~~

Run the test and capture results:

~~~bash
timeout 120 npx playwright test [axe-test-file] --reporter=json > ./axe-playwright-results.json 2>/dev/null
~~~

Parse the results. If the axe test was embedded in the functional test file (Step 4),
extract the accessibility results from the overall test output.

### 7b: axe Fix Suggestions

Review all WCAG violations and produce categorized fix suggestions, prioritizing by
impact (critical > serious > moderate > minor). Do NOT apply any fixes.

**Code-level suggestions** (most axe violations are straightforward):
- Missing alt text → add descriptive `alt` attributes (specify which element and suggested text)
- Missing form labels → add `<label>` elements or `aria-label` (specify which input)
- Missing landmark roles → add `role` or use semantic HTML (`<main>`, `<nav>`, `<header>`)
- Color contrast → adjust colors (reference design-guidelines.md tokens if available)
- Missing lang attribute → add `lang` to `<html>`
- Empty buttons/links → add text content or `aria-label`
- Duplicate IDs → make IDs unique (list the duplicates)
- Missing heading hierarchy → fix heading levels

**Categorize each suggestion as:**
- **Safe fix** — no impact on functionality, usability, or UI (e.g., alt text, labels, roles, non-conflicting contrast). Caller may apply without product approval.
- **Accessibility — design change needed** — would require visual design changes (e.g.,
  color contrast that conflicts with brand colors). Include alternative approaches.
- **FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX** — use when the fix would change interaction flow, focus order that alters task sequence, visible content removal, form submission/validation behavior, or keyboard shortcuts that redefine primary actions. The orchestrator MUST get explicit user approval before implementing; never auto-apply from the report alone.

**De-duplicate with Lighthouse:** If a violation overlaps with a Lighthouse finding
already reported in Step 6c, reference the earlier suggestion rather than duplicating it.
The @axe-core/playwright output uses the same rule IDs as axe CLI, so de-duplication is
straightforward: compare `violation.id` values between the two reports.

**NEVER suggest fixing accessibility issues by removing content or functionality.** Only
suggest adding missing attributes, labels, roles, or adjusting styles.

Clean up any temporary result files:

~~~bash
rm -f ./axe-playwright-results.json
~~~
