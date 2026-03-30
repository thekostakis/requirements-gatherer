---
name: functional-tester
description: >
  Use this skill after completing implementation of a full page, route, or visual flow
  that can be tested end-to-end. Trigger phrases: "write functional tests", "create page
  tests", "playwright tests for this page", "test this page", "functional tests". Also
  fires after implementation steps complete when the work involves a testable page or
  visual flow — similar to how superpowers:code-reviewer fires after major steps.
  Do NOT trigger for individual component work (that's the design-reviewer's job) or
  for non-visual/backend-only code. Uses chrome-devtools-mcp for live browser inspection,
  Playwright AI agents (Planner, Generator, Healer) for resilient test authoring,
  @axe-core/playwright for integrated WCAG audits, visual regression via toHaveScreenshot,
  and Lighthouse CI with budget assertions.
version: 2.0.1
---

# Functional Tester

Generate Playwright functional tests for pages and visual flows, then run them in a
TDD-style loop: write tests, run them, fix failures, rerun until green (or escalate).
Audits with Lighthouse and @axe-core/playwright for accessibility, performance, and SEO.

This skill covers page-level and end-to-end functional testing. For unit tests, use
superpowers:test-driven-development. For design system compliance, use the design-reviewer
skill.

**Reliability:** If an MCP call fails, retry up to 2 times with a 3-second delay before
escalating. All bash commands should use a 30-second timeout unless otherwise specified
(e.g., `timeout 30 <command>` on Linux/Mac, or PowerShell `Start-Process -Wait`).

---

## Step 1: Tool Check (MANDATORY -- RUN FIRST)

Before doing ANY work, verify all required tools are available.

### Check 1: Playwright Installed

~~~bash
timeout 30 npx playwright --version 2>/dev/null || echo "MISSING"
~~~

If Playwright is NOT installed: auto-install it:

~~~bash
timeout 60 npm init playwright@latest -- --yes
timeout 60 npx playwright install --with-deps chromium
~~~

Re-check after install. If the install fails (permissions, network): **STOP.** Tell the user:

- "Playwright could not be auto-installed."
- "To install manually: `npm init playwright@latest`"
- "Retry: Say 'retry' after installing."
- Do NOT proceed without Playwright.

### Check 2: Dev Server Running

#### Server Discovery Priority

Follow this order. Stop at the first successful match:

1. **If the dispatch prompt or user specifies a server URL** → verify it with curl. Do NOT
   start a new server or scan other ports:

~~~bash
timeout 10 curl -s -o /dev/null -w "%{http_code}" <PROVIDED_URL> 2>/dev/null | grep -q "[23]" && echo "VERIFIED: <PROVIDED_URL>" || echo "PROVIDED URL UNREACHABLE"
~~~

2. **If the dispatch prompt says servers are already running** → verify each mentioned
   URL/port with curl. Do NOT start new ones.

3. **Check for a reverse proxy** (nginx, caddy, traefik) before scanning direct ports.
   If a proxy is in front, test through the proxy URL, not direct backend ports:

~~~bash
timeout 10 bash -c 'ls /etc/nginx/sites-enabled/ 2>/dev/null; ls /etc/caddy/ 2>/dev/null; test -f Caddyfile && echo "CADDY_CONFIG_FOUND"; docker ps 2>/dev/null | grep -i "nginx\|caddy\|traefik"'
~~~

4. **Scan common ports** (3000, 3001, 4173, 5173, 5174, 8080):

~~~bash
timeout 30 bash -c 'for port in 3000 3001 4173 5173 5174 8080; do
  curl -s -o /dev/null -w "%{http_code}" http://localhost:$port 2>/dev/null | grep -q "[23]" && echo "FOUND on port $port" && break
done'
~~~

5. **If SSL/self-signed certs are involved** → use `curl -k` for verification and note
   that Playwright will need HTTPS error ignoring configured in `playwright.config`:

~~~bash
timeout 10 curl -sk -o /dev/null -w "%{http_code}" https://localhost:443 2>/dev/null | grep -q "[23]" && echo "FOUND HTTPS on 443"
~~~

If no dev server is detected on any port and no URL was provided: **STOP.** Tell the user:

- "No dev server detected on ports 3000, 3001, 4173, 5173, 5174, or 8080."
- "Please start your dev server and tell me the URL, or say 'retry' once it is running."
- Do NOT proceed without a confirmed dev server URL.

### Check 3: chrome-devtools-mcp Connection

Verify the chrome-devtools-mcp server is connected and a browser page is available:

~~~
Call mcp__chrome-devtools-mcp__list_pages
~~~

If the call **succeeds** and returns at least one page: chrome-devtools-mcp is available.
Proceed.

If the call **fails** or returns no pages: **STOP.** Tell the user:

- "chrome-devtools-mcp is not connected or no browser pages are available."
- "This skill requires chrome-devtools-mcp for live browser inspection."
- "Please ensure the chrome-devtools-mcp MCP server is running and a Chrome instance is connected."
- Do NOT proceed without chrome-devtools-mcp. There is no fallback.

### Check 4: @axe-core/playwright

~~~bash
timeout 30 node -e "require('@axe-core/playwright')" 2>/dev/null && echo "INSTALLED" || echo "MISSING"
~~~

If @axe-core/playwright is NOT installed: auto-install it:

~~~bash
timeout 30 npm install -D @axe-core/playwright
~~~

Re-check after install. If the install fails: **STOP.** Tell the user:

- "@axe-core/playwright could not be auto-installed."
- "To install manually: `npm install -D @axe-core/playwright`"
- "Retry: Say 'retry' after installing."
- Do NOT proceed to the axe audit step without @axe-core/playwright, but functional tests
  (Steps 2-5) and Lighthouse (Step 6) can still run.

### Check 5: Lighthouse

~~~bash
timeout 30 npx lighthouse --version 2>/dev/null || echo "MISSING"
~~~

If Lighthouse is NOT installed: auto-install it:

~~~bash
timeout 60 npm install -g lighthouse
~~~

Re-check after install. If the install fails: **STOP.** Tell the user:

- "Lighthouse could not be auto-installed."
- "To install manually: `npm install -g lighthouse` (or with sudo if needed)"
- "Retry: Say 'retry' after installing."
- Do NOT proceed to the Lighthouse audit step without Lighthouse, but functional tests
  (Steps 2-5) can still run.

**STOP: Checks 1, 2, and 3 must ALL pass before proceeding. Check 3 (chrome-devtools-mcp) is a hard requirement with no fallback. Checks 4 and 5 are needed for audit steps but do not block functional tests.**

---

## Phase Loading

After Step 1 passes, load phase files for the remaining steps:

- **Steps 2-5 (TDD Loop):** Load `phases/tdd-loop.md` — test discovery, Playwright test
  authoring with accessibility-tree selectors, visual regression via `toHaveScreenshot`,
  @axe-core/playwright integration, and the fix loop.

- **Step 6 (Lighthouse + Performance):** Load `phases/lighthouse-perf.md` — Lighthouse
  audit with budget assertions, full-stack performance deep-dive (network waterfall, API
  trace-back, database query analysis).

- **Step 7 (axe Audit):** Load `phases/axe-audit.md` — WCAG accessibility audit via
  @axe-core/playwright with categorized fix suggestions.

---

## Step 8: Report Results

Present the final report using this format. For every Lighthouse, axe, or performance
suggestion that would **change how the system behaves** for users (not only styling or
metadata), include the tag **FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX** and state
that the orchestrator MUST obtain explicit user approval before implementing — never
auto-apply from this report alone.

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

### Visual Regression
| Screenshot | Status | Notes |
|------------|--------|-------|
| [page-name.png] | BASELINE CREATED | First run — baseline snapshot saved |
| [page-name.png] | PASS | Within maxDiffPixels threshold |
| [page-name.png] | FAIL | Diff: X pixels changed — see [diff image path] |

### Fixes Applied
- [file:line] -- [what was changed and why]

### Escalated (if any)
- **[test name]:** [what failed, what was tried across cycles, why it is stuck]

### Next Steps
- [any follow-up actions needed]

### Lighthouse Audit

| Category | Score | Status |
|----------|-------|--------|
| Accessibility | XX/100 | PASS (>=90) / WARN (50-89) / FAIL (<50) |
| Performance | XX/100 | PASS / WARN / FAIL |
| SEO | XX/100 or N/A | PASS / WARN / FAIL / Skipped (behind login) |

#### Budget Assertions (if lighthouse-budget.json exists)
| Budget | Threshold | Actual | Status |
|--------|-----------|--------|--------|
| [resource type] | [limit] | [actual] | PASS / FAIL |

#### Suggested Fixes (safe)
- **[audit-id]:** [file:line] — [what to change and why] — Behavior impact: safe

#### Suggested Fixes (functionality change needed)
- **[audit-id]:** [description] — [recommended approach and tradeoffs] — If this alters UX flows, API contracts, caching, auth, or user-visible outcomes: **FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX**

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
  - Category: Safe fix / Functionality change needed — tag **FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX** when the fix would change response shape, pagination, filtering, or authorization semantics

#### Database Analysis
- **[table/collection]:** [missing index / unbounded query / etc.]
  - Query pattern: [the problematic query]
  - EXPLAIN result: [if available] OR Static analysis only: [recommend running EXPLAIN]
  - Fix suggestion: [code-level or directive-level]
  - Category: Safe fix / Functionality change needed — tag **FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX** when visible data or business rules would change

#### Performance Fixes Not Applied (architecture change needed)
- **[issue]:** [description] — [recommended approach and tradeoffs]

### axe Accessibility Audit (@axe-core/playwright)

| Impact | Violations | Status |
|--------|-----------|--------|
| Critical | X | Suggestion provided |
| Serious | X | Suggestion provided |
| Moderate | X | Suggestion provided |
| Minor | X | Suggestion provided |

#### Suggested Fixes (safe)
- **[rule-id]:** [file:line] — [what to change and why] — Behavior impact: safe

#### Suggested Fixes (design change needed)
- **[rule-id]:** [description] — [recommended approach and alternatives] — If flow or interaction behavior changes: **FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX**

### Cumulative Summary (multi-page)

If multiple pages were tested in this session, include a summary table:

| Page | Tests | Pass | Fail | Lighthouse A11y | Lighthouse Perf | axe Violations |
|------|-------|------|------|-----------------|-----------------|----------------|
| [page] | X | X | X | XX/100 | XX/100 | X |

**Overall:** X pages tested, Y total tests, Z total violations.
~~~

---

## Important Boundaries

1. **NEVER skip the tool check.** Playwright must be installed, a dev server must be
   running, and chrome-devtools-mcp must be connected before any work begins.
2. **chrome-devtools-mcp is a hard requirement.** If it is not detected in Check 3,
   stop immediately. There is no fallback.
3. **NEVER write tests without confirming the test plan with the user first.** The STOP
   gate after Step 3 is mandatory.
4. **NEVER weaken test assertions to make them pass.** Fix the implementation instead.
   Only modify a test if the test itself has an actual bug.
5. **NEVER loop more than 3 times.** After 3 fix-and-rerun cycles, escalate to the user
   with full context.
6. **NEVER modify tests that are already passing.**
7. **NEVER silently fall back** when tools are missing. Present options, fixes,
   workarounds, and wait for user decision.
8. This skill writes **FUNCTIONAL tests** (page-level, end-to-end). For unit tests, use
   superpowers:test-driven-development. For design system compliance, use the
   design-reviewer skill.
9. **NEVER run SEO audits on pages behind authentication.** Search engines cannot crawl
   authenticated pages, making SEO scores misleading.
10. **NEVER suggest fixes that remove content or functionality.** Only suggest adding
    missing attributes, tags, meta elements, or optimizations.
11. **Lighthouse, axe, and performance sections are report-only.** Produce categorized fix
    suggestions but do NOT apply any changes. The Playwright TDD loop (Steps 2-5) is the
    only section that applies fixes directly.
12. **ALWAYS detect the project's tech stack before performance analysis** and use
    WebSearch to find framework-specific optimization techniques.
13. **ALWAYS classify fix suggestions** as "safe fix" or "functionality/design change
    needed." **FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX** overrides "apply immediately":
    the orchestrator MUST confirm with the end user before implementing any suggestion that
    would alter user-visible behavior, API contracts, auth, caching semantics, or business outcomes.
14. **Prefer accessibility-tree selectors** (getByRole, getByText, getByLabel) over CSS
    selectors or data-testid in all test code.
15. **Retry MCP calls** up to 2 times with a 3-second delay before escalating failures.
16. **Timeout all bash commands** at 30 seconds unless a longer timeout is specified.
