/**
 * brand.json v2: the single shared brand format for my products
 * (order tracking, 3d_designer, Doors & laminate). Self-contained so it can be
 * copied into a shared package later: depends only on zod.
 */
import { z } from 'zod';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Ngjyra duhet të jetë në formatin #RRGGBB');
const lang = z.enum(['sq', 'en', 'de']);
const optText = z.string().default('');

export const BUSINESS_TYPES = ['kitchens', 'furniture', 'doors_floors', 'doors_windows'] as const;

export const brandSchema = z.object({
  schemaVersion: z.literal(2),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug: vetëm shkronja të vogla, numra dhe viza'),
  companyName: z.string().min(1, 'Emri i kompanisë mungon'),
  shortName: z.string().min(1),
  tagline: z.partialRecord(lang, z.string()).default({}),
  logo: z.object({ src: z.string().min(1), alt: z.string().default('') }),
  colors: z.object({ primary: hex, accent: hex, background: hex, text: hex }),
  font: z.string().default('Inter'),
  contact: z
    .object({
      phone: optText,
      whatsapp: optText,
      viber: optText,
      email: optText,
      address: optText,
      city: optText,
      mapsUrl: optText,
      googleReviewUrl: optText,
    })
    .prefault({}),
  legal: z
    .object({
      businessNumber: optText,
      fiscalNumber: optText,
      vatNumber: optText,
      bankName: optText,
      iban: optText,
      website: optText,
    })
    .prefault({}),
  languages: z.array(lang).min(1).default(['sq']),
  defaultLanguage: lang.default('sq'),
  businessType: z.enum(BUSINESS_TYPES),
  /** Default for the company's deposit word; the setting can change it. */
  depositWord: z.enum(['Avans', 'Kapar']).default('Avans'),
  modules: z.record(z.string(), z.boolean()).default({ orderTracking: true }),
});

export type Brand = z.infer<typeof brandSchema>;
