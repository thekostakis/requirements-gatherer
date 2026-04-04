# Investigation Paths and Output Format

---

## §Visual — Step 4: Investigation: Visual Bug Path

Use this path when the bug is classified as VISUAL in Step 2.

### If Chrome Tools ARE Available

1. **Navigate to the page** via `mcp__chrome-devtools-mcp__navigate_page` using the dev server URL
   from the environment information collected in Step 3.

2. **Take screenshots** via `mcp__chrome-devtools-mcp__take_screenshot` to capture the current state
   of the affected area.

3. **Inspect computed CSS** via `mcp__chrome-devtools-mcp__evaluate_script`:

```javascript
(() => {
  const el = document.querySelector('SELECTOR');
  if (!el) return { error: 'Element not found' };
  const cs = getComputedStyle(el);
  return {
    color: cs.color, backgroundColor: cs.backgroundColor,
    padding: cs.padding, margin: cs.margin,
    fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily,
    lineHeight: cs.lineHeight, borderRadius: cs.borderRadius,
    boxShadow: cs.boxShadow, display: cs.display, position: cs.position
  };
})()
```

4. **Read console errors** via `mcp__chrome-devtools-mcp__list_console_messages` to capture
   any JavaScript errors or warnings related to the bug.

5. **Check network requests** via `mcp__chrome-devtools-mcp__list_network_requests` to identify
   failed API calls, missing assets, or CORS errors.

6. **Inspect DOM structure** via `mcp__chrome-devtools-mcp__take_snapshot` to understand the
   element hierarchy and identify missing or malformed elements.

Use findings from all six inspection steps to build reproduction steps and evidence.

### If Chrome Tools ARE NOT Available

Tell the user: "chrome-devtools-mcp tools are not available, so I cannot inspect the page
directly. I will build the report from your description and any evidence you can provide."

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
