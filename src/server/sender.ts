import 'server-only';
import { getActiveBrand } from '@/brand/active';
import { getCompany } from '@/db/queries';
import type { Sender } from '@/domain/messages';

/** Who signs customer messages ("Teuta, Druri Design") and the company's own template wording. */
export async function senderFor(user: { firstName: string; companyId: string | null }) {
  const [{ brand }, company] = await Promise.all([getActiveBrand(), getCompany(user.companyId)]);
  const sender: Sender = {
    staffName: user.firstName,
    companyName: brand.companyName,
    companyPhone: brand.contact.phone,
    reviewUrl: brand.contact.googleReviewUrl,
    depositWord: company?.depositWord ?? brand.depositWord,
  };
  return { sender, templates: company?.templates ?? {}, brand };
}
