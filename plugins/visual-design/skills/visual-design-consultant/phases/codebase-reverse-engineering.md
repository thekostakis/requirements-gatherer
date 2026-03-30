# Codebase reverse-engineering — design system from existing code

Use this phase when the user wants to **derive** `design-guidelines.md`, motion, and
`design/components/` from an **existing codebase** (static analysis + **chrome-devtools-mcp**
route inspection). Inspired by the **brainstorming** workflow (explore → approaches →
sectional approval → written spec → execute) but **without** the Superpowers visual
companion — use **only** chrome-devtools-mcp for live browser inspection.

**Spec file location (this plugin only — not Superpowers):**

`docs/design-system/codebase-reverse-spec-YYYY-MM-DD.md`

Create `docs/design-system/` if it does not exist. **Never** write to `docs/superpowers/`.

---

## Tool dependency check

### chrome-devtools-mcp (required for route inspection)

Call `mcp__chrome-devtools-mcp__list_pages` to verify connection. If it fails:

**STOP.** Tell the user chrome-devtools-mcp is required to **visually inspect routes** (not
optional). Offer: install/retry, or cancel codebase mode.

Do **not** offer or use a “visual companion” browser tool from other plugins — only
chrome-devtools-mcp for navigation, screenshots, and scripted evaluation on real routes.

### Read / Grep / Glob / Bash

Required for repository scanning (tokens, configs, component files, route definitions).

---

## Step 1: Explore project context (read-only)

1. **Root scope:** Use the path the user gave, or the workspace root. Confirm in one question
   if ambiguous.
2. **Stack detection:** `package.json`, lockfiles, presence of Tailwind, MUI, styled-components,
   CSS modules, Vite/Next/CRA, etc.
3. **Static token sources:** e.g. `tailwind.config.*`, `theme.ts`, global CSS, `:root` CSS variables,
   `tokens.*`, design-token files.
4. **Component inventory:** Glob `**/components/**`, `**/ui/**`, common library paths; note
   naming patterns (PascalCase files, index exports).
5. **Motion sources:** grep for `keyframes`, `framer-motion`, `transition`, `animation`,
   `animate`, tailwind `animate-*`.
6. **Routing:** Discover app routes (framework-specific): Next.js `app/`, `pages/`,
   React Router routes file, Vue router, etc. Build a **candidate route list** (paths only).

7. **Existing design artifacts:** If `design-guidelines.md` and/or `design/components/` exist,
   read them and list **current** component files and major guideline sections.

Output a **short internal summary** (not the final spec yet).

---

## Step 2: Route list for visual inspection

From Step 1, pick **up to 8–12** routes that maximize UI diversity (home, auth, settings,
data-heavy, empty states). Present to the user:

- Table: **route path** → **why inspect** (one line).

**Do not** navigate until after approaches + plan shape are accepted (Step 3–4), unless the
user already approved inspecting early — default: inspection happens **after** sectional
approval of the **plan structure**, or in **Step 5** once dev server URL is confirmed.

---

## Step 3: Two or three approaches (with trade-offs)

Present **2–3** strategies, e.g.:

- **A — Conservative merge:** Only add/update what clearly maps from code; minimal deletes.
- **B — Code is source of truth:** Replace conflicting guideline sections from extracted
  tokens; deletes only with explicit per-file confirmation.
- **C — Hybrid:** New files from code + manual list of candidate deletes for user to reject.

Recommend one option with reasoning. **One question at a time** if needed to choose.

---

## Step 4: Build the sectional plan (before any writes)

Each **logical unit** is its **own section** for approval (see Step 5). Minimum structure:

1. **Section: Guidelines (tokens & principles)** — NEW or UPDATE `design-guidelines.md`;
   summary of what will change.
2. **Section: Motion system** — NEW or UPDATE motion content (in guidelines or separate
   subsection); summary.
3. **Per component:** exactly **one section per component**:
   - **NEW:** `design/components/<slug>.md` — summary of what will be documented + evidence
     paths in repo.
   - **UPDATE:** same — what changes vs current file.
   - **DELETE:** `design/components/<slug>.md` — **rationale only** in this section; actual
     delete is confirmed **one-by-one** at execution (Step 9).

Order sections: Guidelines → Motion → components alphabetically by slug (or by dependency
order — state the order in the spec).

---

## Step 5: Section-by-section approval (brainstorming-style)

For **each** section **in order**:

1. Present **only** that section’s content (scaled to complexity: a few sentences to ~200
   words).
2. Ask: **"Does this section look right? Reply approve, revise (with notes), or stop."**
3. If **revise**, update the section text and re-present until **approve**.
4. If **DELETE** section: make clear this **plans removal** of that file after final spec
   approval; **execution still requires per-file confirmation** (Step 9).

**STOP** between sections — do not batch multiple sections in one message.

---

## Step 6: chrome-devtools-mcp — inspect routes (after section plan is approved)

**Prerequisites:** Dev server running; user provides base URL if not inferable.

For **each** agreed route (from Step 2 list, possibly trimmed):

1. `mcp__chrome-devtools-mcp__navigate_page` to full URL (base + path).
2. `mcp__chrome-devtools-mcp__take_screenshot` — working artifact under
   `.design-extraction/screenshots/` (same cleanup rules as extraction mode).
3. Optional: `mcp__chrome-devtools-mcp__evaluate_script` for computed styles on representative
   selectors (align with static analysis).

Use findings to **refine** token/motion/component content in the written spec (Step 7) —
not to skip the written spec.

If MCP fails: retry per skill reliability rules; **do not** substitute another browser tool.

---

## Step 7: Write the spec file

Write **complete** content to:

`docs/design-system/codebase-reverse-spec-YYYY-MM-DD.md`

Include:

- Front matter: date, scope path, stack, approaches chosen.
- **Final** text for each approved section (guidelines, motion, each component).
- **DELETE list:** each path with rationale (already approved per section).
- Evidence: key file paths and routes inspected.
- **Explicit note:** Deletes are executed **only** after Step 8 and **one-by-one** confirm in Step 9.

### Spec self-review (inline)

1. Placeholder scan (no TBD for production use).
2. Consistency with repo and existing `design/`.
3. Scope: one coherent extraction.
4. Ambiguity: any double meaning?

Fix issues in the file before Step 8.

---

## Step 8: User review gate (full spec)

Ask the user to read the file on disk and approve or request edits:

> "Spec written to `docs/design-system/codebase-reverse-spec-YYYY-MM-DD.md`. Please review it.
> Reply **approve** to proceed with file writes, or list changes."

Wait. **No** writes to `design-guidelines.md` or `design/components/` until **approve**.

---

## Step 9: Execute (only after full spec approve)

### 9a. Creates and updates

Write `design-guidelines.md` and create/update `design/components/*.md` **exactly** as the
approved spec. Follow existing **design-guidelines.md** and **component compendium** formats
from the main SKILL.

### 9b. Deletes — **one at a time, explicit confirmation**

For **each** file slated for DELETE in the spec, in order:

1. Say: **"Confirm DELETE: `design/components/<file>.md` — type **yes** to delete this file, or **no** to keep it."**
2. **STOP** until the user answers.
3. If **yes**, delete that file only (or empty placeholder if your environment requires
   archive instead — prefer **delete** per user instruction).
4. If **no**, skip that delete; note in the summary and **do not** delete.

**Never** delete multiple files in one step without individual **yes** per file.

### 9c. Post-work

1. Run **update-component-index** skill (or regenerate index per main SKILL wrap-up).
2. Regenerate `design/review-checklist.md` per main SKILL.
3. Update CLAUDE.md references if main SKILL says to.
4. Delete `.design-extraction/` working screenshots when done.
5. Summarize what was created, updated, skipped deletes.

---

## Important boundaries

- **No** Superpowers visual companion; **no** `docs/superpowers/specs/`.
- **Yes** chrome-devtools-mcp for **route-level** visual inspection.
- **Section** = one of: guidelines, motion, or **one component** (new/update/delete).
- **Deletes:** section plan + **per-file yes/no** at execution.
- **No** implementation of **application** code — only design artifact files.
