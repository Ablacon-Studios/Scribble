# Tech Spec: Serve Web + Electron App from Server

**Status**: In Planning  
**Feature**: #1 — Serve Web + Electron App from Server  
**Author**: Business Analyst  
**Date**: 2026-07-03

---

## 1. Overview

This feature establishes the foundational serving architecture for Scribble. The Flask backend must serve the built React frontend as static files in production, while in development the Vite dev server and Flask run side-by-side on separate ports. The Electron desktop shell must load the correct URL depending on the environment.

### Why This Is Needed
- Users need a single entry point (`http://localhost:5000`) to access the full app in production.
- Developers need hot module reload (HMR) via Vite during development.
- The Electron desktop app must work in both modes without code changes to the renderer.
- This is the **blocking prerequisite** for all subsequent features — without it, there is no working app to build upon.

### High-Level Modes

```
┌──────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT MODE                             │
│                                                                  │
│   Browser ──► http://localhost:5173 (Vite dev server)            │
│                    │                                             │
│                    │ API calls (CORS)                             │
│                    ▼                                             │
│              http://localhost:5000 (Flask API only)               │
│                                                                  │
│   Electron ──► http://localhost:5173 (same Vite server)          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     PRODUCTION MODE                               │
│                                                                  │
│   Browser ──► http://localhost:5000                              │
│                    │                                             │
│                    ├── /api/* ──► Flask API handlers              │
│                    ├── /socket.io/* ──► WebSocket (SocketIO)      │
│                    └── /* ──► client/dist/index.html (static)     │
│                                                                  │
│   Electron ──► http://localhost:5000 (same Flask server)         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. User Stories

| ID | Role | Need | Acceptance Criteria |
|----|------|------|---------------------|
| US-1.1 | End User (Browser) | Access the Scribble app at a single URL | Navigating to `http://localhost:5000` loads the full React app. Refreshing any client-side route (e.g., `/draw/123`) returns `index.html`, not a 404. |
| US-1.2 | End User (Electron) | Open the desktop app without needing a separate server | Launching the Electron app loads the Scribble UI. |
| US-1.3 | Developer | Use hot module reload while building features | Running `npm run dev` in `client/` starts Vite on :5173. Changes to React components reflect instantly in the browser. |
| US-1.4 | Developer | Call the Flask API from the Vite-served frontend | API calls from `http://localhost:5173` to `http://localhost:5000/api/*` succeed without CORS errors. |
| US-1.5 | DevOps / Deployer | Configure ports and modes via environment variables | Setting `FLASK_ENV=production` or `FLASK_ENV=development` correctly switches the server behavior. Ports are configurable. |

---

## 3. Technical Approach

### 3.1 Backend Changes (`server/app.py`)

The existing `app.py` is a minimal "Hello World" stub. It must be expanded into the real application entry point with the following responsibilities:

#### 3.1.1 Flask App Factory
- Create the Flask application using a factory pattern (or a simple `create_app()` function).
- Load configuration from environment variables (via `python-dotenv`).

#### 3.1.2 Production Mode: Static File Serving
When `FLASK_ENV=production` (or equivalent):
- Set `static_folder` to point at `../client/dist/` (relative to `server/app.py`).
- Set `static_url_path` to `''` so files are served at root (`/assets/index-abc123.js`).
- Register a catch-all route **after** all API/SocketIO routes that serves `index.html` for any unmatched path (SPA fallback).
- Do **not** run Vite — the built files are pre-generated and served statically.

#### 3.1.3 Development Mode: API-Only Server
When `FLASK_ENV=development`:
- Flask does **not** serve static files (Vite handles that on :5173).
- Flask runs only API and WebSocket routes.
- CORS is enabled with `allow_origin` set to `http://localhost:5173` (or configurable origins).
- The `@app.route('/')` catch-all should NOT be registered in dev mode — or it should return a friendly message indicating the API is running.

#### 3.1.4 CORS Configuration
- `Flask-CORS` is already installed (`flask-cors>=4.0` in `requirements.txt`).
- In **development**, CORS must allow the Vite origin.
- In **production**, CORS is unnecessary (same-origin) but should still allow the Electron `file://` origin if the Electron app ever needs to load from file.
- CORS origins should be configurable via `CORS_ORIGINS` env var (comma-separated list). Default development: `http://localhost:5173`. Default production: `*` or empty (same-origin).

#### 3.1.5 SocketIO Configuration
- `Flask-SocketIO` must be initialized with the Flask app.
- In production, SocketIO runs on the same port (5000) over the standard WebSocket upgrade.
- In development, SocketIO must also handle CORS — `cors_allowed_origins` should match the CORS config.
- The async mode should use `eventlet` (already in `requirements.txt`).

---

### 3.2 Frontend Changes (`client/`)

#### 3.2.1 Vite Configuration (`client/vite.config.js`)

The current `vite.config.js` is bare — it needs the following additions:

**Build Configuration:**
- Set `build.outDir` to `dist` (the default, but explicit is better).
- Set `base` to `'/'` so asset paths are root-relative.
- The `build.assetsDir` should remain `assets` (default).

**Development Proxy:**
- Add a Vite dev server proxy so that `/api` and `/socket.io` requests from the browser are forwarded to Flask on :5000.
- This eliminates the need for absolute API URLs in development.

**Electron consideration:** CORS must still be enabled on Flask because Electron's API calls go directly to Flask (bypassing Vite proxy).

Vite config structure:
```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
```

#### 3.2.2 Environment Variable for API Base URL
- Create `.env.development` and `.env.production` files under `client/`.
- `VITE_API_BASE_URL` defaults to empty string (relative URLs) in both modes, since the Vite proxy handles `/api` forwarding in dev and same-origin in prod.
- Vite auto-loads `.env.*` files and exposes `VITE_*` variables.

#### 3.2.3 React App Entry (`client/src/main.jsx`)
- No changes needed. Existing `main.jsx` renders `<App />` into `#root`.
- The `<App />` component is out of scope.

#### 3.2.4 `client/index.html`
- Update `<title>` from `"client"` to `"Scribble"`.

---

### 3.3 Electron Changes (`client/electron/main.js`)

The existing `main.js` already has `NODE_ENV`-based switching:

```javascript
const isDev = process.env.NODE_ENV === 'development';
if (isDev) {
  mainWindow.loadURL('http://localhost:5173');
} else {
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}
```

**Required Change:** In production, load from `http://localhost:5000` instead of local file:

```javascript
const DEV_URL = 'http://localhost:5173';
const PROD_URL = process.env.SCRIBBLE_URL || 'http://localhost:5000';

if (isDev) {
  mainWindow.loadURL(DEV_URL);
  mainWindow.webContents.openDevTools();
} else {
  mainWindow.loadURL(PROD_URL);
}
```

**Electron Dev Script:**
- Current script uses `NODE_ENV=development electron .` which doesn't work on Windows.
- Add `cross-env` as devDependency and update script:
```json
"electron:dev": "cross-env NODE_ENV=development electron ."
```

---

## 4. Data Flow

### 4.1 Development Mode — Browser Client

```
Browser → Vite :5173 (serves React + HMR)
Browser → Vite :5173/api/* → proxy → Flask :5000
```

### 4.2 Development Mode — Electron Client

```
Electron → Vite :5173 (loadURL, same React app)
Electron → Flask :5000 (API calls directly, CORS required)
```

### 4.3 Production Mode — Both Clients

```
Client → Flask :5000 → serves index.html + static assets + API
SPA routing: /draw/123 → catch-all → index.html → React Router handles client-side
```

---

## 5. API Design

| Prefix | Handler | Description |
|--------|---------|-------------|
| `/api/*` | Flask route handlers | REST API endpoints |
| `/socket.io/*` | Flask-SocketIO | WebSocket connections |
| `/assets/*` | Flask static | Built JS/CSS/images |
| `/*` (fallback) | Flask catch-all | SPA fallback → `index.html` |

---

## 6. Database Schema

No database changes required. SQLAlchemy initialization should be deferred or optional for now.

---

## 7. Dependencies

### New Dependencies

| Package | Location | Type | Purpose |
|---------|----------|------|---------|
| `cross-env` | `client/package.json` | devDependency | Cross-platform env var for `electron:dev` |
| `eventlet` | `server/pyproject.toml` | dependency | Add to pyproject.toml for consistency (already in requirements.txt) |

---

## 8. File Change Summary

### Files to Create
| File | Purpose |
|------|---------|
| `server/.env` | Environment variables for Flask |
| `server/.env.example` | Template with documented defaults |
| `client/.env.development` | Vite env vars for dev |
| `client/.env.production` | Vite env vars for prod |

### Files to Modify
| File | Change |
|------|--------|
| `server/app.py` | Complete rewrite: app factory, static serving, CORS, catch-all route |
| `client/vite.config.js` | Add proxy config, explicit build settings |
| `client/electron/main.js` | Change production load to URL instead of file |
| `client/package.json` | Add `cross-env` dep, update `electron:dev` script |
| `client/index.html` | Update title to "Scribble" |
| `server/pyproject.toml` | Add `eventlet` to dependencies |

---

## 9. Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `development` | Controls static serving, CORS, debug mode |
| `FLASK_PORT` | `5000` | Flask server port |
| `FLASK_DEBUG` | `1` (dev), `0` (prod) | Flask debug mode |
| `CORS_ORIGINS` | `http://localhost:5173` (dev) | Allowed CORS origins |
| `VITE_API_BASE_URL` | `''` (empty) | API base URL for frontend |
| `SCRIBBLE_URL` | `http://localhost:5000` | Production URL for Electron |

### Flask App Configuration Logic

```python
if FLASK_ENV == 'production':
    app = Flask(__name__, static_folder='../client/dist', static_url_path='')
    # No CORS needed (same origin) or minimal CORS
    # Register SPA fallback route
else:
    app = Flask(__name__)  # No static folder
    CORS(app, origins=CORS_ORIGINS.split(','))
    # No SPA fallback — API only
```

---

## 10. Edge Cases & Error Handling

- **Build Not Found**: Crash early with clear error message if `client/dist/` missing in production.
- **CORS Blocking**: Default CORS origins cover both Vite and same-origin. Vite proxy eliminates CORS for browser dev.
- **Port Conflicts**: Vite `strictPort: true` prevents auto-increment. Flask shows clear error.
- **SPA Deep Link Refresh**: `GET /draw/abc123` → catch-all → `index.html` (React Router handles rest).
- **Electron Offline**: Default Chromium error page is acceptable for now.
- **SocketIO Route Protection**: Flask-SocketIO registers routes before catch-all; no interference.
- **Cross-Platform Paths**: `../client/dist` tested on both Windows and Unix.

---

## 11. Testing Strategy

### Backend Tests (pytest)
- Production serves index.html, SPA fallback works, API routes not blocked, static assets served
- Development has no static serving, has CORS headers
- SocketIO route protected from catch-all
- Missing build raises clear error

### Frontend Tests (Jest + RTL)
- App renders without crashing
- index.html has correct title
- Vite build produces expected output

### Electron Tests
- Dev mode loads correct URL
- Production loads configurable URL
- DevTools only open in dev mode

---

## 12. Out of Scope

- API route implementations
- React drawing canvas UI
- User authentication
- Database schema and migrations
- WebSocket event handling
- Production Electron packaging
- CI/CD
- HTTPS/TLS

---

## 13. Acceptance Criteria Checklist

- [ ] `FLASK_ENV=production` → Flask serves built React app from `client/dist/`
- [ ] All non-API routes return `index.html` (SPA fallback) in production
- [ ] `FLASK_ENV=development` → Flask runs API-only; Vite serves frontend on :5173
- [ ] CORS allows cross-origin requests from Vite dev server
- [ ] Vite dev server proxies `/api/*` and `/socket.io/*` to Flask
- [ ] Vite `npm run build` outputs to `client/dist/`
- [ ] Electron loads `http://localhost:5173` in dev, `http://localhost:5000` in prod
- [ ] Environment variables control all configurable behavior
- [ ] All tests pass (backend pytest, frontend Jest)
- [ ] Manual verification on both browser and Electron in both modes
