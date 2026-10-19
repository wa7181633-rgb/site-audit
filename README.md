# site-audit

A free website auditor that runs in one command. **Zero dependencies.** Checks the things that actually cost you customers: speed, SEO basics, mobile readiness and social previews — then gives you a score out of 100 and a prioritised fix list.

```bash
node audit.mjs example.com
```

```
site-audit — free website report
https://example.com/

  ██████████████████░░  90/100  (312 ms, 48.2 KB)

  ✔ HTTPS                        secure
  ✔ Response time                312 ms
  ✔ Title tag                    47 chars — "Example — Fast, clean websites"
  ✘ Meta description             missing — Google writes its own
  ...
```

## Why

Most small-business sites lose enquiries for boring reasons: a missing meta description, no mobile viewport, images without alt text, a 4 MB homepage. `site-audit` finds them in 2 seconds, for free, with no signup.

**Run it before you hire anyone — including me.** If your current site scores badly, that's the work to do first.

## Install

Nothing to install.

```bash
git clone https://github.com/farmoz/site-audit
cd site-audit
node audit.mjs yourdomain.com
```

Requires Node.js 18+ (uses the built-in `fetch`).

## Usage

| Command | What it does |
|---|---|
| `node audit.mjs example.com` | Human-readable report with colour |
| `node audit.mjs https://example.com --json` | Machine-readable JSON (for CI, dashboards, scripts) |
| `node audit.mjs example.com > report.txt` | Save a report to a file |

### JSON mode

```bash
node audit.mjs example.com --json
```

```json
{
  "url": "https://example.com/",
  "score": 90,
  "ms": 312,
  "kb": 48.2,
  "checks": [{ "pass": true, "check": "HTTPS", "detail": "secure" }]
}
```

Pipe it into anything:

```bash
node audit.mjs client.com --json | jq '.score'
```

## What it checks (12 checks, weighted)

| Weight | Check | Fails when |
|---|---|---|
| 12 | Title tag | missing, or not 20–65 characters |
| 12 | Meta description | missing, or not 50–160 characters |
| 10 | Response time | slower than 1.5 s |
| 10 | Mobile viewport | no `viewport` meta — site breaks on phones |
| 8 | HTTPS | served over plain HTTP |
| 8 | Page weight | HTML larger than 500 KB |
| 8 | Single H1 | zero or multiple `<h1>` |
| 8 | Image alt text | any `<img>` without `alt` |
| 8 | Open Graph | missing `og:title` / `og:image` |
| 8 | Content depth | under 300 words |
| 4 | Favicon | no icon link |
| 4 | Canonical URL | no canonical link |

Score = weighted pass rate. Nothing is sent anywhere: the only network request is the one to the site you asked about.

## Limitations (honest ones)

- It reads the **raw HTML**, so it does not measure real-world render speed, Core Web Vitals or JavaScript errors. For that use Lighthouse.
- JavaScript-rendered sites (React/Vue SPAs) may show missing content where the HTML is empty. Use a prerendered URL.
- It is not a security scanner.

## Roadmap

- [ ] `--compare` mode: audit two URLs side by side
- [ ] CSV output for client reports
- [ ] Optional Lighthouse pass-through when installed
- [ ] Broken-link crawler across internal pages

Ideas and pull requests welcome.

## License

MIT — use it, sell the reports, no attribution needed.
