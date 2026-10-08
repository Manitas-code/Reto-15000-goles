import type { Candidate, ImageResponse } from './state';
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
export async function candidates(n: string) {
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
