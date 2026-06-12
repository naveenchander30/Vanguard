# Spectrum Auditing & Telemetry Suite

Self-hosted WiFi spectrum analyzer that correlates passive 802.11 RF data (Kismet) with active router state (SNMP) to visualize channel congestion and client loads across your infrastructure.

## Architecture

```
Kismet REST API ──> kismet-poller ──┐
                                    ├──> scoring-engine ──> SQLite ──> Fastify API ──> React SPA
SNMP (UDP 161)  ──> snmp-transport ─┘
```

The **hybrid client poller** queries each AP via SNMP first (if `supportsSnmp` is enabled), falling back to Kismet's device list filtered by BSSID. APs are read from the `KnownInfrastructure` table in SQLite.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Fastify (TypeScript) |
| Database | SQLite via Prisma (WAL mode) |
| Frontend | React + Vite |
| E2E Tests | Cypress 15 |
| Polling | Kismet REST API + SNMP v2c |
| Container | Docker Compose |

## Quick Start

```bash
git clone <repo>
cd Vanguard
docker compose up -d
```

Visit `http://localhost`. Add APs via the Infrastructure page with their BSSID, IP, and SNMP OID to enable active polling.

> Kismet is excluded from `docker compose up` by default (profiled). To include it: `docker compose --profile full up -d`

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:/data/spectrum.db` | SQLite database path |
| `KISMET_URL` | `http://localhost:2501` | Kismet REST API base URL |
| `NODE_ENV` | `production` | Runtime environment |

### SNMP OID Reference

Each AP stores a custom OID for client count. Common vendor OIDs:

| Vendor | OID | Description |
|--------|-----|-------------|
| TP-Link | `.1.3.6.1.4.1.11863.6.1.1.1.1.3` | AssocStationCount |
| UniFi | `.1.3.6.1.4.1.41112.1.4.1.1.1` | wlanStationCount |
| MikroTik | `.1.3.6.1.4.1.14988.1.1.1.2.1.1` | dot11Count |
| Aruba | `.1.3.6.1.4.1.14823.2.2.1.5.1.1.1` | wlanClientCount |

Community string defaults to `public` (v2c). Set per-AP in the Infrastructure form.

## API Reference

All routes are under `/api`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/infrastructure` | List known APs |
| `POST` | `/infrastructure` | Add AP |
| `PUT` | `/infrastructure/:id` | Update AP |
| `DELETE` | `/infrastructure/:id` | Remove AP |
| `GET` | `/telemetry` | Latest telemetry per BSSID |
| `DELETE` | `/telemetry` | Clear all telemetry |
| `GET` | `/telemetry/export` | CSV download |
| `GET` | `/scores` | Latest congestion scores |
| `GET` | `/scores/stream` | SSE score feed |
| `GET` | `/clients` | Latest client loads per BSSID |
| `GET` | `/clients/stream` | SSE client load feed |

## Development

```bash
# Install
pnpm install

# Start both services with hot reload
pnpm dev

# Backend only
pnpm --filter @spectrum/backend dev

# Frontend only
pnpm --filter @spectrum/frontend dev

# Tests
pnpm test                          # all unit tests
pnpm --filter @spectrum/frontend test:e2e  # E2E (Cypress)
```

### Database

```bash
# Push schema changes (safe for dev)
pnpm --filter @spectrum/backend db:push

# Or use Prisma Studio
pnpm --filter @spectrum/backend exec prisma studio
```

## Docker Details

- **Backend** uses `network_mode: host` to reach Kismet on `localhost:2501`. On first boot, `prisma db push --accept-data-loss` auto-creates tables from the schema.
- **Frontend** runs nginx serving the React build. API requests are proxied to `host.docker.internal:3001` (the backend on the host). The `extra_hosts` compose directive enables `host.docker.internal` resolution.
- **Kismet** is profiled (`--profile full`) — excluded from default `up` since it requires Wi-Fi hardware and the `kismet/kismet` image.

## Project Structure

```
Vanguard/
├── docker-compose.yml
├── packages/
│   ├── backend/
│   │   ├── prisma/schema.prisma
│   │   ├── src/
│   │   │   ├── index.ts              # Entry point / scheduler wiring
│   │   │   ├── app.ts                # Fastify app setup
│   │   │   ├── db/prisma.ts          # Prisma client
│   │   │   ├── routes/               # API handlers
│   │   │   └── services/             # kismet, snmp, scoring, polling
│   │   └── tests/
│   └── frontend/
│       ├── src/
│       │   ├── api/client.ts         # API client + SSE helpers
│       │   ├── pages/                # Dashboard, Infrastructure, etc.
│       │   └── components/
│       └── cypress/
└── AGENTS.md
```

## License

MIT
