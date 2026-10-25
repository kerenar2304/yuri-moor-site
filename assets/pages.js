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
        '<div class="pg-cover' + (b.wide ? ' wide' : '') + '">' + cover(b, 'pg-cv') +
          (b.cover ? '<img class="pg-cv pg-back-cv" src="assets/covers/' + b.cover + '-back.webp" alt="Оборот: ' + esc(b.title) + '" hidden>' +
            '<div class="tabs pg-flip" role="tablist" aria-label="Сторона обложки"><button type="button" data-side="front" aria-selected="true">Обложка</button><button type="button" data-side="back" aria-selected="false">Оборот</button></div>' : '') +
        '</div>' +
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
    // front / back of the cover
    root.querySelectorAll('.pg-flip [data-side]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var back = btn.dataset.side === 'back';
        root.querySelector('.pg-cover > .pg-cv:not(.pg-back-cv)').hidden = back;
        root.querySelector('.pg-back-cv').hidden = !back;
        root.querySelectorAll('.pg-flip [data-side]').forEach(function (x) { x.setAttribute('aria-selected', x === btn); });
      });
    });
    // enlarge the cover: a full-screen view with the same front / back switch
    var cov = root.querySelector('.pg-cover');
    if (cov && b.cover) {
      cov.insertAdjacentHTML('afterbegin', '<button type="button" class="pg-zoom" aria-label="Увеличить обложку"></button>');
      document.body.insertAdjacentHTML('beforeend',
        '<dialog class="cvz" id="cvz" aria-label="Обложка: ' + esc(b.title) + '">' +
          '<button class="x" type="button" data-cvz-close aria-label="Закрыть">×</button>' +
          '<img class="cvz-img" src="assets/covers/' + b.cover + '.webp" alt="Обложка: ' + esc(b.title) + '">' +
          '<div class="tabs cvz-flip" role="tablist" aria-label="Сторона обложки"><button type="button" data-zside="front" aria-selected="true">Обложка</button><button type="button" data-zside="back" aria-selected="false">Оборот</button></div>' +
        '</dialog>');
      var dz = document.getElementById('cvz'), zimg = dz.querySelector('.cvz-img');
      var showSide = function (side) {
        zimg.src = 'assets/covers/' + b.cover + (side === 'back' ? '-back' : '') + '.webp';
        zimg.alt = (side === 'back' ? 'Оборот: ' : 'Обложка: ') + b.title;
        dz.querySelectorAll('[data-zside]').forEach(function (x) { x.setAttribute('aria-selected', x.dataset.zside === side); });
      };
      var openZoom = function () {
        var side = root.querySelector('.pg-back-cv').hidden ? 'front' : 'back';
        showSide(side); dz.showModal();
      };
      root.querySelector('.pg-zoom').addEventListener('click', openZoom);
      root.querySelectorAll('.pg-cover > .pg-cv').forEach(function (im) { im.addEventListener('click', openZoom); });
      dz.querySelectorAll('[data-zside]').forEach(function (x) { x.addEventListener('click', function () { showSide(x.dataset.zside); }); });
      dz.addEventListener('click', function (e) { if (e.target === dz || e.target.closest('[data-cvz-close]')) dz.close(); });
    }
    var rd = $('[data-read-page]', root);
    if (rd) rd.addEventListener('click', function () { if (window.YM) YM.read(b.id); });
  }

  /* ---------- single column page: article.html?id=… ---------- */
  var txt = $('#text-root');
  if (txt && window.TEXTS) {
    var a = TEXTS[new URLSearchParams(location.search).get('id')] || TEXTS.ponaslyshke, bk = byId[a.book];
    document.title = a.t + ' | Юрий Моор-Мурадов';
    txt.innerHTML =
      '<article class="tx">' +
        '<header class="tx-head"><p class="tx-kind">' + esc(a.kind || (a.col ? 'Колонка «' + a.col + '»' : 'Статья')) + ' · ' + esc(a.o) + ' · ' + esc(a.d) + '</p>' +
          '<h1>' + esc(a.t) + '</h1><p class="tx-by">Юрий Моор-Мурадов</p></header>' +
        (a.img ? '<figure class="tx-img"><img src="assets/press/' + a.img + '.webp" alt=""></figure>'
          : '<figure class="tx-img tx-word"><b dir="rtl" lang="he">' + esc(a.word) + '</b><i>' + esc(a.wtr) + '</i></figure>') +
        '<div class="tx-body">' + a.paras.map(function (p) {
          // a line written only in Hebrew reads right to left
          return /[֐-׿]/.test(p) && !/[A-Za-zА-Яа-яЁё]/.test(p) ? '<p class="tx-he" dir="rtl" lang="he">' + esc(p) + '</p>' : '<p>' + esc(p) + '</p>';
        }).join('') + '</div>' +
        (a.he ? '<aside class="tx-words" aria-labelledby="tx-w"><h2 id="tx-w">Словарик колонки</h2><ul dir="rtl" lang="he">' +
          a.he.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></aside>' : '') +
        '<p class="tx-src">' + (a.src ? (a.o === 'Facebook' ? 'Пост на странице автора в Facebook, ' + esc(a.d) + '. <a href="' + a.src + '" target="_blank" rel="noopener">Открыть в Facebook ↗</a>'
          : 'Впервые опубликовано: ' + esc(a.o) + ', ' + esc(a.d) + '. <a href="' + a.src + '" target="_blank" rel="noopener">Оригинал публикации ↗</a>') : esc(a.note || '')) + '</p>' +
        (bk ? '<a class="tx-book" href="book.html?id=' + bk.id + '">' + (bk.cover ? '<img src="assets/covers/' + bk.cover + '.webp" alt="">' : '') +
          '<span><small>Колонка вошла в книгу</small><b>' + esc(bk.title) + '</b><em>' + esc(bk.or || '') + '</em><i>О книге →</i></span></a>' : '') +
      '</article>';
  }

  /* ---------- publications: press.html (all, with filters) and a short row on the home page ---------- */
  var pressRoot = $('#press-root'), homePress = $('#home-press');
  if (pressRoot || homePress) {
    var VIDEO = { id: 'HiTXXnRdmpU', t: 'Юрий Моор-Мурадов: писатель, драматург, публицист, переводчик', o: 'RTN · программа «Контакт»', d: 'Апрель 2025' };
    /* img: assets/press/<img>.webp; d only where the source shows a date */
    var PRESS = [
      { k: 'Интервью', o: 'Zahav.ru', img: 'p-kolea', t: 'Своя колея Юрия Моор-Мурадова', d: '25 сентября 2023', u: 'https://mnenia.zahav.ru/Articles/3611742/%D1%81%D0%B2%D0%BE%D1%8F_%D0%BA%D0%BE%D0%BB%D0%B5%D1%8F_%D1%8E%D1%80%D0%B8%D1%8F_%D0%BC%D0%BE%D0%BE%D1%80%D0%BC%D1%83%D1%80%D0%B0%D0%B4%D0%BE%D0%B2%D0%B0' },
      { k: 'Интервью', o: 'Zahav.ru', img: 'p-narod', t: '«Без языка нельзя стать частью народа»', d: '10 сентября 2020', u: 'https://salat.zahav.ru/Articles/3386066/%D0%B1%D0%B5%D0%B7_%D1%8F%D0%B7%D1%8B%D0%BA%D0%B0_%D0%BD%D0%B5%D0%BB%D1%8C%D0%B7%D1%8F_%D1%81%D1%82%D0%B0%D1%82%D1%8C_%D1%87%D0%B0%D1%81%D1%82%D1%8C%D1%8E_%D0%BD%D0%B0%D1%80%D0%BE%D0%B4%D0%B0' },
      { id: 'love', k: 'Эссе', o: 'Заметки по еврейской истории', img: 'p-love', t: 'Язык как первая любовь со школьных лет', u: 'https://club.berkovich-zametki.com/?p=20515' },
      { id: 'glup', k: 'Статья', o: 'Хайфаинфо', img: 'p-glup', t: 'Все оттенки человеческой глупости', u: 'http://haifainfo.com/?p=29499' },
      { id: 'ponaslyshke', k: 'Статья', o: '9 канал', img: 'p-queue', t: 'Иврит понаслышке, или Как пролезть без очереди' },
      { id: 'un', k: 'Статья', o: 'Хайфаинфо', img: 'p-un', t: 'Кража на Ассамблее ООН, или Русский язык министра Фуада', u: 'https://haifainfo.com/?p=18656' },
      { id: 'buratino', k: 'Статья', o: '9 канал', img: 'p-buratino', t: 'Однокоренная организация, или Богатенький Буратино', u: 'https://web.archive.org/web/20200122093821/http://archive.9tv.co.il:80/news/2010/08/01/80381.html', d: '1 августа 2010' },
      { id: 'knesset', k: 'Статья', o: 'Хайфаинфо', img: 'p-knesset', t: 'Виновник Нобелевской премии, или Приватизация Кнессета', u: 'https://haifainfo.com/?p=22428' },
      { id: 'eu', k: 'Статья', o: 'Хайфаинфо', img: 'p-eu', t: 'Наивен ли Европейский Союз, или Иврит депутата Тиби', u: 'https://haifainfo.com/?p=22426' },
      // standout posts from his Facebook page; full text saved in texts.js
      { id: 'fb-kantselyarit', k: 'Пост', o: 'Facebook' },
      { id: 'fb-kolesnitsa', k: 'Пост', o: 'Facebook' },
      { id: 'fb-nit', k: 'Пост', o: 'Facebook' },
      { id: 'fb-likhora', k: 'Пост', o: 'Facebook' },
      { id: 'fb-nenavist', k: 'Пост', o: 'Facebook' },
      { id: 'fb-dyuzhina', k: 'Пост', o: 'Facebook' },
      { id: 'fb-idish', k: 'Пост', o: 'Facebook' }
    ];
    var KINDS = [['all', 'Все'], ['Интервью', 'Интервью'], ['Статья', 'Статьи'], ['Эссе', 'Эссе'], ['Пост', 'Facebook'], ['Эфир', 'ТВ и видео']];
    var pubCard = function (p) {
      return '<a class="pub" data-k="' + p.k + '" href="' + p.u + '"' + (p.local ? '' : ' target="_blank" rel="noopener"') + '>' +
        '<span class="pub-img">' + p.media + '</span>' +
        '<span class="pub-body"><span class="pub-kind">' + esc(p.k) + ' · ' + esc(p.o) + '</span>' +
        '<b class="pub-t">' + esc(p.t) + '</b>' + (p.d ? '<span class="pub-d">' + esc(p.d) + '</span>' : '') + '</span></a>';
    };
    var pubs = [{ k: 'Эфир', o: 'RTN', t: VIDEO.t, d: VIDEO.d, u: 'https://www.youtube.com/watch?v=' + VIDEO.id,
      media: '<img src="https://i.ytimg.com/vi/' + VIDEO.id + '/maxresdefault.jpg" alt="" loading="lazy"><i class="pub-play" aria-hidden="true"></i>' }]
      .concat(PRESS.map(function (p) {
        // a saved copy exists: open it on the site; the original stays linked from that page
        var s = p.id && window.TEXTS && TEXTS[p.id];
        if (s) { p.u = 'article.html?id=' + p.id; p.local = true; p.d = s.d; }
        if (s && !p.t) p.t = s.t;
        if (s && !p.img && s.img) p.img = s.img;
        p.media = p.img ? '<img src="assets/press/' + p.img + '.webp" alt="" loading="lazy">'
          : '<span class="pub-word"><b dir="rtl" lang="he">' + esc(s.word) + '</b><i>' + esc(s.wtr) + '</i></span>';
        return p; }));
    if (pressRoot) {
      pressRoot.innerHTML =
        '<section class="pubs" aria-label="Публикации">' +
          '<div class="pubs-head"><div class="tabs pubs-tabs" role="tablist" aria-label="Тип публикации">' +
            KINDS.map(function (k, i) { return '<button type="button" data-pk="' + k[0] + '" aria-selected="' + !i + '">' + k[1] + '</button>'; }).join('') +
          '</div></div>' +
          '<div class="pubs-grid">' + pubs.map(pubCard).join('') + '</div>' +
        '</section>';
      pressRoot.querySelectorAll('[data-pk]').forEach(function (b) {
        b.addEventListener('click', function () {
          pressRoot.querySelectorAll('[data-pk]').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
          pressRoot.querySelectorAll('.pub').forEach(function (c) { c.hidden = b.dataset.pk !== 'all' && c.dataset.k !== b.dataset.pk; });
        });
      });
    }
    // home: the broadcast, one interview, one column, the essay
    if (homePress) homePress.innerHTML = ['Эфир', 'Своя колея Юрия Моор-Мурадова', 'Все оттенки человеческой глупости', 'Язык как первая любовь со школьных лет']
      .map(function (key) { return pubs.filter(function (p) { return p.k === key || p.t === key; })[0]; }).map(pubCard).join('');
  }

  /* ---------- words page: articles.html ---------- */
  var art = $('#art-root');
  if (art) {
    art.innerHTML = '<div class="art-grid">' + WORDS.map(function (w) {
      var bk = byId[w.book];
      return '<article class="art-card">' +
        '<p class="art-he" dir="rtl" lang="he">' + esc(w.he) + '</p>' +
        '<p class="art-tr">' + esc(w.tr) + '</p>' +
        '<h3>' + esc(w.ru) + '</h3>' +
        '<p class="art-story">' + esc(w.story) + '</p>' +
        (bk ? '<a class="art-src" href="book.html?id=' + bk.id + '">' + esc(w.src) + ' →</a>' : '<span class="art-src">' + esc(w.src) + '</span>') +
      '</article>';
    }).join('') + '</div>';
  }
})();
