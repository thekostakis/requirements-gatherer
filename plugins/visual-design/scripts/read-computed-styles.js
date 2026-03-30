(function(selector) {
  var el = document.querySelector(selector);
  if (!el) return { error: 'Element not found: ' + selector };
  var cs = getComputedStyle(el);
  return {
    color: cs.color, backgroundColor: cs.backgroundColor,
    padding: cs.padding, margin: cs.margin,
    fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily,
    lineHeight: cs.lineHeight, borderRadius: cs.borderRadius,
    boxShadow: cs.boxShadow, gap: cs.gap, display: cs.display
  };
})('SELECTOR')
