/**
 * Product chips per business type (brand.json `businessType`), used by "+ Porosi e re"
 * until the company sets its own list (Cilësimet → product types, `company.productTypes`).
 */
import type { Brand } from '@/brand/schema';

export const PRODUCTS: Record<Brand['businessType'], string[]> = {
  kitchens: ['Kuzhinë', 'Garderobë', 'Dollap banjoje', 'Mobilje dhome ditore'],
  furniture: ['Dhomë gjumi', 'Garderobë', 'Mobilje dhome ditore', 'Tavolinë ngrënieje'],
  doors_floors: ['Dyer të brendshme', 'Parket laminat', 'Derë hyrëse', 'Dysheme'],
  doors_windows: ['Dritare PVC', 'Derë hyrëse', 'Dritare alumini', 'Grilla'],
};

export function productTypes(companyList: string[] | null | undefined, businessType: Brand['businessType']): string[] {
  return companyList?.length ? companyList : PRODUCTS[businessType] ?? PRODUCTS.kitchens;
}

/** "Ku bëhet puna": one tap; defaults to the company's city. */
export const CITIES = ['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Ferizaj', 'Gjilan', 'Mitrovicë', 'Podujevë', 'Vushtrri', 'Suharekë', 'Lipjan', 'Fushë Kosovë'];

export function citiesFor(home: string | undefined): string[] {
  return [...new Set([home, ...CITIES].filter((c): c is string => !!c))];
}
