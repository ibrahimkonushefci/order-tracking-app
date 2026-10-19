'use client';
/** "+ Porosi e re": the five fields and the place, plus the project switch. Lands on the new order. */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createOrderAction } from '../../actions';
import { Chips, Field, FormAlert, MethodField, MoneyInput, useAction } from '@/components/forms';
import { PHONE_CODES } from '@/lib/phone';

const UNITS = ['copë', 'm²', 'banesa'] as const;

export function NewOrderForm({ products, cities, homeCity, depositWord, clients }: { products: string[]; cities: string[]; homeCity: string; depositWord: string; clients: string[] }) {
  const t = useTranslations('newOrder');
  const w = useTranslations('words');
  const [product, setProduct] = useState(products[0]);
  const [method, setMethod] = useState('cash');
  const [project, setProject] = useState(false);
  const [unit, setUnit] = useState<(typeof UNITS)[number]>('copë');
  const [term, setTerm] = useState('month');
  const { errors, pending, submit } = useAction(createOrderAction);
  return (
    <form className="card narrow form-page form-page--order" onSubmit={submit} noValidate>
      <div className="card__body form">
        <Field name="name" label={t('client')} req errors={errors} help={t('clientHelp')} htmlFor="no-name">
          <input className="input" id="no-name" name="name" autoComplete="off" placeholder={t('clientPh')} list="no-clients" />
          <datalist id="no-clients">
            {clients.map(c => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field name="phone" label={t('phone')} req errors={errors} htmlFor="f-phone">
          <div className="input-group">
            <select className="select" name="phoneCc" aria-label={t('prefix')} defaultValue="+383">
              {PHONE_CODES.map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input className="input" id="f-phone" name="phone" inputMode="tel" placeholder="44 123 456" autoComplete="off" />
          </div>
        </Field>
        <Field name="productType" label={t('product')} req errors={errors}>
          <Chips name="productType" value={product} onChange={setProduct} options={products.map(p => [p, p] as const)} />
          <input className="input" name="description" placeholder={t('descriptionPh')} autoComplete="off" aria-label={t('description')} />
        </Field>
        <Field name="price" label={t('price')} req errors={errors} htmlFor="m-price">
          <MoneyInput name="price" />
        </Field>
        <Field name="deposit" label={depositWord} opt errors={errors} htmlFor="m-deposit">
          <MoneyInput name="deposit" />
        </Field>
        <MethodField value={method} onChange={setMethod} label={t('paidWith', { word: depositWord })} />
        <Field label={t('city')} help={t('directionsHelp')} htmlFor="no-city">
          <select className="select" id="no-city" name="city" defaultValue={homeCity}>
            {cities.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <textarea className="textarea" name="directions" aria-label={t('directions')} placeholder={t('directionsPh')} />
        </Field>
        <Field label={t('note')} opt={t('noteOpt')} htmlFor="no-note">
          <textarea className="textarea" id="no-note" name="internalNote" style={{ minHeight: 64 }} />
        </Field>
        <label className="check">
          <input type="checkbox" name="project" value="1" checked={project} onChange={e => setProject(e.target.checked)} />
          <span>
            {t('projectSwitch')}
            <span className="check__sub">{t('projectSwitchSub')}</span>
          </span>
        </label>
        {project ? (
          <div className="form" data-show-if="project=1">
            <Field name="quantity" label={t('quantity')} req errors={errors} help={t('quantityHelp')} htmlFor="f-qty">
              <div className="row row--wrap">
                <input className="input" id="f-qty" name="quantity" inputMode="numeric" placeholder={t('quantityPh')} style={{ maxWidth: 120 }} />
                <Chips name="unit" value={unit} onChange={setUnit} options={UNITS.map(u => [u, u] as const)} />
              </div>
            </Field>
            <Field label={t('eachPart')} help={t('eachPartHelp')}>
              <Chips name="projectPayTerm" value={term} onChange={setTerm} options={(['week', 'month', 'unknown'] as const).map(k => [k, w(`term.${k}`)] as const)} />
            </Field>
          </div>
        ) : null}
        <FormAlert errors={errors} />
        <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={pending}>
          {pending ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  );
}
