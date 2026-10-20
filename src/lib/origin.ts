/** The origin the browser used: the server may listen on 0.0.0.0, which is not the browser's host. */
export function browserOrigin(req: Request): string {
  const h = req.headers;
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? new URL(req.url).host;
  const proto = h.get('x-forwarded-proto') ?? new URL(req.url).protocol.replace(':', '');
  return `${proto}://${host}`;
}
