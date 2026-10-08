import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const [
  origin = 'http://127.0.0.1:8011',
  output = 'tests/fixtures/react-semantic-baseline.json',
] = process.argv.slice(2);
const pages = [
  'index.html',
  'reto-15000.html',
  'mas-o-menos.html',
  'blackjack-goles.html',
  'emoji-player.html',
  'caras.html',
  'editor-goles.html',
];

const browser = await chromium.launch({ headless: true });
const captures = {};
for (const language of ['es', 'en']) {
  for (const path of pages) {
    const context = await browser.newContext();
    await context.addInitScript((lang) => {
      localStorage.setItem('fg_lang', lang);
      localStorage.setItem('fg_team', 'none');
    }, language);
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-10-05T12:00:00.000Z'));
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === new URL(origin).origin
        ? route.continue()
        : route.abort('blockedbyclient'),
    );
    const response = await page.goto(`${origin}/${path}`, {
      waitUntil: 'networkidle',
    });
    if (!response?.ok())
      throw new Error(`${path} returned ${response?.status()}`);
    captures[`${language}/${path}`] = await page.evaluate(() => {
      const normalize = (value) => value.replace(/\s+/g, ' ').trim();
      const excluded = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);
      const keepAttribute = (name) =>
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
      const attrsFor = (element) =>
        Object.fromEntries(
          [...element.attributes]
            .filter((attribute) => keepAttribute(attribute.name))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((attribute) => [attribute.name, attribute.value]),
        );
      const nodes = [];
      const visit = (element, path) => {
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
            !excluded.has(child.tagName)
          ) {
            visit(child, [...path, index++]);
          }
        }
      };
      const headMeta = [...document.head.querySelectorAll('meta')]
        .map((meta) => attrsFor(meta))
        .filter((attrs) =>
          ['charset', 'name', 'property', 'http-equiv'].some(
            (key) => key in attrs,
          ),
        );
      const canonical = document.head.querySelector('link[rel="canonical"]');
      const title = normalize(document.title);
      let index = 0;
      [...document.body.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = normalize(child.textContent ?? '');
          if (text) nodes.push({ path: [index++], text });
        } else if (
          child.nodeType === Node.ELEMENT_NODE &&
          !excluded.has(child.tagName)
        ) {
          visit(child, [index++]);
        }
      });
      const projection = {
        title,
        lang: document.documentElement.lang,
        metadata: headMeta,
        canonical: canonical?.getAttribute('href') ?? null,
        body: {
          attrs: attrsFor(document.body),
          nodes,
        },
      };
      return projection;
    });
    await context.close();
  }
}
await browser.close();

const fixture = {
  baselineRevision: '88552644372229ccd8e8157c3ac99c88965b5675',
  provenance: {
    source: '/tmp/goalday-migration-baseline',
    capture: 'Playwright Chromium runtime, fixed 2026-10-05T12:00:00.000Z',
    languages: ['es', 'en'],
    team: 'none',
    projection:
      'Flat preorder body elements and text with child paths; excludes script, style, noscript, and non-semantic attributes. Retains classes, ids, links, controls, aria/data, and image sources. Head metadata is recorded separately.',
    sha256: createHash('sha256').update(JSON.stringify(captures)).digest('hex'),
  },
  pages: captures,
};
await writeFile(output, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(
  `Captured ${Object.keys(captures).length} runtime projections in ${output}`,
);
