/** Reading and writing /brands/<slug>/ (no Next.js imports, so scripts and tests can use it). */
import fs from 'node:fs/promises';
import path from 'node:path';
import { FALLBACK_BRAND } from './fallback';
import { brandSchema, type Brand } from './schema';

export const BRANDS_DIR = path.resolve(process.cwd(), 'brands');
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface LoadedBrand {
  brand: Brand;
  /** data: URL of the logo, or null (the UI shows the initial instead). */
  logoUrl: string | null;
  /** True when the requested brand was missing or invalid and the neutral one is used. */
  fallback: boolean;
}

const MIME: Record<string, string> = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

export async function readBrand(slug: string | undefined | null): Promise<LoadedBrand> {
  if (!slug || !SLUG_RE.test(slug)) return { brand: FALLBACK_BRAND, logoUrl: null, fallback: true };
  const dir = path.join(BRANDS_DIR, slug);
  try {
    const raw = JSON.parse(await fs.readFile(path.join(dir, 'brand.json'), 'utf8'));
    const brand = brandSchema.parse(raw);
    let logoUrl: string | null = null;
    const ext = path.extname(brand.logo.src).toLowerCase();
    if (MIME[ext] && !brand.logo.src.includes('/') && !brand.logo.src.includes('..')) {
      try {
        const buf = await fs.readFile(path.join(dir, brand.logo.src));
        logoUrl = `data:${MIME[ext]};base64,${buf.toString('base64')}`;
      } catch {
        logoUrl = null;
      }
    }
    return { brand, logoUrl, fallback: false };
  } catch {
    return { brand: FALLBACK_BRAND, logoUrl: null, fallback: true };
  }
}

export async function listBrandSlugs(): Promise<string[]> {
  try {
    const entries = await fs.readdir(BRANDS_DIR, { withFileTypes: true });
    return entries.filter(e => e.isDirectory() && SLUG_RE.test(e.name)).map(e => e.name).sort();
  } catch {
    return [];
  }
}

/** Writes a validated brand and its logo (from /setup). Never overwrites another file type's logo silently. */
export async function writeBrand(brand: Brand, logo?: { ext: '.svg' | '.png'; data: Buffer }) {
  const parsed = brandSchema.parse(brand);
  const dir = path.join(BRANDS_DIR, parsed.slug);
  await fs.mkdir(dir, { recursive: true });
  if (logo) {
    const name = `logo${logo.ext}`;
    await fs.writeFile(path.join(dir, name), logo.data);
    parsed.logo = { ...parsed.logo, src: name };
  }
  await fs.writeFile(path.join(dir, 'brand.json'), JSON.stringify(parsed, null, 2) + '\n');
  return parsed;
}
