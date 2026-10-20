import type { MetadataRoute } from 'next';
import { getActiveBrand } from '@/brand/active';

/** Installable on phones (Android "Instalo aplikacionin", iPhone "Shto në ekranin kryesor"), with the brand's icon. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { brand } = await getActiveBrand();
  return {
    id: '/',
    name: `${brand.companyName} · Porositë`,
    short_name: brand.shortName,
    description: brand.tagline.sq || `${brand.companyName}: porositë, pagesat dhe borxhet`,
    lang: 'sq',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F7F8F7',
    theme_color: brand.colors.primary,
    icons: [
      { src: '/brand/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/brand/icon/512?maskable=1',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: '/brand/logo', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
