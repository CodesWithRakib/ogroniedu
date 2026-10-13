import { getRequestConfig } from 'next-intl/server';
import bnMessages from '../../messages/bn.json';
import enMessages from '../../messages/en.json';

/** Server request config required by the next-intl plugin (App Router). */
export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale;
  const locale = resolved === 'en' ? 'en' : 'bn';
  return {
    locale,
    messages: locale === 'en' ? enMessages : bnMessages,
  };
});
