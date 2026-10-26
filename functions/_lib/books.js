/* Shared by the order and book-sending functions.
   BOOK_KEY (Cloudflare secret, 64 hex chars) decrypts site/books-enc/<id>.bin, made by _tools/encrypt-books.sh,
   and, hashed, signs the links in the seller's e-mail so nobody else can trigger a send. */

// the file name the customer receives: the exact title on the cover
export const BOOK_FILE = {
  isr: 'Израиль для начинающих', z1: 'Занимательный иврит', z2: 'Нюансы иврита, или Занимательный иврит 2',
  z3: 'Прогулки с ивритом, или Занимательный иврит 3', z4: 'Сленг, жаргон и прочие краски иврита',
  z5: 'Иврит на пятерку, или Занимательный иврит 5', z6: 'Иврит в эфире, или Занимательный иврит 6',
  z7: 'Как на иврите взять быка за рога, или Занимательный иврит 7', z8: 'Новые приключения иврита, или 2000 лет спустя',
  prig: 'Приглашение к ограблению', debut: 'Дебют частного детектива', shp: 'Шпионы попадаются на мелочах',
  nhd: 'Нет худа без добра', heb: 'החקירה הראשונה של הבלש הפרטי', razg: 'Разговорник русский-иврит'
};

const enc = new TextEncoder();
const b64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const keyHex = env => String(env.BOOK_KEY || '').replace(/\s/g, '');

export const hasBookKey = env => /^[0-9a-fA-F]{64}$/.test(keyHex(env));

async function signKey(env) {
  // a separate key for signing, derived from BOOK_KEY, so one secret serves both jobs
  const raw = await crypto.subtle.digest('SHA-256', enc.encode('yurimoor-sign:' + keyHex(env)));
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function seal(env, obj) {
  const body = b64u(enc.encode(JSON.stringify(obj)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await signKey(env), enc.encode(body)));
  return body + '.' + b64u(sig);
}

// the object, or null when the token was changed or not made with our key
export async function unseal(env, token) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const ok = await crypto.subtle.verify('HMAC', await signKey(env), unb64u(sig), enc.encode(body));
    return ok ? JSON.parse(new TextDecoder().decode(unb64u(body))) : null;
  } catch (e) { return null; }
}

// .bin layout: 16-byte IV, then AES-256-CBC ciphertext with PKCS#7 padding (what openssl enc writes)
export async function decryptBook(env, buf) {
  const k = await crypto.subtle.importKey('raw', Uint8Array.from(keyHex(env).match(/../g), h => parseInt(h, 16)), { name: 'AES-CBC' }, false, ['decrypt']);
  const bytes = new Uint8Array(buf);
  return crypto.subtle.decrypt({ name: 'AES-CBC', iv: bytes.slice(0, 16) }, k, bytes.slice(16));
}
