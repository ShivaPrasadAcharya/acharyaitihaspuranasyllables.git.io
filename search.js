/**
 * search.js — Real-time Devanagari search for इतिहासपुराणम् syllabus webpage
 *
 * Features:
 *  • Fixed search bar (injected above nav, sticky on scroll)
 *  • Real-time highlighting with match count & navigation (↑ ↓)
 *  • "Active page only" checkbox (default ON)
 *  • Nepali-normalised search via NepaliNormalizer:
 *      ी→ि  ू→ु  |  श/ष→स  |  ङ/ण/ञ/ं→न्  |  व→ब
 *  • Back-to-top floating arrow button
 *  • Clears on Escape; navigates with Enter / Shift+Enter
 *  • Auto-expands collapsed card-bodies & inactive panes to show matches
 */

(function () {
  'use strict';

  /* ════════════════════════════════════════════════════════════════
     1. NEPALI NORMALIZER
  ════════════════════════════════════════════════════════════════ */
  const NepaliNormalizer = {
    vowelMap:    { '\u0940': '\u093F', '\u0942': '\u0941' },
    sibilantMap: { '\u0936': '\u0938', '\u0937': '\u0938' },
    nasalMap:    { '\u0919': '\u0928\u094D', '\u0923': '\u0928\u094D',
                   '\u091E': '\u0928\u094D', '\u0902': '\u0928\u094D' },
    vaBaMap:     { '\u0935': '\u092C' },

    normalize(text) {
      if (!text) return '';
      let n = text.normalize('NFC')
                  .replace(/\u200D/g, '')
                  .replace(/\u200C/g, '');
      for (const [f, t] of Object.entries(this.vowelMap))    n = n.split(f).join(t);
      for (const [f, t] of Object.entries(this.sibilantMap)) n = n.split(f).join(t);
      for (const [f, t] of Object.entries(this.nasalMap))    n = n.split(f).join(t);
      for (const [f, t] of Object.entries(this.vaBaMap))     n = n.split(f).join(t);
      return n;
    },

    isDevanagari(text) { return /[\u0900-\u097F]/.test(text); },

    mapToOriginal(normPos, original, normalized) {
      if (normPos <= 0) return 0;
      if (normPos >= normalized.length) return original.length;
      let origIdx = 0, normIdx = 0;
      while (normIdx < normPos && origIdx < original.length) {
        if (original[origIdx] === '\u200D' || original[origIdx] === '\u200C') {
          origIdx++; continue;
        }
        origIdx++; normIdx++;
      }
      while (origIdx < original.length &&
             (original[origIdx] === '\u200D' || original[origIdx] === '\u200C')) origIdx++;
      return origIdx;
    }
  };

  /* ════════════════════════════════════════════════════════════════
     2. STYLES
  ════════════════════════════════════════════════════════════════ */
  const CSS = `
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
    #srch-count.no-match  { color: #E07070; }
    #srch-count.has-match { color: #86ECA8; }

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
    .srch-nav-btn:hover    { background: rgba(212,148,58,.38); }
    .srch-nav-btn:disabled { opacity: .35; cursor: default; }

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

    mark.srch-hl {
      background: #FFE066;
      color: #1A0900;
      border-radius: 2px;
      padding: 0 1px;
    }
    mark.srch-hl.srch-current {
      background: #FF8C00;
      color: #fff;
      box-shadow: 0 0 0 2px #FF8C00, 0 0 8px rgba(255,140,0,.6);
      border-radius: 3px;
    }

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

    body { scroll-padding-top: 140px; }
  `;

  /* ════════════════════════════════════════════════════════════════
     3. SEARCH ENGINE
  ════════════════════════════════════════════════════════════════ */

  let allMarks   = [];
  let currentIdx = -1;
  let lastQuery  = '';

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Build reverse-map: normalised char → set of original chars that map to it
  function buildReverseMap() {
    const rev = {};
    const allMaps = [
      NepaliNormalizer.vowelMap,
      NepaliNormalizer.sibilantMap,
      NepaliNormalizer.nasalMap,
      NepaliNormalizer.vaBaMap,
    ];
    for (const map of allMaps) {
      for (const [orig, canon] of Object.entries(map)) {
        if (!rev[canon]) rev[canon] = new Set([canon]);
        rev[canon].add(orig);
      }
    }
    return rev;
  }
  const REVERSE_MAP = buildReverseMap();

  function buildPattern(query, useNorm) {
    if (!query) return null;
    const q = query.normalize('NFC').trim();
    if (!q) return null;

    if (!useNorm) return new RegExp(escapeRe(q), 'g');

    const normQ = NepaliNormalizer.normalize(q);
    let pattern = '';
    for (const ch of [...normQ]) {
      const alts = REVERSE_MAP[ch]
        ? [...REVERSE_MAP[ch]].map(escapeRe)
        : [escapeRe(ch)];
      pattern += alts.length > 1 ? '(?:' + alts.join('|') + ')' : alts[0];
    }
    return new RegExp(pattern, 'g');
  }

  function getSearchRoot() {
    const activeOnly = document.getElementById('srch-active').checked;
    if (activeOnly) {
      const panes = Array.from(document.querySelectorAll('.paper-pane.active'));
      if (panes.length === 1) return panes[0];
      return document.getElementById('papers-body') || document.body;
    }
    return document.querySelector('.container') || document.body;
  }

  function* textNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const tag = node.parentElement && node.parentElement.tagName.toUpperCase();
        if (['SCRIPT','STYLE','NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.tagName === 'MARK') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) yield node;
  }

  function clearHighlights() {
    document.querySelectorAll('mark.srch-hl').forEach(m => {
      const p = m.parentNode;
      if (!p) return;
      p.replaceChild(document.createTextNode(m.textContent), m);
      p.normalize();
    });
    allMarks = []; currentIdx = -1;
  }

  function highlight(root, re, useNorm) {
    const nodes = [];
    for (const n of textNodes(root)) nodes.push(n);

    nodes.forEach(node => {
      const original = node.textContent;
      const testText = useNorm ? NepaliNormalizer.normalize(original) : original;

      re.lastIndex = 0;
      if (!re.test(testText)) return;

      const frag = document.createDocumentFragment();
      let lastEnd = 0;
      re.lastIndex = 0;
      let m;

      while ((m = re.exec(testText)) !== null) {
        const normStart = m.index;
        const normEnd   = m.index + m[0].length;
        const origStart = useNorm ? NepaliNormalizer.mapToOriginal(normStart, original, testText) : normStart;
        const origEnd   = useNorm ? NepaliNormalizer.mapToOriginal(normEnd,   original, testText) : normEnd;

        if (origStart > lastEnd)
          frag.appendChild(document.createTextNode(original.slice(lastEnd, origStart)));

        const mark = document.createElement('mark');
        mark.className   = 'srch-hl';
        mark.textContent = original.slice(origStart, origEnd);
        frag.appendChild(mark);
        allMarks.push(mark);

        lastEnd = origEnd;
        if (m[0].length === 0) re.lastIndex++;
      }
      if (lastEnd < original.length)
        frag.appendChild(document.createTextNode(original.slice(lastEnd)));

      node.parentNode.replaceChild(frag, node);
    });
  }

  // Expand any closed containers that hide the mark
  function ensureVisible(mark) {
    let el = mark.parentElement;
    while (el && el !== document.body) {

      // Open collapsed card-body
      if (el.classList.contains('card-body') && !el.classList.contains('open')) {
        el.classList.add('open');
        const hdr = el.previousElementSibling;
        if (hdr && hdr.classList.contains('card-header')) hdr.classList.add('open');
      }

      // Activate inactive paper-pane
      if (el.classList.contains('paper-pane') && !el.classList.contains('active')) {
        document.querySelectorAll('.paper-pane').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.paper-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        const paneId = el.id;
        const tab = document.querySelector('.paper-tab[data-pane="' + paneId + '"]');
        if (tab) tab.classList.add('active');
        // Update dropdown label
        const ddBtn = document.getElementById('nav-dd-btn');
        if (ddBtn) {
          const allPanes = Array.from(document.querySelectorAll('.paper-pane'));
          const idx = allPanes.indexOf(el);
          if (idx >= 0) ddBtn.textContent = 'पत्र ' + (idx + 1) + ' \u25BE';
        }
      }

      // Activate inactive prak-pane → switch to सर्व mode (show all)
      if (el.classList.contains('prak-pane') && !el.classList.contains('active')) {
        const wrap = el.closest('.prak-panes-wrap');
        if (wrap) wrap.querySelectorAll('.prak-pane').forEach(p => p.classList.add('active'));

        // Activate the सर्व tab
        const tabsWrap = wrap && wrap.previousElementSibling;
        if (tabsWrap && tabsWrap.classList.contains('prak-tabs')) {
          tabsWrap.querySelectorAll('.prak-tab').forEach(t => t.classList.remove('active'));
          const sarvTab = tabsWrap.querySelector('.prak-tab-sarv');
          if (sarvTab) sarvTab.classList.add('active');
        }
      }

      el = el.parentElement;
    }
  }

  function focusMark(idx) {
    if (!allMarks.length) return;
    idx = ((idx % allMarks.length) + allMarks.length) % allMarks.length;
    if (currentIdx >= 0 && allMarks[currentIdx])
      allMarks[currentIdx].classList.remove('srch-current');
    currentIdx = idx;
    const mark = allMarks[currentIdx];
    mark.classList.add('srch-current');
    ensureVisible(mark);
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateCount();
  }

  function updateCount() {
    const countEl = document.getElementById('srch-count');
    if (!countEl) return;
    const total = allMarks.length;
    if (!lastQuery) {
      countEl.textContent = ''; countEl.className = '';
    } else if (total === 0) {
      countEl.textContent = 'कोई मिलान नहीं'; countEl.className = 'no-match';
    } else {
      countEl.textContent = (currentIdx >= 0 ? currentIdx + 1 : 1) + ' / ' + total;
      countEl.className   = 'has-match';
    }
    const banner = document.getElementById('srch-no-result');
    if (banner) {
      if (lastQuery && total === 0) banner.classList.add('show');
      else banner.classList.remove('show');
    }
  }

  function runSearch() {
    clearHighlights();
    const query   = document.getElementById('srch-input').value;
    const useNorm = document.getElementById('srch-norm').checked;
    lastQuery = query.trim();
    if (!lastQuery) { updateCount(); return; }
    const re = buildPattern(lastQuery, useNorm);
    if (!re) { updateCount(); return; }
    highlight(getSearchRoot(), re, useNorm);
    if (allMarks.length > 0) focusMark(0);
    else { currentIdx = -1; updateCount(); }
  }

  function navNext() { if (allMarks.length) focusMark(currentIdx + 1); }
  function navPrev() { if (allMarks.length) focusMark(currentIdx - 1); }

  /* ════════════════════════════════════════════════════════════════
     4. BUILD UI
  ════════════════════════════════════════════════════════════════ */

  function buildUI() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const bar = document.createElement('div');
    bar.id = 'srch-bar';
    bar.setAttribute('role', 'search');

    // Input
    const input = document.createElement('input');
    input.type = 'search'; input.id = 'srch-input';
    input.placeholder = 'खोज्नुहोस्… (यहाँ टाइप गर्नुहोस्)';
    input.autocomplete = 'off'; input.autocorrect = 'off'; input.spellcheck = false;
    bar.appendChild(input);

    // Clear
    const clr = document.createElement('button');
    clr.id = 'srch-clear'; clr.title = 'Clear (Esc)'; clr.innerHTML = '✕';
    bar.appendChild(clr);

    // Prev
    const prev = document.createElement('button');
    prev.className = 'srch-nav-btn'; prev.id = 'srch-prev';
    prev.title = 'Previous (Shift+Enter)'; prev.innerHTML = '▲';
    bar.appendChild(prev);

    // Next
    const next = document.createElement('button');
    next.className = 'srch-nav-btn'; next.id = 'srch-next';
    next.title = 'Next (Enter)'; next.innerHTML = '▼';
    bar.appendChild(next);

    // Count
    const count = document.createElement('span');
    count.id = 'srch-count';
    bar.appendChild(count);

    // Options
    const opts = document.createElement('div');
    opts.id = 'srch-options';

    function makeCheckbox(id, checked, labelText, helpText) {
      const lbl = document.createElement('label');
      lbl.className = 'srch-opt-label';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = id; cb.checked = checked;
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode('\u00A0' + labelText + ' '));
      const sp = document.createElement('span');
      sp.className = 'opt-help'; sp.textContent = helpText;
      lbl.appendChild(sp);
      return lbl;
    }

    opts.appendChild(makeCheckbox(
      'srch-active', true,
      'केवल सक्रिय पृष्ठमा खोज्नुहोस्',
      '(active page only)'
    ));
    opts.appendChild(makeCheckbox(
      'srch-norm', false,
      'नेपाली सामान्यीकृत खोज',
      '(\u0940/\u0942 \u00B7 \u0936/\u0937\u2192\u0938 \u00B7 \u0919/\u0923/\u091E/\u0902\u2192\u0928\u094D \u00B7 \u0935\u2192\u092C)'
    ));
    bar.appendChild(opts);

    // No-result banner
    const noResult = document.createElement('div');
    noResult.id = 'srch-no-result';
    noResult.textContent = '❌ कुनै मिलान फेला परेन — खोज सुधार्नुहोस् वा "सम्पूर्ण पृष्ठ" विकल्प प्रयास गर्नुहोस्।';

    // Insert bar before nav
    const nav = document.getElementById('main-nav');
    if (nav) nav.parentNode.insertBefore(bar, nav);
    else document.body.prepend(bar);

    const container = document.querySelector('.container');
    if (container) container.prepend(noResult);

    // Back-to-top
    const btt = document.createElement('button');
    btt.id = 'srch-btt'; btt.title = 'Back to top'; btt.innerHTML = '▲';
    document.body.appendChild(btt);

    /* ── Events ─────────────────────────────────────────────── */
    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 180);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.value = ''; clearHighlights(); lastQuery = ''; updateCount(); input.blur();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.shiftKey ? navPrev() : navNext();
      }
    });

    prev.addEventListener('click', navPrev);
    next.addEventListener('click', navNext);

    clr.addEventListener('click', () => {
      input.value = ''; clearHighlights(); lastQuery = ''; updateCount(); input.focus();
    });

    document.getElementById('srch-active').addEventListener('change', () => { if (lastQuery) runSearch(); });
    document.getElementById('srch-norm').addEventListener('change',   () => { if (lastQuery) runSearch(); });

    window.addEventListener('scroll', () => {
      btt.classList.toggle('visible', window.scrollY > 320);
    }, { passive: true });

    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault(); input.focus(); input.select();
      }
    });

    // Re-run on tab switch when activeOnly is on
    document.addEventListener('click', (e) => {
      const t = e.target;
      const isSwitch = t.classList.contains('paper-tab') ||
                       t.classList.contains('prak-tab')  ||
                       t.classList.contains('nav-dd-item');
      if (isSwitch && document.getElementById('srch-active').checked && lastQuery) {
        setTimeout(runSearch, 100);
      }
    });

    setTimeout(() => input.focus(), 300);
  }

  /* ════════════════════════════════════════════════════════════════
     5. INIT
  ════════════════════════════════════════════════════════════════ */
  function init() {
    buildUI();
    const srchBar = document.getElementById('srch-bar');
    const mainNav = document.getElementById('main-nav');
    if (srchBar && mainNav) {
      const adjust = () => { mainNav.style.top = srchBar.getBoundingClientRect().height + 'px'; };
      adjust();
      window.addEventListener('resize', adjust, { passive: true });
      setTimeout(adjust, 600);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
