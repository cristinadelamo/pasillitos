# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pasillitos** is a single-file, client-side Spanish-language grocery list organizer. It uses AI (Anthropic Claude Haiku) to parse shopping lists from photos, then matches extracted items to a user-managed aisle catalog. No build system, no package manager, no dependencies beyond CDN-loaded libraries.

**To run:** Open `index.html` directly in a browser, or serve it with any static HTTP server (required for the service worker to register correctly).

## Architecture

The entire application lives in `index.html` (~1290 lines). It has three logical layers:

### Data Layer — sql.js + IndexedDB
- **sql.js** (CDN): SQLite compiled to WebAssembly, runs fully in-browser
- **IndexedDB** (`pasillitos` DB): Persists the SQLite binary blob across sessions
- Schema tables: `config` (API key), `pasillos` (aisles), `articulos` (item catalog per aisle), `lista` (current shopping list with aisle assignment and checked state)
- All DB mutations call `persist()` immediately, which exports the SQLite binary and saves it to IndexedDB
- Query helpers: `q()` (multi-row), `q1()` (single-row), `run()` (mutation)

### In-Memory State
- `lista` (global array): mirrors the `lista` DB table in memory; populated at init via `loadLista()` and kept in sync manually — this is the source of truth for rendering
- `photoData`: base64-encoded current photo, reset on "Nueva lista"

### Business Logic
- **Photo → items**: User takes/uploads photo → base64-encoded → sent to Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) at `https://api.anthropic.com/v1/messages` → JSON response parsed (with regex fallback for `{...}` extraction)
- **Voice dictation**: Web Speech API (`es-ES`, continuous mode) — items dictated one at a time, each passed immediately through `matchCatalog`
- **Fuzzy matching** (`matchCatalog` / `matchScore`): Normalizes strings via `norm()` (lowercase, NFD diacritic stripping, collapse non-alphanumeric to spaces), then scores: exact match (1.0), substring (0.85), word-overlap (proportional). Threshold 0.5 for auto-classification
- **Auto-learning**: Unmatched items enter a manual classification flow (`startClassify` → `doClassify`); the item is then added to `articulos` for future auto-matching (duplicate guard via `articuloExiste`)
- **Emergency backup**: Every `renderPasillos()` call writes the catalog to `localStorage` key `pasillitos_catalog_backup` as a secondary recovery mechanism independent of IndexedDB

### UI
- 3-tab layout: **Mi lista** (shopping list), **Pasillos** (aisle CRUD), **Ajustes** (settings/API key)
- 3 modals: pasillo editor (bottom sheet overlay), classification workflow, loading spinner
- Mobile-first (max-width 600px), Spanish throughout
- CSS variables define the color theme: `--green`, `--green-l`, `--green-d`, `--amber`, `--red`
- Drag-to-reorder aisles via SortableJS; the `onEnd` handler renumbers all aisles sequentially from 1

### PWA / Service Worker (`sw.js`)
- Cache name: `pasillitos-v3` — increment this constant to bust the cache after updating icons or `manifest.json`
- `index.html`: **network-first** (always serves the latest version to mobile home-screen installs)
- CDN libs, icons, manifest: **cache-first**
- Calls to `api.anthropic.com` bypass the service worker entirely

## Key Behaviors to Preserve

- **API key security**: The Anthropic API key is stored only in IndexedDB and sent only to `api.anthropic.com` directly from the browser.
- **Delete cascade**: Deleting an aisle removes its `articulos` AND clears aisle assignment on any `lista` items referencing it.
- **Export formats**: `.sqlite` binary for full DB backup; `catalogo.json` for catalog-only transfer; `apikey.json` for API key transfer between devices
- **Keyboard UX**: Enter key advances through input fields in the pasillo editor and classification modal.
- **No full re-renders**: `toggleItem` updates the DOM directly without re-rendering the full list.
- **XSS protection**: All user-supplied strings injected into innerHTML go through `esc()`.

## CDN Dependencies

| Library | Version | Purpose |
|---|---|---|
| sql.js | 1.12.0 | SQLite in WebAssembly |
| SortableJS | 1.15.3 | Drag-to-reorder aisles |
| Anthropic Claude Haiku | claude-haiku-4-5-20251001 | Image-to-text AI parsing (API call, not CDN) |
