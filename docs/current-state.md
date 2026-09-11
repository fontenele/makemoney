# Current State

Last validated: 2026-09-11

## Milestone status

M0 is complete in the working tree. M1.1 is planned but not implemented. No Binance integration, dashboard, paper-trading logic, strategy, wallet integration, or order execution exists.

## Implemented application

- NestJS 12 application using TypeScript strict mode.
- Startup configuration validation for `NODE_ENV`, `PORT`, `DATABASE_URL`, and `REDIS_URL`.
- PostgreSQL access through Prisma 7.10 and the PostgreSQL driver adapter.
- Redis client with explicit shutdown lifecycle handling.
- `GET /health` checks the API, PostgreSQL, and Redis.
- Docker Compose services for the API, PostgreSQL 17, and Redis 8.
- ESLint, Prettier, Jest unit tests, Jest E2E tests, and TypeScript build scripts.
- Safe `.env.example`; local `.env` files and generated/build artifacts are ignored by Git.

## Local endpoints and ports

- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- PostgreSQL host port: `5433` mapped to container port `5432`
- Redis host port: `6379`

PostgreSQL uses `5433` because another local Docker project already occupies `5432`.

## Verification evidence

The following passed on 2026-09-11:

- `npm run build`
- `npm run lint`
- `npm test -- --runInBand` — 2 tests passed
- `npm run test:e2e -- --runInBand` — 1 test passed with local test environment variables
- `docker compose config --quiet`
- Live `GET /health` — API, PostgreSQL, and Redis reported `up`

## Repository state

M0 files are currently uncommitted relative to the initial commit. Do not discard or overwrite them. The Compose stack is running locally.

## Known issues and cautions

- `PROJECT_CONTEXT.md` and the documentation set were missing before this documentation pass.
- Jest requires Node's `--experimental-vm-modules` flag because NestJS 12 packages are ESM.
- The Docker build reported eight high-severity findings in the dependency audit. They have not been automatically changed because `npm audit fix --force` may introduce breaking upgrades; review them separately.
- A transitive Angular DevKit package recommends Node `24.15.0` or newer while the machine has Node `24.14.1`. Current build, lint, and tests pass, but a Node 24 LTS patch update is advisable.
