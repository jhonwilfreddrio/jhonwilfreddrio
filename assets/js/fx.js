/**
 * fx.js — front-end motion for the portfolio.
 *
 *   1. scroll reveal    case-study cards ease in as they enter view
 *   2. metric count-up  the numbers on each card count to their value
 *
 * Everything here is decoration: if any part is unsupported, or the visitor
 * asks for reduced motion, the page must still read exactly the same.
 */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ── 1. scroll reveal ──────────────────────────────────────────────── */
  //
  // Deliberately a scroll sweep rather than an IntersectionObserver. This page
  // is section-based: the nav shows one <section> and display:none's the rest,
  // so an observer on a hidden card never fires and the card would stay at
  // opacity 0 after its section is shown — content lost, not decoration lost.
  // A sweep re-checks live geometry, and a hidden element measures as a zero
  // rect, which counts as "reveal it" instead of "leave it invisible".
  function initReveal() {
    if (reduced) return;

    var targets = Array.prototype.slice.call(document.querySelectorAll(
      '.portfolio-item .csf-card, .portfolio-item .portfolio-wrap, .leaps-wrap, .kora-duty, .kora-hero'
    ));
    if (!targets.length) return;

    var pending = [];
    targets.forEach(function (el) {
      // Anything already on screen at load stays as-is, so there is no flash.
      var box = el.getBoundingClientRect();
      if (box.height === 0 || box.top < window.innerHeight * 0.92) return;
      el.classList.add('fx-reveal');
      pending.push(el);
    });
    if (!pending.length) return;

    var queued = false;

    function sweep() {
      queued = false;
      var limit = window.innerHeight * 0.92;
      pending = pending.filter(function (el) {
        var box = el.getBoundingClientRect();
        // A zero-height rect means the element is inside a hidden section.
        // Reveal it rather than risk it surfacing invisible later.
        if (box.height !== 0 && box.top >= limit) return true;
        el.classList.add('is-revealed');
        return false;
      });
      if (!pending.length) teardown();
    }

    function request() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(sweep);
    }

    function teardown() {
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      window.removeEventListener('hashchange', request);
    }

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    window.addEventListener('hashchange', request);

    // Showing a section changes what is on screen without any scrolling.
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(request);
      Array.prototype.forEach.call(document.querySelectorAll('section'), function (sec) {
        mo.observe(sec, { attributes: true, attributeFilter: ['class', 'style'] });
      });
    }

    // Last line of defence: whatever the page does, nothing stays hidden.
    setTimeout(function () {
      pending.forEach(function (el) { el.classList.add('is-revealed'); });
      pending = [];
      teardown();
    }, 15000);

    request();
  }

  /* ── 2. metric count-up ────────────────────────────────────────────── */
  function initCountUp() {
    if (!hasIO) return;

    var cells = document.querySelectorAll('.csf-metric > strong, .kora-fact > strong');
    if (!cells.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.6 });

    Array.prototype.forEach.call(cells, function (el) {
      // Only whole numbers animate; "10.2k" and the like keep their label.
      if (!/^[0-9]+$/.test(el.textContent.trim())) return;
      el.setAttribute('data-count-to', el.textContent.trim());
      io.observe(el);
    });

    function run(el) {
      var target = parseInt(el.getAttribute('data-count-to'), 10);
      if (!isFinite(target)) return;
      if (reduced) { el.textContent = String(target); return; }

      var dur = 900, t0 = null;
      el.classList.add('is-counting');

      function tick(now) {
        if (t0 === null) t0 = now;
        var p = Math.min((now - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);       // ease-out cubic
        el.textContent = String(Math.round(target * eased));
        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = String(target);
          el.classList.remove('is-counting');
        }
      }
      requestAnimationFrame(tick);
    }
  }

  /* ── 3. case-study disclosure ──────────────────────────────────────── */
  //
  // The Work section used to be eight fully expanded case studies — about 3,500
  // words and a dozen screens of scrolling. Each card now shows a lead line and
  // its metrics; the Problem / What I Built / Result columns open on request.
  // The text stays in the DOM either way, so crawlers and answer engines still
  // read the whole thing.
  function initDisclosure() {
    var toggles = document.querySelectorAll('.csf-toggle');
    if (!toggles.length) return;

    Array.prototype.forEach.call(toggles, function (btn) {
      var detail = document.getElementById(btn.getAttribute('aria-controls'));
      if (!detail) return;

      // Each toggle remembers its own pair of labels.
      var shut = btn.querySelector('.csf-toggle-label').textContent;
      var openLabel = btn.classList.contains('leaps-toggle') ? 'Show the 8 newest only'
                    : btn.classList.contains('kora-deep-toggle') ? 'Hide the KORA detail'
                    : 'Hide the detail';

      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        detail.classList.toggle('is-open', !open);

        var label = btn.querySelector('.csf-toggle-label');
        if (label) label.textContent = open ? shut : openLabel;

        // The cards sit in an Isotope grid, which positions items absolutely
        // from measured heights. Without this the grid overlaps after a card
        // changes size.
        if (window.portfolioIsotope) {
          window.portfolioIsotope.layout();
          setTimeout(function () { window.portfolioIsotope.layout(); }, 320);
        }

        // Collapsing a tall card can leave the viewport past its own heading.
        if (open) {
          var box = btn.getBoundingClientRect();
          if (box.top < 90) {
            window.scrollBy({ top: box.top - 110, behavior: reduced ? 'auto' : 'smooth' });
          }
        }
      });
    });

    // "See the flow" and the KORA nav links point at #kora, whose flowcharts
    // now live inside the collapsed deep-dive. Open it for them.
    function openKoraDeep() {
      var btn = document.querySelector('.kora-deep-toggle');
      if (btn && btn.getAttribute('aria-expanded') !== 'true') btn.click();
    }
    Array.prototype.forEach.call(document.querySelectorAll('a[href="#kora"]'), function (a) {
      a.addEventListener('click', function () { setTimeout(openKoraDeep, 380); });
    });
    if (window.location.hash === '#kora') setTimeout(openKoraDeep, 700);
    window.addEventListener('hashchange', function () {
      if (window.location.hash === '#kora') setTimeout(openKoraDeep, 380);
    });
  }

  function boot() {
    initReveal();
    initCountUp();
    initDisclosure();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
