import { $ } from './dom';
import type { Candidate, ImageResponse } from './state';
import { players } from '../../data/players';

export function initFacesTool() {
  const names = players.map((p) => p.name);
  let faces: Record<string, string> = {},
    only = false;
  const CKEY = 'gd_caras_elegidas';
  let chosen: Record<string, string> = {};
  try {
    chosen =
      (JSON.parse(localStorage.getItem(CKEY) ?? 'null') as Record<
        string,
        string
      >) || {};
  } catch {
    /* Preserve best-effort behavior. */
  }
  const saveC = () => {
    try {
      localStorage.setItem(CKEY, JSON.stringify(chosen));
    } catch {
      /* Preserve best-effort behavior. */
    }
  };
  const cur = (n: string) => (n in chosen ? chosen[n] : faces[n]);
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  function draw() {
    $('grid').innerHTML = names
      .map((n) => {
        const u = cur(n);
        if (only && !(n in chosen) && u) return '';
        return `<div class="c${n in chosen ? ' chg' : ''}${u ? '' : ' none'}" data-n="${esc(n)}"><div class="ph">${u ? `<img src="${u}" loading="lazy" alt="">` : 'sin foto'}</div><div class="n">${esc(n)}</div></div>`;
      })
      .join('');
    $('st').textContent =
      `${Object.keys(chosen).length} cambiadas · ${names.filter((n) => !cur(n)).length} sin foto. Toca un jugador para elegir otra foto (por ejemplo, una de cuando jugaba).`;
  }
  // ---- buscar fotos alternativas: imágenes de sus artículos (es/en) + Wikimedia Commons ----
  const BAD =
    /flag|bandera|logo|escudo|crest|icon|kit|badge|map|mapa|signature|firma|trophy|trofeo|stadium|estadio|\.svg|commons-|wikiquote|wiktionary|question_book|disambig|edit-clear|ambox|medal|medalla/i;
  async function imgs(host: string, params: string): Promise<Candidate[]> {
    try {
      const d = (await (
        await fetch(
          `https://${host}/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|mime&iiurlwidth=400&` +
            params,
        )
      ).json()) as ImageResponse;
      return Object.values((d.query && d.query.pages) || {})
        .filter(
          (p) =>
            p.imageinfo &&
            /jpeg|png/.test(p.imageinfo[0].mime) &&
            !BAD.test(p.title),
        )
        .map((p) => ({
          t: p.title.replace(/^(File|Archivo):/, ''),
          u: p.imageinfo![0].thumburl,
        }));
    } catch {
      return [];
    }
  }
  async function candidates(n: string) {
    const t = encodeURIComponent(n);
    const lists = await Promise.all([
      imgs(
        'es.wikipedia.org',
        'redirects=1&generator=images&gimlimit=50&titles=' + t,
      ),
      imgs(
        'en.wikipedia.org',
        'redirects=1&generator=images&gimlimit=50&titles=' + t,
      ),
      imgs(
        'commons.wikimedia.org',
        'generator=search&gsrnamespace=6&gsrlimit=40&gsrsearch=' +
          encodeURIComponent('"' + n + '"'),
      ),
    ]);
    const seen = new Set<string>(),
      all: Candidate[] = [];
    lists.flat().forEach((x) => {
      if (x.u && !seen.has(x.t)) {
        seen.add(x.t);
        all.push(x);
      }
    });
    const yr = (x: Candidate) => {
      const m = x.t.match(/(19[3-9]\d|20[01]\d|202\d)/);
      return m ? +m[1] : 9999;
    };
    return all.sort((a, b) => yr(a) - yr(b)); // las más antiguas primero
  }
  async function openPick(n: string) {
    const m = $('modal');
    m.hidden = false;
    m.innerHTML = `<div class="box"><h2>${esc(n)}</h2><p>Buscando fotos…</p></div>`;
    const list = await candidates(n);
    const now = cur(n);
    m.innerHTML = `<div class="box"><h2>${esc(n)}</h2><p>Toca la foto que quieras. Las que tienen año salen primero, de más antigua a más nueva.</p>
   <div class="row"><button class="g" id="mClose">Cerrar</button>${n in chosen ? '<button class="g" id="mUndo">Volver a la original</button>' : ''}<button class="g" id="mNone">Sin foto (iniciales)</button></div>
   <div class="opts">${list.map((x, i) => `<div class="opt${x.u === now ? ' cur' : ''}" data-i="${i}"><img src="${x.u}" loading="lazy" alt=""><small>${esc((x.t.match(/(19|20)\d\d/) || [''])[0])}</small></div>`).join('') || '<p>No se han encontrado más fotos.</p>'}</div></div>`;
    m.querySelector<HTMLButtonElement>('#mClose')!.onclick = () => {
      m.hidden = true;
    };
    const u = m.querySelector<HTMLButtonElement>('#mUndo');
    if (u)
      u.onclick = () => {
        delete chosen[n];
        saveC();
        m.hidden = true;
        draw();
      };
    m.querySelector<HTMLButtonElement>('#mNone')!.onclick = () => {
      chosen[n] = '';
      saveC();
      m.hidden = true;
      draw();
    };
    m.querySelectorAll<HTMLDivElement>('.opt').forEach(
      (o) =>
        (o.onclick = () => {
          chosen[n] = list[+o.dataset.i!].u;
          saveC();
          m.hidden = true;
          draw();
        }),
    );
  }
  $('modal').onclick = (e) => {
    if ((e.target as HTMLElement).id === 'modal')
      (e.target as HTMLElement).hidden = true;
  };
  $('grid').onclick = (e) => {
    const c = (e.target as HTMLElement).closest<HTMLDivElement>('.c');
    if (c) openPick(c.dataset.n!);
  };
  $('bOnly').onclick = (e) => {
    only = !only;
    (e.target as HTMLElement).textContent = only
      ? 'Ver todas'
      : 'Ver solo cambiadas / sin foto';
    draw();
  };
  $('bCopy').onclick = async () => {
    const all: Record<string, string> = {};
    names.forEach((n) => {
      all[n] = cur(n) || '';
    });
    const txt =
      'CARAS GOALDAY\nCAMBIADAS: ' +
      Object.keys(chosen).join(', ') +
      '\nFOTOS: ' +
      JSON.stringify(all);
    const o = $('out');
    o.value = txt;
    o.style.display = 'block';
    o.select();
    try {
      await navigator.clipboard.writeText(txt);
      $('bCopy').textContent = 'Copiado ✔';
    } catch {
      document.execCommand('copy');
    }
  };
  window.GD_faces(names).then((m) => {
    faces = m;
    draw();
  });
}
