// extract-design-tokens.js
// Shipped with the visual-design plugin. Executed via Chrome javascript_tool on each page.
// Returns structured design token data: colors, fonts, spacing, radii, shadows, transitions,
// keyframe animations, and component patterns.
(() => {
  const result = { colors: new Set(), fonts: new Set(), spacing: new Set(),
    radii: new Set(), shadows: new Set(), transitions: new Set(),
    animations: [], components: [] };

  // 1. Extract CSS custom properties from all stylesheets
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
        }
      } catch(e) {} // CORS-blocked cross-origin sheets — expected, skip silently
    }
  } catch(e) {}

  // 2. Sample computed styles from key elements across the page
  const selectors = ['body', 'h1', 'h2', 'h3', 'h4', 'p', 'a', 'button',
    'input', 'select', 'textarea', 'nav', 'header', 'footer', 'main', 'aside',
    '[class*="card"]', '[class*="btn"]', '[class*="modal"]', '[class*="dialog"]',
    '[class*="hero"]', '[class*="container"]', '[class*="badge"]', '[class*="tag"]',
    '[class*="avatar"]', '[class*="tooltip"]', '[class*="dropdown"]', '[class*="tab"]',
    '[class*="alert"]', '[class*="toast"]', '[class*="sidebar"]', '[class*="menu"]'];

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
  });

  return {
    url: window.location.href,
    title: document.title,
    colors: [...result.colors].filter(c => c && c !== 'rgba(0, 0, 0, 0)'),
    fonts: [...result.fonts],
    spacing: [...result.spacing],
    radii: [...new Set([...result.radii].filter(r => r && r !== '0px'))],
    shadows: [...result.shadows],
    transitions: [...result.transitions],
    animations: result.animations,
    components: result.components
  };
})();
