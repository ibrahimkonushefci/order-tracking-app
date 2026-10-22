import { getTranslations } from 'next-intl/server';
import { can } from '@/auth/permissions';
import { requireUser } from '@/auth/session';
import { getActiveBrand } from '@/brand/active';
import { getDb } from '@/db/client';
import { getCompany, listInstallers, listUsers } from '@/db/queries';
import { Icon } from '@/components/icons';
import { Page, PageHead } from '@/components/shell/shell';
import { ThemeSeg } from '@/components/theme';
import { eur } from '@/lib/money';
import { fmtPhone } from '@/lib/phone';
import { logout } from '@/auth/actions';
import { setDepositWord } from './actions';
import { InstallCard } from '@/components/install-card';
import { InstallerButton, TemplatesEditor, type InstallerRow } from '@/components/settings';
import { installerUse } from '@/services/messages';

export default async function SettingsPage() {
  const me = await requireUser();
  const t = await getTranslations();
  const { brand } = await getActiveBrand();
  const c = await getCompany(me.companyId);
  const [users, installers] = c ? await Promise.all([listUsers(c.id), listInstallers(c.id)]) : [[], []];
  const owner = can(me.role, 'settings');
  const word = c?.depositWord ?? brand.depositWord;
  // Only Pronari deletes, so only Pronari's sheet needs to know what points to each installer.
  const use = c && can(me.role, 'delete') ? await installerUse(await getDb(), c.id) : null;
  const installerRow = (i: (typeof installers)[number]) => {
    const u = use?.get(i.id);
    const row: InstallerRow = { id: i.id, name: i.name, phone: i.phone, channel: i.channel, active: i.active };
    if (use) row.use = { records: u?.records ?? 0, openVisits: u?.openVisits ?? 0, heldCash: u?.heldCash ? eur(u.heldCash) : null };
    return (
      <div key={i.id} className="list-row list-row--tight">
        <span className="list-row__icon">
          <Icon name="tool" />
        </span>
        <span className="grow">
          <b>{i.name}</b>
          <br />
          <span className="small muted">
            {fmtPhone(i.phone)} · {t(`channel.${i.channel}`)}
          </span>
        </span>
        <InstallerButton installer={row} className="icon-btn" ariaLabel={t('installers.editLabel', { name: i.name })}>
          <Icon name="edit" />
        </InstallerButton>
        <a className="icon-btn icon-btn--call" href={`tel:${i.phone}`} aria-label={t('settings.call', { name: i.name })}>
          <Icon name="phone" />
        </a>
      </div>
    );
  };
  const inactive = installers.filter(i => !i.active);
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
          <div className="list list--flush">{installers.filter(i => i.active).map(installerRow)}</div>
          {inactive.length ? (
            <details className="fold fold--inline">
              <summary>
                <span className="fold__title">{t('installers.inactiveList', { n: inactive.length })}</span>
              </summary>
              <div className="fold__body">
                <div className="list list--flush">{inactive.map(installerRow)}</div>
                <div className="help">{t('installers.inactiveHelp')}</div>
              </div>
            </details>
          ) : null}
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

      <InstallCard />

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
