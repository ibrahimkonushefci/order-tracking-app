'use client';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { login, type LoginState } from '@/auth/actions';

export function LoginForm() {
  const t = useTranslations('login');
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="form" noValidate>
      <div className={`field${state.error ? ' has-error' : ''}`}>
        <label className="label" htmlFor="email">
          {t('email')}
        </label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          defaultValue={state.email}
          required
        />
      </div>
      <div className={`field${state.error ? ' has-error' : ''}`}>
        <label className="label" htmlFor="password">
          {t('password')}
        </label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        {state.error ? (
          <div className="error" role="alert">
            {t(state.error)}
          </div>
        ) : null}
      </div>
      <button className="btn btn--primary btn--block btn--lg" type="submit" disabled={pending}>
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
