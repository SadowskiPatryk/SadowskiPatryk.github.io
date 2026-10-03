# Patryk Sadowski: Personal Portfolio & Resume

A lightweight, responsive, and evergreen personal portfolio/resume website built with clean HTML5, hand-written CSS, and Vanilla JavaScript. Features dark/light mode, separate bilingual pages (EN/PL), advanced SEO optimization, an interactive CT Viewer demo, and AI-agent compatibility.

**Live Website:** [patryk-sadowski.pl](https://patryk-sadowski.pl)

---

## Features

- **Zero Runtime Dependencies:** Plain static HTML, one CSS file and two small JS files — no frameworks, no CDN scripts and no third-party requests (the Tailwind CDN was replaced by hand-written CSS).
- **Bilingual Support (EN/PL):** Separate pages — `/` (English) and `/pl/` (Polish) — linked with `hreflang`, so both languages are indexable and shareable.
- **Dark & Light Mode:** Seamless theme toggle with CSS transitions, applied before first paint (no flash).
- **Interactive extras:** A hand-written WebGL CT Viewer widget (clip planes, capping) embedded in the project card, and a small interactive terminal in the hero.
- **Advanced SEO & Open Graph:** Includes JSON-LD (Schema.org) structured data for Search Engine Knowledge Graph, complete Open Graph & Twitter/X Cards metadata with custom `og-image.jpg` preview, `sitemap.xml` (with `hreflang` alternates), `robots.txt`, a strict Content-Security-Policy and a custom `404.html`.
- **Cross-Platform Favicons:** Complete favicon suite including `.ico`, high-res `.png` with Apple iOS Icon support.
- **AI-Agent Compatible:** Includes `llms.txt` structured Markdown context for AI models and crawlers.
- **GitHub Pages Hosted:** Automated deployment via GitHub Pages with custom domain integration (`patryk-sadowski.pl`).

---

## Tech Stack

- **Frontend:** HTML5, CSS (custom properties), Vanilla JavaScript, WebGL
- **SEO & Metadata:** JSON-LD, Open Graph Protocol
- **Assets:** Custom SVGs, Favicons, Social Preview Card
- **Hosting & Infrastructure:** GitHub Pages, Custom Domain + DNS

---

## Repository Structure

```text
.
├── index.html              # English landing page (embedded JSON-LD)
├── pl/index.html           # Polish landing page
├── 404.html                # Custom 404 page
├── assets/
│   ├── css/                # site.css (site) and viewer.css (CT Viewer widget)
│   ├── js/                 # site.js (UI, terminal) and viewer.js (WebGL widget)
│   └── img/                # Logo mark
├── viewer/index.html       # CT Viewer widget (embedded as an iframe, noindex)
├── Patryk_Sadowski_CV.pdf  # Downloadable CV
├── favicon.ico             # Standard favicon icon
├── favicon.png             # High-resolution PNG favicon
├── apple-touch-icon.png    # iOS homescreen icon
├── og-image.jpg            # Open Graph social media preview card
├── llms.txt                # Context summary for AI agents
├── robots.txt              # Web crawler directives
├── sitemap.xml             # Search engine sitemap
├── CNAME                   # GitHub Pages custom domain configuration
├── LICENSE                 # Repository license
└── README.md               # This file
```
