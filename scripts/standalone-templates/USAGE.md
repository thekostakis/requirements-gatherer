# Usage: Defect and Requirements Tools

Four skills, four workflows. Each skill activates from natural trigger phrases — you do
not need to remember a slash command. Start a Claude Code session in the project you want
to work in, then tell Claude what you want to do.

## 1. Define what to build (before writing code)

**Trigger phrases:** "gather requirements", "let's do a requirements interview", "I want
to scope a new project", "build out requirements for X".

**What happens:** The `requirements-gatherer` skill interviews you as a senior product
consultant would — one question at a time, covering users, goals, constraints, scope,
and success criteria. It produces a `requirements.md` file in your working directory.

**Adding to an existing requirements.md later:** Just say "add requirements for X" in a
session where `requirements.md` already exists. The skill detects the existing file and
switches to addendum mode instead of starting over.

**Source-sync mode:** If you already have a codebase or docs and want to derive or
reconcile a `requirements.md` from them, say "sync requirements from the repo" or "extract
requirements from these docs". The skill will analyze the source material, propose a
requirements document, and require your explicit approval before overwriting anything.

## 2. Turn requirements into GitHub or Jira issues

**Trigger phrases:** "create issues from requirements", "organize requirements into
epics", "push requirements to GitHub", "push requirements to Jira".

**Prerequisites:** You must have a `requirements.md` file in the working directory, and
`gh` / an Atlassian MCP must be configured.

**What happens:** The `requirements-organizer` skill reads `requirements.md`, groups items
into epics and stories, shows you the full plan, and waits for your explicit confirmation
before creating anything. Created issues link back to the requirement sections.

## 3. Report a bug you just found

**Trigger phrases:** "I found a bug", "report a defect", "file an issue", "something's
broken", "this isn't working".

**What to tell the skill:**
- The page URL (for visual bugs) or the API endpoint (for non-visual bugs).
- What you saw happen.
- What you expected to happen instead.

**What happens:** The `defect-reporter` skill conducts a structured intake interview,
classifies the issue as a defect / story-update / feature, and writes a defect file to
`defects/defect-YYYY-MM-DD-NNN.md`.

On the visual path, when headless Playwright is available, the skill automatically
captures screenshots, a DOM snapshot, computed styles, and console messages into
`defects/evidence/`, and records those paths in the defect file's `## Attachments`
section. If Playwright is not available, the skill falls back to your description plus
any screenshots you can paste manually.

The skill will never modify code or requirements — it only documents.

## 4. Push defect files into tickets

**Trigger phrases:** "push defects to GitHub", "submit the bugs", "create tickets from
defects", "file these with Jira".

**Prerequisites:** You have defect files in `defects/` (from workflow 3) and the target
platform's CLI or MCP is configured.

**What happens:** The `defect-organizer` skill reads all pending defect files, detects the
available platforms, shows you the full submission plan, and waits for confirmation
before creating anything.

**Screenshots in tickets:**
- **GitHub:** Screenshots and capture artifacts are uploaded to a shared release named
  `defect-evidence` in the target repo, with per-defect filename namespacing. The issue
  body embeds images inline so they render in the GitHub UI.
- **Jira:** Screenshots are uploaded as native Jira attachments and referenced inline in
  the issue description.
- **Linear / GitLab:** Attachment paths are listed as text in the issue body. Upload the
  files manually through the platform's UI if needed.

If the upload tool is missing on the selected platform, the skill will explicitly ask
whether to proceed with text-only issues or abort. It will never silently skip.

Successfully submitted defect files are moved to `defects/.archived/`. Failed ones remain
in `defects/` for you to retry.

## What these skills will and won't do

**They WILL:**
- Conduct structured interviews and produce markdown documents.
- Investigate bugs by tracing code or capturing pages headlessly.
- Create issues and upload screenshots to your configured tracker.
- Always show you a plan and wait for confirmation before taking destructive actions.

**They WON'T:**
- Modify your application code. The reporter and organizer are report-only.
- Invent defects or requirements you didn't describe.
- Fix bugs. They classify and document.
- Proceed past a confirmation gate without your explicit approval.
- Silently skip steps when a tool is unavailable — they always tell you.
