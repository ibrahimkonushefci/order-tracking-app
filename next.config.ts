import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from '@serwist/next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// The service worker is built only for production (`next build --webpack`);
// Serwist doesn't support Turbopack, which `next dev` uses (hence the silenced warning).
process.env.SERWIST_SUPPRESS_TURBOPACK_WARNING ??= '1';
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
});

const config: NextConfig = {
  poweredByHeader: false,
  // The dev badge sits on top of the sidebar's user block.
  devIndicators: false,
  // /setup uploads a logo (≤ 2 MB) through a server action.
  experimental: { serverActions: { bodySizeLimit: '3mb' } },
  // Brand files are read at runtime; make sure deployments include them.
  outputFileTracingIncludes: { '*': ['brands/**'] },
  // PGlite ships WASM + data files and must be loaded by Node, not bundled.
  serverExternalPackages: ['@electric-sql/pglite'],
  // The approved v10 prototype is a standalone design reference, never part of the app.
  outputFileTracingExcludes: { '*': ['prototype/**', 'data/**'] },
};

export default withSerwist(withNextIntl(config));
