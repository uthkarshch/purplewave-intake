# Offline-resilient equipment intake: design

Status: approved in chat, pending written-spec review.

## Context

Purple Wave dealers photograph equipment, describe its condition and submit it for appraisal. Dealers on bad wifi lose submissions. A second equipment category is coming.

The exercise's repo and mock server were not provided, so this project builds both: an early-version Expo app with a naive submit path, and a mock server with a fault injector. The fix is built on top of that baseline.

## Constraints

- Must run in Expo Go (no custom native modules, no reliable OS background tasks).
- `npm test` passes at the end.
- Non-squashed commit history; `DECISIONS.md`; `transcripts/`.
- Stack: TypeScript, Expo Router, Express mock server, Jest (jest-expo).

## Assumptions

- Category 1 is excavators; category 2 is tractors (adds PTO hours, hitch type). The PDF names neither.
- No auth. Token expiry is out of scope and recorded as untouched.
- One device, one dealer, one outbox.

## Approach

Persistent outbox with idempotency keys and per-photo resumable uploads (approach A). Rejected: a retry wrapper (loses state on app kill, duplicates on lost responses) and OS background uploads (not viable in Expo Go).

## 1. Submission pipeline and server contract

### Mock server (`server/`)

| Endpoint | Behaviour |
|---|---|
| `POST /submissions` | `Idempotency-Key` header, JSON metadata (category, schemaVersion, fields, photo manifest of ids and checksums). Replaying a key returns the original response. |
| `PUT /submissions/:id/photos/:photoId` | Raw binary body. Idempotent per `photoId`. Verifies `Content-Length` and checksum. |
| `POST /submissions/:id/finalize` | `200` only if every manifest photo is present, else `409` with the missing list. Idempotent. |
| `GET /submissions/:id` | Current server state, used to resolve unknown outcomes. |
| `POST /__chaos` | Sets a fault profile: latency, drop rate, timeout rate, 5xx rate, lost-ack rate (commit, then kill the connection). Presets: `flaky-wifi`, `dead-zone`, `lost-ack-heavy`. |

### App outbox (`src/outbox/`)

- Submit saves the record and copies compressed photos into `documentDirectory/outbox/<id>/`, then returns immediately in state `queued`.
- State machine per submission: `queued -> creating -> uploading-photos -> finalizing -> submitted`, plus `needs-attention` for permanent errors (4xx validation).
- Every step is idempotent, so any step can run again after a crash, timeout or lost response.
- Retries: exponential backoff, full jitter, capped at 5 minutes, honouring `Retry-After`. Transient errors (network, timeout, 5xx, 429, `409` missing-photos, in-progress `409`) retry without an attempt cap. 4xx validation errors are permanent.
- The drain loop is triggered by app foreground, NetInfo connected, a timer, manual retry and Submit. The transport is injectable.
- After an unknown outcome the client calls `GET /submissions/:id` and resumes from server state. A `404` means the create never committed, so replaying `POST` with the same key is safe.

### UI

Submissions list with per-item status and progress, a pending-upload banner, manual retry, drafts persisted across restarts.

## 2. Concurrency and edge cases

### Client

| # | Case | Resolution |
|---|---|---|
| 1 | Overlapping drain triggers | Single-flight drain loop. Triggers set a "drain requested" flag; a run that finds it set loops again. Server idempotency is the backstop. |
| 2 | Double-tap Submit | `id` and idempotency key are minted when the form opens. The `draft -> queued` transition is guarded. |
| 3 | Crash between server commit and local write | Local state is written before and after each network step. Steps replay safely. |
| 4 | Stale in-progress records after a kill | On boot, in-progress states reset to `queued`. |
| 5 | Lost updates in storage, 6 MB Android limit | One AsyncStorage key per submission plus a small index. Writes go through a serial queue. Photos live on the filesystem. Boot reconciles the index against keys and the outbox directory. |
| 6 | Suspended while backgrounded | In-flight steps count as "outcome unknown"; resume via `GET`. |
| 7 | NetInfo connected but unusable | NetInfo only triggers a drain. Request outcomes drive backoff. |
| 8 | Thundering herd on reconnect | Full jitter, 5 minute cap. |
| 9 | Flat timeout wrong for photos | Short fixed timeout for metadata. Size-scaled deadline plus progress-stall detection for photos. |
| 10 | Clock changes | `nextAttemptAt` is clamped to `now + maxBackoff` on read. |
| 11 | Head-of-line blocking | Submissions fail independently. Concurrency is one submission, sequential photos. |
| 12 | Local photo missing | That photo is flagged for retake. Nothing is silently dropped. |
| 13 | Low disk | Compress, copy and size-check at capture time. |

### Server

| # | Case | Resolution |
|---|---|---|
| 14 | Concurrent requests with the same key | In-flight promise map keyed by idempotency key; the second caller awaits the same result. |
| 15 | Same key, different body | `422`. |
| 16 | Truncated or corrupted photo | `422 checksum_mismatch`. Client retries a bounded number of times, then flags the photo. |
| 17 | Finalize before all photos landed | `409` with the missing list. |
| 18 | Finalize twice, or photo re-upload after finalize | `200` with the same result. A re-upload with a different checksum is `409`. |

### Invariants

- Local data is deleted only after the server confirms finalization. Photos are then cleaned up; the metadata record stays as history.
- Nothing auto-drops. The worst outcome is `needs-attention` with manual retry.
- UI reads from a single outbox store.

## 3. Category registry

- One declarative definition per category in `shared/categories/`: `id`, `label`, `schemaVersion`, typed `fields` (text, number, select, boolean, multiline; required flag, unit, bounds) and `photoShots`.
- A pure `validateSubmission(category, values, photos)` is shared by app and server. The app uses it for early feedback; the server is authoritative and returns `422`.
- The form renders from the definition. Submissions store `categoryId` and `schemaVersion` and are validated against the version they were created with. Unknown category or version is `422`.
- Sequencing: the baseline hard-codes excavator fields. Data loss is fixed first; the registry refactor follows.

## Testing

Three Jest projects under one `npm test`:

1. `app` (jest-expo): outbox state machine, backoff, single-flight drain, store writes, boot recovery, registry validation. Fake transport and fake timers.
2. `server` (node): idempotency (including concurrent same-key and key reuse with a different body), checksum rejection, finalize semantics.
3. `integration` (node): real outbox against the real mock server in-process on an ephemeral port, with a seeded PRNG for fault profiles. Invariants: after N submissions the server holds exactly N complete submissions, no duplicates, all photo checksums match.

## Commit plan

1. Scaffold app and mock server with the naive single-request submit (baseline).
2. Chaos harness and a repro test that fails against the baseline (marked intentional).
3. Shared contract and server idempotency, photo and finalize endpoints.
4. Outbox store, state machine, backoff, with unit tests.
5. Transport, drain triggers, app lifecycle.
6. UI: status list, pending banner, retry.
7. Integration chaos tests green.
8. Category registry and second category.
9. `DECISIONS.md` and README.

## Implementation risks to verify

- The pinned Expo SDK determines which `expo-file-system` API is available (class-based vs legacy) and what it supports for upload progress and abort. Check the docs before writing the transport.
- A physical phone needs the server reachable over the LAN: derive the host from Expo's `hostUri`, with an env override.
- `transcripts/` needs the real AI session history; keep a prompt log as work proceeds and export the chat at the end.
