# Install: Defect and Requirements Tools

This zip contains two Claude Code plugins:

- **defect-gatherer v{{VERSION_DEFECT_GATHERER}}** — defect reporting and submission.
  Skills: `defect-reporter` (structured bug intake with optional headless Playwright
  screenshots) and `defect-organizer` (push defect files to GitHub, Jira, Linear, or
  GitLab).
- **requirements-gatherer v{{VERSION_REQUIREMENTS_GATHERER}}** — requirements interview
  and issue creation. Skills: `requirements-gatherer` (senior-product-consultant
  interview that produces `requirements.md`) and `requirements-organizer` (convert
  requirements into GitHub milestones/issues or Jira epics/stories).

See `USAGE.md` in this same zip for task walkthroughs once installed.

## Prerequisites

- **Claude Code** installed and working.
- **Node.js** (v18+) — required by the headless Playwright bridge used by
  `defect-reporter`'s visual-bug path. Not required for API-only bug reports.
- **`gh` CLI** — required if you want `defect-organizer` to upload screenshots to
  GitHub issues. Authenticate with `gh auth login` before use.
- **Atlassian MCP server** — required if you want `defect-organizer` to upload
  screenshots to Jira issues. Configure in your Claude Code settings.

Linear and GitLab are supported for issue creation but not for screenshot upload in
this version; attachment paths come through as text.

## Install (offline, local plugins)

1. **Unzip** this archive to a scratch location.

2. **Copy each plugin directory** into your Claude Code local plugins directory:
   - Unix / macOS: `~/.claude/plugins/`
   - Windows: `%USERPROFILE%\.claude\plugins\`

   For example, on Unix:

   ```bash
   cp -R defect-gatherer ~/.claude/plugins/
   cp -R requirements-gatherer ~/.claude/plugins/
   ```

   The destination should now contain `~/.claude/plugins/defect-gatherer/` and
   `~/.claude/plugins/requirements-gatherer/`.

3. **Reload plugins in Claude Code.** In any Claude Code session, run:

   ```
   /reload-plugins
   ```

## Verify the install

Open a Claude Code session in any project and say:

- "Let's gather requirements for a new project" — should activate `requirements-gatherer`.
- "Create issues from requirements.md" — should activate `requirements-organizer`.
- "I want to report a bug" — should activate `defect-reporter`.
- "Push the defects to GitHub" — should activate `defect-organizer`.

If none of these activate, re-run `/reload-plugins` or restart Claude Code.

## Uninstall

Delete the two plugin directories:

```bash
rm -rf ~/.claude/plugins/defect-gatherer ~/.claude/plugins/requirements-gatherer
```

Then run `/reload-plugins`.

## Notes

- Screenshot upload to tickets is supported on GitHub and Jira only in this version.
  Linear and GitLab fall back to listing paths as text in the issue body.
- The `defect-reporter` visual path will auto-install Playwright and Chromium the first
  time it runs if they are not already present. This takes ~2 minutes on first run.
