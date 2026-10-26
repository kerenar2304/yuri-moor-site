/* Юрий Моор-Мурадов: shelf, catalog, book dialog, excerpt reader, cart */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var BOOKS = window.BOOKS || [], SHOP = window.SHOP || {};
  var byId = {}; BOOKS.forEach(function (b) { byId[b.id] = b; });
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var SERIES = { hebrew: 'Занимательный иврит', detective: 'Детективы', other: 'Израиль и разговорник' };

  /* ---------- covers ---------- */
  function coverHTML(b, lazy) {
    if (b.cover) return '<img src="assets/covers/thumb/' + b.cover + '.webp" srcset="assets/covers/thumb/' + b.cover + '.webp 480w, assets/covers/' + b.cover + '.webp 830w" sizes="(max-width:700px) 45vw, 320px" width="480" height="679" alt="Обложка: ' + esc(b.ru || b.title) + '"' + (lazy ? ' loading="lazy"' : '') + ' decoding="async">';
    var isHeb = b.series === 'hebrew';
    return '<div class="cv" role="img" aria-label="' + esc(b.title) + '"><small>Юрий Моор-Мурадов</small><b>' + esc(b.title) + '</b>' +
      (isHeb ? '<i>Занимательный</i><strong>ИВРИТ ' + b.vol + '</strong>' : '<i>' + esc(b.sub || '') + '</i>') +
      '<span class="cv-ph">[[обложка]]</span></div>';
  }
  // one spine design for every book: author, a clear title, the volume number for the series
  // one spine design for every book: the title, and its place on the shelf under a thin rule
  // the real spine, cut from the print cover (1800px tall); the drawn spine is only a fallback
  var SPINE_W = { debut: 166, heb: 179, isr: 165, nhd: 166, prig: 221, razg: 252, shp: 166, z1: 166, z2: 179, z3: 166, z4: 166, z5: 166, z6: 165, z7: 165, z8: 166 };
  function spineHTML(b, num) {
    if (b.spine && SPINE_W[b.spine]) return '<img src="assets/covers/' + b.spine + '-spine.webp" alt="" decoding="async">';
    return '<span class="sp"' + (b.rtl ? ' lang="he"' : '') + '><b>' + esc(b.title) + '</b><i>' + (num || b.vol || '') + '</i></span>';
  }
  function boxHTML(b, num) {
    return '<span class="box"><span class="f front">' + coverHTML(b) + '</span><span class="f back"></span>' +
      '<span class="f spine">' + spineHTML(b, num) + '</span><span class="f pages"></span><span class="f top"></span></span>';
  }
  function kicker(b) { return b.vol ? 'Занимательный иврит · часть ' + b.vol : (b.isNew ? 'Новая книга' : SERIES[b.series]); }

  /* ---------- the shelf ---------- */
  var ORDER = ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z8', 'isr', 'razg', 'prig', 'debut', 'shp', 'nhd', 'heb'];
  var shelf = $('#shelf');
  if (shelf) {
    shelf.innerHTML = ORDER.map(function (id, i) {
      var b = byId[id]; if (!b) return '';
      return '<div class="bk' + (b.wide ? ' wide' : '') + '" role="listitem" style="--tone:' + b.tone + ';--i:' + i + '">' +
        '<a class="bk-btn" href="#books" data-book="' + b.id + '" aria-label="' + esc((b.ru || b.title) + ', открыть книгу') + '">' + boxHTML(b, i + 1) + '</a></div>';
    }).join('');

    /* The shelf is a slow conveyor (after Keren's reference): one book faces you in the middle,
       the row slides sideways, the cover turns back into a spine as the next book turns to face you.
       Books are a little untidy, like a real shelf: heights and thicknesses vary, a few lean. */
    var bks = $$('.bk', shelf), n = bks.length, sel = 0, G = 7, timer = 0, paused = false;
    // per-book character (stable, hand-picked so it looks natural, not random each load)
    var HF = [1, .97, 1, .95, .99, .96, 1, .98, .93, 1, .98, 1, .95, .97, .99];   // height factor
    var DF = [1.05, .9, 1, 1.1, .95, 1, 1.15, .9, 1, 1, 1.1, .95, 1.05, .85, 1];   // thickness factor
    var LEAN = { 3: -5, 7: 4, 12: -6 };                                               // degrees, books that lean
    function dims() {
      var w = shelf.clientWidth, phone = innerWidth <= 700;
      var H = phone ? Math.min(300, innerHeight * .48) : Math.min((w - 14 * G) / 2.6, innerHeight * .5);
      return bks.map(function (bk, j) {
        var wide = bk.classList.contains('wide');
        var h = wide ? H * .49 : H * HF[j % HF.length];
        var sw = SPINE_W[(byId[ORDER[j]] || {}).spine];
        var d = sw ? h * sw / 1800 : wide ? H * .055 : h * .11 * DF[j % DF.length]; // a real spine sets the real thickness
        return { h: h, d: d, w: wide ? h * 1.55 : h * .705, lean: LEAN[j] || 0 };
      });
    }
    function layout(instant) {
      // the order never changes: books stand 1 → 15 from left to right, the open one takes its cover width
      var D = dims(), W = shelf.clientWidth, pos = new Array(n);
      var rel = function (j) { return j - sel; };
      var slotW = function (j) { var s = D[j]; return j === sel ? s.w : s.d + (s.lean ? Math.abs(Math.sin(s.lean * Math.PI / 180)) * s.h * .9 : 0); };
      var x = 0;
      for (var j = 0; j < n; j++) { pos[j] = x + slotW(j) / 2; x += slotW(j) + G; }
      var total = x - G;
      // the row is centred; if it is wider than the shelf (phones) it slides to keep the open book in view
      var off = total <= W ? (W - total) / 2 : sel < 0 ? 12 : Math.min(0, Math.max(W - total, W / 2 - pos[sel]));
      for (j = 0; j < n; j++) pos[j] += off;
      // how far a finger may slide the row: until its first or last spine reaches the shelf edge
      var rowL = pos[0] - slotW(0) / 2, rowR = pos[n - 1] + slotW(n - 1) / 2;
      panMin = Math.min(0, W - 12 - rowR); panMax = Math.max(0, 12 - rowL);
      shelf.style.setProperty('--shelf-h', Math.max.apply(null, D.map(function (s) { return s.h; })) + 'px');
      bks.forEach(function (bk, j) {
        var s = D[j], r = rel(j), prev = parseFloat(bk.dataset.x || 'NaN'), nx = pos[j] - (r === 0 ? s.w : s.d) / 2;
                var wrap = false; // order is fixed, nothing wraps around
        bk.classList.toggle('jump', !!(instant || wrap));
        // each book is placed by its centre only (zero-width anchor), so the motion is one clean path;
        // the hit zone (--slot) updates instantly and never affects what you see
        var st = bk.style;
        st.setProperty('--h', s.h + 'px'); st.setProperty('--d', s.d + 'px'); st.setProperty('--w', s.w + 'px');
        st.setProperty('--lean', (r === 0 ? 0 : s.lean) + 'deg');
        st.setProperty('--slot', (r === 0 ? s.w : s.d) + 'px');
        st.width = '0px'; bk.dataset.px = pos[j]; st.transform = 'translateX(' + (pos[j] + pan).toFixed(1) + 'px)';
        bk.dataset.x = nx; bk.classList.toggle('open', r === 0);
        var a = $('.bk-btn', bk); a.tabIndex = r === 0 ? 0 : -1;
        if (wrap) { void bk.offsetWidth; bk.classList.remove('jump'); }
      });
    }
    var cap = $('#shelf-cap');
    function caption() {
      if (!cap) return; var b = byId[ORDER[sel]];
      cap.classList.add('swap');
      setTimeout(function () {
        // phones start with every book closed: the caption invites a tap instead of naming a book
        if (!b) { $('.sc-title', cap).textContent = 'Все книги на одной полке'; $('.sc-meta', cap).textContent = 'Нажмите на корешок, чтобы открыть книгу'; $('.sc-count', cap).textContent = n + ' книг'; $$('.sc-dots button', cap).forEach(function (d) { d.classList.remove('on'); }); cap.classList.remove('swap'); return; }
        $('.sc-title', cap).textContent = b.ru || b.title;
        $('.sc-meta', cap).textContent = b.vol ? 'Занимательный иврит · часть ' + b.vol : (b.isNew ? 'Новая книга' : SERIES[b.series]);
        $('.sc-count', cap).textContent = (sel + 1) + ' из ' + n;
        cap.style.setProperty('--tone', b.tone);
        $$('.sc-dots button', cap).forEach(function (d, k) { d.classList.toggle('on', k === sel); d.setAttribute('aria-current', k === sel ? 'true' : 'false'); });
        cap.classList.remove('swap');
      }, 260);
    }
    var stopped = false, browsing = false, pan = 0, panMin = 0, panMax = 0;
    // the books slide inside the shelf (the shelf itself clips, so it must stay put)
    function setPan(v) {
      pan = Math.min(panMax, Math.max(panMin, v));
      bks.forEach(function (bk) { if (bk.dataset.px) bk.style.transform = 'translateX(' + (+bk.dataset.px + pan).toFixed(1) + 'px)'; });
    }
    function go(j, user) { sel = (j + n) % n; browsing = false; setPan(0); layout(false); caption(); if (user && !stopped) play(); }
    function tick() { if (!paused && !browsing && !document.hidden) go(sel + 1); }
    function play() { clearInterval(timer); if (!reduce && !stopped && !isPhone()) timer = setInterval(tick, 5500); }
    var dots = cap && $('.sc-dots', cap);
    if (dots) {
      dots.innerHTML = ORDER.map(function (id, k) { return '<button type="button" aria-label="' + esc((byId[id].ru || byId[id].title)) + '"></button>'; }).join('');
      $$('button', dots).forEach(function (d, k) { d.addEventListener('click', function () { go(k, true); }); });
    }
    // on a phone the shelf is for browsing: no book is open and nothing moves until you tap a spine
    function isPhone() { return innerWidth <= 700; }
    if (isPhone()) sel = -1;
    layout(true); caption(); requestAnimationFrame(function () { bks.forEach(function (bk) { bk.classList.remove('jump'); }); });
    addEventListener('resize', function () { if (sel < 0 && !isPhone()) { sel = 0; caption(); } layout(true); });
    // a spine brings its book to the middle; the book in the middle opens
    shelf.addEventListener('click', function (e) {
      if (Math.abs(dx) > 8) { e.preventDefault(); e.stopPropagation(); dx = 0; return; } // that was a drag, not a tap
      var bk = e.target.closest('.bk'); if (!bk) return;
      var j = bks.indexOf(bk); if (j !== sel) { e.preventDefault(); e.stopPropagation(); go(j, true); }
    }, true);
    shelf.addEventListener('pointerenter', function () { paused = true; });
    shelf.addEventListener('pointerleave', function () { paused = false; play(); }); // a full pause after you leave
    shelf.addEventListener('focusin', function () { paused = true; });
    shelf.addEventListener('focusout', function () { paused = false; play(); });
    // drag on touch: the row slides under the finger and stays where it is left, so you can read the spines;
    // nothing opens and the conveyor waits; a tap on a spine turns that book to face you
    // (the shelf has touch-action: pan-y, so a sideways drag is ours and a vertical one still scrolls the page)
    var sx = null, sy = 0, dx = 0, dragging = false, pan0 = 0;
    shelf.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      sx = e.clientX; sy = e.clientY; dx = 0; dragging = false; paused = true; pan0 = pan;
    });
    shelf.addEventListener('pointermove', function (e) {
      if (sx == null) return;
      dx = e.clientX - sx;
      if (!dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - sy)) {
        dragging = true; browsing = true; clearInterval(timer); shelf.classList.add('dragging'); try { shelf.setPointerCapture(e.pointerId); } catch (er) {}
        // an open book turns back into its spine, and the row stays where it is under the finger
        if (sel >= 0 && isPhone()) {
          var was = bks[sel], x0 = +was.dataset.px;
          sel = -1; shelf.classList.remove('dragging'); layout(false); caption(); shelf.classList.add('dragging');
          pan0 += x0 - +was.dataset.px;
        }
      }
      if (dragging) setPan(pan0 + dx);
    });
    function endDrag() {
      if (sx == null) return;
      sx = null; paused = false;
      if (!dragging) return;
      dragging = false; shelf.classList.remove('dragging');
    }
    shelf.addEventListener('pointerup', endDrag);
    shelf.addEventListener('pointercancel', endDrag);
    // controls (also the WCAG pause for moving content)
    var ctr = $('#shelf-ctrl');
    if (ctr) {
      $('[data-prev]', ctr).addEventListener('click', function () { go(sel - 1, true); });
      $('[data-next]', ctr).addEventListener('click', function () { go(sel + 1, true); });
      var pp = $('[data-pause]');
      pp.addEventListener('click', function () {
        var stop = pp.getAttribute('aria-pressed') !== 'true'; pp.setAttribute('aria-pressed', String(stop));
        pp.setAttribute('aria-label', stop ? 'Продолжить' : 'Пауза'); pp.firstChild.textContent = stop ? '▶' : '❚❚';
        stopped = stop; if (stop) clearInterval(timer); else play();
      });
      if (reduce) { stopped = true; pp.setAttribute('aria-pressed', 'true'); pp.setAttribute('aria-label', 'Продолжить'); pp.firstChild.textContent = '▶'; }
    }
    // run only while the shelf is on screen
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !stopped) play(); else clearInterval(timer);
    }).observe(shelf);
    else play();
  }

  /* ---------- catalog ---------- */
  var grid = $('#grid');
  var ICON_BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zm0 0v13"/></svg>';
  var ICON_PDF = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M10.5 18.5h3"/></svg>';
  var ICON_CART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2.2l2.3 11h10.2l2-8H6.4"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="16.5" cy="19.5" r="1.3"/></svg>';
  var ICON_HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></svg>';
  var ICON_GLASSES = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="14" r="3.5"/><circle cx="17.5" cy="14" r="3.5"/><path d="M10 14c1.2-1 2.8-1 4 0M3 14 4.5 7.5M21 14l-1.5-6.5"/></svg>';
  var SERIES_TAG = { hebrew: 'Иврит', detective: 'Детективы', other: 'Израиль' };
  var fav = []; try { fav = JSON.parse(localStorage.getItem('ymm-fav') || '[]'); } catch (e) {}
  if (grid) {
    var list = BOOKS.slice().sort(function (a, b) {
      var o = { other: 0, hebrew: 1, detective: 2 };
      if (a.isNew) return -1; if (b.isNew) return 1;
      return (o[a.series] - o[b.series]) || ((a.vol || 0) - (b.vol || 0));
    });
    grid.innerHTML = list.map(function (b) {
      // cover and title open the book; the two price buttons put it straight into the cart
      var meta = b.vol ? 'Часть ' + b.vol : (b.isNew ? 'Новинка' : b.series === 'detective' ? 'Детектив' : b.rtl ? 'На иврите' : b.wide ? 'Разговорник' : 'Книга');
      return '<article class="card r' + (b.wide ? ' wide' : '') + (fav.indexOf(b.id) > -1 ? ' faved' : '') + '" data-id="' + b.id + '" data-series="' + b.series + '" style="--tone:' + b.tone + '">' +
        '<div class="card-stage">' +
        '<a class="card-cv" href="' + bookHref(b.id) + '" aria-label="' + esc((b.ru || b.title) + ', подробнее') + '">' +
          '<span class="cvi">' + coverHTML(b, true) +
            '<span class="cvb" aria-hidden="true"><b>' + esc(b.title) + '</b><span>' + esc(b.text[0]) + '</span><i>Юрий Моор-Мурадов</i></span>' +
          '</span></a>' +
        '<div class="card-acts">' +
          '<button type="button" data-fav="' + b.id + '" aria-pressed="' + (fav.indexOf(b.id) > -1) + '" aria-label="В избранное: ' + esc(b.title) + '">' + ICON_HEART + '<em>В избранное</em></button>' +
          '<button type="button" data-flip aria-pressed="false" aria-label="Обратная сторона обложки">' + ICON_GLASSES + '<em>Оборот книги</em></button>' +
        '</div></div>' +
        '<h3 class="card-t"' + (b.rtl ? ' dir="rtl" lang="he"' : '') + '><a href="' + bookHref(b.id) + '">' + esc(b.title) + '</a></h3>' +
        '<p class="card-tags"><span class="tag">' + esc(b.rtl ? 'На иврите' : b.wide ? 'Разговорник' : (SERIES_TAG[b.series] || 'Книга')) + '</span>' + (b.vol || b.isNew ? '<span class="tag soft">' + esc(meta) + '</span>' : '') + '</p>' +
        '<div class="card-foot"><span class="card-pr"><b>' + SHOP.PRICE + ' ₪</b>' + (b.pdf ? '<small>Цифровая копия ' + SHOP.PDF_PRICE + ' ₪</small>' : '') + '</span><button type="button" class="card-buy-btn" data-qb="' + b.id + '" aria-label="Купить: ' + esc(b.title) + '">' + ICON_CART + '</button></div>' +
        '</article>';
    }).join('');
  }
  function filter(f) {
    $$('.tabs [role=tab]').forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.f === f)); });
    $$('.card', grid).forEach(function (c) { c.hidden = !(f === 'all' || c.dataset.series === f || (f === 'fav' && fav.indexOf(c.dataset.id) > -1)); });
  }

  /* ---------- card actions: quick buy, favourites, back of the book ---------- */
  var favTab = $('.tabs [data-f=fav]');
  function favUI() {
    if (favTab) { favTab.hidden = !fav.length; favTab.querySelector('b').textContent = fav.length; }
    $$('[data-fav-count]').forEach(function (b) { b.textContent = fav.length; b.hidden = !fav.length; });
    $$('[data-fav-open]').forEach(function (b) { b.classList.toggle('on', fav.length > 0); });
  }
  $$('[data-fav-open]').forEach(function (b) { b.addEventListener('click', function () {
    if (!fav.length) { toast('Нажмите ♥ на обложке, чтобы отложить книгу'); return; }
    // inner pages have no catalog: go to the home page catalog with the favourites shown
    if (!grid) { location.href = './?fav=1#books'; return; }
    filter('fav'); var s = $('#books'); if (s) s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }); });
  favUI();
  if (grid && fav.length && /[?&]fav=1/.test(location.search)) filter('fav');
  var qb = null, qbCard = null, qbDim = document.createElement('div'); qbDim.className = 'qb-dim'; document.body.appendChild(qbDim);
  function qbClose() {
    if (!qb) return; var card = qbCard, el = qb; qb = null;
    card.classList.remove('qb-on'); el.classList.remove('on'); qbDim.classList.remove('on');
    setTimeout(function () { el.remove(); }, 260); var t = $('[data-qb]', card); if (t) t.focus({ preventScroll: true });
  }
  function qbOpen(card, b) {
    qbClose();
    var pdfPrice = SHOP.PDF_PRICE ? SHOP.PDF_PRICE + ' ₪' : '<i class="ph">[[цена]]</i>';
    var el = document.createElement('div'); el.className = 'qb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Купить: ' + b.title);
    el.innerHTML = '<button type="button" class="qb-x" data-qb-close aria-label="Закрыть">×</button>' +
      '<h4' + (b.rtl ? ' dir="rtl" lang="he"' : '') + '>' + esc(b.title) + '</h4>' +
      '<p class="qb-by">Юрий Моор-Мурадов</p>' +
      (b.pages ? '<button type="button" class="qb-link" data-read="' + b.id + '">Читать отрывок</button>' : '') +
      '<div class="qb-fmts' + (b.pdf ? '' : ' one') + '">' +
        '<div class="qb-f main"><span>' + ICON_BOOK + 'Печатная книга</span><b>' + SHOP.PRICE + ' ₪</b><small>+ доставка</small>' +
          '<button type="button" class="qb-add" data-add="' + b.id + '|print">' + ICON_CART + 'В корзину</button></div>' +
        (b.pdf ? '<div class="qb-f"><span>' + ICON_PDF + 'Цифровая копия</span><b>' + pdfPrice + '</b><small>на e-mail</small>' +
          '<button type="button" class="qb-add" data-add="' + b.id + '|pdf">' + ICON_CART + 'В корзину</button></div>' : '') +
      '</div>' +
      '<a class="qb-more" href="' + bookHref(b.id) + '">Подробнее о книге</a>';
    // one centred window (a bottom sheet on phones)
    var sheet = true; if (sheet) el.classList.add('sheet');
    (sheet ? document.body : $('.card-stage', card)).appendChild(el); qb = el; qbCard = card; card.classList.add('qb-on'); qbDim.classList.add('on');
    requestAnimationFrame(function () { el.classList.add('on'); $('.qb-add', el).focus({ preventScroll: true }); });
  }
  if (grid) document.addEventListener('click', function (e) {
    var q = e.target.closest('[data-qb]'), f = e.target.closest('[data-fav]'), fl = e.target.closest('[data-flip]'), card = e.target.closest('.card');
    if (q) { qbOpen(card, byId[q.dataset.qb]); return; }
    if (e.target.closest('[data-qb-close]')) { qbClose(); return; }
    if (f) {
      var id = f.dataset.fav, k = fav.indexOf(id), on = k < 0;
      if (on) fav.push(id); else fav.splice(k, 1);
      try { localStorage.setItem('ymm-fav', JSON.stringify(fav)); } catch (e2) {}
      f.setAttribute('aria-pressed', String(on)); card.classList.toggle('faved', on); favUI();
      toast(on ? 'Добавлено в избранное ♥' : 'Убрано из избранного');
      if (!on && favTab && favTab.getAttribute('aria-selected') === 'true') filter(fav.length ? 'fav' : 'all');
      return;
    }
    if (fl) { var flipped = card.classList.toggle('flip'); fl.setAttribute('aria-pressed', String(flipped)); return; }
    var rd = e.target.closest('[data-read]');
    if (rd) { cur = byId[rd.dataset.read]; qbClose(); rp = 0; drawSpread(); reader.showModal(); }
  });
  grid && grid.addEventListener('mouseleave', function (e) { $$('.card.flip', grid).forEach(function (c) { c.classList.remove('flip'); $('[data-flip]', c).setAttribute('aria-pressed', 'false'); }); });
  qbDim.addEventListener('click', qbClose);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && qb) qbClose(); });
  document.addEventListener('click', function (e) { if (qb && e.target.closest('[data-book]') && qb.contains(e.target)) qbClose(); });
  $$('.tabs [role=tab]').forEach(function (t) { t.addEventListener('click', function () { filter(t.dataset.f); }); });
  $$('[data-filter]').forEach(function (a) { a.addEventListener('click', function () { filter(a.dataset.filter); }); });

  /* detective stack */
  var det = $('#det-books');
  if (det) det.innerHTML = ['debut', 'prig', 'shp', 'heb'].map(function (id) {
    var b = byId[id]; return '<a class="dbk" href="#books" data-book="' + id + '" style="--tone:' + b.tone + '" aria-label="' + esc(b.ru || b.title) + '">' + coverHTML(b, true) + '</a>';
  }).join('');

  /* ---------- book dialog ---------- */
  var dlg = $('#bookdlg'), cur = null;
  function openBook(id) {
    var b = byId[id]; if (!b || !dlg || !dlg.showModal) return;
    cur = b;
    var box = $('#bd-3d'); box.className = 'bd-3d' + (b.wide ? ' wide' : ''); box.style.setProperty('--tone', b.tone); box.innerHTML = boxHTML(b);
    $('#bd-series').textContent = kicker(b);
    var t = $('#bd-title'); t.textContent = b.title;
    if (b.rtl) { t.setAttribute('dir', 'rtl'); t.setAttribute('lang', 'he'); } else { t.removeAttribute('dir'); t.removeAttribute('lang'); }
    $('#bd-sub').textContent = b.ru ? b.ru + (b.sub ? ' · ' + b.sub : '') : (b.or ? 'или ' + b.or : (b.sub || ''));
    $('#bd-text').innerHTML = b.text.map(function (p) { return '<p>' + esc(p).replace(/\[\[(.+?)\]\]/g, '<span class="ph">[[$1]]</span>') + '</p>'; }).join('');
    var pdf = $('input[name=fmt][value=pdf]', dlg); pdf.disabled = !b.pdf;
    $('input[name=fmt][value=print]', dlg).checked = true;
    $('#bd-pdfprice').innerHTML = b.pdf ? (SHOP.PDF_PRICE ? SHOP.PDF_PRICE + ' ₪, на e-mail' : '<span class="ph">[[цена]]</span>') : 'скоро';
    var rd = $('#bd-read'); rd.hidden = !b.pages;
    $('#bd-wa').href = 'https://wa.me/' + SHOP.PHONE + '?text=' + encodeURIComponent('Здравствуйте! Вопрос о книге «' + (b.ru || b.title) + '»: ');
    dlg.showModal();
    document.documentElement.classList.add('lock');
  }
  if (dlg) {
    dlg.addEventListener('close', function () { document.documentElement.classList.remove('lock'); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }
  $$('[data-close]').forEach(function (x) { x.addEventListener('click', function () { x.closest('dialog').close(); }); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-book]');
    if (a) { e.preventDefault(); openBook(a.dataset.book); }
  });

  /* ---------- excerpt reader ---------- */
  var reader = $('#reader'), rp = 0;
  function spreadSize() { return innerWidth > 700 ? 2 : 1; }
  function drawSpread() {
    var n = cur.pages, s = spreadSize(), html = '';
    for (var k = rp; k < Math.min(rp + s, n); k++) html += '<img src="assets/pages/' + cur.id + '-' + (k + 1) + '.webp" alt="Страница ' + (k + 1) + ' отрывка">';
    $('#spread').innerHTML = html;
    $('#rd-pos').textContent = (rp + 1) + (s > 1 && rp + 1 < n ? '-' + Math.min(rp + s, n) : '') + ' из ' + n;
    $('#rd-prev').disabled = rp === 0; $('#rd-next').disabled = rp + s >= n;
  }
  // inner pages (book.html) open the excerpt reader through this
  window.YM = { read: function (id) { cur = byId[id]; if (!cur || !cur.pages) return; rp = 0; drawSpread(); reader.showModal(); } };
  var rdBtn = $('#bd-read');
  if (rdBtn) rdBtn.addEventListener('click', function () { if (!cur || !cur.pages) return; rp = 0; drawSpread(); reader.showModal(); });
  if (reader) {
    $('#rd-prev').addEventListener('click', function () { rp = Math.max(0, rp - spreadSize()); drawSpread(); });
    $('#rd-next').addEventListener('click', function () { rp += spreadSize(); drawSpread(); });
    reader.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') $('#rd-next').click(); if (e.key === 'ArrowLeft') $('#rd-prev').click(); });
    reader.addEventListener('click', function (e) { if (e.target === reader) reader.close(); });
  }

  /* ---------- cart ---------- */
  var KEY = 'ymm-cart', cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { cart = []; }
  // whatever was stored, keep only known books, a known format and a sane quantity
  cart = (Array.isArray(cart) ? cart : []).filter(function (c) { return c && byId[c.id]; })
    .map(function (c) { return { id: c.id, fmt: c.fmt === 'pdf' ? 'pdf' : 'print', q: Math.max(1, Math.min(50, parseInt(c.q, 10) || 1)) }; });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  function priceOf(c) { return c.fmt === 'pdf' ? SHOP.PDF_PRICE : SHOP.PRICE; }
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('on'); }, 1800); }
  function renderCart() {
    var n = cart.reduce(function (s, c) { return s + c.q; }, 0);
    $$('[data-cart-count]').forEach(function (b) { b.textContent = n; b.hidden = !n; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); });
    var ul = $('#cart-list'); if (!ul) return;
    ul.innerHTML = cart.map(function (c, k) {
      var b = byId[c.id], p = priceOf(c);
      return '<li class="ci" style="--tone:' + b.tone + '"><div class="th">' + coverHTML(b, true) + '</div><div><b>' + esc(b.ru || b.title) + '</b><small>' +
        (c.fmt === 'pdf' ? 'Цифровая копия' : 'Печатная') + ' · ' + (p ? p * c.q + ' ₪' : '[[цена]]') + '</small></div>' +
        '<div class="qty"><button type="button" data-q="-1" data-k="' + k + '" aria-label="Меньше">−</button><span>' + c.q + '</span><button type="button" data-q="1" data-k="' + k + '" aria-label="Больше">+</button></div></li>';
    }).join('');
    $('#cart-empty').hidden = !!cart.length; $('#cart-foot').hidden = !cart.length;
    var sum = 0, unknown = false, hasPrint = false, hasPdf = false;
    cart.forEach(function (c) { var p = priceOf(c); if (p) sum += p * c.q; else unknown = true; if (c.fmt === 'pdf') hasPdf = true; else hasPrint = true; });
    $('#cart-sum').textContent = sum + ' ₪' + (unknown ? ' + цифровая копия' : '');
    $('#cart-note').textContent = (hasPrint ? 'К печатным книгам добавляются почтовые расходы, или заберите книгу сами в Беэр-Якове. ' : '') +
      (hasPdf ? 'Цифровая копия придёт на e-mail после оплаты. После отправки файла отменить покупку цифровой копии нельзя, до отправки можно бесплатно.' : '');
    // the address is asked only for printed books, the e-mail only for a digital copy
    $$('#checkout [data-need]').forEach(function (l) {
      var on = l.dataset.need === 'email' ? hasPdf : hasPrint; l.hidden = !on; $$('input', l).forEach(function (i) { i.required = on; });
    });
    coCheck();
  }
  function add(id, fmt) {
    var c = cart.filter(function (x) { return x.id === id && x.fmt === fmt; })[0];
    if (c) c.q++; else cart.push({ id: id, fmt: fmt, q: 1 });
    var th = $('#cart-thanks'); if (th) th.hidden = true;
    save(); renderCart(); toast('Добавлено в корзину ✓');
  }
  // price buttons on the catalog cards
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add]'); if (!btn) return;
    var p = btn.dataset.add.split('|'); add(p[0], p[1]);
    btn.classList.add('done'); setTimeout(function () { btn.classList.remove('done'); }, 1400);
  });
  var addBtn = $('#bd-add');
  if (addBtn) addBtn.addEventListener('click', function () {
    var fmt = $('input[name=fmt]:checked', dlg).value; add(cur.id, fmt);
    addBtn.textContent = 'В корзине ✓'; setTimeout(function () { addBtn.textContent = 'В корзину'; }, 1500);
  });
  var cartEl = $('#cart'), scrim = $('#scrim'), lastFocus = null;
  function openCart() {
    lastFocus = document.activeElement; cartEl.hidden = false; scrim.hidden = false;
    requestAnimationFrame(function () { cartEl.classList.add('open'); $('.x', cartEl).focus(); });
    document.documentElement.classList.add('lock');
  }
  function closeCart() {
    cartEl.classList.remove('open'); scrim.hidden = true; document.documentElement.classList.remove('lock');
    setTimeout(function () { cartEl.hidden = true; }, reduce ? 0 : 450); if (lastFocus) lastFocus.focus();
  }
  $$('[data-cart-open]').forEach(function (b) { b.addEventListener('click', function () { if (dlg && dlg.open) dlg.close(); openCart(); }); });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-cart-close]')) closeCart(); });
  if (scrim) scrim.addEventListener('click', closeCart);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cartEl && !cartEl.hidden) closeCart(); });
  if (cartEl) cartEl.addEventListener('click', function (e) {
    var q = e.target.closest('[data-q]'); if (!q) return;
    var c = cart[+q.dataset.k]; c.q += +q.dataset.q; if (c.q < 1) cart.splice(+q.dataset.k, 1); save(); renderCart();
  });
  var co = $('#checkout');
  // the button stays dimmed until every required field is filled in
  var coBtn = co && $('button[type=submit]', co), coErr = $('#cart-err');
  function coCheck() { if (coBtn) coBtn.classList.toggle('off', !co.checkValidity()); }
  if (co) { co.addEventListener('input', coCheck); new MutationObserver(coCheck).observe(co, { attributes: true, subtree: true, attributeFilter: ['hidden'] }); coCheck(); }
  // Cloudflare Turnstile (bot check) runs only once its site key is set in SHOP
  if (co && SHOP.TURNSTILE_SITEKEY) {
    var ts = document.createElement('div'); ts.className = 'cf-turnstile'; ts.dataset.sitekey = SHOP.TURNSTILE_SITEKEY; ts.dataset.language = 'ru'; ts.dataset.theme = 'light';
    coBtn.parentNode.insertBefore(ts, coBtn);
    var tsj = document.createElement('script'); tsj.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; tsj.async = true; tsj.defer = true; document.head.appendChild(tsj);
  }
  var FIELD_RU = { name: 'имя и фамилия', phone: 'телефон', email: 'e-mail', street: 'улица', house: 'дом', apt: 'квартира', city: 'город', zip: 'индекс', items: 'корзина', turnstile: 'проверка «я не робот»' };
  if (co) co.addEventListener('submit', function (e) {
    e.preventDefault();
    if (coBtn.classList.contains('busy')) return; // one order per click, even with a double Enter
    coErr.hidden = true; $$('[aria-invalid]', co).forEach(function (i) { i.removeAttribute('aria-invalid'); });
    if (!co.checkValidity()) { co.reportValidity(); return; }
    var d = new FormData(co), total = 0, hasPrint = false;
    var lines = cart.map(function (c) {
      var b = byId[c.id], p = priceOf(c) * c.q; total += p; if (c.fmt !== 'pdf') hasPrint = true;
      return '• ' + (b.ru || b.title) + ' (' + (c.fmt === 'pdf' ? 'цифровая копия' : 'печатная') + ') × ' + c.q + ' = ' + p + ' ₪';
    });
    var addr = hasPrint ? d.get('street') + ' ' + d.get('house') + ', кв. ' + d.get('apt') + ', ' + d.get('city') + ', ' + d.get('zip') : '';
    var msg = 'Новый заказ с сайта:\n' + lines.join('\n') + '\nИтого: ' + total + ' ₪' + (hasPrint ? ' + доставка' : '') +
      '\n\nИмя: ' + d.get('name') + '\nТелефон: ' + d.get('phone') +
      (addr ? '\nАдрес: ' + addr : '') + (d.get('email') ? '\nE-mail: ' + d.get('email') : '');
    var fail = function (fields) {
      coBtn.classList.remove('busy');
      if (fields && fields.length) { // the server named what is wrong: say it and mark those fields
        fields.forEach(function (k) { var i = co.querySelector('[name="' + k + '"]'); if (i) i.setAttribute('aria-invalid', 'true'); });
        coErr.textContent = 'Проверьте, пожалуйста: ' + fields.map(function (k) { return FIELD_RU[k] || k; }).join(', ') + '.';
        var first = co.querySelector('[aria-invalid="true"]'); if (first) first.focus();
      } else {
        coErr.innerHTML = 'Не удалось отправить заказ. Попробуйте ещё раз через минуту или напишите нам в <a href="https://wa.me/' + SHOP.PHONE + '" target="_blank" rel="noopener">WhatsApp</a>.';
      }
      coErr.hidden = false;
      if (window.turnstile) try { turnstile.reset(); } catch (er) {}
    };
    var done = function () {
      coBtn.classList.remove('busy'); co.reset();
      cart = []; save(); renderCart();
      $('#cart-thanks').hidden = false; $('#cart-empty').hidden = true;
    };
    // Web3Forms: the backup route, used only where the site runs without its own server (GitHub Pages)
    var viaForms = function () {
      if (!SHOP.ORDER_EMAIL_KEY) return fail();
      fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: SHOP.ORDER_EMAIL_KEY, subject: 'Заказ книг: ' + d.get('name') + ', ' + total + ' ₪', from_name: 'Сайт Юрия Моор-Мурадова',
          name: d.get('name'), phone: d.get('phone'), email: d.get('email') || undefined, message: msg })
      }).then(function (r) { return r.json(); }).then(function (j) { if (!j.success) throw new Error(j.message); done(); }).catch(fail);
    };
    if (d.get('website')) return done(); // spam trap
    // the order goes to /api/order (Cloudflare + Resend): to the seller, plus a confirmation for a digital copy.
    // Only book ids travel; the server takes titles and prices from its own catalog.
    coBtn.classList.add('busy');
    var order = { items: cart.map(function (c) { return { id: c.id, fmt: c.fmt, q: c.q }; }), turnstile: d.get('cf-turnstile-response') || '' };
    ['name', 'phone', 'email', 'street', 'house', 'apt', 'city', 'zip', 'website'].forEach(function (k) { order[k] = d.get(k) || ''; });
    fetch('api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) })
      .then(function (r) {
        if (r.ok) return done();
        if (r.status === 422) return r.json().then(function (j) { fail(j.fields); }, function () { fail(); });
        if (r.status === 429 || r.status === 403) return fail(); // too many tries or a failed bot check: no backup route
        viaForms(); // no server function here (404/405), Resend not set up yet (503) or down (502)
      }, viaForms);
  });
  renderCart();
  $$('[data-cart-count]').forEach(function (b) { b.classList.remove('pop'); });



  /* ---------- ticker pause ---------- */
  var tp = $('.ticker-pause');
  if (tp) tp.addEventListener('click', function () {
    var t = tp.closest('.ticker'), p = t.classList.toggle('paused'); tp.setAttribute('aria-pressed', String(p));
    tp.textContent = p ? '▶' : 'II'; tp.setAttribute('aria-label', p ? 'Запустить бегущую строку' : 'Остановить бегущую строку');
  });
  if (reduce && tp) tp.click();

  /* ---------- header, drawer, mobile bar ---------- */
  var hdr = $('#hdr'), mbar = $('.mbar'), hero = $('.hero');
  function onScroll() {
    var y = scrollY; hdr.classList.toggle('solid', y > 40);
    if (mbar && hero) mbar.classList.toggle('on', y > hero.offsetHeight * .6);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var burger = $('.burger'), drawer = $('#drawer');
  function menu(open) {
    burger.setAttribute('aria-expanded', String(open)); drawer.hidden = !open; document.documentElement.classList.toggle('lock', open);
    hdr.classList.toggle('solid', open || scrollY > 40);
    if (open) { var first = $('a', drawer); if (first) first.focus(); } else if (document.activeElement && drawer.contains(document.activeElement)) burger.focus();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer && !drawer.hidden) menu(false); });
  if (burger) burger.addEventListener('click', function () { menu(burger.getAttribute('aria-expanded') !== 'true'); });
  if (drawer) drawer.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });

  /* ---------- reveals ---------- */
  var rv = $$('.r, .shelf, .hero');
  if ('IntersectionObserver' in window && !document.documentElement.classList.contains('static')) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        var sib = x.target.parentElement ? $$(':scope > .r', x.target.parentElement) : [];
        var d = Math.max(0, sib.indexOf(x.target)) * 80;
        setTimeout(function () { x.target.classList.add('in'); }, Math.min(d, 400));
        io.unobserve(x.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });
  /* ---------- about: «Подробнее об авторе» ---------- */
  var abBtn = $('.about-toggle'), abMore = $('#about-more');
  if (abBtn && abMore) abBtn.addEventListener('click', function () {
    var open = abMore.classList.toggle('open'); abBtn.setAttribute('aria-expanded', String(open));
    abBtn.firstChild.textContent = open ? 'Свернуть ' : 'Подробнее об авторе ';
  });
  /* ---------- contact stickers ---------- */
  var field = $('#c2-field');
  if (field) {
    // still stickers: a click simply follows the link (no dragging, kinder for older readers)
    $$('.stk[data-todo]', field).forEach(function (s) {
      s.addEventListener('click', function (e) { e.preventDefault(); toast('Ссылка на Facebook скоро появится'); });
    });
  }
})();

/* catalog covers keep their real proportions: pass each image's ratio to its card */
(function () {
  var grid = document.getElementById('grid');
  if (!grid) return;
  var fit = function (img) {
    var card = img.closest('.card');
    if (card && img.naturalWidth) card.style.setProperty('--r', (img.naturalWidth / img.naturalHeight).toFixed(4));
  };
  grid.addEventListener('load', function (e) { if (e.target.matches && e.target.matches('.cvi img')) fit(e.target); }, true);
  grid.querySelectorAll('.cvi img').forEach(function (img) { if (img.complete) fit(img); });
})();
