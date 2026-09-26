// Read-only page/link audit of a running Next.js production build.
// API checks intentionally submit invalid input and never create an enquiry.
import assert from 'node:assert/strict';

const origin = new URL(process.argv[2] || 'http://127.0.0.1:4317');
const paths = ['/', '/services', '/work', '/about', '/contact', '/privacy'];
const pages = new Map();
const links = new Set();
const assets = new Set(['/hero.webp', '/manrope.woff2', '/favicon.svg']);
let assertions = 0;
const check = (condition, message) => {assert.ok(condition, message); assertions++;};
async function page(path) {
  if (pages.has(path)) return pages.get(path);
  const response = await fetch(new URL(path, origin));
  check(response.status === 200, `${path}: HTTP ${response.status}`);
  const html = await response.text();
  check((html.match(/<h1[\s>]/g) || []).length === 1, `${path}: exactly one h1`);
  check(/<title>[^<]+<\/title>/.test(html), `${path}: title`);
  check(html.includes('id="main"'), `${path}: skip target`);
  pages.set(path, html);
  return html;
}
for (const path of paths) {
  const html = await page(path);
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const target = new URL(href.replaceAll('&amp;', '&'), origin);
    check(target.origin === origin.origin, `Unexpected external link: ${target}`);
    const document = await page(target.pathname + target.search);
    if (target.hash) check(document.includes(`id="${target.hash.slice(1)}"`), `Missing anchor ${target.hash}`);
    links.add(target.pathname + target.search + target.hash);
  }
  for (const [, src] of html.matchAll(/<(?:script|img|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
    if (src.startsWith('/_next/') || /\.(css|woff2|webp|svg)$/.test(src)) assets.add(src);
  }
}
for (const src of assets) {
  const response = await fetch(new URL(src.replaceAll('&amp;', '&'), origin));
  check(response.status === 200, `Missing asset ${src}`);
  check(!response.headers.get('content-type')?.includes('text/html'), `HTML returned for asset ${src}`);
  await response.arrayBuffer();
}
for (const path of ['/robots.txt', '/sitemap.xml']) check((await fetch(new URL(path, origin))).status === 200, `${path} missing`);
check((await fetch(new URL('/audit-missing-page', origin))).status === 404, 'Unknown route must return 404');
check((await fetch(new URL('/api/enquiries', origin))).status === 405, 'GET must not expose enquiries');
const invalid = await fetch(new URL('/api/enquiries', origin), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'});
check(invalid.status === 400, 'Invalid enquiry must be rejected');
console.log(JSON.stringify({passed: true, pages: pages.size, links: links.size, assets: assets.size, assertions}, null, 2));
