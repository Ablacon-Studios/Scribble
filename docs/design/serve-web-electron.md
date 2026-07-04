# Design Document: Serve Web + Electron App from Server

**Feature**: #1 — Serve Web + Electron App from Server  
**Status**: In Design  
**Author**: UI/UX Designer  
**Date**: 2026-07-03  
**Tech Spec**: `docs/specs/serve-web-electron.md`

---

## Table of Contents

1. [Design Overview](#1-design-overview)
2. [Layout & Component Hierarchy](#2-layout--component-hierarchy)
3. [Development Mode Status Page](#3-development-mode-status-page)
4. [Splash / Loading Screen](#4-splash--loading-screen)
5. [Electron Window Specifications](#5-electron-window-specifications)
6. [Error States](#6-error-states)
7. [App Branding & Color Palette](#7-app-branding--color-palette)
8. [Tailwind CSS Setup](#8-tailwind-css-setup)
9. [Interaction Design & User Flows](#9-interaction-design--user-flows)
10. [Accessibility](#10-accessibility)
11. [Real-time UX Considerations](#11-real-time-ux-considerations)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Design Overview

This feature establishes the serving architecture for Scribble. While it does not introduce a drawing canvas, it DOES create several user-visible surfaces:

| Surface | Who Sees It | When |
|---|---|---|
| Dev Mode Status Page | Developer | Hitting `http://localhost:5000` in dev mode |
| Splash Screen | All users | App initial load (browser & Electron) |
| Electron Window | Desktop users | App launch |
| Error Pages | Admin / User | Build missing, connection failures |

The design is intentionally minimal. This feature is infrastructure — the canvas UI comes in Feature #2. The goal is to replace all Vite+React starter boilerplate with Scribble-branded placeholders that feel professional and set the tonal foundation for the rest of the app.

---

## 2. Layout & Component Hierarchy

### 2.1 Component Tree

```
index.html
└── <div id="root">
    └── <App>
        └── <SplashScreen>
            ├── <ScribbleLogo />      (SVG icon + "Scribble" wordmark)
            └── <LoadingIndicator />   (subtle animated dots or pulse)
```

This is the **only** React component for Feature #1. There is no routing, no canvas, no toolbar. The `<App />` component renders exactly one child: `<SplashScreen />`.

### 2.2 File Map

| File | Status | Purpose |
|---|---|---|
| `client/src/App.jsx` | **Rewrite** | Replace Vite starter; render `<SplashScreen />` |
| `client/src/App.css` | **Delete** | Replaced entirely by Tailwind |
| `client/src/components/SplashScreen.jsx` | **Create** | New component: branded loading screen |
| `client/src/index.css` | **Rewrite** | Tailwind directives + minimal base resets |
| `client/index.html` | **Modify** | Update title, favicon reference |
| `client/public/scribble-icon.svg` | **Create** | Scribble app icon (SVG) |
| `client/tailwind.config.js` | **Modify** | Content globs, theme colors |
| `server/app.py` | **Modify** | Dev-mode status page route |

---

## 3. Development Mode Status Page

### 3.1 Purpose

When a developer navigates to `http://localhost:5000` in development mode (where Flask does NOT serve the React app), they should see a clean, informative status page — not a 404, not the React app, and not a raw error.

### 3.2 Visual Design

The status page is a centered card on a dark background. It shows:
- "Scribble" heading with pen icon
- "API Server" subtitle
- Status rows: Status (green dot + Running), Mode (Development), Port (5000)
- A clickable link to open the frontend at `http://localhost:5173`
- "API & WebSocket ready" footer note

### 3.3 Layout Specification

The status page is a **pure HTML response** from Flask — not a React component. This is because in dev mode, Flask doesn't serve any frontend assets at all. The response is a self-contained HTML string returned directly from the Flask route handler.

**Colors**: Background `#1a1a2e`, Card `#16213e`, Border `#0f3460`, Text white/`#e0e0e0`, Muted `#8892b0`, Status dot green `#4ade80`, Link blue `#64b5f6` on `#0f3460`.

**Dimensions**: Card max-width 440px, padding 48px 56px, border-radius 12px, centered with flexbox.

### 3.4 Route Logic

```
Flask GET /
├── if FLASK_ENV == 'production':
│   └── serve client/dist/index.html (SPA entry)
└── if FLASK_ENV == 'development':
    └── return status page HTML
```

---

## 4. Splash / Loading Screen

### 4.1 Purpose

The splash screen is the **first thing every user sees** when the app loads — in browser, in Electron, in both dev and production. It replaces the current Vite+React starter page with a minimal branded loading state.

### 4.2 Component Specification: `<SplashScreen />`

**File**: `client/src/components/SplashScreen.jsx`

**Props**: `message?: string` — optional status message (e.g., "Connecting...")

**Layout**:
- Full-viewport centered flex column: `min-h-screen flex flex-col items-center justify-center bg-[#1a1a2e]`
- Logo area: 96×96px rounded-2xl square with gradient `from-[#6c63ff] to-[#3f3d9e]` containing SVG scribble icon
- Title: "SCRIBBLE" — `text-3xl font-bold tracking-[0.3em] uppercase text-white mb-8`
- Loading indicator: 4 dots (10px each) color `#6c63ff` with `animate-pulse` and staggered `animationDelay` (0s, 0.2s, 0.4s, 0.6s)
- Optional message below: `text-sm text-[#8892b0]`

### 4.3 Scribble Icon SVG

**File**: `client/public/scribble-icon.svg`

A minimal quill/pen nib SVG, viewBox 0 0 64 64. Simple pen nib silhouette in white.

### 4.4 Component Replacement: `<App />`

**File**: `client/src/App.jsx` — complete rewrite:
```jsx
import SplashScreen from './components/SplashScreen';
function App() {
  return <SplashScreen />;
}
export default App;
```

### 4.5 File Cleanup
- Delete `client/src/App.css` (all Vite starter styles)
- Delete `client/src/assets/react.svg` (no longer referenced)

---

## 5. Electron Window Specifications

### 5.1 Window Dimensions

| Property | Value | Notes |
|---|---|---|
| Default width | `1280` px | Already set |
| Default height | `800` px | Already set |
| Minimum width | `800` px | **New**: add `minWidth: 800` |
| Minimum height | `600` px | **New**: add `minHeight: 600` |
| Background color | `#1a1a2e` | **New**: prevent white flash |
| Resizable | `true` | Keep default |

### 5.2 Window Icon

Use OS default for now. Icon packaging is out of scope for this feature. Document planned path for future: `public/scribble-icon.png`.

### 5.3 Loading Behavior

```
App launch → BrowserWindow (#1a1a2e bg) → loadURL → React mounts → SplashScreen renders
```

---

## 6. Error States

### 6.1 Build Missing (Production)

**When**: `FLASK_ENV=production` but `client/dist/index.html` does not exist.

**Design**: Flask returns a clean HTML error page (self-contained, no external CSS/JS). Same card layout as dev status page but with warning icon (⚠️), amber accent color, "Build Not Found" heading, and code block showing `npm run build` command. Returns HTTP 503.

### 6.2 Server Unreachable (Electron)

Default Chromium error page. No custom UI needed (per tech spec, acceptable for now).

### 6.3 CORS Error / Port Conflict

Standard terminal/browser error messages. No custom UI needed.

---

## 7. App Branding & Color Palette

### 7.1 Color Palette — Dark Theme

| Token | Hex | Usage |
|---|---|---|
| Background | `#1a1a2e` | Page bg, Electron window bg |
| Surface / Card | `#16213e` | Cards, panels |
| Border | `#0f3460` | Dividers |
| Primary / Accent | `#6c63ff` | Logo, loading dots |
| Primary Dark | `#3f3d9e` | Gradient partner |
| Text Primary | `#ffffff` | Headings |
| Text Secondary | `#e0e0e0` | Body text |
| Text Muted | `#8892b0` | Captions, hints |
| Success | `#4ade80` | Status indicators |
| Warning | `#fbbf24` | Build missing error |

### 7.2 Typography

System font stack — no custom web fonts for Feature #1. "SCRIBBLE" title uses uppercase with `tracking-[0.3em]`.

### 7.3 Light Mode

Not implemented in Feature #1. App defaults to dark theme only.

---

## 8. Tailwind CSS Setup

### 8.1 `client/tailwind.config.js` — Final Configuration

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        scribble: {
          bg: '#1a1a2e',
          surface: '#16213e',
          border: '#0f3460',
          primary: '#6c63ff',
          'primary-dark': '#3f3d9e',
          muted: '#8892b0',
        },
      },
    },
  },
  plugins: [],
};
```

### 8.2 `client/src/index.css` — Rewrite

Replace entire file with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
body {
  margin: 0;
  background-color: #1a1a2e;
  color: #e0e0e0;
}
```

### 8.3 `client/src/App.css` — Delete

Remove this file entirely.

---

## 9. Interaction Design & User Flows

### 9.1 Dev Mode: Developer hits :5000
```
:5000 → Flask (dev mode) → status page HTML → shows API info + link to :5173
```

### 9.2 Production: User hits :5000
```
:5000 → Flask (prod mode) → serves index.html → React mounts → SplashScreen
```

### 9.3 Electron Dev
```
Launch → NODE_ENV=development → loadURL(:5173) → Vite serves React → SplashScreen + DevTools
```

### 9.4 Electron Prod
```
Launch → loadURL(:5000) → Flask serves built files → SplashScreen
```

---

## 10. Accessibility

- **Splash screen**: `role="status"` + `aria-label="Loading Scribble"` on container. Visually hidden "Loading..." text for screen readers.
- **Dev status page**: Semantic HTML (`<h1>`, labeled data rows). Green dot is decorative — "Running" text conveys same info.
- **Reduced motion**: Use `motion-safe:` prefix on animated dots: `motion-safe:animate-pulse`.
- **Color contrast**: All text on `#1a1a2e` exceeds 7:1 ratio (AAA).

---

## 11. Real-time UX Considerations

Forward-looking notes (not implemented in Feature #1):
- Splash screen `message` prop designed for "Connecting...", "Reconnecting..." status.
- Presence indicators out of scope but planned for top bar in future features.

---

## 12. Implementation Checklist

| # | Task | Priority |
|---|---|---|
| 1 | Update `tailwind.config.js` with content globs + custom colors | P0 |
| 2 | Rewrite `index.css` with Tailwind directives | P0 |
| 3 | Delete `App.css` | P0 |
| 4 | Create `<SplashScreen />` component | P0 |
| 5 | Rewrite `<App />` to render `<SplashScreen />` | P0 |
| 6 | Create Scribble icon SVG in `public/` | P1 |
| 7 | Update `index.html` title and favicon | P1 |
| 8 | Add dev mode status page route in Flask | P1 |
| 9 | Add build-missing error page in Flask | P1 |
| 10 | Update Electron BrowserWindow config (minSize, bgColor) | P2 |
| 11 | Add `motion-safe:` for reduced motion | P2 |
| 12 | Add `aria-label` + `role="status"` to splash screen | P2 |
