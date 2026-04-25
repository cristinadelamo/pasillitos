# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pasillitos** is a single-file, client-side Spanish-language grocery list organizer. It uses AI (Google Gemini) to parse shopping lists from photos, then matches extracted items to a user-managed aisle catalog. No build system, no package manager, no dependencies beyond CDN-loaded libraries.

**To run:** Open `index.html` directly in a browser, or serve it with any static HTTP server.

## Architecture

The entire application lives in `index.html` (~940 lines). It has three logical layers:

### Data Layer — sql.js + IndexedDB
- **sql.js** (CDN): SQLite compiled to WebAssembly, runs fully in-browser
- **IndexedDB** (`pasillitos` DB): Persists the SQLite binary blob across sessions
- Schema tables: `config` (API key), `pasillos` (aisles), `articulos` (item catalog per aisle), `lista` (current shopping list with aisle assignment and checked state)
- All DB mutations auto-save to IndexedDB immediately after execution

### Business Logic
- **Photo → items**: User takes/uploads photo → base64-encoded → sent to Gemini 1.5 Flash API → structured JSON response parsed (with regex fallback if JSON extraction fails)
- **Fuzzy matching** (`matchItemsToArticulos`): Normalizes strings (lowercase, strip diacritics, strip units/quantities), then scores: exact match (1.0), substring (0.85), word-overlap (proportional). Threshold 0.5 for auto-classification
- **Auto-learning**: Unmatched items enter a manual classification flow where the user assigns an aisle; the item is then added to `articulos` for future auto-matching (duplicate guard via `articuloExiste`)

### UI
- 3-tab layout: **Mi lista** (shopping list), **Pasillos** (aisle CRUD), **Ajustes** (settings/API key)
- 3 modals: pasillo editor, classification workflow, loading spinner
- Mobile-first (max-width 600px), Spanish throughout
- CSS variables define the green color theme

## Key Behaviors to Preserve

- **API key security**: The Gemini API key is stored only in IndexedDB and never sent anywhere except Google's API endpoint directly from the browser.
- **Delete cascade**: Deleting an aisle removes its `articulos` AND clears aisle assignment on any `lista` items referencing it.
- **Export**: The SQLite binary is downloadable as a `.sqlite` file from Ajustes.
- **Keyboard UX**: Enter key advances through input fields in the pasillo editor and classification modal.
- **No full re-renders**: `toggleItem` and similar targeted updates avoid re-rendering the full list for performance.

## CDN Dependencies

| Library | Purpose |
|---|---|
| sql.js | SQLite in WebAssembly |
| Google Gemini 1.5 Flash | Image-to-text AI parsing |

Both are loaded via CDN at runtime; no local installation needed.
