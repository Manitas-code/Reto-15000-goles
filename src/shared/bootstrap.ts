import { initLanguage } from './i18n/controller';
import { initStadiums } from './stadiums/controller';

export type SharedOrder = 'language-first' | 'stadiums-first';

/** Preserve each page's original initialization order during the migration. */
export function bootShared(order: SharedOrder = 'language-first'): void {
  if (order === 'stadiums-first') {
    initStadiums();
    initLanguage();
  } else {
    initLanguage();
    initStadiums();
  }
}
