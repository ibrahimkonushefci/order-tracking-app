'use server';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/auth/session';
import { grantSetupAccess, hasSetupAccess, pinMatches } from '@/auth/setup-pin';
import { BRAND_COOKIE, getActiveBrand, isDemoMode } from '@/brand/active';
import { writeBrand } from '@/brand/files';
import { BUSINESS_TYPES, brandSchema } from '@/brand/schema';
import { slugify } from '@/brand/slug';
import { getDb } from '@/db/client';
import { company, history } from '@/db/schema';

export type PinState = { error?: boolean };

export async function submitPin(_prev: PinState, form: FormData): Promise<PinState> {
  await requirePermission('setup');
  if (!isDemoMode()) return { error: true };
  if (!pinMatches(String(form.get('pin') ?? '').trim())) return { error: true };
  await grantSetupAccess();
  revalidatePath('/setup');
  return {};
}

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const fieldsSchema = z.object({
  companyName: z.string().trim().min(2).max(60),
  shortName: z.string().trim().min(1).max(24),
  phone: z
    .string()
    .trim()
    .regex(/^\+\d{8,15}$/),
  city: z.string().trim().min(2).max(40),
  businessType: z.enum(BUSINESS_TYPES),
  depositWord: z.enum(['Avans', 'Kapar']),
  primary: hex,
  accent: hex,
});

type Field = keyof z.infer<typeof fieldsSchema>;
/** Errors are i18n keys under `setup` (the form translates them), never raw zod text. */
export type SetupErrorKey = `errors.${Field}` | 'logoInvalid' | 'pinExpired';
export type ApplyState = { ok?: boolean; errors?: Partial<Record<Field | 'logo', SetupErrorKey>> };

const MAX_LOGO = 2 * 1024 * 1024;

async function readLogo(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (file.size > MAX_LOGO) return null;
  const data = Buffer.from(await file.arrayBuffer());
  const isPng = data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (isPng) return { ext: '.png' as const, data };
  const text = data.toString('utf8');
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text) && !/<script|on\w+\s*=|javascript:/i.test(text))
    return { ext: '.svg' as const, data };
  return null;
}

/** "Apliko": writes /brands/<slug>/ (laptop demo), switches this browser to it, updates the company. */
export async function applyBrand(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const u = await requirePermission('setup');
  if (!isDemoMode() || !(await hasSetupAccess())) return { errors: { companyName: 'pinExpired' } };
  const parsed = fieldsSchema.safeParse(Object.fromEntries(form));
  const logo = await readLogo(form.get('logo'));
  if (!parsed.success || logo === null) {
    const errors: ApplyState['errors'] = {};
    if (!parsed.success)
      for (const i of parsed.error.issues) {
        const k = i.path[0] as Field;
        errors[k] ??= `errors.${k}`;
      }
    if (logo === null) errors.logo = 'logoInvalid';
    return { errors };
  }
  const f = parsed.data;
  const { brand: current, fallback } = await getActiveBrand();
  const slug = slugify(f.companyName) || 'brand';
  const base = fallback ? undefined : current;
  const sameBrand = base?.slug === slug;
  // 'none' (no file extension) means "no logo": the UI shows the initial on the brand colour.
  const logoSrc = logo ? `logo${logo.ext}` : sameBrand ? base!.logo.src : 'none';
  const brand = brandSchema.parse({
    // Editing the same brand keeps its other fields; a new company starts clean.
    ...(sameBrand ? base : {}),
    schemaVersion: 2,
    slug,
    companyName: f.companyName,
    shortName: f.shortName,
    tagline: sameBrand ? base!.tagline : {},
    logo: { src: logoSrc, alt: f.companyName },
    colors: { primary: f.primary.toUpperCase(), accent: f.accent.toUpperCase(), background: '#FFFFFF', text: '#1A1A1A' },
    contact: { ...(sameBrand ? base!.contact : {}), phone: f.phone, whatsapp: f.phone, viber: f.phone, city: f.city },
    businessType: f.businessType,
    depositWord: f.depositWord,
    demo: true,
  });
  await writeBrand(brand, logo);

  (await cookies()).set(BRAND_COOKIE, slug, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  if (u.companyId) {
    const db = await getDb();
    await db.transaction(async tx => {
      const [c] = await tx.select().from(company).where(eq(company.id, u.companyId!)).limit(1);
      if (!c) return;
      await tx.update(company).set({ brandSlug: slug, depositWord: f.depositWord }).where(eq(company.id, c.id));
      await tx.insert(history).values({
        companyId: c.id,
        recordType: 'settings',
        userId: u.id,
        text: `Marka: ${c.brandSlug} → ${slug}`,
        field: 'brand',
        oldValue: c.brandSlug,
        newValue: slug,
      });
    });
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}
