/* ═══════════════════════════════════════════════════════════════
   artistonthehill.co.uk — shared analytics (GA4: G-WE9VCP47Q8)
   1. Loads gtag.js if the page doesn't already have it
      (gives untagged pages pageview tracking for free).
   2. Delegated click listener fires key events on every
      enquiry action, including links created dynamically
      (Leaflet map popups, painting-view, etc.):
        whatsapp_click   — any wa.me link
        mailto_click     — any mailto: link
        print_click      — any thegillangallery.com link
        newsletter_click — any eepurl.com link
   Added July 2026. One file, included on every public page.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  var GA_ID = 'G-WE9VCP47Q8';

  /* ── 1. Ensure gtag exists ────────────────────────────────── */
  if (typeof window.gtag !== 'function') {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  /* ── 2. Delegated enquiry-click tracking ──────────────────── */
  function classify(href) {
    if (!href) return null;
    if (href.indexOf('wa.me') !== -1 || href.indexOf('api.whatsapp.com') !== -1) return 'whatsapp_click';
    if (href.indexOf('mailto:') === 0) return 'mailto_click';
    if (href.indexOf('thegillangallery.com') !== -1) return 'print_click';
    if (href.indexOf('eepurl.com') !== -1) return 'newsletter_click';
    return null;
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var eventName = classify(href);
    if (!eventName) return;
    window.gtag('event', eventName, {
      link_url: href.length > 400 ? href.slice(0, 400) : href,
      link_text: (a.textContent || '').trim().slice(0, 100),
      page_path: location.pathname + location.search,
      transport_type: 'beacon'
    });
  }, true); /* capture phase — fires before navigation */
})();
