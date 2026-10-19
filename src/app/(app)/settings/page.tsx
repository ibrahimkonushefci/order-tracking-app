import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { can } from '@/auth/permissions';
import { requireUser } from '@/auth/session';
import { getActiveBrand, isDemoMode } from '@/brand/active';
import { getCompany, listInstallers, listUsers } from '@/db/queries';
import { Icon } from '@/components/icons';
import { Page, PageHead } from '@/components/shell/shell';
import { ThemeSeg } from '@/components/theme';
import { fmtPhone } from '@/lib/phone';
import { logout } from '@/auth/actions';
import { setDemoDays, setDepositWord } from './actions';
import { InstallerButton, TemplatesEditor } from '@/components/settings';
import { pageContext } from '@/server/context';
import { fmtLong } from '@/lib/dates';

export default async function SettingsPage() {
  const me = await requireUser();
  const t = await getTranslations();
  const { brand } = await getActiveBrand();
  const c = await getCompany(me.companyId);
  const [users, installers] = c ? await Promise.all([listUsers(c.id), listInstallers(c.id)]) : [[], []];
  const owner = can(me.role, 'settings');
  const word = c?.depositWord ?? brand.depositWord;
  const { today, offset } = await pageContext();
  return (
    <Page nav="settings">
      <PageHead title={t('settings.title')} sub={brand.companyName} />

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">{t('settings.users')}</h2>
        </div>
        <div className="card__body">
          <div className="list list--flush">
            {users.map(u => (
              <div key={u.id} className="list-row list-row--tight">
                <span className="list-row__icon">
                  <Icon name="user" />
                </span>
                <span className="grow">
                  <b>{u.firstName || u.name}</b>{' '}
                  <span className="muted small">
                    · {t(`role.${u.role}`)}
                    {u.id === me.id ? ` ${t('user.you')}` : ''}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="help">{t('settings.usersHelp')}</div>
          {/* The sidebar's logout is hidden on phones, so Cilësimet carries one too. */}
          <form action={logout} className="btn-row">
            <button className="btn btn--secondary" type="submit">
              <Icon name="logout" /> {t('user.logoutAs', { name: me.firstName })}
            </button>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">{t('settings.installers')}</h2>
          <InstallerButton className="card__link">
            <Icon name="plus" /> {t('installers.add')}
          </InstallerButton>
        </div>
        <div className="card__body">
          <div className="list list--flush">
            {installers.map(i => (
              <div key={i.id} className="list-row list-row--tight">
                <span className="list-row__icon">
                  <Icon name="tool" />
                </span>
                <span className="grow">
                  <b>{i.name}</b>
                  {i.active ? null : <span className="muted small"> · {t('installers.inactive')}</span>}
                  <br />
                  <span className="small muted">
                    {fmtPhone(i.phone)} · {t(`channel.${i.channel}`)}
                  </span>
                </span>
                <InstallerButton installer={{ id: i.id, name: i.name, phone: i.phone, channel: i.channel, active: i.active }} className="icon-btn" ariaLabel={t('installers.editLabel', { name: i.name })}>
                  <Icon name="edit" />
                </InstallerButton>
                <a className="icon-btn icon-btn--call" href={`tel:${i.phone}`} aria-label={t('settings.call', { name: i.name })}>
                  <Icon name="phone" />
                </a>
              </div>
            ))}
          </div>
          <div className="help">{t('settings.installersHelp')}</div>
        </div>
      </section>

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">{t('settings.appearance')}</h2>
        </div>
        <div className="card__body">
          <ThemeSeg />
          <div className="help">{t('settings.appearanceHelp')}</div>
        </div>
      </section>

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">{t('settings.deposit')}</h2>
        </div>
        <div className="card__body">
          <form action={setDepositWord} className="seg">
            {(['Avans', 'Kapar'] as const).map(w => (
              <button key={w} type="submit" name="word" value={w} aria-pressed={word === w} disabled={!owner}>
                {w}
              </button>
            ))}
          </form>
          <div className="help">
            {t('settings.depositHelp')}
            {owner ? '' : ` ${t('settings.depositOwnerOnly')}`}
          </div>
        </div>
      </section>

      {owner && isDemoMode() ? (
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">{t('settings.brand')}</h2>
          </div>
          <div className="card__body">
            <div className="help">{t('settings.brandHelp')}</div>
            <div className="btn-row">
              <Link className="btn btn--secondary" href="/setup">
                <Icon name="edit" /> {t('settings.brandSetup')}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">{t('templates.title')}</h2>
        </div>
        <div className="card__body">
          <div className="help">{t('templates.help')}</div>
          {owner ? (
            <TemplatesEditor saved={c?.templates ?? {}} />
          ) : (
            <div className="callout callout--neutral">
              <Icon name="help" />
              <span>{t('templates.ownerOnly')}</span>
            </div>
          )}
        </div>
      </section>

      {isDemoMode() ? (
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">{t('demoDate.title')}</h2>
          </div>
          <div className="card__body">
            <div className="small">{t('demoDate.now', { date: fmtLong(today), n: offset })}</div>
            <form action={setDemoDays} className="btn-row">
              <button className="btn btn--secondary" type="submit" name="step" value="1">
                {t('demoDate.plus1')}
              </button>
              <button className="btn btn--secondary" type="submit" name="step" value="7">
                {t('demoDate.plus7')}
              </button>
              <button className="btn btn--ghost" type="submit" name="step" value="reset" disabled={!offset}>
                {t('demoDate.reset')}
              </button>
            </form>
            <div className="help">{t('demoDate.help')}</div>
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="card__head">
          <h2 className="card__title">{t('settings.export')}</h2>
        </div>
        <div className="card__body">
          {can(me.role, 'export') ? (
            <>
              <div className="help">{t('settings.exportHelp')}</div>
              <div className="btn-row">
                <a className="btn btn--primary" href="/api/export?format=xlsx" download>
                  <Icon name="download" /> {t('settings.exportXlsx')}
                </a>
                <a className="btn btn--secondary" href="/api/export?format=json" download>
                  <Icon name="download" /> {t('settings.exportJson')}
                </a>
              </div>
            </>
          ) : (
            <div className="callout callout--neutral">
              <Icon name="help" />
              <span>{t('settings.exportOwnerOnly')}</span>
            </div>
          )}
        </div>
      </section>
    </Page>
  );
}
