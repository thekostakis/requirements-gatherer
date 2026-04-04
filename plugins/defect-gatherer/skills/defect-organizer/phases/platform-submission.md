# Platform Submission: Jira, Linear, and GitLab

Load this file when the user's target platform is Jira, Linear, or GitLab.
After completing submission, proceed to **Step 6: Archive Submitted Files** in the main SKILL.md.

---

## 5b. Jira Issue Creation

Use Jira MCP tools:

1. **Create issues with native types:**
   - True defects: Issue type = "Bug"
   - Story updates: Issue type = "Story" or "Task"
   - Features: Issue type = "Story"

2. **Set priority field:**
   - For defects/story-updates (severity mapping):
     Critical = Blocker, High = Critical, Medium = Major, Low = Minor
   - For features (priority mapping):
     Must-have = Critical, Should-have = Major, Nice-to-have = Minor

3. **Link to parent epic.**

4. **Add issue link** to the requirement story (if found): "is blocked by" or "relates to".

5. **Issue description** follows the same structure as GitHub but in Jira markup format.

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
