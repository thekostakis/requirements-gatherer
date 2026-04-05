# Source sync mode — reverse-engineer or reconcile `requirements.md`

Derive behavioral requirements from **files already available** (repo, attachments, pasted
exports) and **URLs** (WebFetch). Infer intent from **code** only as observable behavior
(user-visible flows, API contracts as behavior, feature flags as capability toggles) — not
as architecture recommendations.

## Non-goals (mandatory)

- Do **not** recommend stacks, frameworks, schemas, or system design.
- Do **not** write production code or pseudocode; describe **behavior** only.
- Do **not** silently overwrite `requirements.md`.

## Tooling

- **Read / Glob / Grep** — repo and local files.
- **WebFetch** — public URLs the user or dispatch context names.
- **WebSearch** — domain or product context when the repo is unclear (silent, sparse use).

If a source is **authenticated** (private Jira/Confluence/GitHub) and no export file or
token-backed tool is available: record it under **Source gaps** and ask the user to paste
an export or add a file to the workspace — do **not** invent ticket content.

## Step 1: Confirm scope and sources

1. List every source the user pointed at: paths, globs, URLs, pasted excerpts, attachment
   filenames.
2. If scope is ambiguous, ask **one** clarifying question (product boundary, environment,
   or audience) before scanning.

## Step 2: Inventory sources

Build a table (in working notes, then in the output artifact):

| Source | Type (code / doc / url / export) | Trust (primary / secondary) | Notes |

**Repo-wide scan (when requested):**

- Glob: `README*`, `docs/**/*.md`, `**/openapi*.{yaml,yml,json}`, `**/swagger*`,
  `**/*requirements*.md`, `**/*spec*.md`, `**/routes/**/*`, `**/pages/**/*`, `**/app/**`,
  `**/*feature*.{ts,tsx,js,jsx}`, `**/.env.example`
- Grep (sample): route definitions, HTTP method + path patterns, permission strings,
  feature-flag reads — enough to infer **user-facing capabilities**, not implementation
  structure.
- Stop when diminishing returns: prefer high-signal files over reading every source file.

## Step 3: Extract behavioral candidates

For each source cluster, extract **candidate requirements**: actors, goals, flows,
features, data concepts (conceptual), integrations, NFRs, compliance mentions.

Tag each candidate with: `evidence: <file or URL snippet reference>`.

## Step 4: Reconcile with existing `requirements.md` (if present)

1. Read `requirements.md` in full.
2. Classify each candidate as: **aligned** (already documented), **gap** (missing),
  **drift** (conflicts or contradicts documented behavior), **unclear** (ambiguous).
3. For **drift** or **unclear**: do **not** guess. Add to **Conflicts & ambiguities** and
   **interview the user** with concrete A-vs-B questions. Wait for answers before
   finalizing proposed edits.

## Step 5: Write the sync artifact (always before touching `requirements.md`)

Use `phases/output-format.md §SourceSync`. Write:

`requirements-source-sync-[YYYY-MM-DD].md`

Include:

- Executive summary (what the sources say vs what `requirements.md` says, if any)
- Source inventory table
- Extracted behavioral requirements (structured like the main template where helpful)
- **Drift / gap analysis** with file/URL evidence
- **Conflicts & ambiguities** (empty if none — if any, show user answers once resolved)
- **Proposed edits to `requirements.md`** — section-by-section narrative: current text
  (short quote), proposed text, rationale, risk if wrong

**STOP:** Do **not** apply edits to `requirements.md` in this step.

## Step 6: User confirmation gate

1. Present a short summary in chat: path to the artifact, count of gaps/drifts, open
   questions remaining.
2. Ask explicitly: whether to **create** `requirements.md` (if missing), or **apply**
   proposed updates to the existing file, or **produce an addendum** instead.
3. Only after explicit approval:
   - **No existing file:** write `requirements.md` using `output-format.md §NewMode` and
     content validated in the sync artifact.
   - **Existing file:** apply agreed edits (or write `requirements-addendum-*.md` if the
     user prefers — follow ADDENDUM rules for addendum files).

If the user does not approve a full replace, default to **addendum** or **revised sync
artifact** only — never overwrite without consent.

## Quality check

Before finalizing the sync artifact, verify the litmus test from the main skill:

> Could a team build this with a completely different tech stack and still satisfy every
> requirement stated?

Strip any implementation-specific language that slipped in during code reading.
