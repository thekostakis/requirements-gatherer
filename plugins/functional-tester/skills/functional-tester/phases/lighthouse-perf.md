# Lighthouse + Performance Deep-Dive — Step 6

This phase runs the Lighthouse audit, budget assertions, and full-stack performance
analysis. It is **report-only** — produce categorized fix suggestions but do NOT apply
any changes.

---

## Step 6: Lighthouse Audit

After the Playwright functional tests complete (pass or escalate), run a Lighthouse audit
on the page for accessibility, performance, and SEO quality.

### 6a: Detect Login State

Use `mcp__chrome-devtools-mcp__evaluate_script` to check if the page is behind authentication:

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

If an MCP call fails, retry up to 2 times with a 3-second delay before escalating.

If `behindLogin` is true: exclude the `seo` category from Lighthouse. Search engines cannot
crawl authenticated pages, so SEO results would be misleading.

### 6b: Run Lighthouse

Determine which categories to audit:

~~~bash
# If NOT behind login:
timeout 120 npx lighthouse [PAGE_URL] \
  --output=json \
  --output-path=./lighthouse-report.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=accessibility,performance,seo \
  --quiet

# If behind login (no SEO):
timeout 120 npx lighthouse [PAGE_URL] \
  --output=json \
  --output-path=./lighthouse-report.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=accessibility,performance \
  --quiet
~~~

Parse the JSON output to extract scores and critical failures:

~~~bash
timeout 30 node -e "
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

### 6b-budget: Lighthouse Budget Check (optional)

If a `lighthouse-budget.json` file exists in the project root, run Lighthouse with budget
assertions for configurable thresholds on resource sizes, counts, and timing:

~~~bash
timeout 10 test -f lighthouse-budget.json && echo "BUDGET_FOUND" || echo "NO_BUDGET"
~~~

If found, run Lighthouse with the budget file:

~~~bash
timeout 120 npx lighthouse [PAGE_URL] \
  --output=json --output-path=./lighthouse-budget-report.json \
  --chrome-flags="--headless --no-sandbox" \
  --budget-path=lighthouse-budget.json \
  --quiet
~~~

Parse budget violations from the report:

~~~bash
timeout 30 node -e "
  const r = JSON.parse(require('fs').readFileSync('./lighthouse-budget-report.json', 'utf8'));
  const budgetAudit = r.audits['performance-budget'];
  const timingAudit = r.audits['timing-budget'];
  const violations = [];
  if (budgetAudit?.details?.items) {
    budgetAudit.details.items
      .filter(i => i.sizeOverBudget || i.countOverBudget)
      .forEach(i => violations.push({
        type: 'resource',
        resourceType: i.resourceType,
        size: i.size,
        sizeOverBudget: i.sizeOverBudget,
        count: i.requestCount,
        countOverBudget: i.countOverBudget
      }));
  }
  if (timingAudit?.details?.items) {
    timingAudit.details.items
      .filter(i => i.overBudget)
      .forEach(i => violations.push({
        type: 'timing',
        metric: i.label,
        measurement: i.measurement,
        overBudget: i.overBudget
      }));
  }
  console.log(JSON.stringify({ budgetViolations: violations, total: violations.length }, null, 2));
"
~~~

Include budget violations in the Lighthouse section of the report. Clean up:

~~~bash
rm -f ./lighthouse-budget-report.json
~~~

If no budget file exists, skip this step silently.

### 6b-post: Performance Early Exit Check

If the performance score is already above 90, skip the performance deep-dive (Steps 6c-pre
through 6c-3) entirely. Note in the report: "Performance score XX/100 — above threshold,
no performance analysis performed." Still proceed with accessibility and SEO analysis
regardless of performance score.

### 6c-pre: Detect Tech Stack

Before performance analysis, identify the project's technology stack. Run the detection
script shipped with this plugin:

~~~bash
timeout 30 node plugins/functional-tester/scripts/detect-tech-stack.js
~~~

If the script is not found at that path, locate it dynamically:

~~~bash
timeout 30 node "$(find . -path '*/functional-tester/scripts/detect-tech-stack.js' -print -quit 2>/dev/null)"
~~~

Use WebSearch to look up current performance best practices for the detected tech stack
(e.g., "Next.js performance optimization", "Prisma query optimization best practices").
Use these framework-specific techniques to inform the fix suggestions in the report.

### 6c-1: Network Waterfall Analysis

Extract network timing data from the Lighthouse JSON (still available from 6b — do NOT
delete `lighthouse-report.json` until after this step). Run the parser script:

~~~bash
timeout 30 node plugins/functional-tester/scripts/parse-network-waterfall.js
~~~

If the script is not found at that path, locate it dynamically:

~~~bash
timeout 30 node "$(find . -path '*/functional-tester/scripts/parse-network-waterfall.js' -print -quit 2>/dev/null)"
~~~

Also call `mcp__chrome-devtools-mcp__list_network_requests` to capture the live network
waterfall for real browser timing data. If an MCP call fails, retry up to 2 times with a
3-second delay.

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

2. **Runtime query analysis (if local database is accessible).** Run the database
   detection script shipped with this plugin:

~~~bash
timeout 30 bash plugins/functional-tester/scripts/check-local-db.sh
~~~

If the script is not found at that path, locate it dynamically:

~~~bash
timeout 30 bash "$(find . -path '*/functional-tester/scripts/check-local-db.sh' -print -quit 2>/dev/null)"
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
