import type { Metadata, Viewport } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getActiveBrand } from '@/brand/active';
import { brandCssVars } from '@/brand/theme';
import { themeScript } from '@/lib/theme-script';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const { brand, fallback } = await getActiveBrand();
  return {
    title: {
      default: fallback ? brand.companyName : `${brand.companyName} · Porositë`,
      template: `%s · ${brand.companyName}`,
    },
    applicationName: brand.shortName,
    robots: { index: false, follow: false },
    manifest: '/manifest.webmanifest',
    icons: { icon: '/brand/logo', apple: '/brand/icon/180' },
    appleWebApp: { capable: true, title: brand.shortName, statusBarStyle: 'default' },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { brand } = await getActiveBrand();
  return { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: brand.colors.primary };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { brand } = await getActiveBrand();
  return (
    <html lang="sq" suppressHydrationWarning style={brandCssVars(brand.colors) as CSSProperties}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preload" href="/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
