---
name: functional-tester
description: >
  Use this skill after completing implementation of a full page, route, or visual flow
  that can be tested end-to-end. Trigger phrases: "write functional tests", "create page
  tests", "playwright tests for this page", "test this page", "functional tests". Also
  fires after implementation steps complete when the work involves a testable page or
  visual flow — similar to how superpowers:code-reviewer fires after major steps.
  Do NOT trigger for individual component work (that's the design-reviewer's job) or
  for non-visual/backend-only code. Includes Lighthouse CI and axe CLI audits for accessibility,
  performance, and SEO.
version: 1.4.1
---

# Functional Tester

Generate Playwright functional tests for pages and visual flows, then run them in a
TDD-style loop: write tests, run them, fix failures, rerun until green (or escalate).

This skill covers page-level and end-to-end functional testing. For unit tests, use
superpowers:test-driven-development. For design system compliance, use the design-reviewer
skill.

---

## Step 1: Tool Check (MANDATORY -- RUN FIRST)

Before doing ANY work, verify all required tools are available.

### Check 1: Playwright Installed

~~~bash
npx playwright --version 2>/dev/null || echo "MISSING"
~~~

If Playwright is NOT installed: auto-install it:

~~~bash
npm init playwright@latest -- --yes
npx playwright install --with-deps chromium
~~~

Re-check after install. If the install fails (permissions, network): **STOP.** Tell the user:

- "Playwright could not be auto-installed."
- "To install manually: `npm init playwright@latest`"
- "Retry: Say 'retry' after installing."
- Do NOT proceed without Playwright.

### Check 2: Dev Server Running

Detect a running dev server on common ports by checking each in order:

~~~bash
for port in 3000 3001 4173 5173 5174 8080; do
  curl -s -o /dev/null -w "%{http_code}" http://localhost:$port 2>/dev/null | grep -q "[23]" && echo "FOUND on port $port" && break
done
~~~

If no dev server is detected: **STOP.** Tell the user:

- "No dev server detected on ports 3000, 3001, 4173, 5173, 5174, or 8080."
- "Please start your dev server and tell me the URL, or say 'retry' once it is running."
- Do NOT proceed without a confirmed dev server URL.

### Check 3: Lighthouse

~~~bash
npx lighthouse --version 2>/dev/null || echo "MISSING"
~~~

If Lighthouse is NOT installed: auto-install it:

~~~bash
npm install -g lighthouse
~~~

Re-check after install. If the install fails (permissions, network): **STOP.** Tell the user:

- "Lighthouse could not be auto-installed."
- "To install manually: `npm install -g lighthouse` (or with sudo if needed)"
- "Retry: Say 'retry' after installing."
- Do NOT proceed to the Lighthouse audit step without Lighthouse, but functional tests (Steps 2-5) can still run.

### Check 4: axe CLI

~~~bash
npx axe --version 2>/dev/null || echo "MISSING"
~~~

If axe CLI is NOT installed: auto-install it:

~~~bash
npm install -g @axe-core/cli
~~~

Re-check after install. If the install fails (permissions, network): **STOP.** Tell the user:

- "axe CLI could not be auto-installed."
- "To install manually: `npm install -g @axe-core/cli` (or with sudo if needed)"
- "Retry: Say 'retry' after installing."
- Do NOT proceed to the axe audit step without axe CLI, but functional tests (Steps 2-5) and Lighthouse (Step 6) can still run.

**STOP: Checks 1 and 2 must pass before proceeding. Checks 3 and 4 are needed for the audit steps but do not block functional tests.**

---

## Step 2: Identify What to Test

1. From the conversation context, determine which page(s), route(s), or visual flow(s)
   were just implemented or are being requested for testing.
2. Read relevant requirements files to understand expected behavior:
   - `requirements.md`
   - `requirements-addendum-*.md`
   - Epic or issue descriptions referenced in conversation
   - Any route definitions or page component files
3. Navigate to the page in the browser using `mcp__claude-in-chrome__navigate` with the
   dev server URL discovered in Step 1.
4. Take a screenshot via `mcp__claude-in-chrome__computer` to confirm the page renders
   correctly.

**STOP gate:** If the page does not render (blank page, error screen, 404), tell the
user and wait for guidance. Do not proceed until the page is visually confirmed.

---

## Step 3: Discover Testable Behaviors

1. Use `mcp__claude-in-chrome__read_page` to get the full page structure.
2. Use `mcp__claude-in-chrome__javascript_tool` to inventory interactive elements:

~~~javascript
(() => {
  const inventory = {
    forms: [...document.querySelectorAll('form')].map(f => ({
      id: f.id, action: f.action,
      fields: [...f.querySelectorAll('input,select,textarea')].map(i => ({
        type: i.type, name: i.name, placeholder: i.placeholder
      }))
    })),
    links: [...document.querySelectorAll('a[href]')].map(a => ({
      text: a.textContent.trim().slice(0, 80), href: a.href
    })),
    buttons: [...document.querySelectorAll('button,[role="button"]')].map(b => ({
      text: b.textContent.trim().slice(0, 80), type: b.type, disabled: b.disabled
    })),
    navigation: [...document.querySelectorAll('nav a, [role="navigation"] a')].map(a => ({
      text: a.textContent.trim().slice(0, 80), href: a.href
    })),
    interactive: [...document.querySelectorAll('[onclick],[data-action],details,dialog,[role="dialog"],[role="tab"],[role="tabpanel"]')].map(el => ({
      tag: el.tagName, role: el.getAttribute('role'), id: el.id
    }))
  };
  return inventory;
})()
~~~

3. Cross-reference the element inventory with the requirements to identify key user flows.
4. Present the test plan to the user:

~~~
## Proposed Test Plan: [Page Name]

### Tests to Write
1. **[Test name]** -- [what it verifies]
2. **[Test name]** -- [what it verifies]
...

### User Flows
1. **[Flow name]** -- [step-by-step]
...

Confirm this test plan? I'll write and run these tests.
~~~

**STOP gate:** Wait for user confirmation before writing any tests. Do not proceed
until the user approves or modifies the test plan.

---

## Step 4: Write Playwright Test File

### Detect Project Conventions

1. Look for existing test files to determine conventions:
   - File extension: `.spec.ts` vs `.spec.js` vs `.test.ts` vs `.test.js`
   - Test directory: `tests/`, `e2e/`, `__tests__/`, `test/`
   - Check for `playwright.config.ts` or `playwright.config.js` for baseURL and other settings

~~~bash
find . -name "*.spec.ts" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.test.js" | head -5
find . -name "playwright.config.*" | head -3
ls -d tests/ e2e/ __tests__/ test/ 2>/dev/null
~~~

2. If no existing tests are found, default to: `e2e/[page-name].spec.ts`

### Write the Test File

Create `[test-dir]/[page-name].spec.ts` (or `.js` to match project conventions).

The test file must cover these categories:

1. **Page loads successfully** -- navigates to the route, confirms no errors, key heading
   or landmark is visible.
2. **Key elements visible** -- all critical UI elements from the requirements are present
   and visible.
3. **Navigation works** -- links and navigation items route correctly.
4. **Forms submit correctly** -- fill fields, submit, verify success state or redirect.
5. **Interactive elements respond** -- buttons trigger expected behavior, modals open/close,
   tabs switch, accordions expand.
6. **Responsive layout** -- test at key viewports (375, 768, 1024, 1440) to confirm the
   page does not break.

Structure the test file with:

- A configurable `BASE_URL` constant at the top (read from Playwright config if available,
  otherwise use the detected dev server URL).
- Descriptive `test.describe` blocks grouping related tests.
- Standard Playwright patterns: `page.goto()`, `page.click()`, `page.fill()`,
  `expect(locator).toBeVisible()`, `expect(locator).toHaveText()`,
  `expect(page).toHaveURL()`, etc.
- Proper `await` on all Playwright calls.
- Reasonable timeouts for navigation and animations.

Example test structure (adapt to actual page):

~~~typescript
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('[Page Name]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/route`);
  });

  test('page loads successfully', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toHaveText('Expected Heading');
  });

  test('key elements are visible', async ({ page }) => {
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
    // ... more assertions
  });

  test('navigation links work', async ({ page }) => {
    await page.click('a[href="/target"]');
    await expect(page).toHaveURL(/\/target/);
  });

  test('form submits correctly', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('responsive layout at mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('nav')).toBeVisible();
    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('responsive layout at tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('main')).toBeVisible();
  });

  test('responsive layout at desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('main')).toBeVisible();
  });
});
~~~

---

## Step 5: Run Tests and Fix Loop (TDD-Style)

### Initial Run

~~~bash
npx playwright test [test-file] --reporter=list
~~~

### If ALL Tests PASS

Proceed to Step 6 (Lighthouse Audit), then Step 7 (axe Audit), then Step 8 (Report Results).

### If Tests FAIL

For each failing test, analyze the failure output and determine the root cause:

#### Failure Type A: Test Bug

The test itself has an error -- wrong selector, wrong URL, incorrect expected text,
race condition, or timing issue.

**Signs:**
- `locator.waitFor: Timeout` with a selector that does not match the actual DOM
- Expected text does not match actual text due to a typo in the test
- Test navigates to the wrong route
- Flaky pass/fail on timing-dependent assertions without proper waits

**Action:** Fix the test. Update the selector, URL, expected text, or add proper
`waitFor` / `toBeVisible` guards.

#### Failure Type B: Implementation Bug

The page or component is genuinely missing something that the requirements specify.

**Signs:**
- Element that should exist per requirements is not in the DOM
- Form submission does not trigger expected behavior
- Navigation link goes to wrong destination or does not exist
- Interactive element is present but non-functional (click does nothing)

**Action:** Fix the source code. Edit the implementation file to add the missing
element, fix the behavior, or correct the routing. Prefer fixing the implementation
over weakening the test.

### Fix Cycle

1. Apply fixes (test fixes or implementation fixes as determined above).
2. Re-run: `npx playwright test [test-file] --reporter=list`
3. Analyze results.
4. Repeat if failures remain.

**Maximum 3 cycles.** After 3 fix-and-rerun cycles, if tests still fail:

- **STOP.** Do not continue fixing.
- Escalate to the user with full context:
  - Which tests are still failing
  - What was tried in each cycle
  - Why the fix did not work
  - Suggested next steps

### Key Principle

Tests define the contract. **Never weaken test assertions to make them pass.** If a
test asserts that a button should exist and it does not, add the button to the
implementation -- do not remove the assertion. Only modify a test if the test itself
has an actual bug (wrong selector, wrong URL, race condition, typo in expected text).

**Never modify tests that are already passing.**

---

## Step 6: Lighthouse Audit

After the Playwright functional tests complete (pass or escalate), run a Lighthouse audit
on the page for accessibility, performance, and SEO quality.

### 6a: Detect Login State

Use `mcp__claude-in-chrome__javascript_tool` to check if the page is behind authentication:

~~~javascript
(() => {
  const loginSignals = [
    document.querySelector('input[type="password"]'),
    document.querySelector('form[action*="login"]'),
    document.querySelector('form[action*="signin"]'),
    document.querySelector('[data-testid*="login"]'),
    document.querySelector('[data-testid*="signin"]'),
  ].filter(Boolean);
  const urlSignals = /\/(login|signin|sign-in|auth)\b/i.test(window.location.href);
  return {
    behindLogin: loginSignals.length > 0 || urlSignals,
    signals: loginSignals.map(el => el.tagName + (el.type ? '[type=' + el.type + ']' : ''))
  };
})()
~~~

If `behindLogin` is true: exclude the `seo` category from Lighthouse. Search engines cannot
crawl authenticated pages, so SEO results would be misleading.

### 6b: Run Lighthouse

Determine which categories to audit:

~~~bash
# If NOT behind login:
npx lighthouse [PAGE_URL] \
  --output=json \
  --output-path=./lighthouse-report.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=accessibility,performance,seo \
  --quiet

# If behind login (no SEO):
npx lighthouse [PAGE_URL] \
  --output=json \
  --output-path=./lighthouse-report.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=accessibility,performance \
  --quiet
~~~

Parse the JSON output to extract scores and critical failures:

~~~bash
node -e "
  const r = JSON.parse(require('fs').readFileSync('./lighthouse-report.json', 'utf8'));
  const cats = r.categories;
  const audits = r.audits;
  const critical = Object.values(audits)
    .filter(a => a.score !== null && a.score === 0)
    .map(a => ({ id: a.id, title: a.title, score: a.score, description: a.description }));
  const warnings = Object.values(audits)
    .filter(a => a.score !== null && a.score > 0 && a.score < 0.5)
    .map(a => ({ id: a.id, title: a.title, score: a.score }));
  console.log(JSON.stringify({
    scores: {
      accessibility: Math.round((cats.accessibility?.score || 0) * 100),
      performance: Math.round((cats.performance?.score || 0) * 100),
      seo: cats.seo ? Math.round(cats.seo.score * 100) : 'N/A (behind login)'
    },
    critical: critical.slice(0, 15),
    warnings: warnings.slice(0, 10)
  }, null, 2));
"
~~~

### 6b-post: Performance Early Exit Check

If the performance score is already above 90, skip the performance deep-dive (Steps 6c-pre through 6c-3) entirely. Note in the report: "Performance score XX/100 — above threshold, no performance analysis performed." Still proceed with accessibility and SEO analysis regardless of performance score.

### 6c-pre: Detect Tech Stack

Before performance analysis, identify the project's technology stack:

~~~bash
node -e "
  const pkg = JSON.parse(require('fs').readFileSync('./package.json', 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const stack = [];
  if (deps['next']) stack.push('Next.js');
  else if (deps['react']) stack.push('React');
  if (deps['vue'] || deps['nuxt']) stack.push('Vue/Nuxt');
  if (deps['svelte'] || deps['@sveltejs/kit']) stack.push('Svelte/SvelteKit');
  if (deps['@angular/core']) stack.push('Angular');
  if (deps['astro']) stack.push('Astro');
  if (deps['vite']) stack.push('Vite');
  if (deps['webpack']) stack.push('Webpack');
  if (deps['tailwindcss']) stack.push('Tailwind');
  if (deps['express']) stack.push('Express');
  if (deps['fastify']) stack.push('Fastify');
  if (deps['@nestjs/core']) stack.push('NestJS');
  if (deps['prisma'] || deps['@prisma/client']) stack.push('Prisma ORM');
  if (deps['drizzle-orm']) stack.push('Drizzle ORM');
  if (deps['typeorm']) stack.push('TypeORM');
  if (deps['sequelize']) stack.push('Sequelize');
  if (deps['mongoose'] || deps['mongodb']) stack.push('MongoDB');
  if (deps['pg'] || deps['postgres']) stack.push('PostgreSQL');
  if (deps['mysql2'] || deps['mysql']) stack.push('MySQL');
  if (deps['redis'] || deps['ioredis']) stack.push('Redis');
  console.log(JSON.stringify({ frameworks: stack, allDeps: Object.keys(deps).slice(0, 40) }));
"
~~~

Use WebSearch to look up current performance best practices for the detected tech stack
(e.g., "Next.js performance optimization", "Prisma query optimization best practices").
Use these framework-specific techniques to inform the fix suggestions in the report.

### 6c-1: Network Waterfall Analysis

Extract network timing data from the Lighthouse JSON (still available from 6b — do NOT
delete `lighthouse-report.json` until after this step):

~~~bash
node -e "
  const r = JSON.parse(require('fs').readFileSync('./lighthouse-report.json', 'utf8'));
  const items = r.audits['network-requests']?.details?.items || [];
  const apiCalls = items
    .filter(i => i.resourceType === 'Fetch' || i.resourceType === 'XHR')
    .map(i => ({
      url: i.url,
      duration: Math.round(i.endTime - i.startTime),
      transferSize: i.transferSize,
      statusCode: i.statusCode
    }))
    .sort((a, b) => b.duration - a.duration);
  const slowRequests = items
    .filter(i => (i.endTime - i.startTime) > 500)
    .map(i => ({ url: i.url, duration: Math.round(i.endTime - i.startTime), type: i.resourceType, size: i.transferSize }))
    .sort((a, b) => b.duration - a.duration);
  console.log(JSON.stringify({ totalRequests: items.length, apiCalls: apiCalls.slice(0, 20), slowRequests: slowRequests.slice(0, 10) }, null, 2));
"
~~~

If Chrome MCP tools are available, also call `mcp__claude-in-chrome__read_network_requests`
to capture the live network waterfall for real browser timing data.

Classify each API call:
- **First-party API** — same origin as dev server, or matches patterns in project route files
- **Third-party API** — external domains (CDN, analytics, auth providers, etc.)
- **Static asset** — fonts, images, CSS, JS bundles

For slow first-party API calls (> 500ms), proceed to the backend analysis in 6c-2.

Clean up the report file after extraction:

~~~bash
rm -f ./lighthouse-report.json
~~~

### 6c-2: API Trace-Back to Backend Code

For each slow first-party API endpoint identified in 6c-1:

1. **Find the route handler.** Use Grep to search the codebase for the API route path.
   Adapt search patterns based on the detected framework:
   - Express/Fastify: `router.get('/api/endpoint'` or `app.get(`
   - Next.js: `app/api/endpoint/route.ts` or `pages/api/endpoint.ts`
   - NestJS: `@Get('endpoint')` or `@Controller('api')`

2. **Read the route handler** and trace the data flow. Identify:
   - Database queries (ORM calls, raw SQL, collection queries)
   - External API calls the handler makes
   - Missing caching (no Redis/in-memory cache on frequently-read data)
   - N+1 query patterns (queries inside loops, `.map()` with await, etc.)
   - Missing pagination on large result sets
   - Sequential awaits that could be parallelized with `Promise.all`

3. **Use WebSearch** for framework-specific and ORM-specific optimization techniques
   (e.g., "Prisma N+1 query optimization", "Express response caching best practices").

Produce fix suggestions: directive-level for complex architectural changes, code-level
for simple optimizations (e.g., adding `Promise.all`, adding a `select` clause).

### 6c-3: Database Query Analysis

If the project uses an ORM or database client (detected in 6c-pre):

1. **Static analysis of query patterns.** Read model/schema files and query call sites:
   - Prisma: read `schema.prisma` for missing `@@index` declarations, read call sites
     for `.findMany` without `select`/`take`, nested includes without limits
   - Drizzle/TypeORM/Sequelize: missing indexes, unbounded queries, eager loading everything
   - Raw SQL (`pg`, `mysql2`): `SELECT *`, missing WHERE clauses, missing LIMIT,
     joins without indexes
   - MongoDB/Mongoose: missing indexes in schema, `.find({})` without projection,
     missing `.lean()`

2. **Runtime query analysis (if local database is accessible).** Check if a local
   database is running:

~~~bash
# PostgreSQL
psql --version 2>/dev/null && (pg_isready -q 2>/dev/null && echo "POSTGRES_LOCAL" || echo "POSTGRES_NOT_RUNNING") || echo "NO_PSQL"

# MySQL
mysql --version 2>/dev/null && (mysqladmin ping -s 2>/dev/null && echo "MYSQL_LOCAL" || echo "MYSQL_NOT_RUNNING") || echo "NO_MYSQL"

# MongoDB
mongosh --version 2>/dev/null && (mongosh --eval "db.runCommand({ping:1})" --quiet 2>/dev/null && echo "MONGO_LOCAL" || echo "MONGO_NOT_RUNNING") || echo "NO_MONGOSH"
~~~

   If a local database IS accessible and slow queries were identified:
   - **PostgreSQL:** Run `EXPLAIN ANALYZE` on the slow query patterns found in source
     code. Check for sequential scans on large tables, missing indexes, inefficient joins.
   - **MySQL:** Run `EXPLAIN` on slow queries. Check for full table scans, missing indexes.
   - **MongoDB:** Use `.explain("executionStats")` on slow query patterns. Check for
     collection scans (COLLSCAN vs IXSCAN).

   If a local database is NOT accessible: **STOP the runtime analysis portion.** Report
   the slow query patterns found via static analysis and recommend the user run EXPLAIN
   manually. Present the exact queries to run. Do NOT silently skip — tell the user what
   was found statically and what could not be verified at runtime.

3. **Check connection pooling configuration.** Read config files for pool settings:
   - Prisma: check for `connection_limit` in DATABASE_URL or `datasources` config
   - pg/node-postgres: check for `Pool` configuration (max, idleTimeoutMillis)
   - Mongoose: check for `poolSize` or `maxPoolSize` in connection options

### 6c: Lighthouse Fix Suggestions

After all analysis is complete (6c-pre through 6c-3), produce categorized fix suggestions.
Do NOT apply any fixes. The caller will read this report and apply them.

For each Lighthouse critical failure (score = 0) and warning (score < 0.5), produce a
fix suggestion using mixed detail:

**Code-level suggestions** (for straightforward fixes — include exact file, line, and change):
- Missing `lang` attribute on `<html>` → add it
- Missing meta viewport → add `<meta name="viewport" content="width=device-width, initial-scale=1">`
- Missing document title → add `<title>` tag
- Broken heading hierarchy → fix heading levels
- Missing image alt text → add descriptive `alt` attributes
- Missing form labels → add `<label>` elements or `aria-label` attributes
- Images missing width/height → add explicit dimensions
- Below-fold images without lazy loading → add `loading="lazy"`
- Render-blocking scripts → add `defer` or `async` attributes
- Missing meta description → add `<meta name="description" content="...">`
- Missing canonical link → add `<link rel="canonical" href="...">`

**Directive-level suggestions** (for complex changes — describe approach and tradeoffs):
- Low contrast text → reference design-guidelines.md tokens if available, suggest specific
  color adjustments that maintain design intent
- Large uncompressed assets → recommend build-level optimization (framework-specific)
- Slow API calls → reference findings from 6c-2 with specific handler and query details
- Missing indexes → reference findings from 6c-3 with specific schema changes
- Framework-specific optimizations → reference WebSearch findings from 6c-pre

**Categorize each suggestion as:**
- **Safe fix** — no impact on functionality, usability, or UI. Caller should apply.
- **Performance — functionality change needed** — would impact UX. Include potential
  solutions and tradeoffs. Do NOT apply.

**SEO suggestions (only if NOT behind login):**
- Missing meta description, missing canonical link, non-crawlable links, bad heading hierarchy

**Performance score directive:**
- If < 90: "Performance score is XX/100 (below 90 threshold). Recommended safe fixes
  should be applied. Continue attempting fixes that do not degrade usability, functionality,
  or UI."
- If >= 90: "Performance score XX/100 — above threshold, no performance fixes needed."

**NEVER suggest fixes that remove content or functionality.** Only suggest adding missing
attributes, tags, meta elements, optimizations, or architectural improvements.

---

## Step 7: axe Accessibility Audit

After the Lighthouse audit, run a dedicated WCAG accessibility scan using axe CLI for
deeper coverage. axe and Lighthouse overlap on some checks but each catches issues the
other misses.

### 7a: Run axe CLI

~~~bash
npx axe [PAGE_URL] --tags wcag2a,wcag2aa --reporter json > ./axe-report.json 2>/dev/null
~~~

Parse the JSON output:

~~~bash
node -e "
  const r = JSON.parse(require('fs').readFileSync('./axe-report.json', 'utf8'));
  const violations = (r[0]?.violations || []).map(v => ({
    id: v.id, impact: v.impact, description: v.description,
    nodes: v.nodes.slice(0, 5).map(n => ({ html: n.html?.slice(0, 200), target: n.target }))
  }));
  const passes = r[0]?.passes?.length || 0;
  console.log(JSON.stringify({ violations, passes, total: violations.length }, null, 2));
"
~~~

Clean up the report file:

~~~bash
rm -f ./axe-report.json
~~~

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
- **Safe fix** — no impact on functionality, usability, or UI. Caller should apply.
- **Accessibility — design change needed** — would require visual design changes (e.g.,
  color contrast that conflicts with brand colors). Include alternative approaches.

**De-duplicate with Lighthouse:** If a violation overlaps with a Lighthouse finding
already reported in Step 6c, reference the earlier suggestion rather than duplicating it.

**NEVER suggest fixing accessibility issues by removing content or functionality.** Only
suggest adding missing attributes, labels, roles, or adjusting styles.

---

## Step 8: Report Results

Present the final report using this format:

~~~
## Functional Test Results: [Page Name]

### Status: PASS (X/X tests) | PARTIAL (X/Y passing, Z escalated) | FAIL (escalated)

### Test File: [path to test file]

### Results
| Test | Status | Notes |
|------|--------|-------|
| [test name] | PASS | |
| [test name] | FIXED | [what was changed] |
| [test name] | FAIL | [why it failed, what was tried] |

### Fixes Applied
- [file:line] -- [what was changed and why]

### Escalated (if any)
- **[test name]:** [what failed, what was tried across cycles, why it is stuck]

### Next Steps
- [any follow-up actions needed]

### Lighthouse Audit

| Category | Score | Status |
|----------|-------|--------|
| Accessibility | XX/100 | PASS (≥90) / WARN (50-89) / FAIL (<50) |
| Performance | XX/100 | PASS / WARN / FAIL |
| SEO | XX/100 or N/A | PASS / WARN / FAIL / Skipped (behind login) |

#### Suggested Fixes (safe)
- **[audit-id]:** [file:line] — [what to change and why]

#### Suggested Fixes (functionality change needed)
- **[audit-id]:** [description] — [recommended approach and tradeoffs]

### Performance Deep-Dive

#### Tech Stack: [detected frameworks, ORMs, databases]

#### Network Waterfall
| Endpoint | Duration | Size | Type | Classification |
|----------|----------|------|------|---------------|
| /api/... | XXXms | XXkB | XHR | First-party / slow |

#### Slow API Analysis
- **[endpoint]:** Handler at [file:line]
  - Root cause: [N+1 query / sequential awaits / missing cache / etc.]
  - Fix suggestion: [code-level or directive-level]
  - Category: Safe fix / Functionality change needed

#### Database Analysis
- **[table/collection]:** [missing index / unbounded query / etc.]
  - Query pattern: [the problematic query]
  - EXPLAIN result: [if available] OR Static analysis only: [recommend running EXPLAIN]
  - Fix suggestion: [code-level or directive-level]
  - Category: Safe fix / Functionality change needed

#### Performance Fixes Not Applied (architecture change needed)
- **[issue]:** [description] — [recommended approach and tradeoffs]

### axe Accessibility Audit

| Impact | Violations | Status |
|--------|-----------|--------|
| Critical | X | Suggestion provided |
| Serious | X | Suggestion provided |
| Moderate | X | Suggestion provided |
| Minor | X | Suggestion provided |

#### Suggested Fixes (safe)
- **[rule-id]:** [file:line] — [what to change and why]

#### Suggested Fixes (design change needed)
- **[rule-id]:** [description] — [recommended approach and alternatives]
~~~

---

## Important Boundaries

1. **NEVER skip the tool check.** Playwright must be installed and a dev server must be
   running before any work begins.
2. **NEVER write tests without confirming the test plan with the user first.** The STOP
   gate after Step 3 is mandatory.
3. **NEVER weaken test assertions to make them pass.** Fix the implementation instead.
   Only modify a test if the test itself has an actual bug.
4. **NEVER loop more than 3 times.** After 3 fix-and-rerun cycles, escalate to the user
   with full context.
5. **NEVER modify tests that are already passing.**
6. **NEVER silently fall back** when tools are missing. Present options, fixes,
   workarounds, and wait for user decision.
7. This skill writes **FUNCTIONAL tests** (page-level, end-to-end). For unit tests, use
   superpowers:test-driven-development. For design system compliance, use the
   design-reviewer skill.
8. **NEVER run SEO audits on pages behind authentication.** Search engines cannot crawl
   authenticated pages, making SEO scores misleading.
9. **NEVER suggest Lighthouse fixes that remove content or functionality.** Only suggest
   adding missing attributes, tags, meta elements, or optimizations.
10. **Lighthouse and axe sections are report-only.** Produce categorized fix suggestions
    but do NOT apply any changes. The Playwright TDD loop (Steps 2-5) is the only section
    that applies fixes directly.
11. **NEVER suggest axe fixes that remove content or functionality.** Only suggest adding
    missing attributes, labels, roles, or styles.
12. **ALWAYS detect the project's tech stack before performance analysis** and use
    WebSearch to find framework-specific optimization techniques.
13. **ALWAYS classify fix suggestions** as "safe fix" or "functionality/design change
    needed" so the caller knows which to apply immediately.
