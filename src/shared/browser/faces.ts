import { readJson, writeJson } from '../storage/json';

type FaceMap = Record<string, string>;
type LookupMap = Record<string, string | null>;
interface WikiPage {
  title: string;
  thumbnail?: { source: string };
}
interface WikiResponse {
  error?: unknown;
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: Record<string, WikiPage>;
  };
}

const TITLE: Record<string, string> = {
  Raúl: 'Raúl González Blanco',
  Quini: 'Enrique Castro González',
  Rodri: 'Rodrigo Hernández Cascante',
  Adriano: 'Adriano Leite Ribeiro',
  Marcelo: 'Marcelo Vieira',
  Gabigol: 'Gabriel Barbosa',
  Rodrygo: 'Rodrygo Goes',
  'Luis Enrique': 'Luis Enrique Martínez García',
  Sócrates: 'Sócrates (futbolista)',
  Pauleta: 'Pedro Pauleta',
  Deco: 'Deco (futbolista)',
  'Luis Díaz': 'Luis Díaz (futbolista colombiano)',
  'David Silva': 'David Silva (futbolista)',
  Bebeto: 'Bebeto (futbolista)',
  Zico: 'Zico (futbolista)',
};

const KEY = 'gd_faces_v2';
const API =
  'https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=400';

export function bootFaces(): void {
  const fixed: FaceMap = {};
  let cache = readJson<FaceMap>(KEY, {});
  const save = () => writeJson(KEY, cache);

  async function byTitles(names: string[]): Promise<LookupMap> {
    const result: LookupMap = {};
    for (let i = 0; i < names.length; i += 50) {
      const part = names.slice(i, i + 50);
      const titles = part.map((name) => TITLE[name] || name);
      try {
        const response = await fetch(
          API + '&titles=' + encodeURIComponent(titles.join('|')),
        );
        if (!response.ok) throw new Error('Lookup failed');
        const data = (await response.json()) as WikiResponse;
        if (data.error) throw new Error('Lookup failed');
        const query = data.query || {};
        const aliases: FaceMap = {};
        (query.normalized || []).forEach((alias) => {
          aliases[alias.from] = alias.to;
        });
        (query.redirects || []).forEach((alias) => {
          aliases[alias.from] = alias.to;
        });
        const images: FaceMap = {};
        Object.values(query.pages || {}).forEach((page) => {
          if (page.thumbnail) images[page.title] = page.thumbnail.source;
        });
        part.forEach((name, index) => {
          let title = titles[index];
          let hops = 0;
          while (aliases[title] && hops++ < 3) title = aliases[title];
          if (images[title]) result[name] = images[title];
        });
      } catch {
        part.forEach((name) => {
          result[name] = null;
        });
      }
    }
    return result;
  }

  async function bySearch(name: string): Promise<string | null> {
    try {
      const response = await fetch(
        API.replace('&redirects=1', '') +
          '&generator=search&gsrlimit=1&gsrsearch=' +
          encodeURIComponent(name + ' futbolista'),
      );
      if (!response.ok) return null;
      const data = (await response.json()) as WikiResponse;
      if (data.error) return null;
      const page = data.query?.pages && Object.values(data.query.pages)[0];
      return page?.thumbnail?.source || '';
    } catch {
      return null;
    }
  }

  async function batch(names: string[]): Promise<FaceMap> {
    const result: FaceMap = {};
    const pending: string[] = [];
    names.forEach((name) => {
      if (fixed[name]) result[name] = fixed[name];
      else if (name in cache) result[name] = cache[name];
      else pending.push(name);
    });
    if (pending.length) {
      const resolved = await byTitles(pending);
      for (const name of pending) {
        const url =
          resolved[name] === null
            ? null
            : resolved[name] || (await bySearch(name));
        if (url !== null) cache[name] = url;
        result[name] = url || '';
      }
      save();
    }
    return result;
  }

  window.GD_face = (name) => batch([name]).then((result) => result[name] || '');
  window.GD_faces = batch;
  window.GD_FACE_FIX = fixed;
  window.GD_faces_reset = () => {
    cache = {};
    save();
  };
}
