/* Cloudflare Pages Function: POST /api/order
   Receives the checkout form, checks it, and sends two e-mails through Resend:
   the order to the seller, and a confirmation to the customer (when an e-mail was given).
   Settings (Cloudflare → Pages → Settings → Variables and Secrets):
     RESEND_API_KEY  secret key from resend.com (encrypted)
     ORDER_FROM      sender on the verified domain, e.g. Yura Media <orders@your-domain>
     ORDER_TO        where orders arrive (default ksuwa22@gmail.com) */

const PRICE = { print: 50, pdf: 40 };
const PHONE_TXT = '054-741-93-93';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const json = (body, status) => new Response(JSON.stringify(body), { status: status || 200, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch (e) { return json({ ok: false, error: 'bad request' }, 400); }
  if (d.website) return json({ ok: true });                       // honeypot: bots fill the hidden field, people do not

  const items = (Array.isArray(d.items) ? d.items : []).slice(0, 30).map(i => ({
    title: clean(i.title, 120), fmt: i.fmt === 'pdf' ? 'pdf' : 'print', q: Math.max(1, Math.min(50, parseInt(i.q, 10) || 1))
  })).filter(i => i.title);
  const f = {
    name: clean(d.name, 80), phone: clean(d.phone, 30), email: clean(d.email, 120),
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
    if (!/^[0-9]{5,7}$/.test(f.zip)) missing.push('zip');
  }
  if ((hasPdf || f.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) missing.push('email');
  if (missing.length) return json({ ok: false, error: 'missing', fields: missing }, 422);
  if (!env.RESEND_API_KEY || !env.ORDER_FROM) return json({ ok: false, error: 'not configured' }, 503);

  let total = 0;
  const rows = items.map(i => {
    const sum = PRICE[i.fmt] * i.q; total += sum;
    return { text: i.title + ' (' + (i.fmt === 'pdf' ? 'цифровая копия' : 'печатная') + ') × ' + i.q + ' = ' + sum + ' ₪', ...i, sum };
  });
  const totalTxt = total + ' ₪' + (hasPrint ? ' + доставка' : '');
  const addr = hasPrint ? f.street + ' ' + f.house + ', кв. ' + f.apt + ', ' + f.city + ', ' + f.zip : '';

  const table = rows.map(r => '<tr><td style="padding:6px 0">' + esc(r.title) + ' <span style="color:#667">(' + (r.fmt === 'pdf' ? 'цифровая копия' : 'печатная') + ') × ' + r.q +
    '</span></td><td style="padding:6px 0;text-align:right;white-space:nowrap">' + r.sum + ' ₪</td></tr>').join('');
  const wrap = inner => '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#0d2b52;max-width:560px">' + inner + '</div>';
  const orderTable = '<table style="width:100%;border-collapse:collapse;border-top:1px solid #dde;border-bottom:1px solid #dde">' + table +
    '<tr><td style="padding:8px 0;font-weight:bold">Итого</td><td style="padding:8px 0;text-align:right;font-weight:bold;white-space:nowrap">' + esc(totalTxt) + '</td></tr></table>';

  const send = body => fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });

  // 1. the order, to the seller
  const toSeller = await send({
    from: env.ORDER_FROM, to: [env.ORDER_TO || 'ksuwa22@gmail.com'], reply_to: f.email || undefined,
    subject: 'Заказ книг: ' + f.name + ', ' + total + ' ₪',
    text: 'Новый заказ с сайта:\n' + rows.map(r => '• ' + r.text).join('\n') + '\nИтого: ' + totalTxt +
      '\n\nИмя: ' + f.name + '\nТелефон: ' + f.phone + (addr ? '\nАдрес: ' + addr : '') + (f.email ? '\nE-mail: ' + f.email : ''),
    html: wrap('<h2 style="margin:0 0 12px">Новый заказ с сайта</h2>' + orderTable +
      '<p style="margin:16px 0 0"><b>Имя:</b> ' + esc(f.name) + '<br><b>Телефон:</b> <a href="tel:' + esc(f.phone.replace(/[^0-9+]/g, '')) + '">' + esc(f.phone) + '</a>' +
      (addr ? '<br><b>Адрес:</b> ' + esc(addr) : '') + (f.email ? '<br><b>E-mail:</b> ' + esc(f.email) : '') + '</p>')
  });
  if (!toSeller.ok) return json({ ok: false, error: 'send failed' }, 502);

  // 2. the confirmation, to the customer; the order is already in, so a failure here does not fail the request
  if (f.email) {
    try {
      await send({
        from: env.ORDER_FROM, to: [f.email], reply_to: env.ORDER_TO || 'ksuwa22@gmail.com',
        subject: 'Ваш заказ принят: книги Юрия Моор-Мурадова',
        text: 'Здравствуйте, ' + f.name + '!\n\nСпасибо, ваш заказ принят:\n' + rows.map(r => '• ' + r.text).join('\n') + '\nИтого: ' + totalTxt +
          '\n\nМы свяжемся с вами по телефону или в WhatsApp, подтвердим заказ и пришлём реквизиты для оплаты (Bit или банковский перевод).' +
          '\n\nВопросы: WhatsApp ' + PHONE_TXT + ' или ответ на это письмо.',
        html: wrap('<h2 style="margin:0 0 12px">Спасибо, ваш заказ принят!</h2><p>Здравствуйте, ' + esc(f.name) + '!</p>' + orderTable +
          (addr ? '<p><b>Адрес доставки:</b> ' + esc(addr) + '</p>' : '') +
          '<p>Мы свяжемся с вами по телефону или в WhatsApp, подтвердим заказ и пришлём реквизиты для оплаты (Bit или банковский перевод).</p>' +
          '<p style="color:#667">Вопросы: WhatsApp <a href="https://wa.me/972547419393">' + PHONE_TXT + '</a> или ответ на это письмо.</p>')
      });
    } catch (e) {}
  }
  return json({ ok: true });
}
