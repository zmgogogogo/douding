# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

豆猫 (Doumao) — a full-stack Perler/fuse bead design tool cloned from dmao.cloud. Users create pixel-art bead designs on a grid, match pixels to real bead colors (Hama/Perler/Artkal), import images, and export PNGs.

## Development Commands

```bash
npm start                   # Start server at http://localhost:3456
node server.js              # Same as above (no build step needed)
```

No build pipeline, no bundler, no TypeScript. The frontend is a single vanilla JS SPA served as static files from `public/`. The backend is a single Express server.

## Architecture

```
server.js          ← Express + SQLite backend (769 lines, single file)
public/
  index.html       ← Complete SPA frontend (1240 lines, single file)
  uploads/         ← User-uploaded images (gitignored)
doumao.db          ← SQLite database (auto-created, gitignored)
index.html         ← Standalone editor (requires no backend)
```

**Two modes of operation:**
1. **Full-stack**: `npm start` → backend at :3456 serves `public/index.html` SPA + API
2. **Standalone**: Open root `index.html` directly in browser — editor only, no persistence

## Backend (`server.js`)

Single-file Express server. All routes under `/api/`.

### Database (SQLite via `better-sqlite3`)

Auto-created on first run. Tables: `users`, `designs`, `folders`, `design_likes`, `bead_brands`, `bead_series`, `bead_colors`, `user_bead_inventory`.

Bead data (3 brands × 69 colors) is seeded once via `seedBeads()` — checks `SELECT COUNT(*)` on `bead_brands` before seeding.

**Design grid storage**: `designs.grid_data` stores the full grid as a JSON string: `[[{name,hex,brand,series}|null,...],...]`. Parse with `JSON.parse()` when reading.

### Auth

JWT-based. Token expires in 30 days. Passwords hashed with `bcryptjs`. Middleware:
- `authRequired` — returns 401 if no valid Bearer token
- `authOptional` — attaches `req.user` if token present, continues either way

### Key API Routes

| Route | Purpose |
|---|---|
| `POST /api/auth/register` | Register (username + password, optional nickname) |
| `POST /api/auth/login` | Login, returns JWT + user object |
| `GET /api/beads` | Full brand→series→colors hierarchy |
| `GET /api/beads/colors` | Flat color list (for editor palette) |
| `POST /api/designs` | Create design (gridData as JSON string) |
| `GET /api/designs/:id` | Get design detail (increments view count) |
| `PUT /api/designs/:id` | Update design (owner only) |
| `DELETE /api/designs/:id` | Delete design (owner only) |
| `GET /api/explore` | Public designs feed (?sort=latest|popular|views) |
| `POST /api/designs/:id/like` | Toggle like |
| `POST /api/image-to-grid` | Upload image → resize (sharp) → nearest-bead-color matching |
| `GET /api/search?q=` | Search public designs by title/description |

API response format: `{ code: 200, data: ... }` on success, `{ code: 4xx, message: "..." }` on error.

### Image Processing

`POST /api/image-to-grid` accepts `multipart/form-data` with `file` and `targetWidth`. Uses `sharp` to resize, then `findNearestColor()` to map each pixel to the closest bead color (weighted color distance: `dr²×2 + dg²×3 + db²`).

## Frontend (`public/index.html`)

Single-file SPA, no framework. Hash-based routing (`#home`, `#editor`, `#detail/:id`, etc.).

### Router

`navigate(page, params)` sets `window.location.hash` and calls `showPage(page)` which toggles `.page.active` visibility and runs the page's render function.

### State Management

Global `AUTH` object (token + user in memory + localStorage). Global `ES` object for editor state. No reactive framework — pages re-render by setting `innerHTML` and re-binding event handlers.

### Pages

| Hash | Page | Key function |
|---|---|---|
| `#home` | Explore feed | `renderHome()` — fetches `/api/explore`, renders `.design-card` grid |
| `#login` | Login/Register | `renderAuth()` — toggles login/register mode |
| `#editor` | Bead editor | `initEditor()` — canvas-based drawing, palette, import/export |
| `#warehouse` | My designs | `renderWarehouse()` — folder sidebar + design list |
| `#detail/:id` | Design view | `renderDetail(id)` — preview, colors, like, edit/delete |
| `#profile` | User profile | `renderProfile(uid)` — user info, public designs |
| `#search` | Search | `renderSearch()` — debounced input → `/api/search` |

### Editor Canvas Architecture

The editor uses three layered canvases in `#editorCanvasWrap`:
1. **mainCanvas** — bead grid rendered via `ImageData` (1 pixel per bead at `gridW × gridH` internal resolution, scaled by `devicePixelRatio`)
2. **gridCanvas** — semi-transparent grid lines overlay
3. **refCanvas** — reference image overlay (from image import)

Zoom is handled by setting canvas CSS `width/height` to `gridW × zoom` while keeping internal resolution fixed. `image-rendering: pixelated` ensures crisp upscaling. Pan offsets (`panX`/`panY`) center the canvas in the container.

### API Client

Global `API` object with `get/post/put/del` methods. Automatically attaches `Authorization: Bearer` header when `AUTH.token` exists. Auth-optional endpoints pass `auth=false`.

## Key Patterns

- **No framework**: Everything is vanilla JS. DOM updates are `innerHTML` + event rebinding.
- **Canvas rendering**: Editor uses `createImageData`/`putImageData` for pixel-level control. Each bead = 1 pixel internally; zoom/pixelRatio handled by canvas CSS sizing.
- **Color matching**: Weighted Euclidean distance in RGB space, green-weighted (`×3`) to match human perception.
- **Undo/redo**: Snapshots of the full grid stored in an array with index pointer. Max 200 snapshots.
- **Mobile**: Right panel slides in/out with CSS `transform`, toolbar collapses. Touch events on canvas call the same pointer handlers.
