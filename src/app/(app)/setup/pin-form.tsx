'use client';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { submitPin, type PinState } from './actions';

export function PinForm() {
  const t = useTranslations('setup');
  const [state, action, pending] = useActionState<PinState, FormData>(submitPin, {});
  return (
    <section className="card" style={{ maxWidth: 420 }}>
      <div className="card__body">
        <form action={action} className="form">
          <div className={`field${state.error ? ' has-error' : ''}`}>
            <label className="label" htmlFor="pin">
              {t('pin')}
            </label>
            <input className="input" id="pin" name="pin" inputMode="numeric" autoComplete="off" autoFocus required />
            {state.error ? (
              <div className="error" role="alert">
                {t('pinWrong')}
              </div>
            ) : null}
          </div>
          <button className="btn btn--primary btn--block" type="submit" disabled={pending}>
            {t('pinSubmit')}
          </button>
        </form>
      </div>
    </section>
  );
}
