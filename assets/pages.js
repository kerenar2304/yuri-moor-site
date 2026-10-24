/* Inner pages: book.html?id=… and articles.html. Data comes from books.js (BOOKS, SHOP, WORDS). */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var byId = {}; BOOKS.forEach(function (b) { byId[b.id] = b; });
  var SERIES = { hebrew: 'Занимательный иврит', detective: 'Детективы', other: 'Израиль' };
  var label = function (b) { return b.vol ? 'Занимательный иврит · часть ' + b.vol : b.rtl ? 'Книга на иврите' : b.wide ? 'Разговорник' : b.isNew ? 'Новая книга' : (SERIES[b.series] || 'Книга'); };
  var cover = function (b, cls) {
    return b.cover ? '<img class="' + cls + '" src="assets/covers/' + b.cover + '.webp" alt="Обложка: ' + esc(b.title) + '">'
      : '<span class="' + cls + ' pg-nocover" style="--tone:' + b.tone + '"><b>' + esc(b.title) + '</b><i>Юрий Моор-Мурадов</i></span>';
  };

  /* ---------- book page ---------- */
  var root = $('#book-root');
  if (root) {
    var id = new URLSearchParams(location.search).get('id'), b = byId[id] || BOOKS[0];
    document.title = b.title + ' | Юрий Моор-Мурадов';
    var pdfPrice = SHOP.PDF_PRICE ? SHOP.PDF_PRICE + ' ₪' : '[[цена]]';
    var wa = 'https://wa.me/' + SHOP.PHONE + '?text=' + encodeURIComponent('Здравствуйте, Юрий! Вопрос о книге «' + (b.ru || b.title) + '»: ');
    var same = BOOKS.filter(function (x) { return x.id !== b.id && x.series === b.series; }).slice(0, 6);
    if (same.length < 3) same = same.concat(BOOKS.filter(function (x) { return x.id !== b.id && x.series !== b.series; }).slice(0, 6 - same.length));
    root.innerHTML =
      '<a class="pg-back" href="index.html#books">← Все книги</a>' +
      '<article class="pg-book">' +
        '<div class="pg-cover' + (b.wide ? ' wide' : '') + '">' + cover(b, 'pg-cv') + '</div>' +
        '<div class="pg-info">' +
          '<p class="pg-label">' + esc(label(b)) + '</p>' +
          '<h1' + (b.rtl ? ' dir="rtl" lang="he"' : '') + '>' + esc(b.title) + '</h1>' +
          ((b.ru || b.or || b.sub) ? '<p class="pg-sub">' + esc(b.ru ? b.ru + (b.sub ? ' · ' + b.sub : '') : b.or ? 'или ' + b.or : b.sub) + '</p>' : '') +
          '<div class="pg-text">' + b.text.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
          '<div class="pg-fmts">' +
            '<div class="pg-fmt main"><span>Печатная книга</span><b>' + SHOP.PRICE + ' ₪</b><small>+ доставка почтой</small>' +
              '<button type="button" class="btn solid" data-add="' + b.id + '|print">В корзину <span aria-hidden="true">→</span></button></div>' +
            (b.pdf ? '<div class="pg-fmt"><span>Цифровая копия</span><b>' + pdfPrice + '</b><small>на e-mail после оплаты</small>' +
              '<button type="button" class="btn ghost" data-add="' + b.id + '|pdf">В корзину <span aria-hidden="true">→</span></button></div>' : '') +
          '</div>' +
          '<p class="pg-actions">' + (b.pages ? '<button type="button" class="pg-link" data-read-page>Читать отрывок</button>' : '') +
            '<a class="pg-link" href="' + wa + '" target="_blank" rel="noopener">Вопрос о книге в WhatsApp</a></p>' +
          '<p class="pg-pay">Оплата через Bit или банковским переводом. Заказ оформляется в WhatsApp.</p>' +
        '</div>' +
      '</article>' +
      '<section class="pg-more" aria-labelledby="more-h"><h2 id="more-h">Ещё книги</h2><div class="pg-more-grid">' +
        same.map(function (x) {
          return '<a class="pg-mini" href="book.html?id=' + x.id + '">' + cover(x, 'pg-mini-cv') + '<b' + (x.rtl ? ' dir="rtl" lang="he"' : '') + '>' + esc(x.title) + '</b><span>' + esc(label(x)) + '</span></a>';
        }).join('') + '</div></section>';
    var rd = $('[data-read-page]', root);
    if (rd) rd.addEventListener('click', function () { if (window.YM) YM.read(b.id); });
  }

  /* ---------- articles page ---------- */
  var art = $('#art-root');
  if (art) {
    var PRESS = [
      { o: 'Хайфаинфо', t: 'Все оттенки человеческой глупости', u: 'http://haifainfo.com/?p=29499' },
      { o: 'Хайфаинфо', t: 'Кража на Ассамблее ООН, или Русский язык министра Фуада', u: 'https://haifainfo.com/?p=18656' },
      { o: 'Хайфаинфо', t: 'Виновник Нобелевской премии, или Приватизация Кнессета', u: 'https://haifainfo.com/?p=22428' },
      { o: 'Хайфаинфо', t: 'Наивен ли Европейский Союз, или Иврит депутата Тиби', u: 'https://haifainfo.com/?p=22426' },
      { o: '9 канал', t: 'Иврит понаслышке, или Как пролезть без очереди', u: 'https://archive.9tv.co.il/news/2010/06/22/77359.html' },
      { o: '9 канал', t: 'Однокоренная организация, или Богатенький Буратино', u: 'https://archive.9tv.co.il/news/2010/08/01/80381.html' }
    ];
    art.innerHTML =
      '<div class="art-grid">' + WORDS.map(function (w) {
        var bk = byId[w.book];
        return '<article class="art-card">' +
          '<p class="art-he" dir="rtl" lang="he">' + esc(w.he) + '</p>' +
          '<p class="art-tr">' + esc(w.tr) + '</p>' +
          '<h3>' + esc(w.ru) + '</h3>' +
          '<p class="art-story">' + esc(w.story) + '</p>' +
          (bk ? '<a class="art-src" href="book.html?id=' + bk.id + '">' + esc(w.src) + ' →</a>' : '<span class="art-src">' + esc(w.src) + '</span>') +
        '</article>';
      }).join('') + '</div>' +
      '<section class="art-press" aria-labelledby="press-h"><h2 id="press-h">Статьи в прессе</h2><ul>' +
        PRESS.map(function (p) { return '<li><a href="' + p.u + '" target="_blank" rel="noopener"><span>' + esc(p.o) + '</span><b>' + esc(p.t) + '</b><i aria-hidden="true">↗</i></a></li>'; }).join('') +
      '</ul></section>';
  }
})();
