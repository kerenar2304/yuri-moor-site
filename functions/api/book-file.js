/* GET /api/book-file?t=...
   Hands one decrypted book to Resend, which fetches it as the e-mail attachment.
   The link is signed and lives one hour, so the address alone gives nobody the book. */
import { BOOK_FILE, hasBookKey, unseal, decryptBook } from '../_lib/books.js';

export async function onRequestGet({ request, env }) {
  const no = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (!hasBookKey(env)) return no();
  const t = await unseal(env, new URL(request.url).searchParams.get('t'));
  if (!t || !BOOK_FILE[t.f] || !(t.x > Date.now())) return no();

  const file = await env.ASSETS.fetch(new URL('/books-enc/' + t.f + '.bin', request.url));
  if (!file.ok) return no();
  let pdf;
  try { pdf = await decryptBook(env, await file.arrayBuffer()); } catch (e) { return no(); }
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex',
      'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(BOOK_FILE[t.f] + '.pdf')
    }
  });
}
