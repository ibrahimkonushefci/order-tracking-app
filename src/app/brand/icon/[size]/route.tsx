import { ImageResponse } from 'next/og';
import { getActiveBrand } from '@/brand/active';

const SIZES = new Set([180, 192, 512]);

/**
 * PNG app icons for the PWA install and the iPhone home screen, made from the active brand's
 * logo: `/brand/icon/192`, `/brand/icon/512`, `/brand/icon/180` (Apple), and `?maskable=1`
 * with the wider safe margin Android needs. Without a logo: the initial on the brand colour.
 */
export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response('Not found', { status: 404 });
  const maskable = new URL(req.url).searchParams.has('maskable');
  const { brand, logoUrl } = await getActiveBrand();
  const inner = Math.round(size * (maskable ? 0.58 : 0.78));
  const body = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} width={inner} height={inner} alt="" style={{ objectFit: 'contain' }} />
  ) : (
    <div style={{ fontSize: Math.round(size * 0.46), fontWeight: 600, color: '#fff' }}>
      {brand.companyName.slice(0, 1).toUpperCase()}
    </div>
  );
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: logoUrl ? '#FFFFFF' : brand.colors.primary,
      }}
    >
      {body}
    </div>,
    { width: size, height: size, headers: { 'Cache-Control': 'no-cache' } },
  );
}
