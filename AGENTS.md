# Spectrum Auditing & Telemetry Suite — Agent Context

## Project Overview
Self-hosted full-stack diagnostic app that audits office WiFi networks.
Correlates passive 802.11 RF data (Kismet) with active router state (SNMP) to visualize congestion and hardware load.

## Tech Stack
- **Backend:** Fastify (TypeScript), Prisma (SQLite)
- **Frontend:** React (Vite), Cypress (E2E), Vitest (unit)
- **Package manager:** pnpm workspaces
- **Infra:** Docker Compose (Kismet + backend + frontend)

## Repository Structure
```
Vanguard/
├── AGENTS.md
├── package.json              # workspace root
├── pnpm-workspace.yaml
├── docker-compose.yml
├── .gitignore
├── packages/
│   ├── backend/
│   │   ├── prisma/schema.prisma
│   │   ├── src/
│   │   │   ├── index.ts          # entry point
│   │   │   ├── app.ts            # Fastify app setup
│   │   │   ├── db/prisma.ts      # Prisma client
│   │   │   ├── routes/           # API route handlers
│   │   │   ├── services/         # Business logic (kismet, snmp, scoring)
│   │   │   └── types/            # shared types
│   │   └── tests/
│   │       ├── unit/
│   │       └── e2e/
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   └── api/
│       └── cypress/
```

## Engineering Rules (IMMUTABLE)
1. **TDD is mandatory** — write tests BEFORE implementation code for every core function.
2. **Tests are immutable** — once written, tests must NOT be modified to pass. Implementation must conform to tests.
3. **Frequent commits** — commit after each passing test cycle with conventional commit messages (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
4. **Ask before big decisions** — architecture changes, new dependencies, schema changes must be discussed first.
5. **Keep tests meaningful** — unit tests for logic, integration for API, e2e for user flows.
6. **No test without assertion** — every test must have at least one explicit assertion.

## Data Flow
```
Kismet (REST API) ──> Backend Parser ──> Scoring Engine ──> SQLite ──> Frontend API
                                               ↑
SNMP (UDP 161) ──> Router Poller ──────────────┘
```

## Scoring Algorithm (0-100 Scale)
- External Interference: unrecognized BSSIDs penalized by RSSI (> -60 dBm = +20 pts)
- Internal Co-Channel: two internal APs on same ch hearing each other > -70 dBm → severe penalty
- Hardware Load: +1 pt per SNMP-reported client + weight for high CCA%
- Adjacent Interference: ACI rules for 2.4GHz (penalize ch 6 if ch 4,5,7,8 loud) + HT/VHT channel bonding in 5GHz

## Key Design Decisions
- Prisma with SQLite for zero-dependency local storage
- Fastify over Express for native TypeScript support and performance
- pnpm workspaces for monorepo management
- Kismet runs in host network mode for Wi-Fi adapter access

## Common Gotchas
- Kismet API returns huge payloads — always filter for `type: "Wi-Fi AP"` early
- SNMP OIDs differ by router vendor — use configurable OID mappings
- SQLite concurrent writes during active polling may need WAL mode
