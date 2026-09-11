# Technical Decisions

## Modular monolith

The project remains a single NestJS application. Feature modules and provider boundaries are introduced only when required by an approved milestone.

## PostgreSQL host port 5433

Container-to-container communication uses PostgreSQL's standard port `5432`. Host access uses `5433` because another local project already binds `5432`.

## Prisma 7.10 with PostgreSQL adapter

Prisma CLI, client, and adapter are aligned on version 7.10. PostgreSQL is accessed through `@prisma/adapter-pg` and `pg`.

## NestJS 12 and Jest ESM execution

NestJS 12 packages use ESM. Jest runs through Node with `--experimental-vm-modules`, and ts-jest emits ES modules for tests.

## Financial and provider boundaries

External market providers must be encapsulated. Domain objects must not expose provider payload shapes. Strategies will produce signals, the Risk Engine will assess them, and only an executor may eventually submit an order. No executor exists in M0 or M1.1.
