# Page Discovery & Fluid Responsive Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the visual-design plugin's ability to discover structurally unique pages and their components, and default the responsive design system to fluid responsive techniques.

**Problem statement:**
1. The current sitemap-based page selection guesses template types from URL patterns, missing pages with unique components and structures.
2. The extraction script only captures component styles from 32 hardcoded selectors, missing custom components.
3. Breakpoint detection fails on fully responsive sites that use `clamp()`, viewport units, and container queries instead of `@media` breakpoints.
4. The responsive output defaults to breakpoint-based, but fluid responsive should be the recommended default.

---

## 1. New Script: `page-fingerprint.js`

**Path:** `plugins/visual-design/scripts/page-fingerprint.js`

A lightweight IIFE that returns a compact structural signature and component inventory per page. Designed to run on 30-50 pages quickly.

### Captures

- **Semantic landmarks:** Which HTML5 elements exist (nav, header, footer, main, aside, article, section) and count of each.
- **Component signatures:** Distinctive class name patterns on elements — BEM-style names, multi-word class names, component-like prefixes (e.g., `pricing-`, `carousel-`, `hero-`, `testimonial-`). Not every class — filter to patterns that indicate a distinct component.
- **Layout shape:** Top-level flex/grid containers, column count at each nesting level, max nesting depth of layout containers.
- **Interactive elements:** Presence and count of forms, tab patterns (`[role="tab"]`, `[class*="tab"]`), accordions (`[class*="accordion"]`, `details/summary`), carousels/sliders (`[class*="carousel"]`, `[class*="slider"]`, `[class*="swiper"]`), video/audio elements, iframes.
- **Content profile:** Heading hierarchy (H1 count, H2 count, H3 count), image count, table presence, list count.
- **DOM complexity:** Total node count, max depth.

### Output

```javascript
{
  url: "https://example.com/pricing",
  title: "Pricing - Example",
  structuralHash: "nav-header-main-aside|grid-3col|form-tabs-carousel",  // for grouping
  landmarks: { nav: 1, header: 1, main: 1, aside: 0, footer: 1, article: 0, section: 5 },
  components: [
    { name: "pricing-toggle", selector: ".pricing-toggle", type: "interactive" },
    { name: "comparison-table", selector: ".comparison-table", type: "data" },
    { name: "faq-accordion", selector: ".faq-accordion", type: "interactive" },
    { name: "hero", selector: ".hero-section", type: "layout" },
    { name: "testimonial", selector: ".testimonial-carousel", type: "interactive" }
  ],
  layout: { topLevel: "grid", columns: 3, maxDepth: 6 },
  interactive: { forms: 1, tabs: 1, accordions: 1, carousels: 1, videos: 0, iframes: 0 },
  content: { h1: 1, h2: 4, h3: 8, images: 12, tables: 1, lists: 3 },
  domNodes: 847,
  maxDepth: 12
}
```

The `structuralHash` is built from sorted landmarks + layout shape + interactive element types. Pages with identical hashes are the same template. The `components` array is the DOM-based component inventory used later for targeted extraction.

### Constraints

- Must complete in under 200ms per page (no `getComputedStyle` calls — structure only).
- Output must be under 40 lines of JSON per page (50 pages x 40 lines = 2000 lines max, manageable in context).

---

## 2. New Script: `link-crawler.js`

**Path:** `plugins/visual-design/scripts/link-crawler.js`

A lightweight IIFE that extracts internal links from a page. Runs on 3-4 pages to discover URLs the sitemap missed.

### Captures

- All `<a href>` elements pointing to the same domain (same origin or matching hostname).
- Normalizes: strips trailing slashes, removes query parameters and fragments, lowercases pathname.
- Filters out: anchor-only links (`#`), static assets (`.pdf`, `.jpg`, `.png`, `.zip`, `.css`, `.js`), `mailto:`, `tel:`, `javascript:` URLs.
- Deduplicates by normalized pathname.

### Output

```javascript
{
  sourceUrl: "https://example.com",
  links: [
    "https://example.com/pricing",
    "https://example.com/features",
    "https://example.com/integrations",
    "https://example.com/about",
    ...
  ]
}
```

### Constraints

- Returns at most 100 links per page (sorted by DOM order, which prioritizes navigation and above-fold links).

---

## 3. Enhanced `extract-design-tokens.js`

**Path:** `plugins/visual-design/scripts/extract-design-tokens.js`

Two enhancements to the existing script:

### 3a. Fluid Responsive Detection

Add detection for fluid responsive techniques alongside the existing `CSSMediaRule` breakpoint extraction:

- **`clamp()` / `min()` / `max()` usage:** Scan CSS custom property values and computed styles of sampled elements for these functions. Collect the property name and full expression.
- **Viewport units:** Detect `vw`, `vh`, `vmin`, `vmax`, `dvh`, `svh` in property values of sampled elements.
- **Container queries:** Check for `CSSContainerRule` instances in stylesheets (analogous to the existing `CSSMediaRule` check). Capture container name and query condition.

New fields in return object:
```javascript
{
  fluidResponsive: {
    usesClamp: true,
    usesViewportUnits: true,
    usesContainerQueries: false,
    clampExpressions: [
      "--font-size-base: clamp(1rem, 0.5vw + 0.875rem, 1.25rem)",
      "--spacing-md: clamp(1rem, 2vw, 2rem)",
      ...
    ],
    viewportUnitProperties: [
      "width: 90vw",
      "padding: 5vw 3vw",
      ...
    ],
    containerRules: []
  }
}
```

Cap: 30 clamp expressions, 20 viewport unit properties, 20 container rules.

### 3b. Dynamic Component Extraction

The current script extracts component styles from 32 hardcoded selectors. Enhance it to ALSO accept a component inventory (from the fingerprint script) and extract styles for those discovered components.

Implementation approach: Since `javascript_tool` executes a string of JS, the SKILL.md workflow will prepend a `const discoveredSelectors = [...]` line (built from the fingerprint's component selectors) before the IIFE. The script checks for `typeof discoveredSelectors !== 'undefined'` at the top of its selector-building logic. If present, it merges discovered selectors with the hardcoded list (deduped). If absent, it uses only the hardcoded list. This requires no structural change to the IIFE pattern — just adding a conditional check inside the existing selector loop.

---

## 4. Restructured SKILL.md Workflow

Replace the current Step 1 (sitemap) and Step 2 (extract per page) with a multi-phase discovery and extraction pipeline. Steps 3+ (compile/deduplicate, conflict resolution, interview, wrap-up) remain largely the same with targeted updates.

### Step 1: Gather URLs

1. Fetch `sitemap.xml` via WebFetch — collect all URLs.
2. Open the homepage in a Chrome tab. Run `link-crawler.js` to discover internal links.
3. If the sitemap has distinct sections (e.g., `/blog/`, `/docs/`, `/integrations/`), also run link-crawler on one page from each section to find sub-navigation links.
4. Combine sitemap URLs + crawled URLs, deduplicate by normalized pathname.
5. Cap the combined list at 50 URLs for fingerprinting. If over 50, prioritize: homepage first, then URLs from link crawling (more likely to be navigation-linked important pages), then sitemap URLs.

### Step 2: Fingerprint in Parallel Batches

1. Load `page-fingerprint.js` once by reading the script file.
2. Open 5 tabs simultaneously using `mcp__claude-in-chrome__tabs_create_mcp`.
3. Navigate each tab to a different URL (5 parallel `navigate` calls).
4. Run `page-fingerprint.js` on all 5 tabs (5 parallel `javascript_tool` calls).
5. Collect results.
6. Repeat steps 2-5 for the next batch of 5 URLs. Close completed tabs and open new ones, or reuse tabs by navigating to new URLs.
7. Continue until all URLs are fingerprinted (50 URLs / 5 per batch = 10 rounds).
8. Group fingerprint results by `structuralHash`. Pages with identical hashes are the same template.

### Step 3: Select Representatives and Full Extraction

1. From each unique structural group, pick 1-2 representatives. Prefer pages with:
   - The most entries in the `components` array (richest component diversity)
   - The most interactive elements
   - The highest DOM complexity
2. For each representative page (parallel, 3-5 tabs at a time):
   a. Navigate to the page.
   b. Run full `extract-design-tokens.js`, passing the fingerprint's component selectors for dynamic extraction.
   c. Take a screenshot via `mcp__claude-in-chrome__computer` action "screenshot".
3. **Visual component inventory:** After extraction + screenshot for each page, review the screenshot and cross-reference against the fingerprint's DOM component inventory. Identify any visually distinct components the DOM analysis missed (especially common on utility-class/Tailwind sites where the DOM is generic `div`s). For any visually-discovered components not in the inventory, identify them in the DOM by position/content and do a targeted follow-up extraction.
4. Merge DOM-discovered and visually-discovered component inventories into a unified list per page.

### Step 4: Responsive Extraction

Same as current Step 2b, but with one change:

After responsive extraction is complete, **always present the responsive approach choice:**

> "For your responsive approach, you have two options:
> - **Fluid (recommended):** Things scale smoothly across all screen sizes using `clamp()` and viewport units. No hard jumps. Works on every screen without needing to define specific sizes.
> - **Breakpoint-based:** Layout changes at specific screen widths. Things stay fixed between breakpoints and then jump to a new size.
>
> I recommend fluid — which do you prefer?"

This question is asked regardless of what the extracted site uses. If the site uses breakpoints, note that ("The site I extracted uses breakpoints at X, Y, Z") but still recommend fluid.

Interview mode asks the same question with the same recommendation.

### Steps 5+: Compile, Conflict Resolution, Interview, Wrap-Up

Unchanged from current SKILL.md, except:
- The compile step has access to a much richer component inventory from the new discovery process.
- The responsive output section writes whichever format the user chose (fluid or breakpoints).

---

## 5. Updated `design-guidelines.md` Template — Responsive System

The Responsive System section supports two formats based on user choice:

### Fluid format (default/recommended):

```markdown
## Responsive System

### Approach
Fluid responsive. Typography and spacing scale continuously using clamp().
Layout shifts use minimal breakpoints only where structural changes are needed
(e.g., sidebar visibility, navigation pattern change).

### Fluid Scales
| Token | Min (mobile) | Preferred | Max (desktop) |
|-------|-------------|-----------|---------------|
| font-size-base | 1rem | 0.5vw + 0.875rem | 1.25rem |
| font-size-lg | 1.125rem | 1vw + 0.875rem | 1.5rem |
| font-size-xl | 1.25rem | 1.5vw + 0.75rem | 2rem |
| spacing-sm | 0.5rem | 1vw | 1rem |
| spacing-md | 1rem | 2vw | 2rem |
| spacing-lg | 1.5rem | 3vw | 3rem |

### Layout Breakpoints (structural changes only)
| Token | Value | What Changes |
|-------|-------|-------------|
| bp-nav | Xpx | Navigation switches from hamburger to horizontal |
| bp-sidebar | Xpx | Sidebar becomes visible |
| bp-columns | Xpx | Grid shifts from 1 to multi-column |

### Responsive Patterns
- **Grid strategy:** [CSS Grid / Flexbox / both]
- **Stacking behavior:** [How multi-column layouts collapse]
- **Touch targets:** [Minimum tap target size]
- **Container queries:** [If used, which components use them and why]
```

### Breakpoint format (if user explicitly chooses):

Same as current template (Breakpoints table, Layout Behavior table, Responsive Patterns list).

---

## 6. Files Changed

| File | Change Type | Summary |
|------|------------|---------|
| `plugins/visual-design/scripts/page-fingerprint.js` | **New** | Lightweight structural fingerprint + component inventory |
| `plugins/visual-design/scripts/link-crawler.js` | **New** | Internal link discovery |
| `plugins/visual-design/scripts/extract-design-tokens.js` | Modify | Add fluid responsive detection + dynamic component extraction |
| `plugins/visual-design/skills/visual-design-consultant/SKILL.md` | Modify | Restructure Steps 1-4, add responsive choice question, update template |
| `plugins/visual-design/agents/design-reviewer.md` | Modify | Update responsive testing to handle fluid approach (test at viewport widths, verify clamp ranges) |

---

## 7. Constraints

- Fingerprinting must stay under 200ms per page (no `getComputedStyle`).
- Fingerprint output under 40 lines JSON per page.
- Tab parallelism: 5 tabs for fingerprinting, 3-5 for full extraction.
- Total fingerprinted pages capped at 50.
- Link crawler returns at most 100 links per page.
- Fluid responsive detection capped at 30 clamp expressions, 20 viewport unit properties, 20 container rules.
