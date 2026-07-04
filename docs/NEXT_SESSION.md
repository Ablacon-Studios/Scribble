# Next Session Handoff

## Current Feature
**Serve Web + Electron App from Server**

The Flask backend must serve the built React frontend as static files, and
the Electron shell must load the app from either the Vite dev server
(development) or the built static files (production).

## Completed (This Session)
- Project infrastructure fully configured: directories, build configs, dependencies
- Database: SQLite + SQLAlchemy ORM (migratable to PostgreSQL)
- Testing: pytest + asyncio + mock + factory_boy (backend), Jest + RTL + jest-canvas-mock (frontend)
- AI team: 8 agents (added security-expert)
- Process: PLAN → DESIGN → DEVELOP → REVIEW → TEST → REVIEW → SECURITY → APPROVE
- Feature #1 recorded in backlog and progress.md (status: Planned)

## What To Do Next
Advance to **Phase 1: PLAN**:
1. Delegate to business-analyst to write `docs/specs/serve-web-electron.md`
2. The spec must cover:
   - Flask serving React static build from `client/dist/`
   - Production mode: Flask serves the built files
   - Development mode: Vite dev server on port 5173, Flask on port 5000
   - Electron loads `http://localhost:5173` in dev, `http://localhost:5000` in prod
   - Electron main.js already exists at `client/electron/main.js`
   - Flask static folder configuration
   - CORS handling for dev mode

## Key Context
- Backend: `server/app.py` (Flask), `server/pyproject.toml` (setuptools)
- Frontend: Vite + React in `client/`, built to `client/dist/`
- Electron: Entry at `client/electron/main.js`, `client/electron/preload.js`
- Dependencies already installed: Flask, Flask-SocketIO, Flask-CORS, SQLAlchemy
- The project root is `/home/sunch1p/Projects/Scribble`
- Process is iterative: never start next feature until this one is approved
