import type { MetadataRoute } from 'next';
import { getActiveBrand } from '@/brand/active';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { brand } = await getActiveBrand();
  return {
    name: `${brand.companyName} · Porositë`,
    short_name: brand.shortName,
    lang: 'sq',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F7F8F7',
    theme_color: brand.colors.primary,
    icons: [{ src: '/brand/logo', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
