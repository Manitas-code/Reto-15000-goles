// Element types follow the existing page and its dynamic templates.
interface PageElements {
  bCopy: HTMLButtonElement;
  bOnly: HTMLButtonElement;
  grid: HTMLDivElement;
  mClose: HTMLButtonElement;
  mNone: HTMLButtonElement;
  mUndo: HTMLButtonElement;
  modal: HTMLDivElement;
  out: HTMLTextAreaElement;
  st: HTMLSpanElement;
}

export function $<K extends keyof PageElements>(id: K): PageElements[K];
export function $(id: string): HTMLElement;
export function $(id: string): Element {
  // Known IDs follow the original templates. Preserve null at runtime so the
  // existing optional-element checks keep their original behavior.
  return document.getElementById(id)!;
}
