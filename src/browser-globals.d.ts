import type { EmojiRow } from './data/emoji-players';
import type { StadiumTeam } from './shared/stadiums/teams';
import type { svg } from './shared/stadiums/geometry';

export type LanguageApi = {
  tr: (value: string) => string;
  set: (language: string) => void;
  get: () => string;
};

declare global {
  interface Window {
    GD_EMOJI?: EmojiRow[];
    FG_LANG: LanguageApi;
    FG_STADIUM: {
      teams: StadiumTeam[];
      svg: typeof svg;
      open: () => void;
    };
    GD_face: (name: string) => Promise<string>;
    GD_faces: (names: string[]) => Promise<Record<string, string>>;
    GD_FACE_FIX: Record<string, string>;
    GD_faces_reset: () => void;
  }
}

export {};
