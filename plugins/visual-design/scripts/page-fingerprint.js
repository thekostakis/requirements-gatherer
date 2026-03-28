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
