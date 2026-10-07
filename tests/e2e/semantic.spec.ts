import { testOrigin } from '../helpers/environment';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { FakeGoaldayApi } from '../helpers/fake-api';

type Projection = {
  title: string;
  lang: string;
  metadata: Record<string, string>[];
  canonical: string | null;
  body: { attrs: Record<string, string>; nodes: unknown[] };
};

// Empty class has no tokens; empty text input value is the HTML default.
// Canonicalize both independent reference and actual without rewriting fixtures.
function semanticDefaults(projection: Projection): Projection {
  return {
    ...projection,
    body: {
      ...projection.body,
      nodes: projection.body.nodes.map((raw) => {
        const node = raw as { tag?: string; attrs?: Record<string, string> };
        if (!node.attrs) return node;
        const attrs = { ...node.attrs };
        if (attrs.class === '') delete attrs.class;
        if (
          node.tag === 'input' &&
          attrs.value === '' &&
          (!attrs.type || attrs.type === 'text')
        )
          delete attrs.value;
        return { ...node, attrs };
      }),
    },
  };
}

const fixture = JSON.parse(
  readFileSync(resolve('tests/fixtures/react-semantic-baseline.json'), 'utf8'),
) as { pages: Record<string, Projection> };
const pages = [
  'index.html',
  'reto-15000.html',
  'mas-o-menos.html',
  'blackjack-goles.html',
  'emoji-player.html',
  'caras.html',
  'editor-goles.html',
];

test('el DOM de runtime conserva la referencia original en ES y EN', async ({
  page,
}) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (
      url.hostname.endsWith('.supabase.co') &&
      process.env.GOALDAY_VISUAL_BASELINE_ORIGIN
    )
      await route.abort('blockedbyclient');
    else if (url.origin === testOrigin) await route.continue();
    else await route.abort('blockedbyclient');
  });
  const api = new FakeGoaldayApi();
  await api.attach(page);
  await page.clock.setFixedTime(new Date('2026-10-05T12:00:00.000Z'));
  await page.addInitScript(() => localStorage.setItem('fg_team', 'none'));
  for (const language of ['es', 'en'] as const) {
    await page.goto('/');
    await page.evaluate(
      (lang) => localStorage.setItem('fg_lang', lang),
      language,
    );
    for (const path of pages) {
      // The independently captured semantic reference uses offline upstreams.
      for (const game of [
        'reto',
        'reto',
        'mas-o-menos',
        'blackjack',
        'emoji-player',
      ])
        api.failNext('GET', '/rankings/' + game, 503);
      const response = await page.goto(`/${path}`);
      expect(response?.status(), `${language}/${path}`).toBe(200);
      await page.waitForLoadState('networkidle');
      const actual = await page.evaluate(() => {
        const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
        const excluded = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);
        const keepAttribute = (name: string) =>
          [
            'id',
            'class',
            'href',
            'type',
            'name',
            'role',
            'title',
            'placeholder',
            'value',
            'disabled',
            'checked',
            'selected',
            'tabindex',
            'alt',
            'src',
            'target',
            'rel',
            'for',
            'action',
            'method',
            'content',
            'charset',
            'aria-hidden',
            'viewBox',
            'width',
            'height',
          ].includes(name) ||
          name.startsWith('aria-') ||
          name.startsWith('data-');
        const attrsFor = (element: Element) =>
          Object.fromEntries(
            [...element.attributes]
              .filter((attribute) => keepAttribute(attribute.name))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((attribute) => [attribute.name, attribute.value]),
          );
        const metadata = [...document.head.querySelectorAll('meta')]
          .map(attrsFor)
          .filter((attrs) =>
            ['charset', 'name', 'property', 'http-equiv'].some(
              (key) => key in attrs,
            ),
          );
        const nodes: unknown[] = [];
        const visit = (element: Element, path: number[]) => {
          nodes.push({
            path,
            tag: element.tagName.toLowerCase(),
            attrs: attrsFor(element),
          });
          let index = 0;
          for (const child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
              const text = normalize(child.textContent ?? '');
              if (text) nodes.push({ path: [...path, index++], text });
            } else if (
              child.nodeType === Node.ELEMENT_NODE &&
              !excluded.has((child as Element).tagName)
            ) {
              visit(child as Element, [...path, index++]);
            }
          }
        };
        const root = document.body.querySelector(':scope > #root');
        const children = root
          ? [...root.childNodes]
          : [...document.body.childNodes];
        let index = 0;
        children.forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = normalize(child.textContent ?? '');
            if (text) nodes.push({ path: [index++], text });
          } else if (
            child.nodeType === Node.ELEMENT_NODE &&
            !excluded.has((child as Element).tagName)
          ) {
            visit(child as Element, [index++]);
          }
        });
        return {
          title: normalize(document.title),
          lang: document.documentElement.lang,
          metadata,
          canonical:
            document.head
              .querySelector('link[rel="canonical"]')
              ?.getAttribute('href') ?? null,
          body: { attrs: attrsFor(document.body), nodes },
        };
      });
      expect(semanticDefaults(actual), `${language}/${path}`).toEqual(
        semanticDefaults(fixture.pages[`${language}/${path}`]!),
      );
    }
  }
});
