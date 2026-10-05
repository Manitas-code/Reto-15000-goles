// Element types follow the existing page and its dynamic templates.
interface PageElements {
  bAgain: HTMLButtonElement;
  bDaily: HTMLButtonElement;
  bHome: HTMLButtonElement;
  bLess: HTMLButtonElement;
  bMore: HTMLButtonElement;
  bName: HTMLButtonElement;
  bShare: HTMLButtonElement;
  cA: HTMLElement;
  cB: HTMLElement;
  cat: HTMLSpanElement;
  choice: HTMLDivElement;
  fb: HTMLDivElement;
  game: HTMLDivElement;
  gddh4: HTMLElement;
  gdhh4: HTMLElement;
  home: HTMLDivElement;
  homeStats: HTMLDivElement;
  modesBox: HTMLDivElement;
  nmErr: HTMLDivElement;
  nmIn: HTMLInputElement;
  nmOk: HTMLButtonElement;
  rTabs: HTMLDivElement;
  rankBox: HTMLDivElement;
  rankList: HTMLDivElement;
  rankMsg: HTMLDivElement;
  rec: HTMLElement;
  res: HTMLDivElement;
  shareOk: HTMLSpanElement;
  streak: HTMLElement;
  sub: HTMLParagraphElement;
  tBar: HTMLElement;
  tSec: HTMLSpanElement;
  toast: HTMLDivElement;
}

export function $<K extends keyof PageElements>(id: K): PageElements[K];
export function $(id: string): HTMLElement;
export function $(id: string): Element {
  // Known IDs follow the original templates. Preserve null at runtime so the
  // existing optional-element checks keep their original behavior.
  return document.getElementById(id)!;
}
