# Decisions

## What I was given, and what I built instead

The exercise repo and mock server were not available to me, only the PDF. It describes the product, "a mock server that can simulate a poor dealership connection" and nothing else: no API, no schema, no categories. So I built both halves: a deliberately fragile early-version app plus a mock server, and then fixed the reported problem on top of it. The commit history shows that order: baseline, a repro, then the fix.

This means the server contract is mine, not Purple Wave's. The client/server design transfers; the exact endpoints would not.

## Assumptions

- Category 1 is **excavators**; the "second category next month" is **tractors** (PTO hours, hitch type, PTO photo). The PDF names neither.
- No auth. Token expiry mid-queue is not handled.
- One dealer, one device, one outbox. No cross-device sync.
- A submission is not editable once queued.
- Required photos are per-category "shots"; extra photos are always allowed.
- Submit is disabled until every required field and required photo is present, so the form never queues something the server would reject. The server still validates, because the app is not the only possible client.
- Photos are resized to 1600px and JPEG 0.7 before they are stored. Dealers do not need originals for an appraisal.

## What I prioritized and why

1. **Prove the bug before fixing it.** A seeded fault injector (latency, dropped connections, hangs, 503s, and lost acks where the server commits but the response never arrives), then a test showing the naive client under `flaky-wifi` seed 7 stores 33 rows for 30 submissions: **2 lost, 5 duplicated**. That test stays as a `test.failing` control so the harness can never silently stop detecting the problem.
2. **Server contract and outbox core**, because that is the fix. Everything else is secondary to "a submission is never lost and never duplicated".
3. **Chaos integration tests before the UI.** I did commit 7 (proof) before commit 6 (UI) on purpose: the UI is replaceable, the guarantee is the deliverable. The git order is not the numbering in my original plan.
4. **UI**, kept thin: submit returns as soon as the record is durable, a banner, a status list, manual retry.
5. **Category registry**, because the second category is next month and data loss is happening now.
6. **UI pass, last, once the guarantee was proven.** The thin screens were reorganised into `src/features/` (outbox, appraisal, submissions) on top of a reusable `src/ui/` kit that knows nothing about appraisals, with the real outbox wired in at one place (`src/app/_layout.tsx`) so screens can be tested against a fake. Photo capture became tap-to-add boxes, number inputs only accept plain decimals, and selects have defaults. None of this touches the outbox or server behaviour.

## Why the fix holds on a bad connection

Failure modes on bad wifi, and what answers each:

| Failure | Answer |
|---|---|
| Request times out after the server committed it (lost ack) | `Idempotency-Key` on create; photo upload and finalize are idempotent. A replay returns the original result. |
| Retry resends megabytes from zero | One request per photo. After any failure the client asks the server what it already has and skips those photos. |
| App is killed or backgrounded mid-upload | State is persisted before and after every step, one storage key per submission. On boot, in-flight records are requeued and resume. |
| OS purges the picker cache | Photos are moved into the document directory at capture time. |
| Corrupted or truncated upload | SHA-256 and size are verified against the manifest; mismatches are retried a bounded number of times, then flagged. |
| One bad submission blocks the rest | Each fails independently; permanent errors (server validation) park as `needs-attention` with the reason. |
| NetInfo says "connected" on a captive portal | NetInfo, app foreground and a timer only trigger an attempt. Real request outcomes decide backoff. |
| A request that never answers | Every request has a deadline; photo deadlines scale with size and a stall watchdog aborts silent uploads. The deadline is raced, so a transport that ignores the abort signal still cannot hang the queue. |
| Thundering herd on reconnect | Full-jitter exponential backoff capped at 5 minutes; `Retry-After` is honoured as a floor. |

Evidence, in `integration/chaos.test.ts` (real outbox, real HTTP transport, real server, seeded):

- `flaky-wifi` seed 7, the same preset and seed the naive client fails on (with shorter latency so the suite stays fast): 30 submissions, exactly 30 finalized on the server, byte-identical photos, none duplicated.
- `lost-ack-heavy` (half of all responses lost): same invariants.
- Fully offline, then recovered: nothing lost while down, all delivered after.
- Repeated app kills mid-request, alternating "before the server commits" and "after the server commits": same invariants.

**Mutation check:** I disabled the server's idempotency lookup and ran the lost-ack test. It failed with 67 stored instead of 30. So the test does depend on the mechanism it claims to.

## Considered and rejected

- **Retry wrapper around the old request.** Cheapest, but it loses state on app kill, resends everything, and creates duplicates on lost acks.
- **OS background upload / background fetch.** Not reliable in Expo Go. The outbox resumes on foreground instead, and iOS uploads use a foreground session on purpose.
- **Chunked / resumable (tus-style) uploads.** Photos are resized to 1600px JPEG at 0.7, which should keep them well under a few MB (I have not measured real camera output), so per-photo granularity looked enough and the protocol is much simpler.
- **expo-sqlite instead of AsyncStorage.** Better for thousands of records; the outbox holds a handful, and one key per submission avoids the whole-blob clobbering problem. Revisit if histories grow.
- **A promise map for in-flight idempotency keys on the server.** I first designed one, then noticed the check-and-commit step has no `await`, so Node's single thread already makes it atomic. A test fires 5 concurrent same-key creates to pin that. A real database-backed server would need a unique constraint instead.
- **Byte-level upload progress in the UI.** Photo-level progress (`1/3 photos uploaded`) is enough for the user.

## Where the implementation differs from my first design

- Wrong bytes for a photo are always `422 checksum_mismatch` (I had planned a `409` after finalize).
- After an unknown create outcome the client replays `POST` with the same key rather than calling `GET`, because the server id is not known yet.
- The processor never needs `GET` for correctness; it uses it to avoid resending photos.
- `OutboxProcessor.start()` resolves once persisted state is loaded and does not wait for the first drain, so a first submit is not blocked behind a slow upload.

## Not done / what I'd do next

- **Not verified on a device or in Expo Go.** I had no simulator or phone. The JS bundles compile for iOS and Android, and the logic is covered by tests, but the native seams are only exercised on real hardware: `File.createUploadTask` PUT upload, `ImageManipulator`, `preparePhotos` (move to document dir, SHA-256, disk check), AsyncStorage and NetInfo wiring, and the camera/library pickers. `preparePhotos` has no automated test. This is the first thing I would do next: run the chaos presets from a phone.
- **Drafts across restarts.** Planned, cut. A half-filled form is lost on app kill; only submitted work is protected. Persisting fields is easy; persisting photos means preparing them at pick time.
- **Retaking a missing photo.** A missing local file parks the submission as `needs-attention`. There is no retake flow, and a photo cannot be removed once added.
- Auth and token refresh.
- Real persistence on the server (it is in memory), and a unique constraint for idempotency keys.
- Storage cleanup: submitted records stay as history; only photo files are removed.
- Surfacing `needs-attention` as a notification, not just a banner.
- Telemetry on attempts, time-to-deliver and parked submissions, to see this in production.
- Category schema evolution: only exact-version validation exists, with no migration of queued records across versions.

## Things I think are wrong but did not touch

- Dependency audits report vulnerabilities in transitive dev dependencies of the Expo toolchain. I chose multer 2.x for the mock server because 1.x has known advisories, and did not chase the rest.
- Node 25 triggers `EBADENGINE` warnings from Metro and React Native (they declare 22/24/26+). Everything runs; use an LTS Node to be safe.
- Bun is the package manager. Jest still runs on Node via `bun run test`; `bun test` would invoke Bun's own runner and ignore the Jest config. The mock server runs under `tsx` (Node), the same runtime the tests exercise, rather than Bun's runtime. Bun blocks the `@parcel/watcher` build-from-source postinstall; nothing needs it (typecheck, tests and an iOS export all pass).
- One unexplained flake: once, early on, `server/submissions.test.ts` "rejects a photo that is not in the manifest" returned 405 instead of 422. It did not reproduce in 10+ further runs of that file and of the full suite. I suspect an ephemeral port being reused across Jest workers by a pooled keep-alive connection, but I did not prove it. If it recurs, that is the lead.
- `src/api/naiveSubmit.ts` and `/v0/submissions` are baseline code kept only as the control for the repro test. They should not ship.

## How I used AI

I used an AI coding assistant for the whole exercise and treated its output as a draft to verify.

- I had it brainstorm the design first (approaches, a table of races and edge cases) and approved a written spec before any code. The specs are in `docs/superpowers/specs/`: one for the outbox, and one each for the modular UI structure and the tap-to-add photo boxes.
- Exports of the UI-side sessions are in `transcripts/`. They do not cover the sessions that built the outbox, server and chaos tests; `transcripts/README.md` says exactly what is and is not included.
- I asked it to check current Expo SDK 58 docs for `expo-file-system`, `expo-image-manipulator` and the upload task API instead of trusting its memory, since the API has changed.
- Things I caught or verified rather than accepted:
  - The first clock-skew clamp was wrong: it clamped relative to "now", so a far-future retry time never became due. Its own test caught it; the fix is "an implausibly distant time is treated as due now".
  - TypeScript 6 no longer auto-includes `@types/*`, which broke the first typecheck.
  - React Native Testing Library v14 made `render` and `fireEvent` async; the first tests failed with a misleading "render was not called".
  - A chaos test asserted an exact `queued` phase but a record can legitimately be mid-retry; I relaxed it to what is actually guaranteed.
  - It first pinned multer 1.x (known advisories); I moved to 2.x.
  - It wrote the server before the server tests once, against my TDD intent; I kept the tests as the spec and verified they pass for the right reasons, including the mutation check above.
- I made the AI run the repro first and report the numbers (2 lost, 5 duplicated, identical on a second run) so the claim "this reproduces" is evidence, not narrative.
