# GitHub Repos Governor

GitHub Repos Governor is a cross-platform desktop application built with Go and [Wails](https://wails.io/). It offers a real-time overview of organisation repositories, highlights policy drift, and streamlines governance tasks without requiring contributors to install additional tooling.

## Prerequisites

- Go 1.23 or newer
- Node.js 18+ (used by the Vite/React frontend)
- `wails` CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

## Configuration

The app loads settings from `config/config.json`. Copy `config/config.example.json` and fill in the required fields before launching:

| Key | Required | Description |
|-----|----------|-------------|
| `githubToken` | ✓ | Personal access token with organisation read/write scopes for repositories and settings. |
| `githubOrg` | ✓ | Organisation handle to inspect and manage. |
| `githubApiBaseUrl` | | Optional GitHub Enterprise endpoint (defaults to `https://api.github.com`). |
| `disableCache` | | Set to `true` to skip disk caching of summary snapshots. |
| `cacheDir` | | Directory (relative or absolute) for cached snapshots (defaults to `.cache`). |
| `ignoreArchived` | | When `true` (default), archived repositories are filtered from listings and actions. |

Point the app at an alternative configuration by exporting `GOVERNOR_CONFIG=/absolute/path/config.json`. Use the Refresh button in the Repositories view to rebuild cached data on demand.

## Install dependencies

```bash
cd frontend
npm install
cd ..
```

## Live development

```bash
wails dev
```

- Hot reloads both the Go backend and the React user interface.
- Automatically serves a browser-only dev server at `http://localhost:34115` for debugging while keeping Wails bindings available.
- Includes Dashboard, Repositories, and Settings views for rapid navigation during development.

## Build distributables

```bash
wails build
```

Build artefacts are emitted to `build/bin/` for the current platform. Release workflows package each operating system target and embed the frontend alongside the Go runtime.

## Project layout

```
├─ app.go / main.go       # Wails bootstrap and backend bindings
├─ internal/              # Go packages (GitHub client, caching, models)
├─ frontend/              # Vite + React UI served by Wails
│  ├─ src/components/     # Dashboard, repository, and settings views
│  ├─ src/services/api.ts # Typed bridge to Go bindings
│  └─ package.json        # Frontend dependencies and scripts
└─ wails.json             # Project configuration for Wails
```

## Contributing

- Install [pre-commit](https://pre-commit.com/#install) and run `pre-commit install` to enable formatting, security, and type-checking hooks locally.
- Run `go test ./...` and `npm run lint --prefix frontend` before pushing changes; the CI pipeline enforces both checks along with linting.
- Security workflows execute gosec, npm audit, and Gitleaks on pull requests—resolve issues before requesting review.
- Merging to `main` triggers cross-platform builds and publishes a new minor release, so only merge production-ready changes.
- The application header displays the current build version; local builds report `dev build`, while release pipelines inject semantic versions via `-ldflags "-X main.version=<version>"`.
