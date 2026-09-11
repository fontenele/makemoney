# Changelog

All notable working-tree changes are recorded here. Dates use `YYYY-MM-DD`.

## 2026-09-11 — Documentation baseline

### Added

- Mandatory root project context and documentation index.
- Current-state, roadmap, technical-decisions, and keyword-map documents.
- Documentation workflow rules in `AGENTS.md`.

## 2026-09-11 — M0 bootstrap completed

### Added

- NestJS application with strict TypeScript configuration.
- Validated environment configuration.
- Prisma/PostgreSQL and Redis infrastructure modules.
- Health endpoint with PostgreSQL and Redis checks.
- Redis shutdown lifecycle handling.
- Dockerfile and Docker Compose stack for API, PostgreSQL, and Redis.
- ESLint, Prettier, unit-test, E2E-test, and build configuration.
- Safe environment example, ignore files, and initial README.

### Fixed

- Reconciled an interrupted Prisma installation on version 7.10 and declared the PostgreSQL adapter/driver dependencies.
- Configured Jest for the ESM packages used by NestJS 12.
- Changed the PostgreSQL host mapping to `5433` to avoid conflict with another local project on `5432`.
- Prevented the Redis connection from keeping E2E test processes open after application shutdown.

### Verified

- Build, lint, unit tests, E2E test, Compose configuration, and live health response.

### Security notes

- No Binance API, credentials, wallet, or trading execution was introduced.
- Dependency audit findings were recorded for later review; no forced breaking upgrade was applied.
