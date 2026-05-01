# WPML Support Assistant

Chrome extension for WPML supporters. It reads public WPML forum tickets, sends the relevant ticket context to the configured AI provider from the background service worker, validates the JSON response, and renders a compact floating assistant panel with next best action, missing information, frustration analysis, related errata, similar tickets, and a suggested reply.

## Current Status

- Manifest V3 extension built with WXT, React, TypeScript strict mode and Tailwind.
- Floating panel injected on `https://wpml.org/forums/topic/*` through Shadow DOM.
- Settings page with enable toggle, Anthropic/OpenAI provider selector, API key fields, model selector, section toggles, custom instructions, API key test, API-key storage notice, and cache clearing.
- API calls happen only in the background service worker.
- Ticket scraping extracts title, canonical URL, status, tags, posts, original customer and supporters.
- Only original customer posts and supporter posts are included in AI context.
- Workflow guidance includes a single next best action and specific missing information requests for support follow-up.
- Errata lookup uses WPML's HTMX known-issues endpoint with a fresh session nonce and falls back to public search if needed.
- Suggested replies include copy support, confidence, and source links.
- Automatic analysis runs only when the ticket title starts with `[Assigned]`.
- Non-assigned tickets render the panel empty until Refresh is clicked.
- Results are cached in `chrome.storage.local` by canonical ticket URL and show `Sin cambios` when no relevant new posts exist. Prompt-version changes invalidate old cached analyses.
- AI responses are validated with Zod before being stored or displayed.

## Setup

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run compile
npm run build
```

Then load `.output/chrome-mv3/` in `chrome://extensions/` with Developer mode enabled.

## Settings

Open the extension options page and configure:

- Provider: Anthropic Claude or OpenAI ChatGPT
- API key for the selected provider
- Model
- Visible sections
- Optional custom instructions

Use a dedicated API key with a low spending limit while testing.
API keys are stored in `chrome.storage.local` for this browser profile and are sent only from the background service worker to the selected AI provider.

## Project Structure

```text
assets/                  Shadow DOM CSS tokens
components/              Floating panel and sections
entrypoints/background.ts Background service worker and AI orchestration
entrypoints/content/      WPML ticket content script
entrypoints/options/      Settings UI
lib/                     Schemas, storage, settings, scraping, prompt and AI clients
```
