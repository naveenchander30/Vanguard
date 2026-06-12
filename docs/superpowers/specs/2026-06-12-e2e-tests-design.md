# E2E Tests for Spectrum Audit Frontend

## Goal
Add Cypress E2E tests covering navigation, page rendering, and Infrastructure CRUD interactions in the frontend.

## Approach
- Use `cy.intercept()` to mock all API responses — no running backend required
- Test against `localhost:5173` (Vite dev server)
- Focus on user-visible behavior: navigation, form inputs, table rendering, client cards

## Test Scenarios
1. **Navigation** — sidebar links navigate to the correct routes (Dashboard, Infrastructure, Telemetry, Clients)
2. **Infrastructure CRUD** — add AP form fills and submits, edit populates fields, delete removes row
3. **Dashboard** — stat cards, score table, chart render after mock data loads
4. **Clients page** — card grid renders with mock client data
5. **Empty states** — each page shows loading then empty state when no data

## Files
- `cypress.config.ts` — base config pointing at `http://localhost:5173`
- `cypress/e2e/app.cy.ts` — all test scenarios

## Dependencies
- `cypress` added to `packages/frontend/package.json`
- No change to any production code
