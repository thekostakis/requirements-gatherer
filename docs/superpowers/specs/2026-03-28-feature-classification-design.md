# Design: Add Feature Classification to Defect Gatherer

_Date: 2026-03-28_
_Status: Approved_

## Problem

The defect-gatherer currently classifies all reported issues as either a **defect** (code contradicts spec) or a **story-update** (spec needs changing). There is no classification for when a user reports something that turns out to be missing functionality — the feature was never built and doesn't exist in the requirements. These get awkwardly shoehorned into "defect" or "story-update" when they are neither.

## Solution

Add a third classification: **feature**. This represents functionality that doesn't exist yet — the user expected it, but it was never specified or built. Features get filed as Story/Feature issues under the appropriate epic, with a note that requirements should be updated to include the new feature.

## Changes Required

### 1. defect-reporter SKILL.md

**Step 7 (Classification)** — Add `feature` as a third option:
- **defect**: Code contradicts documented requirements. Code needs to change.
- **story-update**: Requirement is outdated or wrong. Spec needs updating.
- **feature**: Functionality doesn't exist yet. Not in requirements, no code path. New work needed.

The reporter should propose `feature` when investigation reveals: no matching requirement exists, no code path implements the behavior, and the user's expectation is reasonable but unspecified.

**Step 8 (Severity/Priority)** — Make conditional on classification:
- defect/story-update: Use existing severity scale (Critical / High / Medium / Low)
- feature: Use priority scale (Must-have / Should-have / Nice-to-have)

Severity definitions unchanged. Priority definitions:
- **Must-have**: Blocks a primary user flow. Users cannot accomplish a key task without this.
- **Should-have**: Significant gap that affects user experience but has workarounds.
- **Nice-to-have**: Would improve the product but not critical for current scope.

**Step 10 (Verification Playback)** — Show Priority instead of Severity for features.

**Step 11 (Temp File Format)** — Update the neutral intermediate format:
- `_Severity:_` becomes `N/A` for features
- Add `_Priority: [Must-have | Should-have | Nice-to-have]_` (N/A for defects/story-updates)
- `Story Impact` section for features: "This feature should be added to requirements under [Epic/Section]. Requirements.md should be updated to include this functionality."

### 2. defect-organizer SKILL.md

**Step 1** — Summary table adds Priority column for features.

**Step 4 (Submission Plan)** — Table adds Priority column. Features show priority instead of severity.

**Step 5a (GitHub)** — Add `feature` label (green, e.g., 0E8A16). Features get `feature` label, no severity label. New issue body template for features:

```
## Feature Request

**Priority:** [Must-have / Should-have / Nice-to-have]

## Description
[Description from defect report]

## User Expectation
[What the user expected to be able to do]

## Current State
[What actually exists — nothing, or partial implementation]

## Suggested Behavior
[How the feature should work based on user's description and existing patterns]

## Requirements Impact
This feature should be added to requirements under [Epic/Section].
Requirements.md should be updated to include this functionality.

## Requirement Reference
Related epic: [Epic N: Name]
Related area: [requirement section, if identifiable]

_Filed via defect-gatherer plugin_
_Source: [defect file ID]_
```

**Step 5b (Jira)** — Features: Issue type = "Story". Priority maps Must-have→Critical, Should-have→Major, Nice-to-have→Minor.

**Step 5c (Linear)** — Features: "Feature" label. Priority maps Must-have→High(1), Should-have→Medium(2), Nice-to-have→Low(3).

**Step 5d (GitLab)** — Features: `feature` label, no severity label.

**Hard Rules** — Add: "Use distinct issue types/labels for defects vs story-updates vs features."

### 3. requirements.md

Update Features section to include the feature classification. Update Glossary to define "feature" in context.

### 4. Marketplace version bump

Bump defect-gatherer to 1.1.0 in both plugin.json and marketplace.json.

## Files to Modify

1. `plugins/defect-gatherer/skills/defect-reporter/SKILL.md`
2. `plugins/defect-gatherer/skills/defect-organizer/SKILL.md`
3. `plugins/defect-gatherer/.claude-plugin/plugin.json` (version bump)
4. `.claude-plugin/marketplace.json` (version bump)
5. `requirements.md` (update features, glossary)

## Verification

- Read both SKILL.md files and confirm all three classifications are present
- Confirm severity is conditional (defect/story-update only) and priority is feature-only
- Confirm temp file format includes both Severity and Priority fields
- Confirm organizer has templates for all three types across all four platforms
- Confirm versions match in plugin.json and marketplace.json (1.1.0)
