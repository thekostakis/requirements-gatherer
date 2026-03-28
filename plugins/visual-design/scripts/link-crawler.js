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
      // Pages with different query params are treated as the same URL
      let normalized = url.origin + url.pathname.replace(/\/+$/, '').toLowerCase();
      if (normalized === origin) normalized = origin + '/'; // homepage gets trailing slash
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      links.push(normalized);
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
