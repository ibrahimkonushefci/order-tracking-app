import { getRequestConfig } from 'next-intl/server';

/** Staff UI is Albanian only in v1; English/German need only new message files. */
export default getRequestConfig(async () => ({
  locale: 'sq',
  timeZone: 'Europe/Belgrade',
  messages: (await import('../../messages/sq.json')).default,
}));
