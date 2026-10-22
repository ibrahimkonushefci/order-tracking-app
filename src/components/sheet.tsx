'use client';
/**
 * The v10 bottom sheet (a centred dialog on wider screens): close button, Escape to
 * close, the page behind it inert. Rendered into #sheet-root, like the prototype.
 */
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Icon } from './icons';

const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

export function Sheet({
  open,
  onClose,
  title,
  sub,
  children,
  autoFocusField = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  /** false: focus the close button even on laptops (sheets whose first field isn't the point). */
  autoFocusField?: boolean;
}) {
  const t = useTranslations('ui');
  const mounted = useMounted();
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const root = document.getElementById('sheet-root');
    const view = document.getElementById('view');
    const before = document.activeElement as HTMLElement | null;
    root?.classList.add('open');
    if (view) view.inert = true;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
    };
    document.addEventListener('keydown', onKey);
    // Focus the first typing field on devices with a pointer; on phones the close button (no keyboard pop-up).
    const first = !autoFocusField ? null : box.current?.querySelector<HTMLElement>('.input--money, textarea, input:not([type=radio]):not([type=checkbox]):not([type=hidden]):not([type=date]):not([type=month])');
    if (first && window.matchMedia('(hover: hover)').matches) first.focus();
    else box.current?.querySelector<HTMLElement>('.sheet-close')?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      root?.classList.remove('open');
      if (view) view.inert = false;
      before?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once when the sheet opens
  }, [open]);

  if (!open || !mounted) return null;
  const target = document.getElementById('sheet-root') ?? document.body;
  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={box}>
        <button className="sheet-close icon-btn icon-btn--bare" type="button" onClick={onClose} aria-label={t('close')}>
          <Icon name="x" />
        </button>
        {/* Same grid as the prototype's <form class="form">: title, sub (pulled up by its margin), body. */}
        <div className="form">
          <h2 className="sheet__title" id="sheet-title">
            {title}
          </h2>
          {sub ? <p className="sheet__sub">{sub}</p> : null}
          {children}
        </div>
      </div>
    </>,
    target,
  );
}

/* ───────── Toasts ───────── */

const EVENT = 'ot-toast';

export function toast(message: string | undefined) {
  if (message) window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

/** Mounted once in the shell; shows the last message for a few seconds. */
export function Toaster() {
  const mounted = useMounted();
  const el = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      const root = el.current;
      if (!root) return;
      root.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'toast';
      box.setAttribute('role', 'status');
      box.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
      const span = document.createElement('span');
      span.textContent = String((e as CustomEvent).detail);
      box.append(span);
      root.append(box);
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (el.current) el.current.innerHTML = '';
      }, 3600);
    };
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener(EVENT, on);
      clearTimeout(timer);
    };
  }, []);
  return mounted ? <div id="toast-root" ref={el} aria-live="polite" /> : null;
}
