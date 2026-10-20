import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { isDemoMode } from '@/brand/active';
import { demoPhone } from '@/server/demo';
import { openingTotals, orderTotals } from '@/domain/balances';
import { lastReminder } from '@/domain/debts';
import { LANGS, openingMessage, orderMessage, reminderCheck, templatesFor, type Lang, type MessageKind } from '@/domain/messages';
import { Compose } from '@/components/compose';
import { Icon } from '@/components/icons';
import { Page, PageHead } from '@/components/shell/shell';
import { fmtDate } from '@/lib/dates';
import { ago } from '@/lib/fmt';
import { loadOpening, loadOrder } from '@/services/book';
import { pageContext } from '@/server/context';
import { trackingUrl } from '@/server/jobs';
import { senderFor } from '@/server/sender';

/** "Shkruaj klientit" and the green "Kujtesë": a prepared message in the client's language, sent by hand. */
export default async function ComposePage({ params, searchParams }: { params: Promise<{ kind: string; id: string }>; searchParams: Promise<{ t?: string; lang?: string }> }) {
  const { kind, id } = await params;
  const q = await searchParams;
  if (kind !== 'order' && kind !== 'opening') notFound();
  const { db, companyId, today, user } = await pageContext();
  const t = await getTranslations('compose');
  const w = await getTranslations('words');
  const tt = await getTranslations('time');
  const { sender, templates } = await senderFor(user);

  let to, text, list: MessageKind[], type: MessageKind, lang: Lang, title: string, sub: string, back: string, check, last;
  if (kind === 'order') {
    const o = await loadOrder(db, companyId, id);
    if (!o) notFound();
    list = templatesFor(o, today);
    type = list.find(x => x === q.t) ?? list[0];
    lang = LANGS.find(l => l === q.lang) ?? o.client.language;
    text = orderMessage(type, o, lang, await trackingUrl(o.trackingToken), sender, today, templates);
    to = { name: o.client.name, phone: o.client.phone, channel: o.client.channel };
    title = type === 'deposit' ? w('msgType.deposit', { word: sender.depositWord }) : w(`msgType.${type}`);
    sub = `${o.number} · ${o.client.name}`;
    back = `/orders/${o.id}`;
    check = reminderCheck(orderTotals(o), o, o.client.noReminders, today);
    last = lastReminder(o.messages);
  } else {
    const ob = await loadOpening(db, companyId, id);
    if (!ob || !ob.phone) notFound();
    list = ['reminder', 'free'];
    type = list.find(x => x === q.t) ?? 'reminder';
    lang = LANGS.find(l => l === q.lang) ?? ob.language;
    const tot = openingTotals(ob);
    text = openingMessage(type as 'reminder' | 'free', ob, tot.owed, lang, sender, templates);
    to = { name: ob.name, phone: ob.phone, channel: ob.channel };
    title = w(`msgType.${type}`);
    sub = `${w('opening')} · ${ob.name}`;
    back = `/debts/${ob.id}`;
    check = reminderCheck(tot, ob, ob.noReminders, today);
    last = lastReminder(ob.messages);
  }
  const href = (p: { t?: string; lang?: string }) => `/compose/${kind}/${id}?t=${p.t ?? type}&lang=${p.lang ?? lang}`;
  const reason = !check.ok
    ? t(`reason.${check.reason}`, {
        date: fmtDate(check.dueDate ?? check.until ?? null),
        ago: check.lastAt ? ago(check.lastAt, today, tt) : '',
      })
    : '';
  const lastIso = last ? (typeof last.sentAt === 'string' ? last.sentAt : last.sentAt.toISOString()).slice(0, 10) : null;
  return (
    <Page nav={kind === 'opening' || type === 'reminder' ? 'debts' : 'orders'}>
      <PageHead back={back} backLabel={t('back')} title={title} sub={sub} />
      <Compose
        key={`${type}-${lang}`}
        to={to}
        text={text}
        log={{ kind: 'customer', record: kind, id, type, language: lang }}
        demo={isDemoMode()}
        demoPhone={await demoPhone()}
        sender={sender.companyName}
      >
        {list.length > 1 ? (
          <div className="field">
            <span className="label">{t('templates')}</span>
            <div className="chips chips--scroll">
              {list.map(x => (
                <Link key={x} className={`chip${x === type ? ' is-on' : ''}`} href={href({ t: x })} aria-current={x === type ? 'true' : undefined} replace>
                  <span>{x === 'deposit' ? w('msgType.deposit', { word: sender.depositWord }) : w(`msgType.${x}`)}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        <div className="field">
          <span className="label">{t('language')}</span>
          <div className="chips">
            {LANGS.map(l => (
              <Link key={l} className={`chip${l === lang ? ' is-on' : ''}`} href={href({ lang: l })} aria-current={l === lang ? 'true' : undefined} replace>
                <span>{w(`lang.${l}`)}</span>
              </Link>
            ))}
          </div>
        </div>
        {type === 'reminder' && last && lastIso ? (
          <div className="note-line">
            <Icon name="message" />
            <span>{t('lastReminder', { ago: ago(lastIso, today, tt), channel: w(`channelName.${last.channel}`) })}</span>
          </div>
        ) : null}
        {type === 'reminder' && !check.ok ? (
          <div className="callout callout--warning">
            <Icon name="alert" />
            <span>
              <b>{t('notNow')}</b> {reason}. {t('notNowTail')}
            </span>
          </div>
        ) : null}
      </Compose>
    </Page>
  );
}
