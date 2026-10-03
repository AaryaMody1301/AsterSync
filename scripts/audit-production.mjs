// Exercises the compiled Worker and its assets with an isolated, disposable DB.
// Does not connect to the hosted site or modify its enquiries.
import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve('wrangler/package.json'));
const { Miniflare, Log, LogLevel, createFetchMock } = wranglerRequire('miniflare');
const root = path.resolve(import.meta.dirname, '..');
const server = path.join(root, 'dist/server');
const moduleFiles = (await readdir(server, { recursive: true })).filter(f => f.endsWith('.js') && f !== 'index.js');
const options = {
  modules: ['index.js', ...moduleFiles].map(file => ({ type: 'ESModule', path: path.join(server, file) })),
  modulesRoot: server,
  compatibilityDate: '2026-05-15',
  compatibilityFlags: ['nodejs_compat'],
  assets: { directory: path.join(root, 'dist/client'), routerConfig: { has_user_worker: true } },
  d1Databases: ['DB'],
  log: new Log(LogLevel.ERROR),
};
const mf = new Miniflare(options);
const origin = 'https://audit.local';
const get = (url, options) => mf.dispatchFetch(new URL(url, origin), options);
const pages = new Map();
const expectedTitles = { '/': 'AsterSync — Software that makes work flow.', '/services': 'Services', '/work': 'Work &amp; demos', '/about': 'About the studio', '/contact': 'Discuss your project', '/privacy': 'Privacy' };
const counts = { pages: 0, links: 0, assets: 0, assertions: 0 };
const check = (value, message) => { assert.ok(value, message); counts.assertions++; };
async function page(url) {
  if (pages.has(url)) return pages.get(url);
  const res = await get(url);
  check(res.status === 200, `${url}: HTTP ${res.status}`);
  check(res.headers.get('content-type')?.includes('text/html'), `${url}: expected HTML`);
  const html = await res.text();
  check((html.match(/<h1[\s>]/g) ?? []).length === 1, `${url}: exactly one h1`);
  check(/<title>[^<]+<\/title>/.test(html), `${url}: page title`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const expected = expectedTitles[new URL(url, origin).pathname];
  check(title?.includes(expected), `${url}: wrong page title: ${title}`);
  check(html.includes('id="main"'), `${url}: skip-link target`);
  check(html.includes('rel="preload" href="/manrope.woff2"') || html.includes('href="/manrope.woff2"'), `${url}: font preload`);
  pages.set(url, html); counts.pages++;
  return html;
}
try {
  const routes = ['/', '/services', '/work', '/about', '/contact', '/privacy'];
  const links = new Set();
  const assets = new Set(['/hero.webp', '/manrope.woff2', '/favicon.svg']);
  for (const route of routes) {
    const html = await page(route);
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      const target = new URL(match[1].replaceAll('&amp;', '&'), origin + route);
      check(target.origin === origin, `Unexpected external link: ${target.href}`);
      const key = target.pathname + target.search;
      const destination = await page(key);
      if (target.hash) check(destination.includes(`id="${target.hash.slice(1)}"`), `Missing anchor ${target}`);
      links.add(target.pathname + target.search + target.hash);
    }
    for (const match of html.matchAll(/<(?:script|img|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
      const target = match[1];
      if (target.startsWith('/_next/') || /\.(?:css|woff2|webp|svg)$/.test(target)) assets.add(target);
    }
  }
  counts.links = links.size;
  // Verify the server-to-client prefill contract, including untrusted queries.
  for (const [query, service] of [
    ['?service=websites', 'websites'], ['?service=automation', 'automation'], ['?service=data', 'data'],
    ['', 'unsure'], ['?service=invalid', 'unsure'], ['?service=data&service=websites', 'unsure'],
  ]) {
    const html = (await page('/contact' + query)).replace(/\\+"/g, '"');
    check(html.includes(`"initialService":"${service}"`), `Contact prefill failed for ${query || 'no query'}`);
  }
  for (const asset of assets) {
    const res = await get(asset);
    check(res.status === 200, `Missing asset ${asset}: ${res.status}`);
    check(!res.headers.get('content-type')?.includes('text/html'), `HTML returned for ${asset}`);
    await res.arrayBuffer(); counts.assets++;
  }
  for (const route of ['/robots.txt', '/sitemap.xml']) {
    const res = await get(route); check(res.status === 200, `${route}: HTTP ${res.status}`);
  }
  const missing = await get('/audit-missing-page');
  check(missing.status === 404, 'Unknown route should return 404');
  check((await missing.text()).includes('Back to home'), '404 recovery link missing');
  const db = await mf.getD1Database('DB');
  const sql = await readFile(path.join(root, 'drizzle/0000_supreme_red_ghost.sql'), 'utf8');
  await db.batch(sql.split('--> statement-breakpoint').filter(s => s.trim()).map(s => db.prepare(s)));
  const input = { id: crypto.randomUUID(), name: 'Production audit', email: 'audit@example.com', service: 'data', message: 'A synthetic enquiry for the isolated production build audit.' };
  const submit = body => get('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const saved = await submit(input); check(saved.status === 201, `Enquiry save: HTTP ${saved.status}`);
  check((await saved.json()).id === input.id, 'Enquiry reference mismatch');
  const retry = await submit(input); check(retry.status === 200, 'Enquiry retry should be idempotent');
  check((await db.prepare('SELECT COUNT(*) AS n FROM enquiries').first()).n === 1, 'Retry created a duplicate');
  check((await submit({ ...input, email: 'invalid' })).status === 400, 'Invalid email accepted');
  check((await submit({ ...input, message: 'short' })).status === 400, 'Short message accepted');
  check((await submit({ ...input, website: 'spam' })).status === 400, 'Honeypot accepted');
  check((await get('/api/enquiries')).status === 405, 'Enquiries endpoint must not list records');
  // Exercise the compiled provider switch without touching any remote project.
  const fetchMock = createFetchMock();
  fetchMock.disableNetConnect();
  await mf.setOptions({...options, fetchMock, bindings: {
    ENQUIRY_STORAGE: 'supabase', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ENQUIRY_KEY: 'a'.repeat(64),
  }});
  for (const [status, expected] of [['created', 201], ['duplicate', 200], ['rate_limited', 429], ['conflict', 409]]) {
    fetchMock.get('https://example.supabase.co').intercept({path: '/functions/v1/enquiries', method: 'POST'})
      .reply(200, {id: input.id, status});
    check((await submit(input)).status === expected, `Supabase ${status} must return ${expected}`);
  }
  fetchMock.get('https://example.supabase.co').intercept({path: '/functions/v1/enquiries', method: 'POST'})
    .reply(503, {error: 'Synthetic database outage'});
  check((await submit({...input, id: crypto.randomUUID()})).status === 503, 'Supabase outage must remain retryable');
  const currentDb = await mf.getD1Database('DB');
  check((await currentDb.prepare('SELECT COUNT(*) AS n FROM enquiries').first()).n === 1, 'Supabase outage must not silently write to D1');
  fetchMock.assertNoPendingInterceptors();
  const chunks = path.join(root, 'dist/client/_next/static/chunks');
  let raw = 0, gzip = 0;
  for (const file of await readdir(chunks)) if (/\.(js|css)$/.test(file)) {
    const data = await readFile(path.join(chunks, file)); raw += data.length; gzip += gzipSync(data).length;
  }
  console.log(JSON.stringify({ passed: true, ...counts, bundle: { raw, gzip }, checkedLinks: [...links] }, null, 2));
} finally { await mf.dispose(); }
