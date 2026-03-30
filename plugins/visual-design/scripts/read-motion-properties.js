(function(selector) {
  var results = [];
  var els = document.querySelectorAll(selector + ', ' + selector + ' *');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var cs = getComputedStyle(el);
    if (cs.transition !== 'all 0s ease 0s' || cs.animationName !== 'none') {
      results.push({
        selector: el.tagName + (el.className ? '.' + el.className.toString().split(' ').join('.') : ''),
        transition: cs.transition,
        transitionDuration: cs.transitionDuration,
        transitionTimingFunction: cs.transitionTimingFunction,
        animationName: cs.animationName,
        animationDuration: cs.animationDuration,
        animationTimingFunction: cs.animationTimingFunction
      });
    }
  }
  return results;
})('SELECTOR')
