---
name: component-context
description: >
  Use for design-system guidance during UI implementation: which component to use, specs for
  named components, fuzzy matches when no exact spec exists, or how to approach a component
  that has no spec yet — without loading the entire compendium into the caller's context.
  Trigger phrases: "load component spec", "component design spec", "what does the design say
  about [component]", "design spec for [component]", "which component should I use",
  "recommend a component", "pick a component from the design system", "map this UI to components",
  "no spec for", "missing component spec", "there's no design for", "how should I design",
  "how to style", "design guidance for", "component gap", "compose from existing components",
  "what should I use for [pattern]", "implement this against the design system",
  "offload component context", "get a compact spec briefing". Also when creating or editing
  files under components/, ui/, or widgets/ and you need token-aware implementation hints.
  Prefer dispatching the visual-design:component-context agent. **Exact match or ~90%+
  high-confidence fuzzy:** return the **complete** markdown body of the matched component
  spec (entire file), plus motion guidance — never a summary instead of the full spec.
  **Top-3** when fuzzy is ambiguous; **gap** when nothing fits. Never dump the whole compendium.
  Do NOT use for establishing a new design system from scratch (visual-design-consultant)
  or for post-build visual QA (design-reviewer).
version: 1.4.4
---

# Component Context

Route every request through a **decision**: obvious single match → **minimal** return; fuzzy
and **not** highly confident → **auto top 3** full specs + synthesis + motion; no match →
**gap** inference (includes motion from guidelines). Cap remains **3** full spec files max.

Heavy scoring and wide reads stay in the **`visual-design:component-context`** agent session.

---

## Step 1: Check for Design Compendium

Look for `design/components/`. If it doesn't exist:

**STOP.** Tell the user: "No component compendium found at `design/components/`. Run the
visual-design-consultant skill first to establish a design system."

If `design-guidelines.md` is missing, note it; still return what you can for motion (from
specs alone if present).

---

## Step 2: Invocation

**Recommended:** Dispatch **`visual-design:component-context`** with UI intent, component name,
or file path.

**Interactive:** Same rules in the main thread.

---

## Step 3: Identify the Component or Pattern

Extract **target name** and **what they are trying to build** (drives fuzzy ranking and
synthesis).

---

## Step 4: Lookup (agent session)

### Exact match

Try `design/components/{name}.md` with kebab-case / singular-plural / PascalCase variants.
If a file exists → note **exact_match**.

### Fuzzy match (no exact file)

1. Prefer `design/components/index.md`: score rows (substring/related **3**, keywords **2**,
   category **1**).
2. Internally rank **at least top 5**; read `.md` files as needed for scores and motion.
3. No index: `Glob` `design/components/*.md`, score from Related + Usage & Content.

Let **S1** = highest score, **S2** = second-highest (use **0** if no second candidate).

### Motion sources (always consider)

- `design-guidelines.md`: motion / animation / duration / easing / `prefers-reduced-motion`
  if documented.
- Each component spec: **Motion**, **Animation**, **Transitions**, or equivalent sections.

---

## Step 5: Decision — which output mode?

### A. Exact match

→ **Minimal mode** (§7a). **MUST** include the **entire** contents of the matched
`design/components/<file>.md` (full component spec — no excerpts, no “key sections only”).
Then **Motion guidance** (§6). **Do not** add long briefing, ranked lists, or pattern
synthesis unless the user explicitly asked to compare options.

### B. No exact match — high-confidence fuzzy (≈ “90%+” winner)

Treat as **single obvious match** when **any** holds:

1. **S2 == 0** and **S1 > 0** (only one scored candidate), or  
2. **S1 > 0** and **S2 / S1 ≤ 0.1** (runner-up is ≤10% of the top score — top is ~90%+ of the
   combined top-two signal), or  
3. **S1 - S2 ≥ 3** on the weighted row scale (3/2/1 weights) — clear separation.

→ **Minimal mode** for the **top-ranked** component only (§7a). **MUST** include the **entire**
markdown body of that component’s spec file — same rule as exact match: **full spec**, not a
summary.

### C. No exact match — not high-confidence

→ **Top-3 mode** (§7b): include **full** markdown for the **top 1–3** components that have
**score > 0** (if only two exist, two full specs — **do not** pad with weak third). Add
**Design pattern synthesis** and **Motion guidance** (§6).

### D. No scores > 0

→ **Gap mode** (§7c).

---

## Step 6: Pattern synthesis and motion (Top-3 mode)

### Design pattern synthesis

**Required** in Top-3 mode. **Omit** in Minimal mode.

- How each of the **included** full specs maps to what they are building; when to prefer A
  vs B vs C.
- **Composition:** stack/nest (from Related / Usage in specs).
- **Shared tokens / density / a11y** across those components.
- **Gaps:** what none of the three cover → suggest visual-design-consultant.

Keep roughly **≤40 lines** unless dispatch asks for depth.

### Motion guidance

**Always provide motion guidance** in some form:

| Mode | Motion |
|------|--------|
| **Minimal** | After the full spec: **### Motion guidance** — **≤4 bullets** from that spec’s motion/animation sections + relevant lines from `design-guidelines.md`. Mention **prefers-reduced-motion** if guidelines do. |
| **Top-3** | **### Motion guidance** — how motion should **align** across the chosen components (durations, easing, enter/exit, reduced motion). Cite tokens from guidelines + each spec’s motion sections. **≤8 bullets** or **≤25 lines**. |
| **Gap** | **### Motion guidance** — **≤5 bullets** from `design-guidelines.md` only (or note “no motion tokens documented”). |

---

## Step 7: Output shapes

### 7a. Minimal mode (exact or high-confidence single match)

No ranked list. No pattern synthesis.

**HARD RULE:** Output the **complete** component spec — **100%** of the file from disk for
the matched component. Do **not** truncate, abbreviate, or replace with a bullet summary.

```
## Full design spec: [Component display name]

[verbatim full contents of design/components/<file>.md — entire file]

### Motion guidance
- [≤4 bullets — spec + design-guidelines.md]
```

Optional single line before the heading: `Single match: [name] ([path])` — **one line only**.

### 7b. Top-3 mode (ambiguous fuzzy)

**Part A — Briefing**

```
## Component context briefing

### What you're building
- [one line]

### Top matches (full specs below for ranks 1–3; score > 0 only)
1. **[Name]** — [path] — [one line fit] (S=[score optional])
2. ...
3. ...
4+. [Name] — path — [one line only, no full spec]

### Design pattern synthesis
- [§6]

### Motion guidance
- [§6]

### Key tokens (max 8 bullets)
- [...]

### Implementation notes (max 7 bullets)
- [...]
```

**Part B — Full specs**

For each of **up to 3** components in rank order, separated by `---`:

```
## Full design spec: [Name]
[entire file]
---
```

### 7c. Gap mode

```
## Component context briefing

### What you're building
- [one line]

### Inferred approach (no compendium match)
- [≤7 bullets — composition, tokens, states, a11y]

### Motion guidance
- [≤5 bullets from design-guidelines.md or note absence]

### Next step
- Run visual-design-consultant to add `design/components/...` when ready.
```

**No Part B.**

### Routing-only (optional)

If dispatch is only “which file?”: **Part A** with paths + one line each; **omit** full
paste unless asked.

---

## Important Boundaries

- Read-only on design files.
- **Max 3** full spec files per reply.
- **Minimal mode (exact or ~90%+ fuzzy):** **full** component spec file (entire markdown) +
  motion — **never** substitute a shortened spec.
- **Top-3 mode:** auto top **1–3** full specs by rank when **not** high-confidence; fourth+
  summarized only.
- visual-design-consultant owns net-new system creation.
