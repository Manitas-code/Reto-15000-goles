export type TimeKey = 'desde' | 'corte' | 'hasta';
export interface Goal {
  name: string;
  flag: string;
  h: string[];
  mt: string;
  tx: string;
  yt?: string;
  video?: string;
  desde?: number;
  corte?: number;
  hasta?: number;
  tapar?: unknown;
  color?: boolean;
}
export interface YouTubePlayer {
  getCurrentTime(): number;
  seekTo(time: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}
export interface YouTubeOptions {
  videoId: string;
  playerVars: { rel: number; modestbranding: number; playsinline: number };
  events: { onError: (event: { data: number }) => void };
}

declare global {
  const GOLES: Goal[] | undefined;
  const INICIO: string;
  const YT: {
    Player: new (id: string, options: YouTubeOptions) => YouTubePlayer;
  };
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    _w?: ReturnType<typeof setInterval>;
  }
}
