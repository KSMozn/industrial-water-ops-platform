# Application — Industrial Water Operations Platform

> A narrative the client can read in 5 minutes, pointing into the work-sample repo.

I've built a working proof-of-concept for the platform described in your
brief: a single Node + Postgres + Vue system that replaces spreadsheets, your
Salesforce flow, the manual workshop MES, and the hand-built lab-review
process. The code is at the linked repo; the highlights below tell you where
to look and how I'd shape the 24-week delivery.

## What's there

**Five priority modules, all implemented end-to-end:**

1. **Service Operations Dashboard** — per-site health roll-up
   (`apps/web/src/views/Dashboard.vue`, served by
   `apps/api/src/modules/sites/repository.js#dashboardSummary`). Sites,
   visits, technicians, lab results all live in the schema
   (`apps/api/prisma/schema.prisma`).

2. **AI lab-results review** — paste a raw lab transcription, the platform
   extracts readings, flags anomalies against thresholds, suggests actions,
   and persists both the raw model response and the validated structured
   result (`apps/api/src/ai/agents/labReviewAgent.js`,
   `apps/api/src/ai/validation/labResultValidator.js`). Auto-creates tasks
   for each anomaly with severity-driven SLAs.

3. **Task Request Automation** — full lifecycle `REQUESTED → APPROVED →
   ASSIGNED → IN_PROGRESS → COMPLETED` with an explicit transition matrix
   that the UI doesn't need to know about
   (`apps/api/src/modules/tasks/service.js`,
   `apps/web/src/views/TaskBoard.vue`). Tasks originate from service visits,
   AI lab anomalies, manual entry, workshop blockers, or quotes — every task
   carries its `source` for tracing.

4. **Inventory + Offshore Reconciliation** — serial-tracked equipment,
   shipments with `expectedSerial` / `receivedSerial` per line, and a
   reconciliation report that splits results into matched / mismatch /
   missing / extra buckets (`apps/api/src/modules/inventory/reconcile.js`,
   `apps/web/src/views/Inventory.vue`). The reconciliation is a pure
   function with its own unit tests — no DB needed.

5. **Workshop MES** — work orders move through five stations (FRAME → PLUMBING
   → ELECTRICAL → QA → DISPATCH). Each station has a tablet-friendly cell on
   the big-screen progress board; tapping a cell advances the station's
   state, automatically rolls up the parent work-order status, and tracks
   blockers (`apps/web/src/views/Workshop.vue`,
   `apps/api/src/modules/workshop/service.js`).

6. **Quotes** — pipeline (DRAFT → SENT → ACCEPTED → CONVERTED), AUD totals,
   and a `convertToWorkOrders` endpoint that spawns workshop work orders for
   each accepted line (`apps/api/src/modules/quotes/service.js`).

## How I built it

- **Backend:** Fastify + Prisma + Zod, layered as
  routes → controller → service → repository per module
  (`apps/api/src/modules/`). All Prisma access goes through the repository so
  the data layer is swappable.
- **Frontend:** Vue 3 + Vite + Pinia, six dashboard-style views, dark
  enterprise theme. Deliberately styling-light to keep focus on patterns over
  polish.
- **AI:** A provider abstraction with three implementations — Claude, OpenAI,
  and a deterministic mock used in tests and for offline demo
  (`apps/api/src/ai/providers/`). Swapping providers is a config change.
- **Trust pattern:** the model only extracts numerics. Anomaly detection,
  severity, and action recommendations are deterministic functions of the
  validated readings — never of the raw model output. Every AI call writes a
  full audit row (`AiReview`) with raw response, parsed JSON, prompt/output
  tokens, latency, validation errors, and confidence.
- **Tests:** 23 tests via `node --test`, all offline. The interesting ones are
  `labResultValidator.test.js`, `reconcile.test.js`, and
  `labReviewAgent.test.js` (which runs the full agent path against the mock
  provider).
- **Local dev:** `docker compose up --build` brings up Postgres, the API,
  and the Vue app; the seed loads 20 sites across all Australian states,
  service visits with normal + anomalous lab results, a clean and a
  discrepant shipment, six work orders in varying stages, and four quotes.

## What I'd do in week one

- Sit with the field service lead and walk through three real lab reports.
  Lab vendor formats vary; the prompt and validator need that data.
- Sit with the workshop foreman and watch a build cycle. The station list in
  this POC is conservative — the real list might include sub-stations or a
  dedicated commissioning step.
- Confirm AI data residency with the customer. Anthropic / OpenAI calls leave
  AU. Bedrock in Sydney is a viable alternative — same provider abstraction.

## What I'd defer

- Authentication: I left it out to keep the sample focused. I'd put OIDC
  (Workspace or M365) in on day one of the engagement.
- Per-site thresholds: hardcoded constants in the POC; row-per-site in prod.
- A background job runner: AI calls block the HTTP request in the POC. I'd
  move them to BullMQ + Redis so the lab-review UI is non-blocking.

## 24-week shape

Weeks 1-2 discovery + AWS setup → Weeks 3-6 service ops + AI lab review (the
biggest spreadsheet replacement) → Weeks 7-9 tasks → Weeks 10-13 inventory +
reconciliation → Weeks 14-17 workshop MES → Weeks 18-20 quotes + Salesforce
migration → Weeks 21-22 observability + DR → Week 23 UAT → Week 24 cutover.

Full breakdown including AWS Sydney deployment notes in
[`README.md`](./README.md).

## Where to look first

If you have 5 minutes:

1. `apps/api/prisma/schema.prisma` — the domain model.
2. `apps/api/src/ai/validation/labResultValidator.js` + its test — the AI trust
   pattern in 200 lines.
3. `apps/api/src/modules/inventory/reconcile.js` + its test — the offshore
   reconciliation workflow as a pure function.
4. `docker compose up --build` then http://localhost:5173.
