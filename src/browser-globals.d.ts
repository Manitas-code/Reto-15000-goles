import type { EmojiRow } from './data/emoji-players';

declare global {
  interface Window {
    GD_EMOJI?: EmojiRow[];
    GD_face: (name: string) => Promise<string>;
    GD_faces: (names: string[]) => Promise<Record<string, string>>;
    GD_FACE_FIX: Record<string, string>;
    GD_faces_reset: () => void;
  }
}

export {};
