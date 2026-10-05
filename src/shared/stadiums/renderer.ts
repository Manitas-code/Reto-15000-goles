import { svg } from './geometry';
import type { StadiumTeam } from './teams';
type CacheEntry = { k: string; t: string; url: string };
export function createStadiumRenderer(onUrl: (url: string | null) => void) {
  let lastUrl: string | null = null;
  let curTeam: StadiumTeam | null = null;
  let gen = 0;
  let rt: ReturnType<typeof setTimeout> | undefined;
  const pending = new Map<string, HTMLImageElement>();
  function cancelPending() {
    for (const [url, image] of pending) {
      image.onload = null;
      image.onerror = null;
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
    }
    pending.clear();
  }
  const CKEY = 'fg_bg';
  function sizeKey(id: string): string {
    return (
      id +
      '|' +
      window.innerWidth +
      'x' +
      window.innerHeight +
      '|' +
      Math.min(window.devicePixelRatio || 1, 2)
    );
  }
  // mismo equipo, ancho y dpr, y alto parecido (barra de URL del móvil): vale la imagen, que se pinta en modo cover
  function fits(a: string, b: string): boolean {
    const x = String(a).split('|'),
      y = String(b).split('|');
    if (x.length < 3 || y.length < 3 || x[0] !== y[0] || x[2] !== y[2])
      return false;
    const dimensionsX = x[1]!.split('x'),
      dimensionsY = y[1]!.split('x');
    const heightX = Number(dimensionsX[1]),
      heightY = Number(dimensionsY[1]);
    return (
      dimensionsX[0] === dimensionsY[0] &&
      Math.abs(heightX - heightY) < 0.25 * Math.max(heightX, heightY)
    );
  }
  function readCache(): CacheEntry | null {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(CKEY) || 'null');
      if (
        value &&
        typeof value === 'object' &&
        'k' in value &&
        't' in value &&
        'url' in value &&
        typeof value.k === 'string' &&
        typeof value.t === 'string' &&
        typeof value.url === 'string'
      )
        return { k: value.k, t: value.t, url: value.url };
      return null;
    } catch {
      return null;
    }
  }
  function writeCache(k: string, id: string, url: string): void {
    try {
      localStorage.setItem(CKEY, JSON.stringify({ k: k, t: id, url: url }));
    } catch {
      try {
        localStorage.removeItem(CKEY);
      } catch {
        // Cache cleanup is best-effort when storage is unavailable.
      }
    }
  }
  function show(u: string | null): void {
    if (u === lastUrl) return;
    lastUrl = u;
    onUrl(u);
  }
  function paint(): void {
    cancelPending();
    const my = ++gen,
      t = curTeam;
    if (!t) return;
    const activeTeam = t,
      teamId = t.id;
    const k = sizeKey(teamId),
      cached = readCache();
    if (cached && cached.t === t.id) {
      show(cached.url);
      if (fits(cached.k, k)) return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2),
      vw = window.innerWidth,
      vh = window.innerHeight;
    // en pantallas anchas se abre el encuadre a los lados en vez de ampliar el dibujo
    const vbH = 640,
      vbW = Math.max(390, Math.round((vbH * vw) / vh));
    const blob = new Blob([svg(activeTeam.spec, vbW, vbH)], {
        type: 'image/svg+xml;charset=utf-8',
      }),
      url = URL.createObjectURL(blob),
      img = new Image();
    pending.set(url, img);
    img.onload = function () {
      pending.delete(url);
      URL.revokeObjectURL(url);
      if (my !== gen) return; // ya hay otro dibujo más nuevo (otro equipo u otro tamaño)
      const c = document.createElement('canvas');
      c.width = Math.round(vw * dpr);
      c.height = Math.round(vh * dpr);
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      const sc = Math.max(vw / vbW, vh / vbH),
        w = vbW * sc,
        h = vbH * sc;
      ctx.fillStyle = '#050912';
      ctx.fillRect(0, 0, vw, vh);
      ctx.drawImage(img, (vw - w) / 2, 0, w, h);
      const dataUrl = c.toDataURL('image/jpeg', 0.86);
      show(dataUrl);
      // si la ventana cambió mientras se dibujaba, no se guarda y se vuelve a dibujar
      if (fits(k, sizeKey(teamId))) writeCache(k, teamId, dataUrl);
      else {
        clearTimeout(rt);
        rt = setTimeout(paint, 250);
      }
    };
    img.onerror = function () {
      pending.delete(url);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  const resize = () => {
    clearTimeout(rt);
    rt = setTimeout(paint, 250);
  };
  window.addEventListener('resize', resize);
  return {
    setTeam(t: StadiumTeam | null) {
      curTeam = t;
      if (t) paint();
      else {
        gen++;
        cancelPending();
        try {
          localStorage.removeItem(CKEY);
        } catch {
          /* Cache is optional. */
        }
        show(null);
      }
    },
    dispose() {
      gen++;
      cancelPending();
      clearTimeout(rt);
      window.removeEventListener('resize', resize);
    },
  };
}
export function stadiumTone(t: StadiumTeam): 'yellow' | 'light' | 'normal' {
  // clasificar el estadio para elegir el color de acento del texto
  function hex(c: string): number[] {
    c = c.replace('#', '');
    return [
      parseInt(c.substr(0, 2), 16),
      parseInt(c.substr(2, 2), 16),
      parseInt(c.substr(4, 2), 16),
    ];
  }
  const sp = t.spec,
    cols: string[] = [],
    stands = sp.open ? [sp.far, sp.side, sp.sideR || sp.side] : [sp];
  stands.forEach(function (st) {
    st?.tiers?.forEach(function (tr) {
      cols.push(tr[2]);
    });
    if (st?.roofCol) cols.push(st.roofCol);
  });
  if (sp.roof === 'lattice') cols.push('#c9ccd3');
  let yellow = 0,
    light = 0;
  cols.forEach(function (c) {
    const r = hex(c),
      lum = (0.299 * r[0] + 0.587 * r[1] + 0.114 * r[2]) / 255;
    if (r[0] > 180 && r[1] > 150 && r[2] < 120) yellow++;
    if (lum > 0.7) light++;
  });
  return yellow >= 1 ? 'yellow' : light >= 2 ? 'light' : 'normal';
}
