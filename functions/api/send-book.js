/* /api/send-book?t=...  (the button in the seller's order e-mail)
   GET  shows the seller a page with the order and one confirm button; nothing is sent yet,
        so a mail scanner that opens the link cannot send the book before payment.
   POST (that button) e-mails each digital book to the customer as a PDF attachment.
   Needs BOOK_KEY, RESEND_API_KEY and ORDER_FROM. */
import { BOOK_FILE, hasBookKey, seal, unseal } from '../_lib/books.js';

const MAX_AGE = 90 * 24 * 3600 * 1000;
const PHONE_TXT = '054-741-93-93';
const SELLER_RU = 'Продавец: Керен Арлихман, עוסק פטור, ת.ז. 317066652. Адрес для возвратов: ברקת 2, באר יעקב.';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const page = (inner, status) => new Response('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>שליחת ספר דיגיטלי</title>' +
  '<style>body{margin:0;background:#f4f1ea;color:#0d2b52;font:18px/1.6 Arial,sans-serif}main{max-width:560px;margin:0 auto;padding:40px 20px}' +
  'h1{font-size:28px;line-height:1.2;margin:0 0 16px}ul{padding-inline-start:20px}.box{background:#fff;border:1px solid #dde;border-radius:12px;padding:20px 24px;margin:0 0 24px}' +
  'button{font:inherit;font-weight:bold;background:#0d2b52;color:#fff;border:0;border-radius:26px;height:52px;padding:0 28px;cursor:pointer;width:100%}' +
  '.note{color:#556;font-size:15px}.ok{color:#1b6b3a}.err{color:#a3261b}</style></head><body><main>' + inner + '</main></body></html>',
  { status: status || 200, headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
  } });

async function readOrder(env, token) {
  if (!hasBookKey(env) || !env.RESEND_API_KEY || !env.ORDER_FROM) return { error: 'השליחה עדיין לא מוגדרת באתר (חסר BOOK_KEY).' };
  const o = await unseal(env, token);
  if (!o || !Array.isArray(o.b)) return { error: 'הקישור לא תקין. פתחי אותו שוב מתוך מייל ההזמנה.' };
  if (!(Date.now() - o.t < MAX_AGE)) return { error: 'הקישור ישן מ־90 יום. שלחי את הספר ידנית או בקשי מהלקוח להזמין שוב.' };
  const books = o.b.filter(id => BOOK_FILE[id]);
  if (!books.length || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.e || '')) return { error: 'בהזמנה הזאת אין ספר דיגיטלי או כתובת מייל.' };
  return { o, books };
}

const summary = (o, books) => '<div class="box"><b>לקוח:</b> ' + esc(o.n) + '<br><b>מייל:</b> ' + esc(o.e) +
  '<br><b>תאריך ההזמנה:</b> ' + new Date(o.t).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' }) +
  '<ul>' + books.map(id => '<li>' + esc(BOOK_FILE[id]) + '</li>').join('') + '</ul></div>';

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get('t') || '';
  const r = await readOrder(env, token);
  if (r.error) return page('<h1>לא ניתן לשלוח</h1><p class="err">' + esc(r.error) + '</p>', 400);
  return page('<h1>שליחת הספר ללקוח</h1>' + summary(r.o, r.books) +
    '<p>לחצי רק אחרי שהתשלום התקבל. הלקוח יקבל מייל עם הספר בקובץ PDF.</p>' +
    '<form method="post"><input type="hidden" name="t" value="' + esc(token) + '"><button type="submit">התשלום התקבל, שלחי עכשיו</button></form>' +
    '<p class="note">אחרי השליחה ביטול העסקה כבר לא אפשרי, כמו שכתוב בתקנון.</p>');
}

export async function onRequestPost({ request, env }) {
  const self = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  if (origin && origin !== self) return page('<h1>לא ניתן לשלוח</h1>', 403);
  let token = '';
  try { token = String((await request.formData()).get('t') || ''); } catch (e) {}
  const r = await readOrder(env, token);
  if (r.error) return page('<h1>לא ניתן לשלוח</h1><p class="err">' + esc(r.error) + '</p>', 400);
  const { o, books } = r;

  // one e-mail per book keeps every message far below the attachment size limit
  const failed = [];
  for (const id of books) {
    const title = BOOK_FILE[id];
    const fileToken = await seal(env, { f: id, x: Date.now() + 3600 * 1000 });
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.ORDER_FROM, to: [o.e], reply_to: env.ORDER_TO || undefined,
        subject: 'Ваша книга: ' + title,
        text: 'Здравствуйте, ' + o.n + '!\n\nСпасибо за оплату. Книга «' + title + '» во вложении, в формате PDF.\nПриятного чтения!\n\n' +
          'Вопросы: WhatsApp ' + PHONE_TXT + ' или ответ на это письмо.\n\n' + SELLER_RU,
        html: '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#0d2b52;max-width:560px">' +
          '<h2 style="margin:0 0 12px">Здравствуйте, ' + esc(o.n) + '!</h2><p>Спасибо за оплату. Книга <b>«' + esc(title) + '»</b> во вложении, в формате PDF.</p>' +
          '<p>Приятного чтения!</p><p style="color:#667">Вопросы: WhatsApp <a href="https://wa.me/972547419393">' + PHONE_TXT + '</a> или ответ на это письмо.</p>' +
          '<p style="color:#667;font-size:13px">' + esc(SELLER_RU) + '</p></div>',
        attachments: [{ filename: title + '.pdf', path: self + '/api/book-file?t=' + encodeURIComponent(fileToken) }]
      })
    }).catch(() => null);
    if (!res || !res.ok) failed.push(title);
  }

  if (failed.length === books.length) return page('<h1>השליחה נכשלה</h1><p class="err">שום ספר לא נשלח. נסי שוב בעוד כמה דקות, ואם זה חוזר, בדקי את Resend.</p>', 502);
  return page('<h1 class="ok">נשלח ✓</h1>' + summary(o, books.filter(id => !failed.includes(BOOK_FILE[id]))) +
    (failed.length ? '<p class="err">לא נשלחו: ' + failed.map(esc).join(', ') + '. רענני את הדף הקודם ונסי שוב.</p>' : '') +
    '<p class="note">אם תלחצי שוב על הכפתור במייל, הספר יישלח פעם נוספת לאותו לקוח.</p>');
}
