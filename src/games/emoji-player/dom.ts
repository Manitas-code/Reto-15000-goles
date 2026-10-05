// Element types follow the existing page and its dynamic templates.
interface PageElements {
  btnGo: HTMLButtonElement;
  btnLang: HTMLButtonElement;
  btnNext: HTMLButtonElement;
  btnReview: HTMLButtonElement;
  btnShare: HTMLButtonElement;
  btnStart: HTMLButtonElement;
  dots: HTMLDivElement;
  emojis: HTMLDivElement;
  end: HTMLElement;
  endGrid: HTMLDivElement;
  endHits: HTMLElement;
  endNote: HTMLParagraphElement;
  endPts: HTMLElement;
  endStreak: HTMLElement;
  fb: HTMLDivElement;
  game: HTMLElement;
  guesses: HTMLDivElement;
  home: HTMLElement;
  homeDate: HTMLElement;
  idx: HTMLElement;
  inp: HTMLInputElement;
  nameBox: HTMLDivElement;
  nmErr: HTMLDivElement;
  nmErr0: HTMLDivElement;
  nmIn: HTMLInputElement;
  nmIn0: HTMLInputElement;
  nmOk: HTMLButtonElement;
  nmOk0: HTMLButtonElement;
  nmSkip0: HTMLButtonElement;
  pts: HTMLSpanElement;
  rankBox: HTMLElement;
  rankList: HTMLElement;
  rankMsg: HTMLDivElement;
  reveal: HTMLDivElement;
  review: HTMLDivElement;
  rvName: HTMLDivElement;
  rvPts: HTMLDivElement;
  rvWhy: HTMLParagraphElement;
  streakLine: HTMLParagraphElement;
  subTitle: HTMLParagraphElement;
  sug: HTMLDivElement;
  tabDay: HTMLButtonElement;
  tabWeek: HTMLButtonElement;
  toast: HTMLDivElement;
  tries: HTMLDivElement;
  worth: HTMLElement;
}

export function $<K extends keyof PageElements>(id: K): PageElements[K];
export function $(id: string): HTMLElement;
export function $(id: string): Element {
  // Known IDs follow the original templates. Preserve null at runtime so the
  // existing optional-element checks keep their original behavior.
  return document.getElementById(id)!;
}
