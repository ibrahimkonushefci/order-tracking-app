import { getTranslations } from 'next-intl/server';
import { getActiveBrand } from '@/brand/active';
import { citiesFor, productTypes } from '@/domain/catalog';
import { Page, PageHead } from '@/components/shell/shell';
import { getCompany } from '@/db/queries';
import { clientNames } from '@/services/book';
import { pageContext } from '@/server/context';
import { NewOrderForm } from './new-order-form';

export default async function NewOrderPage() {
  const { db, companyId } = await pageContext();
  const [company, { brand }, clients] = await Promise.all([getCompany(companyId), getActiveBrand(), clientNames(db, companyId)]);
  const t = await getTranslations('newOrder');
  return (
    <Page nav="orders">
      <PageHead back="/orders" backLabel={t('back')} title={t('title')} sub={t('sub')} />
      <NewOrderForm
        products={productTypes(company?.productTypes, brand.businessType)}
        cities={citiesFor(brand.contact.city)}
        homeCity={brand.contact.city || 'Prishtinë'}
        depositWord={company?.depositWord ?? brand.depositWord}
        clients={clients.map(c => c.name)}
      />
    </Page>
  );
}
