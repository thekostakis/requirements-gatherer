# EXTRACTION MODE

Use when no `design-guidelines.md` exists and the user has provided URLs to reference sites.

## Step 1: Gather URLs

For each URL the user provided:

1. Use **WebFetch** to fetch `[site]/sitemap.xml`. This is plain XML — no browser rendering
   needed. Do NOT use Chrome browser tools for this step. Collect all URLs from the sitemap.
2. Open the homepage in a Chrome tab. Run the `link-crawler.js` script (ships with this
   plugin — use Glob to find `**/link-crawler.js`, read it once) via
   `mcp__chrome-devtools-mcp__evaluate_script` to discover internal links.
3. If the sitemap has distinct sections (e.g., `/blog/`, `/docs/`, `/integrations/`), also
   run `link-crawler.js` on one page from each section to find sub-navigation links.
4. Combine sitemap URLs + crawled URLs, deduplicate by normalized pathname.
5. Cap the combined list at 50 URLs for fingerprinting. If over 50, prioritize: homepage
   first, then URLs from link crawling (more likely to be navigation-linked important
   pages), then sitemap URLs.
6. If no sitemap exists AND link crawling returns fewer than 10 URLs, tell the user:
   "I found limited pages to analyze. I have two options:"
   - (a) "I can crawl deeper from the pages I found to discover more."
   - (b) "You can give me specific URLs for the key pages you want me to analyze."
   Wait for the user's choice.

## Step 2: Fingerprint Pages in Parallel

Fingerprint all gathered URLs to identify structurally unique page templates before doing
the expensive full extraction.

1. Load `page-fingerprint.js` once (ships with this plugin — use Glob to find
   `**/page-fingerprint.js`, read it once).
2. Process pages in parallel batches of 5 when the browser session has enough tabs; otherwise fingerprint sequentially (see below).
   a. **`list_pages` lists tabs — it does not create them.** If fewer than 5 pages are returned, either: (i) open additional Chrome tabs in the same debugging-attached browser until `list_pages` shows 5+ pages, then assign each `navigate_page` to a distinct page id, or (ii) fall back to **sequential fingerprinting**: one tab, `navigate_page` → `evaluate_script` (fingerprint) → next URL, repeat — slower but valid when only one tab exists.
   b. When you have 5+ pages: navigate each tab to a different URL (up to 5 parallel `mcp__chrome-devtools-mcp__navigate_page` calls targeting different page ids).
   c. Run `page-fingerprint.js` on each tab in the batch (parallel `evaluate_script` calls when multiple tabs exist).
   d. Collect the fingerprint results.
   e. Reuse tabs by navigating to the next batch of URLs.
3. Repeat until all URLs are fingerprinted (50 URLs / 5 per batch = 10 rounds).
4. Group fingerprint results by `structuralHash`. Pages with identical hashes use the
   same template — they share the same landmark structure, layout shape, and interactive
   element types.
5. Present a summary to yourself (not the user): "Found X unique page templates from Y
   total URLs. Templates: [list each hash with count and example URL]."

## Step 3: Full Extraction on Unique Pages

From each unique structural group, pick 1-2 representative pages. Prefer pages with:
- The most entries in the `components` array (richest component diversity)
- The most interactive elements
- The highest DOM complexity

For each representative page, use Chrome browser tools for three things — JS extraction,
a screenshot, and visual component review.

Load the extraction script `extract-design-tokens.js` once (use Glob to find
`**/extract-design-tokens.js`, read it once).

Process representative pages in parallel batches of 3-5 tabs:

1. **Navigate** to the page using `mcp__chrome-devtools-mcp__navigate_page`.
2. **Extract styles via JavaScript** using `mcp__chrome-devtools-mcp__evaluate_script`.
   To pass discovered component selectors from the fingerprint, prepend
   `const discoveredSelectors = [".pricing-toggle", ".faq-accordion", ...];` (built from
   the fingerprint's `components[].selector` values for this page) before the extraction
   script contents. This makes the extraction script capture styles for ALL discovered
   components, not just the 32 hardcoded selectors.
3. **Capture a screenshot** using `mcp__chrome-devtools-mcp__take_screenshot`.
   Save to `.design-extraction/screenshots/`. These screenshots are **working artifacts**
   for visual design interpretation.
4. **Visual component inventory**: After extraction + screenshot for each page, review the
   screenshot and cross-reference against the fingerprint's DOM component inventory.
   Identify any visually distinct components the DOM analysis missed — especially common
   on utility-class/Tailwind sites where the DOM is generic `div`s with no distinctive
   class names. For any visually-discovered components not in the inventory, identify them
   in the DOM by position/content and do a targeted follow-up extraction with their
   selectors added to `discoveredSelectors`.
5. Merge DOM-discovered and visually-discovered component inventories into a unified list
   per page.

**Important:** Do NOT use `mcp__chrome-devtools-mcp__take_snapshot` — the JS extraction script
already captures everything from the DOM. Adding read_page would duplicate data and waste
tokens.

## Step 4: Responsive Extraction

After completing Step 3 for all representative pages, perform responsive extraction on 1-2
pages (pick the pages with the most layout complexity — typically the homepage and one
content-heavy page):

1. Examine the `breakpoints` array AND the `fluidResponsive` object from the extraction
   data. Note whether the site uses discrete breakpoints, fluid techniques, or both.
2. Regardless of what the site uses, test at these viewport widths: 375px (mobile), 768px
   (tablet), 1024px (desktop), 1440px (wide desktop).
3. For each viewport width:
   a. Call `mcp__chrome-devtools-mcp__resize_page` with `width` set to the value,
      `height` of 900.
   b. Re-run the extraction script via `mcp__chrome-devtools-mcp__evaluate_script`. This
      captures computed styles, layout patterns, and animated elements at this viewport.
   c. Take a screenshot at this viewport size (same working artifacts approach as Step 3).
4. After all viewport passes, compare the extraction data across viewports:
   - Which layout patterns change? (e.g., a 3-column grid becoming a single column)
   - Which components change size, padding, or visibility?
   - Does the navigation pattern change? (horizontal menu becoming a hamburger)
   - Do font sizes or spacing values scale down?
   - Does the `fluidResponsive` data show clamp()/viewport-unit usage?
5. Restore the browser to a reasonable default width (1280px) after responsive extraction.

**Note:** The `breakpoints`, `responsivePatterns`, and `fluidResponsive` data are the same
at every viewport (parsed from stylesheet rules), but `layoutPatterns`, `components`,
`fonts`, `spacing`, and `animatedElements` will differ. The diff between viewport passes
reveals the responsive behavior.

**Acceptable shortcut:** If time is tight, extracting at just two widths (375px mobile +
1280px desktop) is sufficient to capture the core responsive behavior.

### Responsive Approach Choice

After responsive extraction is complete, **always** present this choice to the user:

"For your responsive approach, you have two options:
- **Fluid (recommended):** Things scale smoothly across all screen sizes using `clamp()`
  and viewport units. No hard jumps. Works on every screen without needing to define
  specific sizes.
- **Breakpoint-based:** Layout changes at specific screen widths. Things stay fixed between
  breakpoints and then jump to a new size.

I recommend fluid — which do you prefer?"

If the extracted site uses breakpoints, note that: "The site I extracted uses breakpoints
at [X, Y, Z]px." But still recommend fluid.

If the extracted site uses fluid techniques, note that: "The site I extracted already uses
fluid responsive techniques like clamp() and viewport units."

Remember the user's choice — it determines which responsive template format to use in the
design-guidelines.md output.

## Step 5: Compile and Deduplicate

After extracting from all pages across all sites:

1. **Deduplicate** colors, fonts, spacing values. Normalize formats (hex to consistent case,
   combine similar values within tolerance).
2. **Group** into categories: primary palette, neutral palette, accent colors, font families,
   type scale, spacing scale, motion tokens, component patterns.
3. **Identify the design language**: is it minimal or detailed? Rounded or sharp? Elevated
   (shadows) or flat? Dense or spacious? Fast or deliberate?
4. **Identify responsive patterns**: From the multi-viewport extraction data, characterize:
   mobile-first vs desktop-first (do `@media` rules use `min-width` or `max-width`?), how
   many breakpoints the site uses, what layout strategy is used (CSS Grid, Flexbox, or both),
   and key responsive behaviors (stacking columns, hiding sidebars, collapsing navigation,
   changing font sizes).
5. **Catalog motion patterns**: From the `animatedElements` data, group discovered animations
   by purpose: micro-interactions (hover/focus feedback), state transitions (open/close,
   show/hide), loading/skeleton patterns, scroll-triggered animations, decorative/ambient
   motion. Cross-reference `animationName` values against the extracted `CSSKeyframesRule`
   definitions to get full motion specs. Custom components with unique animations that don't
   match any hardcoded selector are especially important to document — these are the ones
   most likely to be missed during implementation.

## Step 6: Multi-Site Conflict Resolution

If multiple sites were extracted, present conflicts to the user in plain language:

```
I extracted design patterns from [N] sites. Here's what I found:

**Colors:**
- Site A uses a blue primary (#1a73e8), Site B uses purple (#6b5ce7). Which direction?
- Both use similar neutral grays — I'll merge these.

**Typography:**
- Site A uses Inter, Site B uses SF Pro. Preference?
- Both use similar size scales — I'll combine the best of both.

**Spacing:**
- Site A uses a 4px base unit (tight, dense), Site B uses 8px (more breathing room).
  Do you want things packed close together or more spread out?

**Corners:**
- Site A is very rounded (12-16px), Site B is sharper (4-6px). Rounded and friendly,
  or crisp and professional?

**Motion:**
- Site A has quick, snappy animations (150ms), Site B has smoother, slower transitions
  (300ms). Fast and responsive, or smooth and polished?
```

Wait for user choices on each conflict before proceeding.

## Step 7: Interview for Unextractable Properties

After extraction, some things can't be determined from CSS alone. Ask about these in plain
language (don't skip even if you think you can guess):

- "What mood should the app convey? Professional? Playful? Calm? Energetic?"
- "Should it feel premium and polished, or approachable and casual?"
- "Any brand colors that must be used regardless of what I extracted?"
- "Should the interface feel dense with lots of information visible, or clean with
  more empty space?"
- "For accessibility — do you need to meet any specific standards? (If unsure, I'll
  default to WCAG AA which covers most needs.)"
- "Any colors or styles you definitely don't want?"

**Responsive (based on extraction data):**
- "I found the site uses [N] breakpoints for different screen sizes. Do you want to match
  those, or do you have specific screen sizes you need to support?"
- "Should your layout collapse to a single column on phones, or do you want a compact
  multi-column layout on small screens?"
- "Are there any features that should be hidden on mobile, or should everything be
  available at every screen size?"

**Custom component animations (based on animatedElements discovery):**
- "I found [N] different animations on the site, including some on custom elements like
  [list top 3-5 by selector]. Here's what they do: [brief description]. Which of these
  do you want to keep in your design system?"
- "Some of these animations are on unique components that aren't standard buttons or
  cards — like [example]. Should I document these as part of your component library,
  or are they one-offs you don't need?"
- For any animation the user wants to keep: "Should this animation be reusable (other
  components could use the same motion pattern) or specific to just this component?"

After completing Steps 1-7, proceed to the **Wrap-Up Sequence** in the main SKILL.md.
