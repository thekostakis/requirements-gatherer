# Investigation Paths and Output Format

---

## §Visual — Step 4: Investigation: Visual Bug Path

Use this path when the bug is classified as VISUAL in Step 2.

Read **`references/playwright-headless.md`** first. Resolve `BRIDGE`, set `PW_STORAGE_STATE` /
`PW_IGNORE_HTTPS_ERRORS` when the dispatch or user indicated login or HTTPS issues.

Create evidence directory if needed:

~~~bash
mkdir -p defects/evidence
~~~

Let **PAGE_URL** be the full URL from Step 3 (dev server or deployed). Retry failed bridge
commands up to **2** times with a **3-second** delay.

### If Playwright and `BRIDGE` are available

1. **Login wall check** — `node "$BRIDGE" probe-login "<PAGE_URL>"`. If `behindLogin` is true
   and `PW_STORAGE_STATE` is not set, tell the user that headless capture may only show the
   login surface unless they provide a storage state file or unauthenticated repro URL.

2. **Screenshot** — Capture current state (replace filename with something traceable, e.g.
   slug of the route):

~~~bash
node "$BRIDGE" screenshot "<PAGE_URL>" "defects/evidence/visual-<short-label>.png" 1280 720
~~~

3. **Accessibility / structure snapshot** — `node "$BRIDGE" snapshot "<PAGE_URL>"` for a
   structured tree (roles, names). Use it like a DOM-oriented map when interpreting layout
   bugs.

4. **Computed styles** — Use `run` with a small module under `defects/evidence/`. Replace
   `SELECTOR` with a stable CSS selector for the affected element (from user description or
   snapshot):

```javascript
// defects/evidence/computed-styles.mjs — set SELECTOR before running
const SELECTOR = 'main .REPLACE_ME';

export default async function (page) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { error: 'Element not found', selector: sel };
    const cs = getComputedStyle(el);
    return {
      selector: sel,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      padding: cs.padding,
      margin: cs.margin,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontFamily: cs.fontFamily,
      lineHeight: cs.lineHeight,
      borderRadius: cs.borderRadius,
      boxShadow: cs.boxShadow,
      display: cs.display,
      position: cs.position,
    };
  }, SELECTOR);
}
```

~~~bash
node "$BRIDGE" run "<PAGE_URL>" "defects/evidence/computed-styles.mjs"
~~~

5. **Console messages** — Collect JS errors/warnings after a reload (attach listener before
   `reload`):

```javascript
// defects/evidence/console-capture.mjs
export default async function (page) {
  const messages = [];
  page.on('console', (msg) => {
    try {
      messages.push({ type: msg.type(), text: msg.text() });
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
  return { consoleMessages: messages };
}
```

~~~bash
node "$BRIDGE" run "<PAGE_URL>" "defects/evidence/console-capture.mjs"
~~~

6. **Network** — `node "$BRIDGE" network "<PAGE_URL>"` for request URLs, methods, and
   resource types (failed status codes are not always in this log; correlate with user
   reports and server logs).

Use findings from these steps to build reproduction steps and evidence. Reference screenshot
paths and JSON summaries in the report.

### If Playwright or `BRIDGE` is NOT available

Tell the user: "Headless Playwright is not available (or the bridge script was not found),
so I cannot capture the page automatically. I will build the report from your description
and any evidence you can provide."

Then:

1. Ask the user to describe the visual issue in detail — what element is affected, where
   on the page, what it looks like vs what it should look like.
2. Ask for screenshots if they have any.
3. Ask whether they see any errors in the browser console.
4. Build reproduction steps from the user's description alone.

**NEVER silently skip this notification.** The user must know that visual inspection is
degraded.

After completing investigation, return to **Step 6** in the main SKILL.md.

---

## §API — Step 5: Investigation: API/Non-Visual Bug Path

Use this path when the bug is classified as API/NON-VISUAL in Step 2.

1. **Identify the affected area.** Ask the user which endpoint, feature, or function is
   affected. Get the specific route, method, or user flow.

2. **Search the codebase.** Use Grep and Read tools to find the relevant code:
   - Search for route definitions matching the affected endpoint.
   - Find the handler function or controller method.
   - Trace the call chain: route -> handler -> service -> data access layer.
   - Look for validation logic, business rules, and state transitions.

3. **Read the relevant code files** to understand the expected logic. Identify where the
   behavior diverges from what the user described as expected.

4. **Propose reproduction steps** based on the code trace. Be specific:
   - "1. POST /api/orders with payload { ... }"
   - "2. GET /api/orders/123"
   - "3. Observe: status field is 'pending' but should be 'confirmed' per acceptance criteria"

Use research tools silently. Do not announce every file you read — come prepared with
informed analysis.

After completing investigation, return to **Step 6** in the main SKILL.md.

---

## §OutputFormat — Step 11 Output Format

Write the defect report file using this EXACT format:

```markdown
# Defect Report: [Short Title]

_ID: defect-YYYY-MM-DD-NNN_
_Date: YYYY-MM-DD_
_Status: Pending submission_
_Classification: [defect | story-update | feature]_
_Severity: [Critical | High | Medium | Low | N/A]_
_Priority: [Must-have | Should-have | Nice-to-have | N/A]_
_Reproduced: [Yes | No -- filed at user's request]_

## Description
[User's description of the bug]

## Expected Behavior
[What should happen per requirements]

## Actual Behavior
[What actually happens]

## Environment
[Browser, OS, dev server URL, relevant config]

## Frequency
[Always | Sometimes | Once | Unknown]

## Steps to Reproduce
1. [Step]
2. [Step]
...

## Evidence
- Screenshots: [paths or descriptions]
- Console errors: [if any]
- Network failures: [if any]
- CSS issues: [if any]

## Attachments
<!-- Machine-readable list for defect-organizer. One path per line, relative to repo root. Paths may point to any file type; images render inline in tickets, other files are linked. -->
- [path relative to repo root, e.g. defects/evidence/visual-login-button-2026-04-10.png]

## Requirement Reference
- **Requirement**: [Section/feature from requirements.md]
- **Acceptance Criteria**: [Specific criteria violated]
- **Source file**: [requirements.md or addendum filename]

## Root Cause Hypothesis
[Proposed root cause based on investigation]

## Story Impact
[For story-updates: "This changes Epic/Story XYZ. That story should be
updated for consistency."
For features: "This feature should be added to requirements under [Epic/Section].
Requirements.md should be updated to include this functionality."
For true defects: "N/A"]

## Code References
[For API bugs: relevant files, functions, line numbers traced]
```
