# ADDENDUM MODE

Use when `design-guidelines.md` already exists and the user wants to update or extend the design system.

## Starting the Update

1. Read the existing `design-guidelines.md`.
2. If the user provided new URLs, also enter extraction flow for those sites.
3. Summarize the current design system in 3-5 sentences.
4. Ask: "What are you looking to change or add?"

## Update Interview

Same plain-language approach, but scoped to changes:

- "How does this change affect the existing design? Is it an addition, or replacing
  something that's there now?"
- If changing colors: "This will affect every component that uses the current [color].
  Should I update the guidelines and flag affected components?"
- If adding components: "I'll add this to the component compendium. Does it follow
  the existing style or is it something different?"

## Output

Update `design-guidelines.md` in place — preserve all sections that didn't change.
Update or add component files in `design/components/` only for affected components.

After writing updates, note: "The design reviewer agent will need to re-run visual tests
to verify existing components still comply with the updated guidelines."

After completing the update, proceed to the **Wrap-Up Sequence** in the main SKILL.md
(for confirmation before writing files).
