import { NextResponse, type NextRequest } from 'next/server';
import { browserOrigin } from './lib/origin';

/**
 * Demo mode only: `?brand=<slug>` switches the brand. The request goes to /demo/brand, which
 * remembers it in a cookie and, when someone is signed in, moves the session to the same role
 * in that brand's demo company (so the logo and the data agree), then returns to this URL
 * without the parameter. Auth is NOT checked here: every page and server action checks the
 * session and role itself.
 */
export function proxy(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('brand');
  if (slug === null || process.env.DEMO_MODE !== 'true') return NextResponse.next();
  const back = new URLSearchParams(req.nextUrl.search);
  back.delete('brand');
  const next = req.nextUrl.pathname + (back.size ? `?${back}` : '');
  return NextResponse.redirect(
    new URL(`/demo/brand?${new URLSearchParams({ slug, next })}`, browserOrigin(req)),
  );
}

export const config = { matcher: ['/((?!_next/|api/|demo/|sw.js|fonts/|favicon).*)'] };
