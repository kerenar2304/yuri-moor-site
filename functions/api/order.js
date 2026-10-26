/* Cloudflare Pages Function: POST /api/order
   Receives the checkout form, checks it, and sends through Resend:
   the order to the seller, and, for a digital copy, a confirmation to the customer.
   Settings (Cloudflare → Pages → Settings → Variables and Secrets):
     RESEND_API_KEY    secret key from resend.com (encrypted)
     ORDER_FROM        sender on the verified domain, e.g. Yura Media <orders@your-domain>
     ORDER_TO          where orders arrive
     TURNSTILE_SECRET  Turnstile secret key (encrypted); when set, every order must pass the bot check
     SITE_ORIGIN       optional, e.g. https://your-domain; when set, orders from other sites are refused */

import { hasBookKey, seal } from '../_lib/books.js';

const PRICE = { print: 50, pdf: 40 };
const PHONE_TXT = '054-741-93-93';
const MAX_BODY = 16 * 1024;

// the catalog lives here too: the browser sends only book ids, so nobody can put their own text into the e-mails
const CATALOG = {
  isr: 'Израиль для начинающих', z1: 'Занимательный иврит', z2: 'Нюансы иврита', z3: 'Прогулки с ивритом',
  z4: 'Сленг, жаргон и прочие краски иврита', z5: 'Иврит на пятёрку', z6: 'Иврит в эфире', z7: 'Как в иврите взять быка за рога',
  z8: 'Новые приключения иврита', prig: 'Приглашение к ограблению', debut: 'Дебют частного детектива', shp: 'Шпионы попадаются на мелочах',
  nhd: 'Нет худа без добра', heb: 'Первое расследование частного детектива (на иврите)', razg: 'Разговорник русский-иврит'
};
const DIGITAL = new Set(['isr', 'z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z8', 'prig', 'debut', 'shp', 'nhd', 'heb', 'razg']);

const SELLER_RU = 'Продавец: Керен Арлихман, עוסק פטור, ת.ז. 317066652. Адрес для возвратов: ברקת 2, באר יעקב.';
const CANCEL_RU = 'Отменить покупку цифровой копии можно бесплатно до отправки файла; после отправки файла отмена невозможна (ст. 14ג(ד)(3) Закона о защите прав потребителя). Полные условия: раздел «Условия покупки» на сайте.';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const noLinks = s => s.replace(/(https?:\/\/|www\.)\S*/gi, '').replace(/\S+\.(com|net|org|ru|info|io|xyz|top|link|site)\b\S*/gi, '');
const json = (body, status) => new Response(JSON.stringify(body), {
  status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

export async function onRequestPost({ request, env }) {
  // cheap filters first: size, type, and (when configured) the site it came from
  const len = parseInt(request.headers.get('content-length') || '0', 10);
  if (len > MAX_BODY) return json({ ok: false, error: 'too large' }, 413);
  if (!(request.headers.get('content-type') || '').includes('application/json')) return json({ ok: false, error: 'bad type' }, 415);
  const origin = request.headers.get('origin') || '';
  const allowed = env.SITE_ORIGIN ? env.SITE_ORIGIN.split(',').map(s => s.trim()) : [new URL(request.url).origin];
  if (origin && !allowed.includes(origin)) return json({ ok: false, error: 'origin' }, 403);

  let d;
  try { const raw = await request.text(); if (raw.length > MAX_BODY) return json({ ok: false, error: 'too large' }, 413); d = JSON.parse(raw); }
  catch (e) { return json({ ok: false, error: 'bad request' }, 400); }
  if (!d || typeof d !== 'object') return json({ ok: false, error: 'bad request' }, 400);
  if (d.website) return json({ ok: true });                       // honeypot: bots fill the hidden field, people do not

  if (!env.RESEND_API_KEY || !env.ORDER_FROM || !env.ORDER_TO) return json({ ok: false, error: 'not configured' }, 503);

  // bot check (Cloudflare Turnstile), when its secret is set
  if (env.TURNSTILE_SECRET) {
    // trim: a stray space or line break from pasting the secret must not break the check
    const form = new FormData(); form.append('secret', String(env.TURNSTILE_SECRET).trim()); form.append('response', String(d.turnstile || ''));
    const ip = request.headers.get('cf-connecting-ip'); if (ip) form.append('remoteip', ip);
    const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form }).then(r => r.json()).catch(() => ({}));
    // Cloudflare's own reason codes (e.g. invalid-input-secret, timeout-or-duplicate) say what went wrong without exposing anything
    if (!v.success) return json({ ok: false, error: 'missing', fields: ['turnstile'], codes: v['error-codes'] || [] }, 422);
  }

  // only known books, in a format that exists, with a sane quantity
  const items = (Array.isArray(d.items) ? d.items : []).slice(0, 30)
    .map(i => ({ id: String(i && i.id), fmt: i && i.fmt === 'pdf' ? 'pdf' : 'print', q: Math.max(1, Math.min(50, parseInt(i && i.q, 10) || 1)) }))
    .filter(i => CATALOG[i.id] && (i.fmt === 'print' || DIGITAL.has(i.id)));
  const f = {
    name: noLinks(clean(d.name, 60)), phone: clean(d.phone, 30), email: clean(d.email, 120),
    street: clean(d.street, 80), house: clean(d.house, 12), apt: clean(d.apt, 12), city: clean(d.city, 60), zip: clean(d.zip, 10)
  };
  const hasPrint = items.some(i => i.fmt === 'print'), hasPdf = items.some(i => i.fmt === 'pdf');

  // the same rules as the form: nothing is sent unless every required field is filled
  const missing = [];
  if (!items.length) missing.push('items');
  if (f.name.length < 3) missing.push('name');
  if (!/^[0-9+()\- ]{9,}$/.test(f.phone)) missing.push('phone');
  if (hasPrint) {
    ['street', 'house', 'apt', 'city'].forEach(k => { if (!f[k]) missing.push(k); });
    if (!/^([0-9]{5}|[0-9]{7})$/.test(f.zip)) missing.push('zip');
  }
  if (hasPdf && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) missing.push('email');
  if (missing.length) return json({ ok: false, error: 'missing', fields: missing }, 422);
  if (!hasPdf) f.email = '';                                        // the e-mail is used only for a digital copy

  let total = 0;
  const rows = items.map(i => {
    const sum = PRICE[i.fmt] * i.q, title = CATALOG[i.id]; total += sum;
    return { title, fmt: i.fmt, q: i.q, sum, text: title + ' (' + (i.fmt === 'pdf' ? 'цифровая копия' : 'печатная') + ') × ' + i.q + ' = ' + sum + ' ₪' };
  });
  const totalTxt = total + ' ₪' + (hasPrint ? ' + доставка' : '');
  const addr = hasPrint ? f.street + ' ' + f.house + ', кв. ' + f.apt + ', ' + f.city + ', ' + f.zip : '';

  const table = rows.map(r => '<tr><td style="padding:6px 0">' + esc(r.title) + ' <span style="color:#667">(' + (r.fmt === 'pdf' ? 'цифровая копия' : 'печатная') + ') × ' + r.q +
    '</span></td><td style="padding:6px 0;text-align:right;white-space:nowrap">' + r.sum + ' ₪</td></tr>').join('');
  const wrap = inner => '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#0d2b52;max-width:560px">' + inner + '</div>';
  const orderTable = '<table style="width:100%;border-collapse:collapse;border-top:1px solid #dde;border-bottom:1px solid #dde">' + table +
    '<tr><td style="padding:8px 0;font-weight:bold">Итого</td><td style="padding:8px 0;text-align:right;font-weight:bold;white-space:nowrap">' + esc(totalTxt) + '</td></tr></table>';

  // for a digital copy: a signed one-click link that lets the seller send the book once the payment is in
  let sendBtn = '', sendTxt = '';
  if (hasPdf && hasBookKey(env)) {
    const base = env.SITE_ORIGIN ? env.SITE_ORIGIN.split(',')[0].trim() : new URL(request.url).origin;
    const ids = [...new Set(items.filter(i => i.fmt === 'pdf').map(i => i.id))];
    const link = base + '/api/send-book?t=' + encodeURIComponent(await seal(env, { e: f.email, n: f.name, b: ids, t: Date.now() }));
    sendTxt = '\n\nאחרי שהתשלום התקבל, לשליחת הספר ללקוח: ' + link;
    sendBtn = '<p dir="rtl" style="margin:24px 0 0"><a href="' + esc(link) + '" style="display:inline-block;background:#0d2b52;color:#fff;' +
      'text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:26px">התשלום התקבל? שלחי את הספר ללקוח</a></p>';
  }

  const send = body => fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });

  // 1. the order, to the seller
  const toSeller = await send({
    from: env.ORDER_FROM, to: [env.ORDER_TO], reply_to: f.email || undefined,
    subject: 'Заказ книг: ' + f.name + ', ' + total + ' ₪',
    text: 'Новый заказ с сайта:\n' + rows.map(r => '• ' + r.text).join('\n') + '\nИтого: ' + totalTxt +
      '\n\nИмя: ' + f.name + '\nТелефон: ' + f.phone + (addr ? '\nАдрес: ' + addr : '') + (f.email ? '\nE-mail: ' + f.email : '') + sendTxt,
    html: wrap('<h2 style="margin:0 0 12px">Новый заказ с сайта</h2>' + orderTable +
      '<p style="margin:16px 0 0"><b>Имя:</b> ' + esc(f.name) + '<br><b>Телефон:</b> <a href="tel:' + esc(f.phone.replace(/[^0-9+]/g, '')) + '">' + esc(f.phone) + '</a>' +
      (addr ? '<br><b>Адрес:</b> ' + esc(addr) : '') + (f.email ? '<br><b>E-mail:</b> ' + esc(f.email) : '') + '</p>' + sendBtn)
  });
  if (!toSeller.ok) return json({ ok: false, error: 'send failed' }, 502);

  // 2. for a digital copy only: a confirmation to the customer, with the seller's details and the cancellation terms.
  //    The order is already in, so a failure here does not fail the request.
  if (hasPdf && f.email) {
    try {
      await send({
        from: env.ORDER_FROM, to: [f.email], reply_to: env.ORDER_TO,
        subject: 'Ваш заказ принят: книги Юрия Моор-Мурадова',
        text: 'Здравствуйте!\n\nСпасибо, ваш заказ принят:\n' + rows.map(r => '• ' + r.text).join('\n') + '\nИтого: ' + totalTxt +
          '\n\nМы свяжемся с вами по телефону или в WhatsApp, подтвердим заказ и пришлём реквизиты для оплаты (Bit или банковский перевод). ' +
          'Цифровая копия придёт на этот адрес после оплаты.\n\n' + SELLER_RU + '\n' + CANCEL_RU + '\n\nВопросы: WhatsApp ' + PHONE_TXT + ' или ответ на это письмо.',
        html: wrap('<h2 style="margin:0 0 12px">Спасибо, ваш заказ принят!</h2>' + orderTable +
          '<p>Мы свяжемся с вами по телефону или в WhatsApp, подтвердим заказ и пришлём реквизиты для оплаты (Bit или банковский перевод). Цифровая копия придёт на этот адрес после оплаты.</p>' +
          '<p style="color:#667;font-size:13px">' + esc(SELLER_RU) + '<br>' + esc(CANCEL_RU) + '</p>' +
          '<p style="color:#667">Вопросы: WhatsApp <a href="https://wa.me/972547419393">' + PHONE_TXT + '</a> или ответ на это письмо.</p>')
      });
    } catch (e) {}
  }
  return json({ ok: true });
}
