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
    var VIDEO = { id: 'HiTXXnRdmpU', t: 'Юрий Моор-Мурадов: писатель, драматург, публицист, переводчик', o: 'RTN · программа «Контакт»', d: 'Апрель 2025' };
    var PRESS = [
      { k: 'Статья', o: 'Хайфаинфо', t: 'Все оттенки человеческой глупости', u: 'http://haifainfo.com/?p=29499', q: 'Почему «хатихат метумтемет» обиднее, чем просто «метумтемет»?' },
      { k: 'Интервью', o: 'Zahav.ru', t: 'Своя колея Юрия Моор-Мурадова', u: 'https://mnenia.zahav.ru/Articles/3611742/%D1%81%D0%B2%D0%BE%D1%8F_%D0%BA%D0%BE%D0%BB%D0%B5%D1%8F_%D1%8E%D1%80%D0%B8%D1%8F_%D0%BC%D0%BE%D0%BE%D1%80%D0%BC%D1%83%D1%80%D0%B0%D0%B4%D0%BE%D0%B2%D0%B0' },
      { k: 'Статья', o: '9 канал', t: 'Иврит понаслышке, или Как пролезть без очереди', u: 'https://archive.9tv.co.il/news/2010/06/22/77359.html' },
      { k: 'Интервью', o: 'Zahav.ru', t: '«Без языка нельзя стать частью народа»', u: 'https://salat.zahav.ru/Articles/3386066/%D0%B1%D0%B5%D0%B7_%D1%8F%D0%B7%D1%8B%D0%BA%D0%B0_%D0%BD%D0%B5%D0%BB%D1%8C%D0%B7%D1%8F_%D1%81%D1%82%D0%B0%D1%82%D1%8C_%D1%87%D0%B0%D1%81%D1%82%D1%8C%D1%8E_%D0%BD%D0%B0%D1%80%D0%BE%D0%B4%D0%B0' },
      { k: 'Статья', o: 'Хайфаинфо', t: 'Кража на Ассамблее ООН, или Русский язык министра Фуада', u: 'https://haifainfo.com/?p=18656' },
      { k: 'Эссе', o: 'Заметки по еврейской истории', t: 'Язык как первая любовь со школьных лет', u: 'https://club.berkovich-zametki.com/?p=20515' },
      { k: 'Статья', o: '9 канал', t: 'Однокоренная организация, или Богатенький Буратино', u: 'https://archive.9tv.co.il/news/2010/08/01/80381.html' },
      { k: 'Статья', o: 'Хайфаинфо', t: 'Виновник Нобелевской премии, или Приватизация Кнессета', u: 'https://haifainfo.com/?p=22428' },
      { k: 'Статья', o: 'Хайфаинфо', t: 'Наивен ли Европейский Союз, или Иврит депутата Тиби', u: 'https://haifainfo.com/?p=22426' }
    ];
    var html =
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
      '<section class="np" aria-labelledby="np-h">' +
        '<header class="np-mast"><p class="np-meta"><span>Израиль</span><span>Пресса · интервью · эфир</span><span>Yura Media</span></p>' +
          '<h2 id="np-h">Вести о Моор-Мурадове</h2><p class="np-rule"></p></header>' +
        '<div class="np-page">' +
          '<figure class="np-video"><button type="button" class="np-play" data-yt="' + VIDEO.id + '" aria-label="Смотреть видео: ' + esc(VIDEO.t) + '">' +
            '<img src="https://i.ytimg.com/vi/' + VIDEO.id + '/maxresdefault.jpg" alt=""><i aria-hidden="true"></i></button>' +
            '<figcaption><span class="np-kind">Эфир</span><b>' + esc(VIDEO.t) + '</b><span>' + esc(VIDEO.o) + ' · ' + esc(VIDEO.d) + '</span>' +
            '<a href="https://www.youtube.com/watch?v=' + VIDEO.id + '" target="_blank" rel="noopener">Открыть на YouTube ↗</a></figcaption></figure>' +
          PRESS.map(function (p, k) {
            return '<a class="np-clip' + (k === 0 ? ' lead' : '') + '" href="' + p.u + '" target="_blank" rel="noopener">' +
              '<span class="np-head"><span class="np-src">' + esc(p.o) + '</span><span class="np-kind">' + esc(p.k) + '</span></span>' +
              '<b class="np-t">' + esc(p.t) + '</b>' + (p.q ? '<q>' + esc(p.q) + '</q>' : '') +
              '<span class="np-cols" aria-hidden="true"><i></i><i></i></span><span class="np-more">Читать ↗</span></a>';
          }).join('') +
        '</div>' +
      '</section>';
    art.innerHTML = html;
    var play = $('.np-play', art);
    if (play) play.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + play.dataset.yt + '?autoplay=1&rel=0';
      f.title = VIDEO.t; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true;
      play.replaceWith(f);
    });
  }
})();
