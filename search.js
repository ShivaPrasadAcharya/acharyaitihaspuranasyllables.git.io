/**
 * search.js — Real-time Devanagari search for इतिहासपुराणम् syllabus webpage
 *
 * Features:
 *  • Fixed search bar (injected above nav, sticky on scroll)
 *  • Real-time highlighting with match count & navigation (↑ ↓)
 *  • "Active page only" checkbox (default ON) — searches only the
 *    currently-visible paper-pane; unchecked = entire page
 *  • Nepali-normalized search — collapses:
 *      ह्रस्व ↔ दीर्घ   (अ/आ, इ/ई, उ/ऊ, ए, ऐ, ओ, औ)
 *      न/ण/ञ/ङ/ं/ँ/म  → single class
 *      स/श/ष           → single class
 *  • Back-to-top floating arrow button
 *  • Clears on Escape; navigates with Enter / Shift+Enter
 *  • Auto-expands collapsed card-bodies and inactive panes to show matches
 */

(function () {
  'use strict';

  /* ════════════════════════════════════════════════════════════════
     1. STYLES
  ════════════════════════════════════════════════════════════════ */
  const CSS = `
    /* ── Search bar wrapper ─────────────────────────────────── */
    #srch-bar {
      position: sticky;
      top: 0;
      z-index: 200;
      background: linear-gradient(90deg, #2A1005 0%, #4A2810 100%);
      border-bottom: 2px solid #D4943A;
      padding: .55rem .8rem;
      display: flex;
      align-items: center;
      gap: .6rem;
      flex-wrap: wrap;
      box-shadow: 0 3px 14px rgba(59,31,10,.45);
      font-family: 'Noto Sans Devanagari', 'Noto Serif Devanagari', sans-serif;
    }

    /* ── Input ──────────────────────────────────────────────── */
    #srch-input {
      flex: 1 1 180px;
      min-width: 140px;
      padding: .45rem .75rem .45rem 2.1rem;
      border: 1.5px solid #C9A96E;
      border-radius: 20px;
      background: #FDF6E8;
      color: #2A1505;
      font-family: 'Noto Serif Devanagari', serif;
      font-size: .95rem;
      outline: none;
      transition: border-color .2s, box-shadow .2s;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23C45E0A' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: .55rem center;
      background-size: 1rem;
    }
    #srch-input:focus {
      border-color: #D4943A;
      box-shadow: 0 0 0 3px rgba(212,148,58,.25);
    }
    #srch-input::placeholder { color: #A07840; font-size: .88rem; }

    /* ── Count badge ────────────────────────────────────────── */
    #srch-count {
      color: #F2C97E;
      font-size: .82rem;
      min-width: 80px;
      white-space: nowrap;
      text-align: center;
      padding: .25rem .5rem;
      background: rgba(0,0,0,.2);
      border-radius: 10px;
      letter-spacing: .02em;
    }
    #srch-count.no-match { color: #E07070; }
    #srch-count.has-match { color: #86ECA8; }

    /* ── Nav buttons ────────────────────────────────────────── */
    .srch-nav-btn {
      background: rgba(212,148,58,.18);
      border: 1px solid #C9A96E;
      color: #F2C97E;
      border-radius: 6px;
      width: 2rem; height: 2rem;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      font-size: 1rem;
      transition: background .15s;
      flex-shrink: 0;
    }
    .srch-nav-btn:hover { background: rgba(212,148,58,.38); }
    .srch-nav-btn:disabled { opacity: .35; cursor: default; }

    /* ── Clear button ───────────────────────────────────────── */
    #srch-clear {
      background: none;
      border: none;
      color: #C9A96E;
      font-size: 1.15rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 .1rem;
      flex-shrink: 0;
      transition: color .15s;
    }
    #srch-clear:hover { color: #F2C97E; }

    /* ── Checkboxes row ─────────────────────────────────────── */
    #srch-options {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem .9rem;
      align-items: center;
      width: 100%;
    }
    .srch-opt-label {
      display: flex;
      align-items: center;
      gap: .35rem;
      color: #E8C98A;
      font-size: .8rem;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    .srch-opt-label input[type=checkbox] {
      accent-color: #D4943A;
      width: 14px; height: 14px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .srch-opt-label .opt-help {
      color: #A07840;
      font-size: .72rem;
      font-style: italic;
    }

    /* ── Highlights ─────────────────────────────────────────── */
    mark.srch-hl {
      background: #FFE066;
      color: #1A0900;
      border-radius: 2px;
      padding: 0 1px;
      transition: background .15s;
    }
    mark.srch-hl.srch-current {
      background: #FF8C00;
      color: #fff;
      box-shadow: 0 0 0 2px #FF8C00, 0 0 8px rgba(255,140,0,.6);
      border-radius: 3px;
    }

    /* ── No-result banner ───────────────────────────────────── */
    #srch-no-result {
      display: none;
      background: #FFF0F0;
      border: 1px solid #E07070;
      color: #8B1A1A;
      border-radius: 6px;
      padding: .55rem 1rem;
      font-size: .88rem;
      margin: .8rem 1.2rem 0;
      text-align: center;
    }
    #srch-no-result.show { display: block; }

    /* ── Back-to-top ────────────────────────────────────────── */
    #srch-btt {
      position: fixed;
      bottom: 1.8rem;
      right: 1.5rem;
      z-index: 500;
      width: 46px; height: 46px;
      background: linear-gradient(135deg, #5C3310, #8B5E0A);
      border: 2px solid #D4943A;
      color: #F2C97E;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(59,31,10,.45);
      opacity: 0;
      pointer-events: none;
      transform: translateY(12px);
      transition: opacity .3s, transform .3s;
      text-decoration: none;
    }
    #srch-btt.visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }
    #srch-btt:hover {
      background: linear-gradient(135deg, #8B5E0A, #C45E0A);
      border-color: #F2C97E;
    }

    /* ── Adjust body top-padding when search bar is sticky ─── */
    body { scroll-padding-top: 120px; }
  `;

  /* ════════════════════════════════════════════════════════════════
     2. NEPALI NORMALISATION
     Collapse categories:
       • ह्रस्व/दीर्घ pairs → canonical short form
       • nasal class (न ण ञ ङ ं ँ म) → 'न'
       • sibilant class (स श ष) → 'स'
  ════════════════════════════════════════════════════════════════ */

  // Build a regex that matches any char from a class
  const N_VOWEL_MAP = [
    // long → short (in canonical NFC string)
    ['\u0906', '\u0905'], // आ → अ
    ['\u0908', '\u0907'], // ई → इ
    ['\u090A', '\u0909'], // ऊ → उ
    ['\u0948', '\u0947'], // ै → े   (matras)
    ['\u094C', '\u094B'], // ौ → ो
    ['\u0902', '\u0928'], // ं → न (anusvara → न)
    ['\u0901', '\u0928'], // ँ → न (chandrabindu → न)
    ['\u0923', '\u0928'], // ण → न
    ['\u091E', '\u0928'], // ञ → न
    ['\u0919', '\u0928'], // ङ → न
    ['\u092E', '\u0928'], // म → न
    ['\u0936', '\u0938'], // श → स
    ['\u0937', '\u0938'], // ष → स
  ];

  function normalise(str) {
    // NFC first
    let s = str.normalize('NFC');
    for (const [from, to] of N_VOWEL_MAP) {
      // replace all occurrences
      s = s.split(from).join(to);
    }
    return s;
  }

  /* ════════════════════════════════════════════════════════════════
     3. SEARCH ENGINE
  ════════════════════════════════════════════════════════════════ */

  let allMarks = [];      // all <mark> elements in DOM order
  let currentIdx = -1;    // index of currently-focused mark
  let lastQuery = '';
  let useNorm = false;
  let activeOnly = true;

  // ── Get the currently-visible paper pane (or null) ───────────
  function getActivePaperPane() {
    return document.querySelector('.paper-pane.active') || null;
  }

  // ── Scope: the nodes to search within ───────────────────────
  function getSearchRoot() {
    if (activeOnly) {
      // Try active paper pane first, fall back to whole container
      const pane = getActivePaperPane();
      return pane || document.getElementById('papers-body') || document.body;
    }
    return document.querySelector('.container') || document.body;
  }

  // ── Escape string for use in RegExp ─────────────────────────
  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ── Build RegExp from query ──────────────────────────────────
  function buildPattern(query, norm) {
    if (!query) return null;
    let q = query.normalize('NFC').trim();
    if (!q) return null;

    if (norm) {
      q = normalise(q);
      // Each character in the query: if it's a canonical form, also match original forms
      let pattern = '';
      for (const ch of [...q]) {
        const alternatives = [escapeRe(ch)];
        // Reverse-map: if ch is the canonical, add original forms
        for (const [orig, canon] of N_VOWEL_MAP) {
          if (canon === ch) alternatives.push(escapeRe(orig));
        }
        // Also match both आ and अ if query has अ
        pattern += alternatives.length > 1
          ? '(?:' + alternatives.join('|') + ')'
          : alternatives[0];
      }
      return new RegExp(pattern, 'g');
    } else {
      return new RegExp(escapeRe(q), 'g');
    }
  }

  // ── Text nodes under an element (skip script/style/mark) ────
  function* textNodes(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const tag = node.parentElement && node.parentElement.tagName.toUpperCase();
          if (['SCRIPT','STYLE','NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
          // Don't re-highlight inside existing marks (avoid double-wrap)
          if (node.parentElement && node.parentElement.tagName === 'MARK') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let node;
    while ((node = walker.nextNode())) yield node;
  }

  // ── Remove all existing highlights ──────────────────────────
  function clearHighlights() {
    // Replace each <mark> with its text content
    const marks = document.querySelectorAll('mark.srch-hl');
    marks.forEach(m => {
      const parent = m.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
    allMarks = [];
    currentIdx = -1;
  }

  // ── Highlight all matches in root ───────────────────────────
  function highlight(root, re, norm) {
    // We must collect text nodes first (modifying DOM invalidates walker)
    const nodes = [];
    for (const n of textNodes(root)) nodes.push(n);

    nodes.forEach(node => {
      const text = node.textContent;
      const testText = norm ? normalise(text) : text;

      re.lastIndex = 0;
      if (!re.test(testText)) return;   // no match in this node

      // Split text into segments [text, matched, text, matched, ...]
      const frag = document.createDocumentFragment();
      let lastEnd = 0;
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(testText)) !== null) {
        const start = m.index, end = m.index + m[0].length;

        // Text before match
        if (start > lastEnd) {
          frag.appendChild(document.createTextNode(text.slice(lastEnd, start)));
        }

        // The matched slice from the *original* (un-normalised) text
        const mark = document.createElement('mark');
        mark.className = 'srch-hl';
        mark.textContent = text.slice(start, end);
        frag.appendChild(mark);
        allMarks.push(mark);

        lastEnd = end;
        // Prevent infinite loop on zero-length match
        if (m[0].length === 0) re.lastIndex++;
      }
      // Remaining text
      if (lastEnd < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastEnd)));
      }

      node.parentNode.replaceChild(frag, node);
    });
  }

  // ── Ensure a mark is visible (expand collapsed panes) ───────
  function ensureVisible(mark) {
    // Walk up and open any closed card-body
    let el = mark.parentElement;
    while (el) {
      if (el.classList.contains('card-body') && !el.classList.contains('open')) {
        el.classList.add('open');
        const hdr = el.previousElementSibling;
        if (hdr && hdr.classList.contains('card-header')) hdr.classList.add('open');
      }
      // Activate inactive paper-pane
      if (el.classList.contains('paper-pane') && !el.classList.contains('active')) {
        // Deactivate current
        const allPanes = document.querySelectorAll('.paper-pane');
        const allTabs  = document.querySelectorAll('.paper-tab');
        allPanes.forEach(p => p.classList.remove('active'));
        allTabs.forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        // Activate corresponding tab
        const paneId = el.id; // e.g. "pane-p1"
        const tab = document.querySelector(`.paper-tab[data-pane="${paneId}"]`);
        if (tab) tab.classList.add('active');
      }
      // Activate inactive prak-pane
      if (el.classList.contains('prak-pane') && !el.classList.contains('active')) {
        const container = el.parentElement;
        if (container) {
          container.querySelectorAll('.prak-pane').forEach(p => p.classList.remove('active'));
        }
        el.classList.add('active');
        // Find and activate corresponding prak-tab
        const tabBar = el.parentElement && el.parentElement.previousElementSibling;
        if (tabBar && tabBar.classList.contains('prak-tabs')) {
          tabBar.querySelectorAll('.prak-tab').forEach(t => t.classList.remove('active'));
          const paneId = el.id;
          const matchingTab = tabBar.querySelector(`[data-pane="${paneId}"]`);
          if (matchingTab) matchingTab.classList.add('active');
        }
      }
      el = el.parentElement;
    }
  }

  // ── Focus a specific match index ────────────────────────────
  function focusMark(idx) {
    if (!allMarks.length) return;
    idx = ((idx % allMarks.length) + allMarks.length) % allMarks.length;
    if (currentIdx >= 0 && allMarks[currentIdx]) {
      allMarks[currentIdx].classList.remove('srch-current');
    }
    currentIdx = idx;
    const mark = allMarks[currentIdx];
    mark.classList.add('srch-current');
    ensureVisible(mark);
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateCount();
  }

  // ── Update count display ────────────────────────────────────
  function updateCount() {
    const countEl = document.getElementById('srch-count');
    if (!countEl) return;
    const total = allMarks.length;
    if (!lastQuery) {
      countEl.textContent = '';
      countEl.className = '';
    } else if (total === 0) {
      countEl.textContent = 'कोई मिलान नहीं';
      countEl.className = 'no-match';
    } else {
      const cur = currentIdx >= 0 ? currentIdx + 1 : 1;
      countEl.textContent = `${cur} / ${total}`;
      countEl.className = 'has-match';
    }
    const banner = document.getElementById('srch-no-result');
    if (banner) {
      if (lastQuery && total === 0) banner.classList.add('show');
      else banner.classList.remove('show');
    }
  }

  // ── Main search runner ───────────────────────────────────────
  function runSearch() {
    clearHighlights();
    const query = document.getElementById('srch-input').value;
    useNorm = document.getElementById('srch-norm').checked;
    activeOnly = document.getElementById('srch-active').checked;
    lastQuery = query.trim();

    if (!lastQuery) { updateCount(); return; }

    const re = buildPattern(lastQuery, useNorm);
    if (!re) { updateCount(); return; }

    const root = getSearchRoot();
    highlight(root, re, useNorm);

    if (allMarks.length > 0) {
      focusMark(0);
    } else {
      currentIdx = -1;
      updateCount();
    }
  }

  // ── Navigate ────────────────────────────────────────────────
  function navNext() { if (allMarks.length) focusMark(currentIdx + 1); }
  function navPrev() { if (allMarks.length) focusMark(currentIdx - 1); }

  /* ════════════════════════════════════════════════════════════════
     4. BUILD DOM
  ════════════════════════════════════════════════════════════════ */

  function buildUI() {
    // Inject styles
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // ── Search bar ─────────────────────────────────────────────
    const bar = document.createElement('div');
    bar.id = 'srch-bar';
    bar.setAttribute('role', 'search');
    bar.setAttribute('aria-label', 'Syllabus search');

    // Input
    const input = document.createElement('input');
    input.type = 'search';
    input.id = 'srch-input';
    input.placeholder = 'खोज्नुहोस्… (यहाँ टाइप गर्नुहोस्)';
    input.autocomplete = 'off';
    input.autocorrect = 'off';
    input.spellcheck = false;
    bar.appendChild(input);

    // Clear button
    const clr = document.createElement('button');
    clr.id = 'srch-clear';
    clr.title = 'Clear (Esc)';
    clr.innerHTML = '✕';
    clr.setAttribute('aria-label', 'Clear search');
    bar.appendChild(clr);

    // Prev button
    const prev = document.createElement('button');
    prev.className = 'srch-nav-btn';
    prev.id = 'srch-prev';
    prev.title = 'Previous (Shift+Enter)';
    prev.innerHTML = '▲';
    prev.setAttribute('aria-label', 'Previous match');
    bar.appendChild(prev);

    // Next button
    const next = document.createElement('button');
    next.className = 'srch-nav-btn';
    next.id = 'srch-next';
    next.title = 'Next (Enter)';
    next.innerHTML = '▼';
    next.setAttribute('aria-label', 'Next match');
    bar.appendChild(next);

    // Count
    const count = document.createElement('span');
    count.id = 'srch-count';
    bar.appendChild(count);

    // Options row
    const opts = document.createElement('div');
    opts.id = 'srch-options';

    // Checkbox: active page only
    const lblActive = document.createElement('label');
    lblActive.className = 'srch-opt-label';
    const cbActive = document.createElement('input');
    cbActive.type = 'checkbox';
    cbActive.id = 'srch-active';
    cbActive.checked = true;  // default ON
    lblActive.appendChild(cbActive);
    lblActive.appendChild(document.createTextNode(' केवल सक्रिय पृष्ठमा खोज्नुहोस् '));
    const helpActive = document.createElement('span');
    helpActive.className = 'opt-help';
    helpActive.textContent = '(active page only)';
    lblActive.appendChild(helpActive);
    opts.appendChild(lblActive);

    // Checkbox: nepali normalised
    const lblNorm = document.createElement('label');
    lblNorm.className = 'srch-opt-label';
    const cbNorm = document.createElement('input');
    cbNorm.type = 'checkbox';
    cbNorm.id = 'srch-norm';
    cbNorm.checked = false;
    lblNorm.appendChild(cbNorm);
    lblNorm.appendChild(document.createTextNode(' नेपाली सामान्यीकृत खोज '));
    const helpNorm = document.createElement('span');
    helpNorm.className = 'opt-help';
    helpNorm.textContent = '(ह्रस्व-दीर्घ · न/ण/ञ/ङ/ं/म · स/श/ष)';
    lblNorm.appendChild(helpNorm);
    opts.appendChild(lblNorm);

    bar.appendChild(opts);

    // No-result banner (inserted into container after search)
    const noResult = document.createElement('div');
    noResult.id = 'srch-no-result';
    noResult.textContent = '❌ कुनै मिलान फेला परेन — खोज सुधार्नुहोस् वा "सम्पूर्ण पृष्ठ" विकल्प प्रयास गर्नुहोस्।';

    // ── Insert bar before nav (so nav remains under it) ────────
    const nav = document.getElementById('main-nav');
    if (nav) {
      nav.parentNode.insertBefore(bar, nav);
    } else {
      document.body.prepend(bar);
    }

    // Insert no-result banner after container
    const container = document.querySelector('.container');
    if (container) container.prepend(noResult);

    // ── Back-to-top button ──────────────────────────────────────
    const btt = document.createElement('button');
    btt.id = 'srch-btt';
    btt.title = 'Back to top';
    btt.innerHTML = '▲';
    btt.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(btt);

    /* ════════════════════════════════════════════════════════════
       5. EVENT LISTENERS
    ════════════════════════════════════════════════════════════ */

    // Debounced real-time search
    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 180);
    });

    // Keyboard navigation inside input
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.value = '';
        clearHighlights();
        lastQuery = '';
        updateCount();
        input.blur();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) navPrev(); else navNext();
      }
    });

    // Nav buttons
    prev.addEventListener('click', navPrev);
    next.addEventListener('click', navNext);

    // Clear button
    clr.addEventListener('click', () => {
      input.value = '';
      clearHighlights();
      lastQuery = '';
      updateCount();
      input.focus();
    });

    // Checkbox: active-only — re-run search scope immediately
    cbActive.addEventListener('change', () => { if (lastQuery) runSearch(); });

    // Checkbox: normalise — re-run
    cbNorm.addEventListener('change', () => { if (lastQuery) runSearch(); });

    // Back-to-top visibility
    window.addEventListener('scroll', () => {
      if (window.scrollY > 320) btt.classList.add('visible');
      else btt.classList.remove('visible');
    }, { passive: true });

    btt.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Global Ctrl+F / Cmd+F → focus search input
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });

    // When paper tabs switch, re-run search in new scope (if active-only)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('paper-tab') || e.target.classList.contains('prak-tab')) {
        if (cbActive.checked && lastQuery) {
          // Small delay to let tab switch complete
          setTimeout(runSearch, 80);
        }
      }
    });

    // Focus input on load
    setTimeout(() => input.focus(), 300);
  }

  /* ════════════════════════════════════════════════════════════════
     6. INIT
  ════════════════════════════════════════════════════════════════ */

  function init() {
    buildUI();
    // Adjust nav's sticky top to account for search bar height
    const srchBar = document.getElementById('srch-bar');
    const mainNav = document.getElementById('main-nav');
    if (srchBar && mainNav) {
      const adjustNavTop = () => {
        const h = srchBar.getBoundingClientRect().height;
        mainNav.style.top = h + 'px';
      };
      adjustNavTop();
      window.addEventListener('resize', adjustNavTop, { passive: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
