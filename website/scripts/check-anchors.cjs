#!/usr/bin/env node
/**
 * Verifies every internal `#fragment` link in the built site points at a heading that exists.
 *
 * starlight-links-validator checks these too, but under Astro's Sätteri engine its heading
 * collection runs before heading ids are assigned, so it reports every anchor as broken. This
 * checks the rendered HTML instead, which is the ground truth, and is used in its place.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
if (!fs.existsSync(DIST)) {
  console.error('check-anchors: no dist/ to check — run the build first.');
  process.exit(1);
}

/** Every page's route -> the heading ids on it. */
const pages = new Map();
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) {
      const rel = path.relative(DIST, full).replace(/\\/g, '/');
      const route =
        '/' +
        rel
          .replace(/index\.html$/, '')
          .replace(/\.html$/, '')
          .replace(/\/$/, '');
      const html = fs.readFileSync(full, 'utf8');
      const ids = new Set();
      for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);
      pages.set(route === '/' ? '/' : route, { ids, html, file: rel });
    }
  }
}
walk(DIST);

const problems = [];
for (const [route, page] of pages) {
  const main = (page.html.match(/<main[\s\S]*?<\/main>/) || [page.html])[0];
  for (const m of main.matchAll(/href="([^"]*#[^"]+)"/g)) {
    const href = m[1];
    if (/^[a-z]+:/i.test(href)) continue;
    const [target, frag] = href.split('#');
    if (!frag || frag === '_top') continue;
    const targetRoute = target === '' ? route : target.replace(/\/$/, '') || '/';
    const targetPage = pages.get(targetRoute);
    if (!targetPage) continue; // a missing page is the link validator's job, not ours
    if (!targetPage.ids.has(decodeURIComponent(frag))) {
      problems.push({ from: page.file, href, targetRoute, frag });
    }
  }
}

if (problems.length) {
  console.error(`\ncheck-anchors: ${problems.length} link(s) point at a heading that does not exist\n`);
  for (const p of problems) console.error(`  ${p.from}\n    ${p.href}  (no "#${p.frag}" on ${p.targetRoute})`);
  process.exit(1);
}
console.log(`check-anchors: all anchor links resolve (${pages.size} pages scanned)`);
