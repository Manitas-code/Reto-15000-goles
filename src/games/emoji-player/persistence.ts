import { readJson, writeJson } from '../../shared/storage/json';
import { emptyStore, type EmojiStore } from './model';

export const EMOJI_STORAGE_KEY = 'gd_emoji_v1';

export function readEmojiStore(): EmojiStore {
  return emptyStore(readJson<unknown>(EMOJI_STORAGE_KEY, {}));
}

export function writeEmojiStore(store: EmojiStore): void {
  writeJson(EMOJI_STORAGE_KEY, store);
}
