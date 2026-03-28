// extract-design-tokens.js
// Shipped with the visual-design plugin. Executed via Chrome javascript_tool on each page.
// Returns structured design token data: colors, fonts, spacing, radii, shadows, transitions,
// keyframe animations, component patterns, responsive breakpoints, layout patterns,
// and animated element discovery.
(() => {
  const result = { colors: new Set(), fonts: new Set(), spacing: new Set(),
    radii: new Set(), shadows: new Set(), transitions: new Set(),
    animations: [], components: [] };
  const fluidData = { clampExpressions: new Set(), viewportUnitProperties: new Set(),
    containerRules: [] };

  // Change 1d: Capture viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 1. Extract CSS custom properties from all stylesheets
  const mediaRules = [];
  const breakpointSet = new Set();
  try {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.style) {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith('--')) {
                const val = rule.style.getPropertyValue(prop).trim();
                if (val.match(/#|rgb|hsl/i)) result.colors.add(`${prop}: ${val}`);
                if (val.match(/px|rem|em|%/) && !val.match(/#|rgb/))
                  result.spacing.add(`${prop}: ${val}`);
                // Detect fluid responsive functions in custom properties
                if (val.match(/clamp\s*\(|min\s*\(|max\s*\(/i)) {
                  fluidData.clampExpressions.add(`${prop}: ${val}`);
                }
                if (val.match(/\d+(\.\d+)?(vw|vh|vmin|vmax|dvh|svh)/i)) {
                  fluidData.viewportUnitProperties.add(`${prop}: ${val}`);
                }
              }
            }
          }
          // Capture keyframe animations
          if (rule instanceof CSSKeyframesRule) {
            result.animations.push({
              name: rule.name,
              keyframes: Array.from(rule.cssRules).map(kf => ({
                key: kf.keyText,
                style: kf.style.cssText
              }))
            });
          }
          // Change 1a: Capture @media rules and extract breakpoints
          if (rule instanceof CSSMediaRule) {
            if (mediaRules.length < 50) {
              const query = rule.media.mediaText;
              const bpMatch = query.match(/(\d+(?:\.\d+)?)(px|em|rem)/);
              if (bpMatch) {
                breakpointSet.add(JSON.stringify({ value: parseFloat(bpMatch[1]), unit: bpMatch[2], query }));
              }
              const childRules = [];
              const childList = rule.cssRules || [];
              for (let ci = 0; ci < Math.min(childList.length, 20); ci++) {
                const child = childList[ci];
                if (child.style && child.selectorText) {
                  const props = {};
                  for (let pi = 0; pi < child.style.length; pi++) {
                    const p = child.style[pi];
                    props[p] = child.style.getPropertyValue(p).trim();
                  }
                  childRules.push({ selector: child.selectorText, properties: props });
                }
              }
              mediaRules.push({ query, childRules });
            }
          }
          // Capture container query rules
          if (typeof CSSContainerRule !== 'undefined' && rule instanceof CSSContainerRule) {
            if (fluidData.containerRules.length < 20) {
              fluidData.containerRules.push({
                containerName: rule.containerName || '(unnamed)',
                conditionText: rule.conditionText || rule.cssText.slice(0, 200)
              });
            }
          }
        }
      } catch(e) {} // CORS-blocked cross-origin sheets — expected, skip silently
    }
  } catch(e) {}

  // 2. Sample computed styles from key elements across the page
  // Dynamic component extraction: merge hardcoded selectors with discovered ones
  // When called with `const discoveredSelectors = [...]` prepended, those selectors
  // are included. Otherwise, only the hardcoded list is used.
  const extraSelectors = (typeof discoveredSelectors !== 'undefined' && Array.isArray(discoveredSelectors))
    ? discoveredSelectors : [];
  const selectors = ['body', 'h1', 'h2', 'h3', 'h4', 'p', 'a', 'button',
    'input', 'select', 'textarea', 'nav', 'header', 'footer', 'main', 'aside',
    '[class*="card"]', '[class*="btn"]', '[class*="modal"]', '[class*="dialog"]',
    '[class*="hero"]', '[class*="container"]', '[class*="badge"]', '[class*="tag"]',
    '[class*="avatar"]', '[class*="tooltip"]', '[class*="dropdown"]', '[class*="tab"]',
    '[class*="alert"]', '[class*="toast"]', '[class*="sidebar"]', '[class*="menu"]',
    ...extraSelectors.filter(s => !['body','h1','h2','h3','h4','p','a','button',
      'input','select','textarea','nav','header','footer','main','aside'].includes(s))
  ];

  const layoutPatterns = [];

  selectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    const cs = getComputedStyle(el);
    result.colors.add(cs.color);
    result.colors.add(cs.backgroundColor);
    if (cs.borderColor !== cs.color) result.colors.add(cs.borderColor);
    result.fonts.add(`${cs.fontFamily} | ${cs.fontSize} | ${cs.fontWeight} | ${cs.lineHeight} | ${cs.letterSpacing}`);
    result.spacing.add(`padding: ${cs.padding}`);
    result.spacing.add(`margin: ${cs.margin}`);
    result.spacing.add(`gap: ${cs.gap}`);
    result.radii.add(cs.borderRadius);
    if (cs.boxShadow !== 'none') result.shadows.add(cs.boxShadow);
    if (cs.transition !== 'all 0s ease 0s') result.transitions.add(cs.transition);
    // Detect fluid responsive values in computed styles
    const propsToCheck = { fontSize: cs.fontSize, padding: cs.padding, margin: cs.margin,
      width: cs.width, maxWidth: cs.maxWidth, gap: cs.gap };
    for (const [name, val] of Object.entries(propsToCheck)) {
      if (val && val.match && val.match(/\d+(\.\d+)?(vw|vh|vmin|vmax|dvh|svh)/i)) {
        fluidData.viewportUnitProperties.add(`${sel} ${name}: ${val}`);
      }
    }

    // 3. Capture component patterns for common UI elements
    const tag = sel.replace(/\[class\*="(.+?)"\]/, '$1');
    const componentTypes = ['btn', 'button', 'card', 'modal', 'dialog', 'badge', 'tag',
      'avatar', 'tooltip', 'dropdown', 'tab', 'alert', 'toast', 'menu'];
    const matchedType = componentTypes.find(t => tag.includes(t) || sel === t);
    if (matchedType) {
      result.components.push({
        type: matchedType, selector: sel,
        styles: {
          bg: cs.backgroundColor, color: cs.color, padding: cs.padding,
          margin: cs.margin, radius: cs.borderRadius, fontSize: cs.fontSize,
          fontWeight: cs.fontWeight, lineHeight: cs.lineHeight,
          border: cs.border, shadow: cs.boxShadow,
          transition: cs.transition, cursor: cs.cursor,
          display: cs.display, position: cs.position
        }
      });
    }

    // Change 1b: Capture layout patterns for flex and grid elements
    if (cs.display && (cs.display.includes('flex') || cs.display.includes('grid'))) {
      const layout = { selector: sel, display: cs.display, width: cs.width, maxWidth: cs.maxWidth, minWidth: cs.minWidth };
      if (cs.display.includes('flex')) {
        layout.flexDirection = cs.flexDirection;
        layout.flexWrap = cs.flexWrap;
        layout.alignItems = cs.alignItems;
        layout.justifyContent = cs.justifyContent;
      }
      if (cs.display.includes('grid')) {
        layout.gridTemplateColumns = cs.gridTemplateColumns;
        layout.gridTemplateRows = cs.gridTemplateRows;
        layout.gap = cs.gap;
      }
      layoutPatterns.push(layout);
    }
  });

  // Change 1c: Discover ALL animated/transitioning elements (not just indexed selectors)
  const animatedElements = [];
  const allElements = document.querySelectorAll('*');
  const seen = new Set();
  for (const el of allElements) {
    if (animatedElements.length >= 100) break;
    const cs = getComputedStyle(el);
    const hasTransition = cs.transition && cs.transition !== 'all 0s ease 0s' && cs.transition !== 'none';
    const hasAnimation = cs.animationName && cs.animationName !== 'none';
    if (!hasTransition && !hasAnimation) continue;
    const sig = `${cs.transition}|${cs.animationName}|${cs.animationDuration}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    const id = el.id ? `#${el.id}` : '';
    const classes = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
      : '';
    const selector = el.tagName.toLowerCase() + id + classes;
    const entry = { selector };
    if (hasTransition) {
      entry.transition = {
        property: cs.transitionProperty,
        duration: cs.transitionDuration,
        timing: cs.transitionTimingFunction,
        delay: cs.transitionDelay
      };
    }
    if (hasAnimation) {
      entry.animation = {
        name: cs.animationName,
        duration: cs.animationDuration,
        timing: cs.animationTimingFunction,
        delay: cs.animationDelay,
        iterationCount: cs.animationIterationCount,
        direction: cs.animationDirection,
        fillMode: cs.animationFillMode
      };
    }
    animatedElements.push(entry);
  }

  return {
    url: window.location.href,
    title: document.title,
    viewportWidth,
    viewportHeight,
    colors: [...result.colors].filter(c => c && c !== 'rgba(0, 0, 0, 0)'),
    fonts: [...result.fonts],
    spacing: [...result.spacing],
    radii: [...new Set([...result.radii].filter(r => r && r !== '0px'))],
    shadows: [...result.shadows],
    transitions: [...result.transitions],
    animations: result.animations,
    components: result.components,
    breakpoints: [...breakpointSet].map(s => JSON.parse(s)).sort((a, b) => a.value - b.value),
    responsivePatterns: mediaRules,
    layoutPatterns,
    animatedElements,
    fluidResponsive: {
      usesClamp: fluidData.clampExpressions.size > 0,
      usesViewportUnits: fluidData.viewportUnitProperties.size > 0,
      usesContainerQueries: fluidData.containerRules.length > 0,
      clampExpressions: [...fluidData.clampExpressions].slice(0, 30),
      viewportUnitProperties: [...fluidData.viewportUnitProperties].slice(0, 20),
      containerRules: fluidData.containerRules
    }
  };
})();
