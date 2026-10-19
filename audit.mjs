#!/usr/bin/env node
/**
 * site-audit — free website auditor (zero dependencies)
 * ----------------------------------------------------
 * Usage:
 *   node audit.mjs https://example.com
 *   node audit.mjs example.com --json
 *
 * Checks: HTTPS, speed, title, meta description, viewport, headings,
 * images (alt), Open Graph, favicon, lang, page weight, word count.
 */

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const target = args.find((a) => !a.startsWith('--'));

if (!target) {
  console.log('Usage: node audit.mjs <url> [--json]');
  process.exit(1);
}

const url = /^https?:\/\//i.test(target) ? target : `https://${target}`;

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

const pad = (s, n) => String(s).padEnd(n, ' ');

function bar(score) {
  const filled = Math.round(score / 5);
  const color = score >= 80 ? C.green : score >= 55 ? C.yellow : C.red;
  return `${color}${'█'.repeat(filled)}${C.dim}${'░'.repeat(20 - filled)}${C.reset}`;
}

function countMatches(html, re) {
  return (html.match(re) || []).length;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'", mdash: '—', ndash: '–', hellip: '…' };
function decode(s) {
  return String(s)
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
      const k = e.toLowerCase();
      if (ENTITIES[k]) return ENTITIES[k];
      if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16));
      if (k.startsWith('#')) return String.fromCodePoint(parseInt(k.slice(1), 10));
      return m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const started = Date.now();
  let res, html;

  try {
    res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'site-audit/1.0 (+https://github.com/farmoz)' },
    });
    html = await res.text();
  } catch (err) {
    console.error(`${C.red}Could not reach ${url}${C.reset}\n  ${err.message}`);
    process.exit(2);
  }

  const ms = Date.now() - started;
  const kb = Buffer.byteLength(html, 'utf8') / 1024;
  const isHttps = res.url.startsWith('https://');

  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]);
  const desc = decode((html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [, ''])[1]);
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const lang = (html.match(/<html[^>]+lang=["']([^"']+)["']/i) || [, ''])[1];
  const h1 = countMatches(html, /<h1[\s>]/gi);
  const h2 = countMatches(html, /<h2[\s>]/gi);
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter((t) => !/\balt=/i.test(t)).length;
  const ogTitle = /<meta[^>]+property=["']og:title["']/i.test(html);
  const ogImage = /<meta[^>]+property=["']og:image["']/i.test(html);
  const favicon = /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html);
  const canonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  const words = decode(html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')).split(/\s+/).filter(Boolean).length;

  const checks = [];
  const add = (ok, weight, label, detail) => checks.push({ ok, weight, label, detail });

  add(isHttps, 8, 'HTTPS', isHttps ? 'secure' : 'not secure — visitors see a warning');
  add(ms < 1500, 10, 'Response time', `${ms} ms`);
  add(kb < 500, 8, 'Page weight (HTML)', `${kb.toFixed(1)} KB`);
  add(title.length >= 20 && title.length <= 65, 12, 'Title tag', title ? `${title.length} chars — "${title}"` : 'missing');
  add(desc.length >= 50 && desc.length <= 160, 12, 'Meta description', desc ? `${desc.length} chars` : 'missing — Google writes its own');
  add(viewport, 10, 'Mobile viewport', viewport ? 'present' : 'missing — site will look broken on phones');
  add(h1 === 1, 8, 'Single H1', `${h1} found${h2 ? `, ${h2} H2` : ''}`);
  add(imgs.length === 0 || noAlt === 0, 8, 'Image alt text', imgs.length === 0 ? 'no images' : `${noAlt}/${imgs.length} missing alt`);
  add(ogTitle && ogImage, 8, 'Social preview (Open Graph)', ogTitle && ogImage ? 'title + image' : 'incomplete — links look plain on WhatsApp/LinkedIn');
  add(favicon, 4, 'Favicon', favicon ? 'present' : 'missing');
  add(canonical, 4, 'Canonical URL', canonical ? 'present' : 'missing');
  add(words >= 300, 8, 'Content depth', `${words} words`);

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter((c) => c.ok).reduce((s, c) => s + c.weight, 0);
  const score = Math.round((earned / total) * 100);

  const report = {
    url: res.url,
    score,
    ms,
    kb: Number(kb.toFixed(1)),
    title, description: desc, lang, h1, h2,
    images: imgs.length, imagesMissingAlt: noAlt,
    checks: checks.map((c) => ({ pass: c.ok, check: c.label, detail: c.detail })),
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`\n${C.bold}site-audit${C.reset} ${C.dim}— free website report${C.reset}`);
  console.log(`${C.cyan}${res.url}${C.reset}\n`);
  console.log(`  ${bar(score)}  ${C.bold}${score}/100${C.reset}  ${C.dim}(${ms} ms, ${kb.toFixed(1)} KB)${C.reset}\n`);

  for (const c of checks) {
    const icon = c.ok ? `${C.green}✔${C.reset}` : `${C.red}✘${C.reset}`;
    console.log(`  ${icon} ${pad(c.label, 28)} ${C.dim}${c.detail}${C.reset}`);
  }

  const fails = checks.filter((c) => !c.ok);
  console.log('');
  if (!fails.length) {
    console.log(`${C.green}Everything passed. Nice work.${C.reset}\n`);
  } else {
    console.log(`${C.bold}Fix these first:${C.reset}`);
    fails.sort((a, b) => b.weight - a.weight).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.label} ${C.dim}(${f.detail})${C.reset}`);
    });
    console.log(`\n${C.dim}Report generated by site-audit — https://github.com/farmoz/site-audit${C.reset}\n`);
  }
}

main();
