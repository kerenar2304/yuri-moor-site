/* One address for the whole site: www and the Pages preview host send visitors (and Google) to https://yurimoor.co.il,
   keeping the path and query. Deploy previews (<hash>.yuri-moor-site.pages.dev) are left alone. */
const MAIN = 'yurimoor.co.il';
const MOVE = new Set(['www.yurimoor.co.il', 'yuri-moor-site.pages.dev']);

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (MOVE.has(url.hostname)) {
    url.hostname = MAIN; url.protocol = 'https:'; url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
