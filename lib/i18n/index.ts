import en, { TranslationKey } from './en';
import da from './da';

export type Language = 'en' | 'da';

const translations: Record<Language, Record<TranslationKey, string>> = { en, da };

export function getT(lang: Language) {
  return function t(key: TranslationKey): string {
    return translations[lang]?.[key] ?? translations.en[key] ?? key;
  };
}

export type { TranslationKey };
