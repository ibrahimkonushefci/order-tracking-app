import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // prototype/ is the standalone v10 design reference; it is never linted with the app.
  globalIgnores([
    '.next/**',
    'out/**',
    'next-env.d.ts',
    '.claude/**',
    'prototype/**',
    'data/**',
    'public/sw.js',
    'playwright-report/**',
    'test-results/**',
  ]),
]);
