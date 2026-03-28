# Page Discovery & Fluid Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sitemap-guessing page selection with structural fingerprinting + link crawling for comprehensive component discovery, add fluid responsive detection, default responsive output to fluid, and add fuzzy matching to the component-context agent.

**Architecture:** Two new lightweight JS scripts (page-fingerprint.js, link-crawler.js) handle URL discovery and structural analysis. The existing extract-design-tokens.js gets fluid responsive detection and dynamic component extraction. SKILL.md gets a restructured multi-phase workflow with parallel tab batching. Component-context agent gets fuzzy matching with richer metadata. Design-reviewer gets fluid responsive testing support.

**Tech Stack:** Browser IIFE scripts (vanilla JS), Claude Code plugin markdown (SKILL.md, agent .md files)

---

### Task 1: Create `link-crawler.js`

**Files:**
- Create: `plugins/visual-design/scripts/link-crawler.js`

- [ ] **Step 1: Write the link-crawler.js script**

```javascript
// link-crawler.js
// Shipped with the visual-design plugin. Executed via Chrome javascript_tool.
// Extracts all internal links from the current page for URL discovery.
// Returns deduplicated, normalized internal URLs sorted by DOM order.
(() => {
  const origin = window.location.origin;
  const hostname = window.location.hostname;
  const seen = new Set();
  const links = [];

  // File extensions to filter out (not pages)
  const assetExts = /\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|zip|tar|gz|css|js|woff|woff2|ttf|eot|mp3|mp4|webm|avi|mov)$/i;

  for (const a of document.querySelectorAll('a[href]')) {
    let href = a.href; // browser resolves to absolute URL

    // Skip non-http, mailto, tel, javascript
    if (!href.startsWith('http')) continue;

    // Skip external links
    try {
      const url = new URL(href);
      if (url.hostname !== hostname) continue;

      // Skip static assets
      if (assetExts.test(url.pathname)) continue;

      // Normalize: strip query, fragment, trailing slash, lowercase pathname
      const normalized = url.origin + url.pathname.replace(/\/+$/, '').toLowerCase();
      if (seen.has(normalized)) continue;
      if (normalized === origin || normalized === origin + '') {
        // Homepage — include but dedupe
        if (seen.has(origin)) continue;
        seen.add(origin);
        links.push(origin + '/');
        continue;
      }
      seen.add(normalized);
      links.push(url.origin + url.pathname.replace(/\/+$/, ''));
    } catch (e) {
      continue; // malformed URL
    }

    // Cap at 100 links
    if (links.length >= 100) break;
  }

  return {
    sourceUrl: window.location.href,
    links
  };
})();
```

- [ ] **Step 2: Verify the script is syntactically valid**

Open a browser console (any page), paste the script, and confirm it returns an object with `sourceUrl` (string) and `links` (array of strings). It should return internal links from the current page.

- [ ] **Step 3: Commit**

```bash
git add plugins/visual-design/scripts/link-crawler.js
git commit -m "feat: add link-crawler.js for internal URL discovery"
```

---

### Task 2: Create `page-fingerprint.js`

**Files:**
- Create: `plugins/visual-design/scripts/page-fingerprint.js`

- [ ] **Step 1: Write the page-fingerprint.js script**

```javascript
// page-fingerprint.js
// Shipped with the visual-design plugin. Executed via Chrome javascript_tool.
// Returns a lightweight structural fingerprint and component inventory for a page.
// Designed to run on 30-50 pages quickly — NO getComputedStyle calls.
(() => {
  // 1. Semantic landmarks
  const landmarkTags = ['nav', 'header', 'footer', 'main', 'aside', 'article', 'section'];
  const landmarks = {};
  for (const tag of landmarkTags) {
    landmarks[tag] = document.querySelectorAll(tag).length;
  }

  // 2. Component signatures — find elements with distinctive class patterns
  const components = [];
  const compSeen = new Set();

  // Patterns that indicate a component: multi-word hyphenated classes, BEM-style,
  // or known component-like prefixes
  const componentPattern = /^[a-z]+-[a-z]+/; // at least two hyphenated words
  const knownPrefixes = ['hero', 'carousel', 'slider', 'swiper', 'accordion', 'toggle',
    'pricing', 'testimonial', 'feature', 'cta', 'banner', 'callout', 'wizard', 'stepper',
    'timeline', 'gallery', 'lightbox', 'player', 'chart', 'graph', 'countdown', 'comparison',
    'faq', 'breadcrumb', 'pagination', 'rating', 'review', 'progress', 'notification'];

  // Scan elements with class attributes, skip deep-leaf nodes (text spans etc)
  const candidates = document.querySelectorAll('[class]');
  for (const el of candidates) {
    if (components.length >= 50) break;
    if (typeof el.className !== 'string') continue;

    const classes = el.className.trim().split(/\s+/);
    for (const cls of classes) {
      const lower = cls.toLowerCase();
      if (compSeen.has(lower)) continue;

      const isComponentLike = componentPattern.test(lower) ||
        knownPrefixes.some(p => lower.includes(p));
      if (!isComponentLike) continue;

      compSeen.add(lower);

      // Classify component type
      const interactiveSignals = ['carousel', 'slider', 'swiper', 'accordion', 'toggle',
        'dropdown', 'modal', 'dialog', 'tab', 'stepper', 'wizard', 'lightbox', 'player',
        'countdown'];
      const dataSignals = ['table', 'chart', 'graph', 'comparison', 'pricing', 'rating',
        'progress', 'timeline'];

      let type = 'layout';
      if (interactiveSignals.some(s => lower.includes(s))) type = 'interactive';
      else if (dataSignals.some(s => lower.includes(s))) type = 'data';

      components.push({
        name: lower,
        selector: '.' + cls,
        type
      });
    }
  }

  // 3. Also detect components by ARIA roles and semantic patterns
  const roleSelectors = [
    { query: '[role="tablist"]', name: 'tabs', type: 'interactive' },
    { query: '[role="dialog"]', name: 'dialog', type: 'interactive' },
    { query: '[role="alertdialog"]', name: 'alert-dialog', type: 'interactive' },
    { query: '[role="navigation"]', name: 'navigation', type: 'layout' },
    { query: '[role="search"]', name: 'search', type: 'interactive' },
    { query: '[role="slider"]', name: 'slider', type: 'interactive' },
    { query: '[role="progressbar"]', name: 'progressbar', type: 'data' },
    { query: 'details', name: 'accordion-details', type: 'interactive' },
    { query: 'dialog', name: 'dialog-element', type: 'interactive' },
    { query: 'video', name: 'video-player', type: 'interactive' },
    { query: 'audio', name: 'audio-player', type: 'interactive' },
  ];
  for (const { query, name, type } of roleSelectors) {
    if (compSeen.has(name)) continue;
    if (document.querySelector(query)) {
      compSeen.add(name);
      components.push({ name, selector: query, type });
    }
  }

  // 4. Interactive element counts
  const interactive = {
    forms: document.querySelectorAll('form').length,
    tabs: document.querySelectorAll('[role="tab"], [role="tablist"]').length,
    accordions: document.querySelectorAll('[class*="accordion" i], details').length,
    carousels: document.querySelectorAll('[class*="carousel" i], [class*="slider" i], [class*="swiper" i]').length,
    videos: document.querySelectorAll('video, [class*="player" i]').length,
    iframes: document.querySelectorAll('iframe').length
  };

  // 5. Content profile
  const content = {
    h1: document.querySelectorAll('h1').length,
    h2: document.querySelectorAll('h2').length,
    h3: document.querySelectorAll('h3').length,
    images: document.querySelectorAll('img, picture, [class*="image" i]').length,
    tables: document.querySelectorAll('table').length,
    lists: document.querySelectorAll('ul, ol').length
  };

  // 6. Layout shape — check top-level containers for flex/grid
  const mainEl = document.querySelector('main') || document.body;
  const topChildren = mainEl.children;
  let topLevelDisplay = 'block';
  let columns = 1;
  let maxDepth = 0;

  // Check main's direct display
  const mainStyle = mainEl.style;
  const mainDisplay = mainEl.getAttribute('style');
  // Use className-based heuristic since we avoid getComputedStyle
  const mainClasses = (mainEl.className || '').toString().toLowerCase();
  if (mainClasses.includes('grid')) { topLevelDisplay = 'grid'; }
  else if (mainClasses.includes('flex')) { topLevelDisplay = 'flex'; }

  // Estimate columns from direct children count in grid/flex containers
  if (topLevelDisplay !== 'block' && topChildren.length > 0) {
    columns = Math.min(topChildren.length, 12);
  }

  // DOM depth via sampling (walk 10 deepest-looking branches)
  function measureDepth(el, depth) {
    if (depth > maxDepth) maxDepth = depth;
    if (depth > 30) return; // safety cap
    const children = el.children;
    if (children.length === 0) return;
    // Follow the child with the most descendants (heuristic for deepest branch)
    let deepest = children[0];
    let maxKids = 0;
    for (let i = 0; i < Math.min(children.length, 5); i++) {
      const count = children[i].querySelectorAll('*').length;
      if (count > maxKids) { maxKids = count; deepest = children[i]; }
    }
    measureDepth(deepest, depth + 1);
  }
  measureDepth(document.body, 0);

  // 7. DOM complexity
  const domNodes = document.querySelectorAll('*').length;

  // 8. Build structural hash for grouping
  // Format: sorted-landmarks|layout-shape|sorted-interactive-types
  const landmarkParts = landmarkTags.filter(t => landmarks[t] > 0).sort();
  const interactiveParts = Object.entries(interactive)
    .filter(([, v]) => v > 0)
    .map(([k]) => k)
    .sort();
  const structuralHash = [
    landmarkParts.join('-') || 'none',
    `${topLevelDisplay}-${columns}col`,
    interactiveParts.join('-') || 'none'
  ].join('|');

  return {
    url: window.location.href,
    title: document.title,
    structuralHash,
    landmarks,
    components,
    layout: { topLevel: topLevelDisplay, columns, maxDepth },
    interactive,
    content,
    domNodes,
    maxDepth
  };
})();
```

- [ ] **Step 2: Verify the script is syntactically valid**

Open a browser console on any content-rich page (e.g., a marketing site homepage), paste the script, and confirm it returns an object with all expected fields: `url`, `title`, `structuralHash`, `landmarks`, `components` (array), `layout`, `interactive`, `content`, `domNodes`, `maxDepth`. Verify `components` finds at least a few entries on a component-rich page.

- [ ] **Step 3: Commit**

```bash
git add plugins/visual-design/scripts/page-fingerprint.js
git commit -m "feat: add page-fingerprint.js for structural page analysis"
```

---

### Task 3: Enhance `extract-design-tokens.js` — Fluid Responsive Detection

**Files:**
- Modify: `plugins/visual-design/scripts/extract-design-tokens.js`

- [ ] **Step 1: Add fluid responsive detection inside the stylesheet loop**

After the existing `CSSMediaRule` block (line 66), add `CSSContainerRule` detection. Inside the existing CSS custom property scan (lines 25-29), also detect `clamp()`/`min()`/`max()` and viewport units. Add new collection variables near the top of the IIFE.

Add these variables after line 9 (`animations: [], components: [] };`):

```javascript
  const fluidData = { clampExpressions: new Set(), viewportUnitProperties: new Set(),
    containerRules: [] };
```

Inside the existing custom property loop (after line 29, `result.spacing.add(...)`), add:

```javascript
                // Detect fluid responsive functions in custom properties
                if (val.match(/clamp\s*\(|min\s*\(|max\s*\(/i)) {
                  fluidData.clampExpressions.add(`${prop}: ${val}`);
                }
                if (val.match(/\d+(\.\d+)?(vw|vh|vmin|vmax|dvh|svh)/i)) {
                  fluidData.viewportUnitProperties.add(`${prop}: ${val}`);
                }
```

Inside the stylesheet rule loop (after the `CSSMediaRule` block ending at line 66), add:

```javascript
          // Capture container query rules
          if (typeof CSSContainerRule !== 'undefined' && rule instanceof CSSContainerRule) {
            if (fluidData.containerRules.length < 20) {
              fluidData.containerRules.push({
                containerName: rule.containerName || '(unnamed)',
                conditionText: rule.conditionText || rule.cssText.slice(0, 200)
              });
            }
          }
```

- [ ] **Step 2: Add fluid detection in the computed styles sampling loop**

Inside the `selectors.forEach` callback (after line 95, the transitions line), add detection for fluid values in computed properties:

```javascript
    // Detect fluid responsive values in computed styles
    const propsToCheck = { fontSize: cs.fontSize, padding: cs.padding, margin: cs.margin,
      width: cs.width, maxWidth: cs.maxWidth, gap: cs.gap };
    for (const [name, val] of Object.entries(propsToCheck)) {
      if (val && val.match && val.match(/\d+(\.\d+)?(vw|vh|vmin|vmax|dvh|svh)/i)) {
        fluidData.viewportUnitProperties.add(`${sel} ${name}: ${val}`);
      }
    }
```

Note: `getComputedStyle` resolves `clamp()` to a computed pixel value, so clamp detection only works via CSS custom properties and stylesheet rules, not computed styles. This is expected — the custom property scan catches clamp expressions where they're defined.

- [ ] **Step 3: Add dynamic component extraction via discoveredSelectors**

Before the existing `selectors` array (line 73), add:

```javascript
  // Dynamic component extraction: merge hardcoded selectors with discovered ones
  // When called with `const discoveredSelectors = [...]` prepended, those selectors
  // are included. Otherwise, only the hardcoded list is used.
  const extraSelectors = (typeof discoveredSelectors !== 'undefined' && Array.isArray(discoveredSelectors))
    ? discoveredSelectors : [];
```

Then modify line 73 to append discovered selectors:

```javascript
  const selectors = ['body', 'h1', 'h2', 'h3', 'h4', 'p', 'a', 'button',
    'input', 'select', 'textarea', 'nav', 'header', 'footer', 'main', 'aside',
    '[class*="card"]', '[class*="btn"]', '[class*="modal"]', '[class*="dialog"]',
    '[class*="hero"]', '[class*="container"]', '[class*="badge"]', '[class*="tag"]',
    '[class*="avatar"]', '[class*="tooltip"]', '[class*="dropdown"]', '[class*="tab"]',
    '[class*="alert"]', '[class*="toast"]', '[class*="sidebar"]', '[class*="menu"]',
    ...extraSelectors.filter(s => !['body','h1','h2','h3','h4','p','a','button',
      'input','select','textarea','nav','header','footer','main','aside'].includes(s))
  ];
```

- [ ] **Step 4: Add fluidResponsive to the return object**

In the return statement (line 175), add after `animatedElements`:

```javascript
    fluidResponsive: {
      usesClamp: fluidData.clampExpressions.size > 0,
      usesViewportUnits: fluidData.viewportUnitProperties.size > 0,
      usesContainerQueries: fluidData.containerRules.length > 0,
      clampExpressions: [...fluidData.clampExpressions].slice(0, 30),
      viewportUnitProperties: [...fluidData.viewportUnitProperties].slice(0, 20),
      containerRules: fluidData.containerRules
    }
```

- [ ] **Step 5: Verify the script is syntactically valid**

Read the full modified file to confirm the IIFE is syntactically correct. Check that all braces and parentheses balance. Paste into a browser console on any page and verify the return object now includes `fluidResponsive` with the expected shape.

- [ ] **Step 6: Commit**

```bash
git add plugins/visual-design/scripts/extract-design-tokens.js
git commit -m "feat: add fluid responsive detection and dynamic component extraction"
```

---

### Task 4: Restructure SKILL.md — Page Discovery Workflow

**Files:**
- Modify: `plugins/visual-design/skills/visual-design-consultant/SKILL.md:67-141`

This task replaces the current EXTRACTION MODE Steps 1, 2, and 2b with the new multi-phase discovery and extraction pipeline.

- [ ] **Step 1: Replace Step 1 (Read the Sitemap)**

Replace lines 69-82 (the current "Step 1: Read the Sitemap" section) with:

```markdown
## Step 1: Gather URLs

For each URL the user provided:

1. Use **WebFetch** to fetch `[site]/sitemap.xml`. This is plain XML — no browser rendering
   needed. Do NOT use Chrome browser tools for this step. Collect all URLs from the sitemap.
2. Open the homepage in a Chrome tab. Run the `link-crawler.js` script (ships with this
   plugin — use Glob to find `**/link-crawler.js`, read it once) via
   `mcp__claude-in-chrome__javascript_tool` to discover internal links.
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
```

- [ ] **Step 2: Replace Step 2 (Extract Design Patterns) with fingerprinting**

Replace lines 84-110 (the current "Step 2: Extract Design Patterns" section) with:

```markdown
## Step 2: Fingerprint Pages in Parallel

Fingerprint all gathered URLs to identify structurally unique page templates before doing
the expensive full extraction.

1. Load `page-fingerprint.js` once (ships with this plugin — use Glob to find
   `**/page-fingerprint.js`, read it once).
2. Process pages in parallel batches of 5:
   a. Open 5 tabs simultaneously using `mcp__claude-in-chrome__tabs_create_mcp` (5 parallel calls).
   b. Navigate each tab to a different URL (5 parallel `mcp__claude-in-chrome__navigate` calls).
   c. Run `page-fingerprint.js` on all 5 tabs (5 parallel `mcp__claude-in-chrome__javascript_tool` calls).
   d. Collect the fingerprint results.
   e. Reuse tabs by navigating to the next batch of URLs, or close and reopen as needed.
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

1. **Navigate** to the page using `mcp__claude-in-chrome__navigate`.
2. **Extract styles via JavaScript** using `mcp__claude-in-chrome__javascript_tool`.
   To pass discovered component selectors from the fingerprint, prepend
   `const discoveredSelectors = [".pricing-toggle", ".faq-accordion", ...];` (built from
   the fingerprint's `components[].selector` values for this page) before the extraction
   script contents. This makes the extraction script capture styles for ALL discovered
   components, not just the 32 hardcoded selectors.
3. **Capture a screenshot** using `mcp__claude-in-chrome__computer` with action "screenshot".
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

**Important:** Do NOT use `mcp__claude-in-chrome__read_page` — the JS extraction script
already captures everything from the DOM. Adding read_page would duplicate data and waste
tokens.
```

- [ ] **Step 3: Update Step 2b (Responsive Extraction) to add the fluid choice question**

Replace lines 112-140 (the current "Step 2b: Responsive Extraction" section) with:

```markdown
## Step 4: Responsive Extraction

After completing Step 3 for all representative pages, perform responsive extraction on 1-2
pages (pick the pages with the most layout complexity — typically the homepage and one
content-heavy page):

1. Examine the `breakpoints` array AND the `fluidResponsive` object from the extraction
   data. Note whether the site uses discrete breakpoints, fluid techniques, or both.
2. Regardless of what the site uses, test at these viewport widths: 375px (mobile), 768px
   (tablet), 1024px (desktop), 1440px (wide desktop).
3. For each viewport width:
   a. Call `mcp__claude-in-chrome__resize_window` with `width` set to the value,
      `height` of 900, and the current `tabId`.
   b. Re-run the extraction script via `mcp__claude-in-chrome__javascript_tool`. This
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
```

- [ ] **Step 4: Verify the step numbers are consistent**

After the replacement, the extraction mode steps should be:
- Step 1: Gather URLs
- Step 2: Fingerprint Pages in Parallel
- Step 3: Full Extraction on Unique Pages
- Step 4: Responsive Extraction
- Step 5: Compile and Deduplicate (was Step 3, renumber)
- Step 6: Multi-Site Conflict Resolution (was Step 4, renumber)
- Step 7: Interview for Unextractable Properties (was Step 5, renumber)

Renumber the existing Step 3 (Compile and Deduplicate) to Step 5, Step 4 (Multi-Site Conflict Resolution) to Step 6, and Step 5 (Interview for Unextractable Properties) to Step 7.

- [ ] **Step 5: Add responsive choice question to interview mode**

In the Interview Mode section, after the "Spacing and Layout" questions (after line 265, the hamburger menu question), add a new subsection:

```markdown
### Responsive Approach
- "For how things adapt to different screen sizes, you have two options:
  **Fluid** means everything scales smoothly — text, spacing, and layout adjust
  continuously as the screen gets bigger or smaller. No hard jumps.
  **Breakpoint-based** means things stay the same until a specific screen width, then
  jump to a new layout.
  I recommend fluid — it works well on every screen size. Which sounds better to you?"
```

- [ ] **Step 6: Commit**

```bash
git add plugins/visual-design/skills/visual-design-consultant/SKILL.md
git commit -m "feat: restructure extraction workflow with fingerprinting, parallel tabs, fluid choice"
```

---

### Task 5: Update SKILL.md — Responsive Template and Component Compendium

**Files:**
- Modify: `plugins/visual-design/skills/visual-design-consultant/SKILL.md:461-597`

- [ ] **Step 1: Replace the Responsive System template section**

Replace lines 481-508 (the current Responsive System section inside the design-guidelines.md template) with:

```markdown
## Responsive System

[Use the FLUID format if the user chose fluid (recommended default).
Use the BREAKPOINT format only if the user explicitly chose breakpoints.]

### FLUID FORMAT:

### Approach
Fluid responsive. Typography and spacing scale continuously using clamp().
Layout shifts use minimal breakpoints only where structural changes are needed
(e.g., sidebar visibility, navigation pattern change).

### Fluid Scales
| Token | Min (mobile) | Preferred | Max (desktop) |
|-------|-------------|-----------|---------------|
| font-size-base | Xrem | Xvw + Xrem | Xrem |
| font-size-lg | Xrem | Xvw + Xrem | Xrem |
| font-size-xl | Xrem | Xvw + Xrem | Xrem |
| spacing-sm | Xrem | Xvw | Xrem |
| spacing-md | Xrem | Xvw | Xrem |
| spacing-lg | Xrem | Xvw | Xrem |

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

### BREAKPOINT FORMAT (only if user chose breakpoints):

### Approach
[Mobile-first / Desktop-first. 1-2 sentences on the responsive philosophy.]

### Breakpoints
| Token | Value | Description |
|-------|-------|-------------|
| bp-sm | Xpx | Small phones (portrait) |
| bp-md | Xpx | Tablets, large phones (landscape) |
| bp-lg | Xpx | Desktops, laptops |
| bp-xl | Xpx | Large desktops, wide monitors |

### Layout Behavior
| Breakpoint Range | Columns | Navigation | Sidebar | Container Max-Width |
|-----------------|---------|------------|---------|-------------------|
| 0 - bp-sm | 1 | [hamburger/bottom nav] | [hidden/overlay] | 100% |
| bp-sm - bp-md | [1-2] | [varies] | [varies] | Xpx |
| bp-md - bp-lg | [2-3] | [horizontal] | [visible] | Xpx |
| bp-lg+ | [3-4] | [horizontal] | [visible] | Xpx |

### Responsive Patterns
- **Grid strategy:** [CSS Grid / Flexbox / both]
- **Stacking behavior:** [How multi-column layouts collapse]
- **Font scaling:** [Whether/how type scale changes at breakpoints]
- **Spacing scaling:** [Whether spacing tokens change at breakpoints]
- **Touch targets:** [Minimum tap target size on mobile, if different from desktop]
```

- [ ] **Step 2: Add Data Fields and Usage & Content sections to the component compendium template**

In the Component Compendium File Format section, add two new sections after the existing `## Accessibility` section (after line 587) and before the existing `## Responsive Behavior` section:

```markdown
## Data Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| [field name] | [string/number/boolean/enum(...)/object] | [yes/no] | [What this field controls] |

## Usage & Content
- **When to use:** [1-2 sentences on when this component is the right choice. Include what
  it is NOT for — name the alternative component.]
- **Typical content:** [What kind of content this component usually holds — text length,
  media, interactive elements.]
- **Common contexts:** [Where in an app this component typically appears.]
- **Related components:** [Comma-separated list of component names that serve similar
  purposes or are commonly used alongside this one.]
```

- [ ] **Step 3: Commit**

```bash
git add plugins/visual-design/skills/visual-design-consultant/SKILL.md
git commit -m "feat: add fluid responsive template and component metadata sections"
```

---

### Task 6: Update `design-reviewer.md` — Fluid Responsive Testing

**Files:**
- Modify: `plugins/visual-design/agents/design-reviewer.md:158-175`

- [ ] **Step 1: Update Category E to handle fluid responsive**

Replace lines 158-175 (the current Category E: Responsive Behavior section) with:

```markdown
**Category E: Responsive Behavior**
- Read the Responsive System section from `design-guidelines.md`.
- Determine which approach the project uses:
  - **Fluid:** Look for a "Fluid Scales" section. Test by verifying that font sizes and
    spacing change continuously across viewports (not in discrete jumps). At each test
    viewport, assert that computed font-size/padding values fall within the min/max range
    defined in the Fluid Scales table.
  - **Breakpoint-based:** Look for a "Breakpoints" section with discrete values. Test
    layout changes at each defined breakpoint.
  - If no responsive section exists, use default test viewports: 375px, 768px, 1024px,
    1440px.
- Read the component's Responsive Behavior table from its compendium spec.
- For each test viewport, set the Playwright viewport and verify:
  - Layout changes match the spec (e.g., columns collapse, sidebar hides)
  - No horizontal overflow or content clipping at any viewport
  - Touch targets are at least 44x44px at mobile viewports
  - Text remains readable (no truncation without ellipsis, no overlap)
  - Navigation adapts as specified (hamburger appears, horizontal nav collapses)
  - **Fluid-specific:** If the project uses fluid responsive, verify that computed
    values at 375px and 1440px fall within the min/max bounds of the Fluid Scales table.
    Flag as BLOCKING if a value exceeds its defined range.
- Playwright viewport setting:
  ```typescript
  await page.setViewportSize({ width: 375, height: 812 });
  ```
- Take a screenshot at each viewport for visual comparison
- Assert CSS property values at each viewport match what the design system specifies
```

- [ ] **Step 2: Add fluid-specific blocking and low issues**

In the BLOCKING issues list (around line 198), add:

```markdown
- Fluid scale value outside defined min/max range at any tested viewport
```

In the LOW issues list (around line 210), add:

```markdown
- Fluid scales defined but component uses fixed pixel values instead of clamp()
```

- [ ] **Step 3: Commit**

```bash
git add plugins/visual-design/agents/design-reviewer.md
git commit -m "feat: add fluid responsive testing support to design reviewer"
```

---

### Task 7: Update `component-context.md` — Fuzzy Matching

**Files:**
- Modify: `plugins/visual-design/agents/component-context.md`

- [ ] **Step 1: Update the agent description to mention fuzzy matching**

In the YAML frontmatter description (lines 3-14), add after line 13 ("it notifies the user and suggests running the visual-design-consultant skill."):

```markdown
  If no exact spec match is found, the agent performs fuzzy matching against all
  component specs using name similarity, Related Components fields, Usage & Content
  overlap, and Data Fields overlap. It returns up to 3 suggestions ranked by relevance.
```

Add a new example after the existing two examples:

```markdown
  <example>
  Context: User is creating a notification-banner component, but no spec exists for it
  user: "Create a notification banner component"
  assistant: "No exact spec for notification-banner, but I found similar components."
  <commentary>
  No exact match. Fuzzy search finds alert (similar purpose, overlapping data fields)
  and toast (also a notification pattern). Return both as suggestions.
  </commentary>
  </example>
```

- [ ] **Step 2: Update the Your Role section**

Replace lines 47-52 (the current role bullets) with:

```markdown
- Read the component compendium at `design/components/` and deliver the spec for the
  component being implemented
- If an exact spec match is not found, perform fuzzy matching against all specs using
  name similarity, Related Components fields, Usage & Content sections, and Data Fields
  sections — return up to 3 suggestions ranked by relevance
- If no compendium exists at all, say so and suggest running the visual-design-consultant
  skill first
- Also read `design-guidelines.md` and include the relevant tokens (colors, spacing,
  motion) that the component spec references
```

- [ ] **Step 3: Replace the Workflow section with exact match + fuzzy fallback**

Replace lines 64-94 (the entire Workflow section from "## Workflow" through the delivery template closing ```) with:

```markdown
## Workflow

### Step 1: Identify the Component
From the context of what's being implemented, determine which component(s) are relevant.

### Step 2: Search for Exact Match
Look for `design/components/[component-name].md`. Try the component name directly, then
try common variants: hyphenated, camelCase split to hyphenated, singular/plural.

If found → go to Step 4 (Deliver).

### Step 3: Fuzzy Match (no exact match found)
If no exact match exists, search all component spec files in `design/components/`:

1. Use Glob to list all `.md` files in `design/components/`.
2. Read each spec file and score it against the target component using these signals:

| Signal | Weight | How it matches |
|--------|--------|---------------|
| Name substring | 3 | Target name appears in spec filename or vice versa |
| Related components field | 3 | Target name listed in spec's "Related components" |
| Usage keyword overlap | 2 | Words from the implementation context match spec's "When to use" / "Common contexts" |
| Data field overlap | 2 | Similar field names or types to what the component likely needs |
| Same category | 1 | Both serve similar purposes (feedback, navigation, data display, etc.) |

3. Rank all specs by total score. Return up to 3 with score > 0.

**Delivery format for suggestions:**

    ## No Exact Spec: [Component Name]

    No spec file found for "[component name]". Here are similar components
    that may help as a starting point:

    ### Suggestion 1: [Name] (highest relevance)
    **Why:** [1-2 sentences explaining the match — which signals scored]

    [Full spec content of the highest-scoring component]

    ### Suggestion 2: [Name] (moderate relevance)
    **Why:** [1-2 sentences]

    [Abbreviated spec — Visual Properties, Data Fields, Usage & Content only]

    ### Suggestion 3: [Name] (lower relevance)
    **Why:** [1-2 sentences]

    [Abbreviated spec — Visual Properties, Data Fields, Usage & Content only]

    ---
    To add a dedicated spec for [component name], run the visual-design-consultant skill.

If no specs score above 0 → fall back to: "No spec file found for [component name], and
no similar components in the compendium. Run the visual-design-consultant skill to add it."

### Step 4: Load Relevant Tokens
Read `design-guidelines.md` and extract the specific tokens referenced by the component
spec (colors, spacing, typography, motion, breakpoints).

### Step 5: Deliver
Return the component spec and relevant tokens in a clear format:

    ## Design Spec: [Component Name]

    [Full content of the component spec file]

    ## Relevant Design Tokens

    [Only the tokens from design-guidelines.md that this component uses]

    ## Responsive Tokens (if component spec has Responsive Behavior section)

    [Breakpoints or fluid scales and responsive patterns from design-guidelines.md
    that the component's Responsive Behavior table references]
```

- [ ] **Step 4: Commit**

```bash
git add plugins/visual-design/agents/component-context.md
git commit -m "feat: add fuzzy matching with suggestions to component-context agent"
```

---

### Task 8: Version Bump

**Files:**
- Modify: `plugins/visual-design/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Bump version in plugin.json**

Change `"version": "1.1.0"` to `"version": "1.2.0"` in `plugins/visual-design/.claude-plugin/plugin.json`.

- [ ] **Step 2: Bump version in marketplace.json**

Change `"version": "1.1.0"` to `"version": "1.2.0"` for the visual-design entry in `.claude-plugin/marketplace.json`.

- [ ] **Step 3: Commit**

```bash
git add plugins/visual-design/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore: bump visual-design plugin to v1.2.0"
```

- [ ] **Step 4: Push**

```bash
git push origin master
```
