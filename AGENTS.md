# Agent Guide

## Project Snapshot
- **Name**: GitHub Repos Governor (Wails desktop app)
- **Languages**: Go backend (Wails), React/TypeScript frontend (Vite)
- **Purpose**: Inspect GitHub org repositories, adjust governance settings, and persist configuration via a desktop UI.
- **Entrypoints**:
  - Backend: `app.go`, `main.go`
  - Frontend: `frontend/src/App.tsx`

## Local Development
1. Install requirements:
   - Go 1.23+
   - Node.js 18+
   - Wails CLI `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
2. Bootstrap dependencies:
   ```bash
   npm install --prefix frontend
   ```
3. Run the app with hot reload:
   ```bash
   wails dev
   ```
   - Desktop window launches with live Go/React reload.
   - Browser-only dev server is available at `http://localhost:34115` for debugging the UI.

## Building & Testing
- Backend build: `go build ./...`
- Backend tests: `go test ./...`
- Frontend typecheck/lint: `npm run lint --prefix frontend`
- Frontend production build: `npm run build --prefix frontend`
- Desktop distributables: `wails build` (outputs to `build/bin/`)

## Configuration
- Primary config file: `config/config.json`
- Settings can be edited in-app (top nav **Settings**), which calls `GetSettings` / `SaveSettings` (Go) to rewrite the JSON and reload config.
- Required keys: `githubToken`, `githubOrg`. Optional: `githubApiBaseUrl`, `disableCache`, `cacheDir`, `ignoreArchived`.
- The app exposes `EnvironmentStatus` (with version, config path) on startup.
- The now-removed `.env` secret file should **not** exist; keep secrets out of the repo. `.env.example` documents expected environment variables if needed.

## Repository Layout
```
├─ app.go / main.go        # Wails bootstrap, backend handlers
├─ internal/               # Go packages (github client, cache, config, models)
├─ frontend/               # React UI (Vite)
│  ├─ src/components/
│  │  ├─ dashboard/
│  │  ├─ repositories/     # Main table with toggles, governance widget
│  │  ├─ repo-detail/
│  │  └─ settings/         # Settings view (new UI)
│  ├─ src/services/api.ts  # Typed bridge to Wails methods
│  └─ wailsjs/             # Auto-generated bindings (do not edit manually)
├─ build/                  # Wails build output
├─ config/config.json      # Active configuration
├─ .cache/                 # Optional cache location (safe to delete)
└─ README.md               # Usage instructions
```

## Frontend Notes
- Repository table now shows GitHub icon **before** the repo name; the name opens the detail view while the icon opens GitHub.
- Table header is sticky (`position: sticky` in CSS) with a scrollable wrapper.
- Governance widget on the Repositories page exposes the same bulk actions as the old Governance tab (which has been removed).
- Settings screen handles config persistence and notifies via the nav banner.

## Backend Notes
- `GetSettings`/`SaveSettings` (app.go) serialize/deserialise `SettingsPayload` and call `config.Save` (new helper) before reinitialising the app config/cache provider.
- `config.Save` added alongside `EnsureFile` to rewrite config JSON safely.
- Governance toggles call `ApplyGovernanceActions` and surface notifications through the top-level handler.

## Tooling
- Pre-commit config: `.pre-commit-config.yaml`
- Version metadata for Wails: `version.go`
- Wails project metadata: `wails.json`

## Cleanup Status & Outstanding Tasks
- ✅ Removed sensitive `.env` file from the repo (keep `.env.example`).
- ⚠️ Local `.next/` (legacy Next.js build artefact) still exists—delete before committing to a clean history.
- ⚠️ Old `legacy_next_app/` directory is still present. Remove if no longer required to avoid shipping unused code.
- Frontend `dist/` is present for convenience but can be regenerated; delete before releases if you prefer keeping Git-only sources.

## Release Prep Checklist
1. Remove temporary directories (`.next/`, `legacy_next_app/`, `frontend/dist/`) if not needed.
2. Confirm `config/config.json` omits secrets (use environment vars in CI/CD).
3. Run `go build ./...`, `npm run lint --prefix frontend`, and `npm run build --prefix frontend`.
4. `wails build` to publish desktop binaries if required.
5. Tag release version via `version.go` (or ldflags) for packaged builds.

## Quick Reference Commands
- `wails dev` – interactive development
- `wails build` – production binaries
- `npm run lint --prefix frontend` – frontend typecheck
- `npm run build --prefix frontend` – frontend production assets
- `go test ./...` – backend tests

Keep this guide evergreen by updating it whenever workflows or structure change.
