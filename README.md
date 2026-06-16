# Industrial Water Operations Platform — Work Sample

A working proof-of-concept for the operations platform described in the 24-week
brief: replace spreadsheets, Salesforce, and manual workflows for an Australian
industrial water-treatment / manufacturing business with a Postgres + Node + Vue
system that also ships safe AI-assisted lab review.

This is **not** the final platform. It is a focused work sample that demonstrates
the architecture, domain modelling, and AI-workflow patterns I would carry into
the engagement.

---

## What's in here

```
industrial-water-ops-platform/
├── docker-compose.yml           # Postgres + API + Web (one command up)
├── apps/
│   ├── api/                     # Fastify + Prisma backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # 19 models — see "Domain model" below
│   │   │   └── seed.js          # 20 sites, 5 customers, 5 techs, labs, shipments, WOs, quotes
│   │   ├── src/
│   │   │   ├── server.js        # Fastify bootstrap, module wiring, error mapping
│   │   │   ├── config/env.js
│   │   │   ├── lib/             # prisma client, AppError taxonomy
│   │   │   ├── ai/
│   │   │   │   ├── providers/   # Claude, OpenAI, mock — single interface
│   │   │   │   ├── validation/  # Deterministic gate after every AI call
│   │   │   │   └── agents/labReviewAgent.js
│   │   │   └── modules/         # routes / controller / service / repository per module
│   │   │       ├── sites/       (+ /dashboard aggregate)
│   │   │       ├── visits/
│   │   │       ├── labResults/  (+ AI integration)
│   │   │       ├── tasks/       (+ lifecycle state machine)
│   │   │       ├── inventory/   (+ reconciliation report)
│   │   │       ├── workshop/    (+ station progress board)
│   │   │       └── quotes/      (+ convert-to-WorkOrder)
│   │   └── tests/               # 23 tests, `node --test`
│   └── web/                     # Vue 3 + Vite, 6 dashboard-style views
│       └── src/views/
│           ├── Dashboard.vue
│           ├── LabReview.vue
│           ├── TaskBoard.vue
│           ├── Inventory.vue
│           ├── Workshop.vue
│           └── Quotes.vue
└── APPLICATION_ANSWER.md        # The narrative I would send to the client
```

---

## Business domain — what the brief describes

The customer is an Australian industrial water-treatment business with these
operating realities (drawn from the job brief):

- A field service team visits customer sites to inspect deployed equipment,
  collect samples, and act on lab readings.
- Equipment is manufactured offshore, shipped to AU, and serial-tracked from
  receipt → workshop assembly → dispatch → customer site.
- A workshop assembles units through fixed stations (frame → plumbing →
  electrical → QA → dispatch). Today this is whiteboard-driven.
- Sales lives in Salesforce; quotes are heavy and disconnected from operations.
- AI is wanted to triage lab results — but with the trust caveats expected
  for industrial decisions.

The system replaces 4 disconnected workflows (spreadsheets, Salesforce, a
manual MES, hand-built lab reviews) with one operational platform.

---

## Architecture

### Stack

| Layer       | Choice                              | Why                                                                 |
|-------------|-------------------------------------|---------------------------------------------------------------------|
| Backend     | Node.js + Fastify                   | Throughput, plugin model, sane error / validation hooks             |
| DB          | Postgres 16                         | Brief requires it; supports both relational integrity and JSONB     |
| ORM         | Prisma                              | Schema-first, migrations baked in, strong typing for cleaner code   |
| Frontend    | Vue 3 + Vite + Pinia                | Brief requires Vue; Vite gives fast DX and tiny prod bundles        |
| AI          | Anthropic + OpenAI + Mock           | Provider-agnostic; mock keeps tests offline                          |
| Validation  | Zod                                 | Single library for HTTP body schemas AND post-AI shape validation    |
| Tests       | `node --test`                       | Zero-config; production code uses no test-only deps                  |

### Module layout (each operations module)

```
modules/<name>/
  routes.js        ← Fastify route registration
  controller.js    ← thin HTTP adapter (sometimes inlined in routes for small modules)
  service.js       ← business logic, validation, transitions
  repository.js    ← all Prisma queries — services do not import prisma directly
  schema.js        ← Zod schemas for request bodies (when not inline)
```

This boundary lets us swap Prisma later (or add Redis caching, or fan
queries to a read replica) without touching service logic, and it keeps
state-machine code (`tasks/service.js`, `workshop/service.js`,
`quotes/service.js`) testable without a DB.

### AI workflow — never trust raw model output

The lab-review agent demonstrates the trust pattern I would use across the
platform:

1. **Provider abstraction** (`src/ai/providers/`) — Claude, OpenAI, and a
   regex-based mock all expose the same `complete({ system, prompt }) → { raw,
   parsed, usage, latencyMs }` envelope. Switching providers is a config
   change, not a code change.
2. **Strict prompt** — the model is instructed to *only* extract numerical
   readings into a known JSON schema; it is told **not** to interpret, flag,
   or recommend anything.
3. **Deterministic validator** (`src/ai/validation/labResultValidator.js`) is
   the sole authority for whether a reading is safe to act on. The pipeline:
   - **Shape**  — strict Zod parse; unknown keys dropped, missing fields tolerated.
   - **Plausibility** — every numeric reading must sit within a physical
     window (pH ∈ [0,14], conductivity ≤ 200,000 µS/cm, etc.). A model that
     says pH=42 is hallucinating; we drop the value rather than flagging it.
   - **Thresholds** — operating bands (per-parameter constants for the POC;
     per-site rows in production) yield anomalies with severity.
   - **Suggested actions** — derived deterministically from anomalies via a
     lookup table. A prompt regression cannot change what we recommend.
   - **Confidence** — coverage × (1 − error penalty), bounded [0, 1].
4. **Full audit trail** — `AiReview` row stores raw response, parsed JSON,
   provider, model, prompt/output tokens, latency, validation errors, and the
   confidence score. We can re-run extraction against the same `rawInput`
   when a prompt or model changes — see `POST /api/lab-results/:id/rereview`.
5. **Fail-open with status** — if the provider errors, the lab row is still
   persisted with `status = REVIEW_FAILED`. Nothing is silently dropped.

### Important state machines

Three modules carry explicit allow-list state machines so that lifecycle
correctness doesn't depend on UI discipline:

- **Tasks** `REQUESTED → APPROVED → ASSIGNED → IN_PROGRESS → COMPLETED` (+ CANCELLED from any non-terminal)
- **Workshop stations** `PENDING → IN_PROGRESS → BLOCKED ↔ IN_PROGRESS → DONE` (or `SKIPPED`)
- **Quotes** `DRAFT → SENT → ACCEPTED → CONVERTED` (+ REJECTED / EXPIRED branches)

Illegal transitions return HTTP 409 with the allowed set, so the UI never
needs to know the matrix.

---

## How this maps to the job brief

| Brief priority                                | Implementation                                                                                          |
|-----------------------------------------------|---------------------------------------------------------------------------------------------------------|
| 1. Service Operations Dashboard               | `apps/api/src/modules/sites/repository.js#dashboardSummary` + `apps/web/src/views/Dashboard.vue`        |
| 1. AI lab-results review                      | `apps/api/src/ai/agents/labReviewAgent.js` + `LabResult` / `AiReview` Prisma models + `LabReview.vue`   |
| 2. Task Request Automation (lifecycle)        | `apps/api/src/modules/tasks/service.js#TRANSITIONS` + `TaskBoard.vue` (drag-by-button POC)              |
| 3. Inventory + serial tracking                | `Equipment` / `EquipmentModel` + `Shipment` / `ShipmentLine` + `Inventory.vue`                          |
| 3. Offshore reconciliation                    | `apps/api/src/modules/inventory/reconcile.js` (pure, unit-tested) + `Inventory.vue` reconciliation card |
| 4. Workshop MES + tablet stations             | `WorkOrder` / `WorkOrderStation` + `workshop/service.js` (per-station state machine) + `Workshop.vue`   |
| 5. Sales / Quotes, convert quote → WO         | `quotes/service.js#convertToWorkOrders` + `Quotes.vue`                                                  |

---

## Local setup

Requirements: Node 20+, Docker.

```sh
# 1. Boot Postgres (Docker)
docker compose up -d postgres

# 2. Install deps (workspace install handles both apps)
npm install
npm install --workspace apps/api
npm install --workspace apps/web

# 3. Configure env
cp .env.example apps/api/.env
# AI_PROVIDER defaults to "mock" — no API keys needed for local demo

# 4. Run migrations + seed
npm run migrate --workspace apps/api -- --name init
npm run seed   --workspace apps/api

# 5. Start API + Web in two terminals
npm run dev:api     # http://localhost:4000
npm run dev:web     # http://localhost:5173
```

Or run everything containerised:

```sh
docker compose up --build
```

### Tests

```sh
npm test --workspace apps/api
# 23 tests, all offline (mock AI provider, no DB-dependent integration tests)
```

### Switching AI providers

```sh
# .env
AI_PROVIDER=claude         # or openai
AI_MODEL=claude-sonnet-4-6 # or gpt-4o-mini
ANTHROPIC_API_KEY=sk-ant-…
OPENAI_API_KEY=sk-…
```

A `?provider=` query param on `POST /api/lab-results` overrides the env for a
single request — useful for A/B comparison during prompt-engineering.

---

## AI agent design

### What the model does (and does not) do

| Decision                              | Owner       | Rationale                                                                            |
|---------------------------------------|-------------|--------------------------------------------------------------------------------------|
| Extract numeric readings              | Model       | Hardest part: noisy transcriptions, varied units, multi-line layouts.                |
| Normalise units (e.g. mS/cm → µS/cm)  | Model       | Prompted explicitly.                                                                  |
| Decide whether a reading is anomalous | **Platform**| A threshold breach is a deterministic comparison — never trust the model with it.   |
| Recommend a service action            | **Platform**| Action lookup table mapped from anomalies. A jailbreak cannot change dose advice.    |
| Compute a confidence score            | **Platform**| Function of field coverage + validation errors. The model does not self-rate.        |

### Re-review

Models and prompts change. Every lab result keeps its raw input forever, so
calling `POST /api/lab-results/:id/rereview?provider=claude` re-extracts and
re-validates without losing prior history (we `upsert` the `AiReview` row,
keep its history via the audit columns).

### Where this generalises

The same pattern fits other agent flows the brief implies:
- Auto-triage technician findings into draft tasks
- Summarise service-visit notes into a customer-facing report
- Detect bill-of-materials drift between a quote and a work-order

Each new agent gets the same recipe: thin provider, strict prompt, Zod
validator, deterministic decision step, full audit row.

---

## AWS Sydney (ap-southeast-2) deployment notes

The repo is AWS-ready but not AWS-locked. Suggested target:

| Component   | AWS service                                                                                                                  |
|-------------|------------------------------------------------------------------------------------------------------------------------------|
| API         | ECS Fargate behind an ALB (Sydney). Container is the existing `apps/api/Dockerfile`. Two tasks for HA.                       |
| Web         | S3 + CloudFront (build `apps/web` with `npm run build`, sync `dist/` to S3). Origin in Sydney; cache for 5 min.               |
| Postgres    | RDS Postgres 16 (Multi-AZ, ap-southeast-2). Daily snapshots. PIT recovery on.                                                 |
| AI          | Direct calls from Fargate to Anthropic + OpenAI via VPC NAT egress. Bedrock is also viable — same provider abstraction.       |
| Secrets     | AWS Secrets Manager for `DATABASE_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Injected to Fargate via task definition.       |
| Migrations  | Run `npx prisma migrate deploy` as an ECS one-off task on each release. Same code path as `docker compose up`.                |
| Logging     | Container `stdout` → CloudWatch Logs. Structured Fastify logs already JSON; add log groups per env.                            |
| CI/CD       | GitHub Actions → ECR push → ECS deploy. Same Dockerfile for dev and prod.                                                     |

Data residency: Sydney region. No cross-region calls for storage. AI inference
calls leave AU (Anthropic / OpenAI) — that decision belongs to the customer
and is one of the first stakeholder questions.

---

## 24-week delivery roadmap

| Weeks  | Focus                                                                                                                                 |
|--------|---------------------------------------------------------------------------------------------------------------------------------------|
| 1–2    | Stakeholder discovery, AWS account hardening, prod schema (start from `schema.prisma` here, validate per-customer field needs)        |
| 3–6    | Service Operations module + AI lab review (the highest-leverage module — replaces the most painful spreadsheet workflow)              |
| 7–9    | Tasks module + technician mobile-friendly views; integration with whoever owns auth (likely OIDC via Workspace / M365)                |
| 10–13  | Inventory + offshore reconciliation; goods-receipt mobile scan flow; serial label printing                                            |
| 14–17  | Workshop MES + tablet UIs at each station; big-screen progress dashboard; QA gating                                                   |
| 18–20  | Sales / Quotes; Salesforce data migration script; quote → work order flow                                                              |
| 21–22  | Observability (CloudWatch dashboards, alerting), backup / DR drill, security review                                                   |
| 23     | UAT with operations + workshop teams; hardening                                                                                       |
| 24     | Cutover, training, hypercare plan                                                                                                     |

Risks worth surfacing on day one:
- Lab report formats vary heavily by lab vendor — discovery in week 1, not week 5.
- Offshore serial label quality is the single biggest reconciliation pain — confirm with warehouse staff before designing the receipt flow.
- AI calls leaving AU — decide policy before turning anything on in prod.

---

## What I would do differently in production

Concrete things I deliberately did **not** add to the work sample to keep it
focused — but that I would put in on day one of the engagement:

- Authentication (OIDC) + per-role authorisation
- Per-site thresholds in DB (not constants in code)
- Audit log for every mutation, not just AI calls
- Background job runner (BullMQ + Redis) for AI calls so the lab-review HTTP request returns immediately
- Observability: OpenTelemetry traces, structured request IDs, Sentry
- TypeScript across the API (JSDoc here is a deliberate trade-off for sample size)
- Playwright smoke tests against the seeded environment
- Per-customer data partitioning if the customer signs more than one industrial group

---

## Quick tour for a reviewer with 5 minutes

1. Skim `apps/api/prisma/schema.prisma` — the domain model is the spine.
2. Read `apps/api/src/ai/validation/labResultValidator.js` and its test file — that's the AI trust pattern in 200 lines.
3. Read `apps/api/src/modules/inventory/reconcile.js` + test — the offshore reconciliation workflow as a pure function.
4. Read `apps/api/src/modules/tasks/service.js` — explicit state machine.
5. `docker compose up --build` and visit http://localhost:5173.

See also: `APPLICATION_ANSWER.md` for the narrative I would actually send to the client.
