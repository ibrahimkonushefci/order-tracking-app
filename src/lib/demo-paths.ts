/**
 * Where a demo brand switch lands. Record screens (an order, a notebook debt, a customer
 * message, an installer send screen) belong to one company, so after switching to another
 * brand's company they fall back to their list; every other screen is kept as it is.
 */
export function pathAfterBrandSwitch(path: string): string {
  const p = path.split(/[?#]/)[0];
  if (/^\/orders\/(?!new$)[^/]+/.test(p)) return '/orders';
  if (/^\/debts\/(?!new$)[^/]+/.test(p)) return '/debts';
  if (/^\/compose\/opening\//.test(p)) return '/debts';
  if (/^\/compose\//.test(p)) return '/orders';
  if (/^\/send\//.test(p)) return '/schedule';
  return path;
}

/**
 * The demo bar's brand link: the current screen with its filters (`?stage=…&view=…`), or, for
 * the other brand, where the switch lands. `search` is the current query string without "?".
 */
export function brandSwitchHref(path: string, search: string, slug: string, same: boolean): string {
  const q = new URLSearchParams(search);
  q.delete('brand');
  const here = q.size ? `${path}?${q}` : path;
  const base = same ? here : pathAfterBrandSwitch(here);
  return `${base}${base.includes('?') ? '&' : '?'}brand=${slug}`;
}
