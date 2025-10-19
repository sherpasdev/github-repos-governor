# GitHub Repos Governor (Wails Edition)

GitHub Repos Governor is now a cross-platform desktop application built with Go and [Wails](https://wails.io/). It provides an at-a-glance dashboard for your organisation's repositories and a governance engine for applying opinionated GitHub policies without asking end users to install Node.js or manage npm dependencies.

## Prerequisites

- Go 1.23 or newer
- Node.js 18+ (frontend tooling used by Wails/Vite)
- `wails` CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

## Configuration

The application reads its settings from `config/config.json`. Populate the following keys before launching the app:

| Key | Required | Description |
|-----|----------|-------------|
| `githubToken` | ✓ | Personal access token with organisation read/write scopes for repositories and settings. |
| `githubOrg` | ✓ | Organisation handle to inspect and manage. |
| `githubApiBaseUrl` | | Override for GitHub Enterprise deployments (defaults to `https://api.github.com`). |
| `disableCache` | | Set to `true` to skip disk caching of summary snapshots. |
| `cacheDir` | | Directory (relative or absolute) for persisted cache files (defaults to `.cache`). |
| `ignoreArchived` | | When `true` (default), archived repositories are filtered out of listings and governance actions. |

You can keep multiple config files and point to one at runtime by setting the optional `GOVERNOR_CONFIG` environment variable to an absolute path. Use the Repositories tab refresh button to generate a fresh snapshot on demand.

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

- Opens the native application with hot reloading for both Go backend code and the React UI.
- A browser-only development server is also available at `http://localhost:34115` if you need devtools access while still calling Go methods.
- The app shell exposes Dashboard, Repositories, and Settings tabs so you can jump between overviews, policy controls, and configuration management.

## Build distributables

```bash
wails build
```

This outputs platform-specific binaries under `build/bin/`. The default build bundles the Go backend, React frontend, and runtime into a single executable per platform.

## Project structure

```
├─ app.go / main.go         # Wails bootstrap and backend bindings
├─ internal/                # Go packages (GitHub client, caching, models)
├─ frontend/                # Vite + React UI served by Wails
│  ├─ src/components/       # Dashboard, governance and detail views
│  ├─ src/services/api.ts   # Typed bridges to Wails Go methods
│  └─ package.json          # Frontend dependencies
└─ wails.json               # Project configuration
```

## Notes

- GitHub API quotas are surfaced in the UI so you can see remaining calls and reset windows.
- Summary data is cached on disk to avoid hammering the API; use the Refresh button under the Repositories tab (or delete the `.cache/` directory) to rebuild snapshots.
- The previous Next.js implementation now lives under `legacy_next_app/`. It can be removed when no longer needed.

## Contributing

- Install [pre-commit](https://pre-commit.com/#install) and run `pre-commit install` to enable formatting, security, and type-checking hooks locally.
- Use `go test ./...` and `npm run lint --prefix frontend` before submitting changes; the CI pipeline enforces the same checks along with Go linting.
- Security workflows run gosec, npm audit, and Gitleaks on pull requests; address any findings before requesting reviews.
- Merging to `main` automatically builds desktop binaries for each platform and publishes a new minor release, so only merge when the code is ready for distribution.
- The desktop shell shows the build version in the header; local builds report `dev build`, while release builds inject their semantic version via `-ldflags "-X main.version=<version>"`.
