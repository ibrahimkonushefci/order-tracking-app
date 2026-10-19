/**
 * "Si të shkoni": phone numbers and links become tappable; a Google Maps link is
 * offered as "Hap në Maps" (spec §3). Plain React elements, no HTML injection.
 */
import type { ReactNode } from 'react';

const URL_RE = /(https?:\/\/[^\s]+)/g;
const PHONE_RE = /(\+\d{3}\s?\d{2}\s?\d{3}\s?\d{3,4}|\b0\d{2}\s?\d{3}\s?\d{3}\b)/g;
const isMaps = (u: string) => /maps|goo\.gl/.test(u);
const telOf = (s: string) => {
  const d = s.replace(/\s/g, '');
  return d.startsWith('+') ? d : '+383' + d.slice(1);
};

export function mapsLink(text: string | null | undefined): string | null {
  return (String(text ?? '').match(URL_RE) ?? []).find(isMaps) ?? null;
}

export function Linkified({ text }: { text: string }) {
  const out: ReactNode[] = [];
  String(text)
    .split(URL_RE)
    .forEach((seg, i) => {
      if (i % 2) {
        out.push(
          <a key={`u${i}`} href={seg} target="_blank" rel="noopener">
            {isMaps(seg) ? 'Google Maps' : seg.replace(/^https?:\/\//, '').slice(0, 30)}
          </a>,
        );
        return;
      }
      seg.split(PHONE_RE).forEach((part, j) => {
        out.push(
          j % 2 ? (
            <a key={`p${i}-${j}`} href={`tel:${telOf(part)}`}>
              {part}
            </a>
          ) : (
            part
          ),
        );
      });
    });
  return <>{out}</>;
}
