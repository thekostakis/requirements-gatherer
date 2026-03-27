# requirements-gatherer

A Claude Code plugin with two skills for requirements gathering and issue creation.

## Skills

### requirements-gatherer

A senior product consultant that interviews you to understand what you want to build, then produces a structured `requirements.md` file. It defines WHAT and WHY, never HOW — no architecture, no tech recommendations, no implementation details.

**Trigger phrases:** "gather requirements", "requirements interview", "what should we build", "help me define the requirements", "I want to build [something]"

**What it does:**
- Asks 1-2 questions at a time, pushes back on vagueness, names patterns
- Silently researches your domain to ask informed questions
- Proactively surfaces gaps you haven't considered
- Challenges scope creep and helps find the MVP
- Produces a structured `requirements.md` after a confirmation step

### requirements-organizer

Reads a reviewed `requirements.md` and creates structured epics and issues in GitHub or Jira. You trigger this after reviewing and editing the requirements document.

**Trigger phrases:** "create issues from requirements", "organize into epics", "push to GitHub", "push to Jira", "create tickets"

**What it does:**
- Groups features into dependency-ordered epics (Epic 1 is always Foundations)
- Presents the epic structure for your approval before creating anything
- Creates milestones + issues (GitHub) or epics + stories (Jira)
- Falls back to a `backlog.md` file if no GitHub/Jira integration is available
- Open questions become `needs-decision`-labeled issues

## Installation

**Step 1:** Add the marketplace:

```
/plugin marketplace add thekostakis/requirements-gatherer
```

**Step 2:** Install the plugin:

```
/plugin install requirements-gatherer@functional-design-tools
```

**Step 3:** Reload:

```
/reload-plugins
```

## Usage

Start a requirements interview:

```
> I want to build a project management tool for small teams
```

After reviewing and editing the generated `requirements.md`:

```
> create issues from requirements.md
```

## License

MIT
