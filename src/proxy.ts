import { NextResponse, type NextRequest } from 'next/server';

/**
 * Demo mode only: `?brand=<slug>` switches the brand for this browser (cookie) and
 * redirects to the same URL without the parameter. Auth is NOT checked here:
 * every page and server action checks the session and role itself.
 */
export function proxy(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('brand');
  if (slug === null || process.env.DEMO_MODE !== 'true') return NextResponse.next();
  const url = req.nextUrl.clone();
  url.searchParams.delete('brand');
  const res = NextResponse.redirect(url);
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    res.cookies.set('ot-brand', slug, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  } else {
    res.cookies.delete('ot-brand');
  }
  return res;
}

export const config = { matcher: ['/((?!_next/|api/|sw.js|fonts/|favicon).*)'] };
