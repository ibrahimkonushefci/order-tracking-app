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
