# Patryk Sadowski: Personal Portfolio & Resume

A lightweight, responsive, and evergreen personal portfolio/resume website built with clean HTML5, Tailwind CSS, and Vanilla JavaScript. Features dark/light mode, simple bilingual support (EN/PL), advanced SEO optimization, and AI-agent compatibility.

**Live Website:** [patryk-sadowski.pl](https://patryk-sadowski.pl)

---

## Features

- **Zero-Build Architecture:** Single-file HTML structure powered by Tailwind CSS via CDN — no Node.js or framework overhead.
- **Bilingual Support (EN/PL):** Instant language switching with smooth fade animations and `localStorage` persistence (defaults to English).
- **Dark & Light Mode:** Seamless theme toggle with CSS transitions.
- **Advanced SEO & Open Graph:** Includes JSON-LD (Schema.org) structured data for Search Engine Knowledge Graph, complete Open Graph & Twitter/X Cards metadata with custom `og-image.jpg` preview, `sitemap.xml`, and `robots.txt`.
- **Cross-Platform Favicons:** Complete favicon suite including `.ico`, high-res `.png` with Apple iOS Icon support.
- **AI-Agent Compatible:** Includes `llms.txt` structured Markdown context for AI models and crawlers.
- **GitHub Pages Hosted:** Automated deployment via GitHub Pages with custom domain integration (`patryk-sadowski.pl`).

---

## Tech Stack

- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript
- **SEO & Metadata:** JSON-LD, Open Graph Protocol
- **Assets:** Custom SVGs, Favicons, Social Preview Card
- **Hosting & Infrastructure:** GitHub Pages, Custom Domain + DNS

---

## Repository Structure

```text
.
├── index.html              # Main landing page (One-pager with embedded JSON-LD)
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
