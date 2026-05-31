# Keystroke

A fast, private, offline-first markdown notes app with rich-text editing, image support, and a dark-themed brand identity.

Built as a Progressive Web App (PWA) — works offline, installable on desktop and mobile.

## Features

- **Markdown editing** with live preview toggle
- **Rich-text formatting** — bold, italic, underline, headings, links, bullet lists, code blocks
- **Image support** — insert, resize, and delete images inline
- **Auto-pairing** for brackets, quotes, and parentheses
- **Auto-replace** — `.,` → `•`, `=>` / `->` → `→`
- **Keyboard shortcuts** — `Ctrl+N` (new note), `Ctrl+F` (search), `Ctrl+S` (save)
- **Pin notes** — keep important notes at the top
- **Search** — filter notes by title and body
- **Bulk select & delete** with undo
- **Export** — save notes as `.txt` (plain text) or `.md` (markdown)
- **Import/Export** — full backup as JSON
- **Fullscreen mode** — hide sidebar for distraction-free writing
- **Resizable sidebar** — drag to adjust width
- **Dark/light theme** — toggle with persistent preference
- **Sort notes** — by recent, created date, or title
- **Custom scrollbars**, tooltips, and smooth animations
- **Offline PWA** — service worker with stale-while-revalidate caching
- **Zero telemetry** — fully offline, no tracking, no network requests

## Tech Stack

- [Vite](https://vitejs.dev/) — build tool
- [idb](https://github.com/jakearchibald/idb) — IndexedDB wrapper
- [marked](https://marked.js.org/) — markdown parser
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — PWA support
- Vanilla JavaScript — no framework

## Getting Started

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

### Build for production

```bash
npm run build
```

Output is in `dist/`.

### Preview production build

```bash
npm run preview
```

## Usage

- **New note** — click the `+` button or press `Ctrl+N`
- **Search** — press `Ctrl+F` or type in the search bar
- **Pin** — click the star icon or right-click → Pin note
- **Delete** — right-click → Delete note, or select mode → bulk delete
- **Formatting** — use the toolbar in the editor for bold, italic, underline, heading, link, list, and code
- **Preview** — toggle between Edit and Preview modes
- **Save as** — use the buttons in the editor footer to save as `.txt` or `.md`
- **Theme** — click the moon/sun icon to switch between dark and light mode
- **Fullscreen** — click the fullscreen icon to hide the sidebar
- **Settings** — export/import all notes as JSON backup

## PWA

Keystroke is fully installable as a PWA. When visited on a supported browser, an install prompt appears. The app works offline once cached.

## License

MIT
