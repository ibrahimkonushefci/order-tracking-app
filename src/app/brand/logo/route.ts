import { getActiveBrand } from '@/brand/active';

/** The active brand's logo (favicon, PWA icon). Without a logo: the initial on the brand colour. */
export async function GET() {
  const { brand, logoUrl } = await getActiveBrand();
  // Uploaded SVGs are untrusted: never let one run as a document on this origin.
  const headers = {
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  };
  if (logoUrl) {
    const [, mime, b64] = /^data:([^;]+);base64,(.*)$/.exec(logoUrl) ?? [];
    if (mime && b64) return new Response(Buffer.from(b64, 'base64'), { headers: { ...headers, 'Content-Type': mime } });
  }
  const letter = brand.companyName.slice(0, 1).toUpperCase().replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${brand.colors.primary}"/><text x="32" y="42" font-family="system-ui,sans-serif" font-size="30" font-weight="600" text-anchor="middle" fill="#fff">${letter}</text></svg>`;
  return new Response(svg, { headers: { ...headers, 'Content-Type': 'image/svg+xml' } });
}
