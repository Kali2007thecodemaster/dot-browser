# Dot

> Your personal AI web agent — built on Chrome, designed around you.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

---

## What is Dot?

Dot is a personal AI web automation agent that runs as a Chrome extension. Give it a task in plain language — it plans, navigates, extracts, fills forms, and reports back — all inside your browser, using your own API keys.

Dot is built on top of the open-source [Nanobrowser](https://github.com/nanobrowser/nanobrowser) project (Apache 2.0), which provides the multi-agent browser control foundation. On top of that, Dot adds a fully custom design system, personal productivity features, and a tighter focus on individual use.

---

## Features

### Core Automation
- **Three-agent system** — Planner, Navigator, and Validator collaborate on complex tasks
- **Multi-step browsing** — Agent opens its own tab so it never interrupts your session
- **URL batch mode** — Paste multiple URLs with one instruction; runs them in sequence
- **Follow-up questions** — Continue the conversation after a task completes

### Personal Productivity
- **Profile store** — Name, email, skills, experience — agent reads these to fill forms for you
- **Workflow templates** — Pre-built task templates: job search, research, extraction, form filling
- **File uploads** — Attach `.md` or `.pdf` files; PDFs are converted to markdown automatically
- **Context menu** — Right-click any selected text → "Ask Dot about this" pre-fills the input
- **Past session browser** — Load any previous chat and continue it

### Monitoring & Scheduling
- **Web watches** — Monitor URLs for content changes; Chrome notification when a page updates
- **Scheduled tasks** — Run any agent task on a repeating interval (hourly, daily, etc.)

### Results & Analysis
- **Results store** — Extracted data is saved and browsable
- **Result diffing** — Select two saved results and see what was added, removed, or changed

### Safety
- **Financial guardrails** — Agent cannot click purchase/checkout/pay buttons without explicit user confirmation
- **AI consultation** — For complex sub-tasks the agent can open Gemini, Claude, ChatGPT, or DeepSeek in a new tab and use structured prompts
- **Boot gate** — Manual power-on before the agent initializes (API cost control)

### Design
- **Brutalist glassmorphism** — 3-tone palette (beige / black / burnt amber), dark mode
- **Fonts** — Manrope (body), Cormorant Garamond (headings), monospace (labels)

---

## Browser Support

| Browser | Status |
|---------|--------|
| Chrome | Full support |
| Edge | Full support |
| Firefox, Safari, other Chromium | Not supported (Chrome MV3 APIs required) |

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v22.12.0 or higher
- [pnpm](https://pnpm.io/installation) v9.15.1 or higher

### Install

```bash
git clone https://github.com/Kali2007thecodemaster/dot-browser.git
cd dot-browser
pnpm install
pnpm build
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `dist/` folder
4. Open the Dot side panel from the toolbar

### Configure

1. Click the **Settings** icon in the side panel
2. Add at least one LLM API key (Anthropic, OpenAI, Gemini, etc.)
3. Assign models to the Navigator and Planner agents
4. Start a task

---

## Recommended Models

| Agent | Better performance | Cost-effective |
|-------|-------------------|----------------|
| Planner | Claude Sonnet 4 | Claude Haiku / GPT-4o |
| Navigator | Claude Haiku 3.5 | Gemini 2.5 Flash / GPT-4o-mini |

Local models via Ollama are also supported (Qwen 2.5, Mistral Small, Falcon 3).

---

## Development

```bash
pnpm dev                                  # hot-reload dev build
pnpm build                                # production build
pnpm -F chrome-extension type-check       # type-check background worker
pnpm -r --filter "./pages/side-panel" type-check  # type-check side panel
pnpm zip                                  # → dist-zip/ for distribution
```

---

## Tech Stack

- **Chrome MV3** — service worker + side panel
- **React 18** + TypeScript + Tailwind CSS + Vite
- **LangChain.js** — agent orchestration and LLM abstraction
- **Puppeteer / CDP** — browser control and DOM interaction
- **pnpm workspaces** + Turbo — monorepo build system
- **pdfjs-dist** — PDF text extraction

---

## Example Tasks

```
Go to Hacker News and extract the top 10 stories with links
```
```
https://linkedin.com/jobs/...
https://indeed.com/jobs/...
https://weworkremotely.com/...

Check each of these listings and tell me which ones require TypeScript
```
```
Fill in the job application form at [url] using my profile
```
```
Every 6 hours, check news.ycombinator.com for new AI stories
```

---

## Credits

Dot is built on top of **[Nanobrowser](https://github.com/nanobrowser/nanobrowser)** (Apache 2.0) — an open-source multi-agent browser automation framework. The core agent architecture (Planner, Navigator, Validator), CDP-based browser control, and the extension scaffolding all originate from that project. Sincere thanks to the Nanobrowser team and all upstream contributors.

Additional open-source projects this builds on:

- [LangChain.js](https://js.langchain.com/) — LLM orchestration
- [Chrome Extension Boilerplate](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite) — Vite + React MV3 setup
- [pdfjs-dist](https://mozilla.github.io/pdf.js/) — PDF parsing
- [Browser Use](https://github.com/browser-use/browser-use) — inspiration for DOM interaction patterns

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
