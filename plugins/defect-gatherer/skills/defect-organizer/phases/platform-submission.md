# Platform Submission: Jira, Linear, and GitLab

Load this file when the user's target platform is Jira, Linear, or GitLab.
After completing submission, proceed to **Step 6: Archive Submitted Files** in the main SKILL.md.

---

## 5b. Jira Issue Creation

Use Jira MCP tools. This section runs AFTER Step 4.5 has confirmed an Atlassian
attachment MCP tool is available (or confirmed `attachments_disabled = true`).

### 5b.1 Create issue with placeholder Attachments block

1. **Issue type:**
   - True defects: "Bug"
   - Story updates: "Story" or "Task"
   - Features: "Story"

2. **Priority field:**
   - Defects/story-updates (severity mapping): Critical → Blocker, High → Critical,
     Medium → Major, Low → Minor
   - Features (priority mapping): Must-have → Critical, Should-have → Major,
     Nice-to-have → Minor

3. **Link to parent epic.** Add issue link to the requirement story (if found):
   "is blocked by" or "relates to".

4. **Issue description.** Build the description from the same structure as the GitHub
   templates in SKILL.md §5a.3, with the Attachments section as PLACEHOLDERS:

```markdown
## Attachments
_Uploading: <basename-1>_
_Uploading: <basename-2>_
```

If `attachments_disabled` is true, omit the placeholders and substitute the original
text-only `## Evidence` content from the defect file instead.

5. **Create the issue** and record the returned `issueKey`.

### 5b.2 Upload attachments

Skip this sub-step entirely if `attachments_disabled` is true or this defect has no
attachments.

For each path in the defect's attachment list:

```
POST /rest/api/3/issue/{issueKey}/attachments
Headers: X-Atlassian-Token: no-check
Body: multipart/form-data file=@<path>
```

Call the Atlassian MCP attachment tool (discovered in Step 4.5) with the issue key and
file path. On network/permission error, retry once. On second failure, record in session
`upload_failures`, continue.

Record each successful upload as
`uploaded_assets[<defect_id>].append({filename: "<basename>", issue_key: "<key>"})`.

### 5b.3 Update issue description with inline references

Skip if `attachments_disabled` is true or no attachments were uploaded for this defect.

Build the final Attachments block:

- For each uploaded attachment, if the basename ends with `.png`, `.jpg`, `.jpeg`,
  `.gif`, or `.webp` (case-insensitive), emit
  `![<basename>](attachment://<basename>)`.
- Otherwise emit `[<basename>](attachment://<basename>)`.
- One per line, blank line between each.

Call the Jira update-issue MCP tool to replace the placeholder `## Attachments` block in
the description with the final block.

**Fallback when description update is unavailable:** If the MCP in use does not expose a
description-update tool (or the update call fails), instead post a single comment on the
issue whose body is the final `## Attachments` block. Jira renders attachment references
inside comments identically. The placeholder stays in the description in this case — do
not treat that as a failure.

### 5b.4 Verify

For each created issue, call the Jira get-issue MCP tool and confirm the attachment count
equals the expected count for that defect. Mismatches go to session `upload_failures`.

---

## 5c. Linear Issue Creation

Use Linear CLI, MCP, or API (whichever was detected):

1. **Create issues:**
   - True defects: Add "Bug" label
   - Story updates: Add "Improvement" label
   - Features: Add "Feature" label

2. **Set priority:**
   - For defects/story-updates (severity mapping):
     Critical = Urgent (0), High = High (1), Medium = Medium (2), Low = Low (3)
   - For features (priority mapping):
     Must-have = High (1), Should-have = Medium (2), Nice-to-have = Low (3)

3. **Assign to project** (equivalent of epic).

4. **Add requirement reference** in description.

**Attachments:** Attachment upload is not implemented for Linear in this plugin version.
Defect attachment paths from the `## Attachments` block are included in the issue
description as text paths, prefixed by the note added in Step 4.5. Manual upload is
supported via the Linear UI.

---

## 5d. GitLab Issue Creation

Use glab CLI, MCP, or API:

1. **Create issues:**
   - True defects: Label `bug`
   - Story updates: Label `story-update`
   - Features: Label `feature`

2. **Severity labels** (defects/story-updates only): `severity::critical`, `severity::high`,
   `severity::medium`, `severity::low`. Features do not get severity labels.

3. **Assign to milestone.**

4. **Add requirement reference** in description using `#[issue]` linking.

**Attachments:** Attachment upload is not implemented for GitLab in this plugin version.
Defect attachment paths from the `## Attachments` block are included in the issue
description as text paths, prefixed by the note added in Step 4.5. Manual upload is
supported via the GitLab UI.
