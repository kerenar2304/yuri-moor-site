/* Haim's accessibility widget - one component for every site.
 *
 * Plain JS, no framework, so the same file runs on React, WordPress and plain
 * HTML and every site gets the identical control in the identical corner.
 *
 *   <link rel="stylesheet" href="/a11y-widget.css">
 *   <script src="/a11y-widget.js" defer
 *           data-statement="/accessibility"   the statement page (required)
 *           data-key="mysite:a11y"            localStorage key (optional)
 *           data-side="end"                   end (default) | start
 *           data-lang="he"></script>          he (default) | en
 *
 * Colour comes from CSS variables the site sets (see a11y-widget.css):
 *   --a11y-accent, --a11y-ink, --a11y-accent-panel
 *
 * Seven controls, not sixteen. No built-in screen reader, no "AI fixes": a
 * widget that promises what the page underneath cannot deliver is the failure
 * this product category is known for. Every preference is a class on <html>
 * resolved by real CSS; this file only writes them.
 *
 * The widget is not the site's accessibility. The page has to be right with
 * nobody touching anything - the link at the bottom of the panel says where
 * that is committed to. */
(function () {
  if (window.__a11yWidget) return;
  window.__a11yWidget = true;

  var script = document.currentScript || document.querySelector("script[data-statement]");
  var cfg = (script && script.dataset) || {};
  var KEY = cfg.key || "a11y";
  var STATEMENT = cfg.statement || "/accessibility";
  var RU = cfg.lang === "ru";
  var EN = cfg.lang === "en" || RU; /* Russian reads left to right, like English */

  var T = RU
    ? {
        open: "Меню доступности (Ctrl+U)",
        active: function (n) { return "Меню доступности: включено настроек " + n; },
        title: "Доступность", close: "Закрыть", size: "Размер текста", normal: "Обычный размер текста",
        grow: function (p) { return "Увеличить текст на " + p; }, reset: "Сбросить всё", statement: "Заявление о доступности",
        sw: [
          ["contrast", "Высокий контраст", "Чёрный фон, белый текст, чёткие рамки"],
          ["links", "Выделить ссылки", "Подчёркивание и рамка у каждой ссылки"],
          ["motion", "Остановить движение", "Останавливает анимации, переходы и бегущую строку"],
          ["spacing", "Интервалы в тексте", "Больше места между буквами и строками"],
          ["cursor", "Крупный курсор", "Увеличивает указатель мыши"],
        ],
      }
    : EN
    ? {
        open: "Accessibility menu (Ctrl+U)",
        active: function (n) { return "Accessibility menu - " + n + " settings on"; },
        title: "Accessibility", close: "Close", size: "Text size", normal: "Normal text size",
        grow: function (p) { return "Enlarge text by " + p; }, reset: "Reset all", statement: "Accessibility statement",
        sw: [
          ["contrast", "High contrast", "Black background, white text, clear borders"],
          ["links", "Highlight links", "Underline and outline every link"],
          ["motion", "Stop motion", "Pauses animations, transitions and tickers"],
          ["spacing", "Text spacing", "More room between letters and lines"],
          ["cursor", "Large cursor", "Enlarges the mouse pointer"],
        ],
      }
    : {
        open: "תפריט נגישות (Ctrl+U)",
        active: function (n) { return "תפריט נגישות - " + n + " הגדרות פעילות"; },
        title: "נגישות", close: "סגירה", size: "גודל הטקסט", normal: "גודל טקסט רגיל",
        grow: function (p) { return "הגדלת הטקסט ב-" + p; }, reset: "איפוס הכל", statement: "הצהרת הנגישות",
        sw: [
          ["contrast", "ניגודיות גבוהה", "רקע שחור, טקסט לבן, מסגרות ברורות"],
          ["links", "הדגשת קישורים", "קו תחתון ומסגרת לכל קישור"],
          ["motion", "עצירת תנועה", "עוצר אנימציות, מעברים וטקסט רץ"],
          ["spacing", "ריווח טקסט", "מרווח גדול יותר בין אותיות ושורות"],
          ["cursor", "סמן גדול", "מגדיל את סמן העכבר"],
        ],
      };

  /* WCAG 1.4.4 asks that text can be doubled, so the top step is 200% */
  var ZOOM = [1, 1.25, 1.5, 2];
  var ZLABEL = [RU ? "Обычный" : EN ? "Normal" : "רגיל", "+25%", "+50%", "+100%"];
  var BLANK = { text: 0, contrast: false, links: false, motion: false, spacing: false, cursor: false };

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var p = raw ? JSON.parse(raw) : {};
      var out = {};
      for (var k in BLANK) out[k] = k in p ? p[k] : BLANK[k];
      return out;
    } catch (e) {
      return Object.assign({}, BLANK);
    }
  }
  var prefs = read();
  var open = false;

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var a in attrs || {}) {
      if (a === "text") n.textContent = attrs[a];
      else n.setAttribute(a, attrs[a]);
    }
    (kids || []).forEach(function (k) { n.appendChild(k); });
    return n;
  }

  var root = el("div", { class: "a11y-root" + (cfg.side === "start" ? " is-start" : ""), dir: EN ? "ltr" : "rtl" });

  var btn = el("button", { type: "button", class: "a11y-btn", "aria-expanded": "false", "aria-controls": "a11y-panel" });
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="4.2" r="2.1" fill="currentColor"/>' +
    '<path fill="currentColor" d="M12 7.6c-2.3 0-4.4-.4-6.4-1.2a1.05 1.05 0 1 0-.7 2c1.4.5 2.9.9 4.5 1.1v3.2l-2.1 6.4a1.05 1.05 0 0 0 2 .7L12 14.3l2.7 5.5a1.05 1.05 0 0 0 2-.7l-2.1-6.4V9.5c1.6-.2 3.1-.6 4.5-1.1a1.05 1.05 0 1 0-.7-2c-2 .8-4.1 1.2-6.4 1.2z"/></svg>' +
    '<i class="a11y-btn__dot" aria-hidden="true"></i>';

  /* a paragraph, not a heading: mounted ahead of every page's content, an
     <h2> here would be the first heading in every document */
  var title = el("p", { class: "a11y-panel__title", id: "a11y-panel-title", tabindex: "-1", text: T.title });
  var closeBtn = el("button", { type: "button", class: "a11y-close", text: T.close });
  var head = el("div", { class: "a11y-panel__head" }, [title, closeBtn]);

  var steps = ZOOM.map(function (_, i) {
    return el("button", {
      type: "button",
      class: "a11y-size__step",
      "data-step": String(i),
      "aria-label": i === 0 ? T.normal : T.grow(ZLABEL[i].slice(1)),
      text: ZLABEL[i],
    });
  });
  var size = el("fieldset", { class: "a11y-size" }, [
    el("legend", { text: T.size }),
    el("div", { class: "a11y-size__row" }, steps),
  ]);

  var rows = T.sw.map(function (s) {
    var r = el("button", { type: "button", role: "switch", class: "a11y-row", "data-key": s[0] });
    r.appendChild(el("span", { class: "a11y-row__text" }, [el("b", { text: s[1] }), el("i", { text: s[2] })]));
    r.appendChild(el("span", { class: "a11y-row__switch", "aria-hidden": "true" }));
    return r;
  });
  var list = el("div", { class: "a11y-list" }, rows);

  var reset = el("button", { type: "button", class: "a11y-reset", text: T.reset });
  var link = el("a", { href: STATEMENT, text: T.statement });
  var foot = el("div", { class: "a11y-foot" }, [reset, link]);

  var panel = el("div", { id: "a11y-panel", class: "a11y-panel", role: "dialog", "aria-labelledby": "a11y-panel-title" }, [
    head, size, list, foot,
  ]);
  panel.inert = true;

  root.appendChild(btn);
  root.appendChild(panel);

  function apply() {
    var h = document.documentElement;
    h.classList.toggle("a11y-contrast", !!prefs.contrast);
    h.classList.toggle("a11y-links", !!prefs.links);
    h.classList.toggle("a11y-motion", !!prefs.motion);
    h.classList.toggle("a11y-spacing", !!prefs.spacing);
    h.classList.toggle("a11y-cursor", !!prefs.cursor);
    /* the class gates the rule: without it nothing applies, which is the
       difference between a feature that is off and one that is on at 100% */
    h.classList.toggle("a11y-text", prefs.text > 0);
    h.style.setProperty("--a11y-text", String(ZOOM[prefs.text] || 1));
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch (e) {
      /* private mode - the choices hold for this visit */
    }

    var active = 0;
    for (var k in prefs) if (prefs[k] !== false && prefs[k] !== 0) active++;
    btn.setAttribute("aria-label", active ? T.active(active) : T.open);
    btn.classList.toggle("has-active", active > 0);
    reset.disabled = !active;
    steps.forEach(function (s, i) {
      s.setAttribute("aria-pressed", String(prefs.text === i));
      s.classList.toggle("is-on", prefs.text === i);
    });
    rows.forEach(function (r) {
      var on = !!prefs[r.dataset.key];
      r.setAttribute("aria-checked", String(on));
      r.classList.toggle("is-on", on);
    });
  }

  function setOpen(v, refocus) {
    open = v;
    panel.classList.toggle("is-open", v);
    panel.inert = !v;
    btn.setAttribute("aria-expanded", String(v));
    /* the dialog's name takes the focus, so a screen reader hears it open
       and a keyboard lands on the first control rather than the page */
    if (v) title.focus();
    else if (refocus) btn.focus();
  }

  btn.addEventListener("click", function () { setOpen(!open); });
  closeBtn.addEventListener("click", function () { setOpen(false, true); });
  steps.forEach(function (s, i) {
    s.addEventListener("click", function () { prefs.text = i; apply(); });
  });
  rows.forEach(function (r) {
    r.addEventListener("click", function () { prefs[r.dataset.key] = !prefs[r.dataset.key]; apply(); });
  });
  reset.addEventListener("click", function () { prefs = Object.assign({}, BLANK); apply(); });
  link.addEventListener("click", function () { setOpen(false); });

  /* Ctrl+U: the shortcut readers already learnt from the overlay widgets */
  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key && e.key.toLowerCase() === "u") {
      e.preventDefault();
      setOpen(!open);
      return;
    }
    if (e.key === "Escape" && open) setOpen(false, true);
  });
  window.addEventListener("pointerdown", function (e) {
    if (open && !root.contains(e.target)) setOpen(false);
  });

  function mount() {
    document.body.appendChild(root);
    apply();
  }
  /* the classes go on <html> before the body exists, so a saved preference
     is there on the first paint rather than flashing in afterwards */
  apply();
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
