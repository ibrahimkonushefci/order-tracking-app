import type { Brand } from './schema';

/** Used when the brand files are missing or invalid: neutral, nameless, still usable. */
export const FALLBACK_BRAND: Brand = {
  schemaVersion: 2,
  slug: 'neutral',
  companyName: 'Porositë',
  shortName: 'Porositë',
  tagline: {},
  logo: { src: '', alt: '' },
  colors: { primary: '#3F4A45', accent: '#9A8F80', background: '#FFFFFF', text: '#1F2421' },
  font: 'Inter',
  contact: { phone: '', whatsapp: '', viber: '', email: '', address: '', city: '', mapsUrl: '', googleReviewUrl: '' },
  legal: { businessNumber: '', fiscalNumber: '', vatNumber: '', bankName: '', iban: '', website: '' },
  languages: ['sq'],
  defaultLanguage: 'sq',
  businessType: 'furniture',
  depositWord: 'Avans',
  modules: { orderTracking: true },
  demo: false,
};
