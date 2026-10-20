'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/auth/session';
import { grantSetupAccess, hasSetupAccess, pinMatches } from '@/auth/setup-pin';
import { getActiveBrand, isDemoMode } from '@/brand/active';
import { writeBrand } from '@/brand/files';
import { BUSINESS_TYPES, brandSchema } from '@/brand/schema';
import { slugify } from '@/brand/slug';
import { writePeople } from '@/db/demo/load';
import { DEFAULT_PEOPLE } from '@/db/demo/seed';
import { resetDemo, signInDemo } from '@/server/demo';

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
  owner: z
    .string()
    .trim()
    .max(60)
    .refine(v => v === '' || v.length >= 2),
  office: z
    .string()
    .trim()
    .max(60)
    .refine(v => v === '' || v.length >= 2),
});

type Field = keyof z.infer<typeof fieldsSchema>;
/** Errors are i18n keys under `setup` (the form translates them), never raw zod text. */
export type SetupErrorKey = `errors.${Field}` | 'logoInvalid' | 'pinExpired';
export type ApplyState = {
  ok?: boolean;
  readOnly?: boolean;
  errors?: Partial<Record<Field | 'logo', SetupErrorKey>>;
};

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

/** "Apliko dhe rimbush demon": writes /brands/<slug>/ (laptop demo), reseeds the demo data and signs in as its Pronari. */
export async function applyBrand(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  await requirePermission('setup');
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
  try {
    await writeBrand(brand, logo);
    if (f.owner || f.office || !sameBrand)
      await writePeople(slug, {
        owner: f.owner || DEFAULT_PEOPLE.owner.name,
        office: f.office || DEFAULT_PEOPLE.office.name,
      });
  } catch {
    // A deployment's file system is read-only: brands are added through Git there.
    return { readOnly: true };
  }
  // "Apply & reseed demo": the demo data starts again, this brand as its own company with its
  // name, city and business type; this browser continues as its Pronari.
  await resetDemo(slug);
  await signInDemo('owner', slug);
  redirect('/');
}
