// Element types follow the existing page and its dynamic templates.
interface PageElements {
  count: HTMLSpanElement;
  cp: HTMLButtonElement;
  dl: HTMLButtonElement;
  ed: HTMLElement;
  list: HTMLElement;
  next: HTMLButtonElement;
  test: HTMLButtonElement;
  url: HTMLInputElement;
  warn: HTMLDivElement;
  yt: HTMLDivElement;
  ytp: HTMLDivElement;
}

export function $<K extends keyof PageElements>(id: K): PageElements[K];
export function $(id: string): HTMLElement;
export function $(id: string): Element {
  // Known IDs follow the original templates. Preserve null at runtime so the
  // existing optional-element checks keep their original behavior.
  return document.getElementById(id)!;
}
