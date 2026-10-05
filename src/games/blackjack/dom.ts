// Element types follow the existing page and its dynamic templates.
interface PageElements {
  act: HTMLDivElement;
  bAgain: HTMLButtonElement;
  bDaily: HTMLButtonElement;
  bDeal: HTMLButtonElement;
  bDouble: HTMLButtonElement;
  bHome: HTMLButtonElement;
  bName: HTMLButtonElement;
  bNext: HTMLButtonElement;
  bShare: HTMLButtonElement;
  bStand: HTMLButtonElement;
  bTake: HTMLButtonElement;
  cat: HTMLSpanElement;
  chips: HTMLElement;
  dCards: HTMLDivElement;
  dSum: HTMLSpanElement;
  game: HTMLDivElement;
  gddh4: HTMLElement;
  gdhh4: HTMLElement;
  handLbl: HTMLElement;
  hero: HTMLDivElement;
  home: HTMLDivElement;
  homeStats: HTMLDivElement;
  hudChips: HTMLDivElement;
  mid: HTMLDivElement;
  modesBox: HTMLDivElement;
  nmErr: HTMLDivElement;
  nmIn: HTMLInputElement;
  nmOk: HTMLButtonElement;
  pCards: HTMLDivElement;
  pSum: HTMLSpanElement;
  rTabs: HTMLDivElement;
  rankBox: HTMLDivElement;
  rankList: HTMLDivElement;
  rankMsg: HTMLDivElement;
  res: HTMLDivElement;
  shareOk: HTMLDivElement;
  sub: HTMLParagraphElement;
  tBar: HTMLElement;
  tSec: HTMLElement;
  table: HTMLDivElement;
  toast: HTMLDivElement;
}

export function $<K extends keyof PageElements>(id: K): PageElements[K];
export function $(id: string): HTMLElement;
export function $(id: string): Element {
  // Known IDs follow the original templates. Preserve null at runtime so the
  // existing optional-element checks keep their original behavior.
  return document.getElementById(id)!;
}
