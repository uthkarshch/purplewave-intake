# Purple Wave Intake

Expo app for equipment dealers to photograph a machine, describe its condition and submit it for appraisal, plus a mock server that can simulate a bad dealership connection.

See [DECISIONS.md](DECISIONS.md) for assumptions, trade-offs and what is not done.

## Run it

> **You need two terminals: the mock server and the Expo app.** The app has no backend of its own. Without the server running, submissions are saved on the device and sit in the queue as "Waiting to retry", which is the offline behaviour working as designed, not a bug.

Needs [Bun](https://bun.sh) 1.3+ and Expo Go (SDK 58) on a phone, or an iOS simulator / Android emulator.

```sh
bun install
```

**Terminal 1: the mock server**

```sh
bun run server
```

It prints `mock server listening on :4000` when ready (override the port with `PORT=4001 bun run server`). Check it from a third terminal:

```sh
curl localhost:4000/__debug/v1/submissions    # should print []
```

**Terminal 2: the Expo app**

```sh
bun run start        # then scan the QR code with Expo Go
bun run ios          # or open directly in the iOS simulator
bun run android      # or in the Android emulator
```

The app reaches the server at the same host Expo is served from, on port 4000. On a physical phone, the phone and the computer must be on the same network. If that guess is wrong for your network, set the address explicitly:

```sh
EXPO_PUBLIC_API_URL=http://<lan-ip>:4000 bun run start
```

If submissions stay queued after the server is up, the app cannot reach it: check the host and port, then tap **Retry now** on the Submissions tab.

Bun blocks the `@parcel/watcher` build-from-source postinstall; it is not needed (Metro ships its own watcher).

## Using the app

- **New appraisal:** pick a category, fill in the fields, then tap a photo box to choose Camera or Library. Required fields and required photos are marked `*`, and **Submit** stays disabled until they are all present. Extra photos go in the **+ Extra** box.
- **Submit** returns as soon as the record is saved on the device; uploading happens in the background and survives app restarts.
- **Submissions:** every queued or sent record with its status and photo progress, and **Retry now** for ones that are waiting or need attention.

## Change the connection quality

The mock server takes a fault profile at runtime, with no restart. Run these from any terminal on the computer running the server:

```sh
# bad wifi, repeatable
curl -X POST localhost:4000/__chaos -H 'content-type: application/json' -d '{"preset":"flaky-wifi","seed":7}'
# fully offline
curl -X POST localhost:4000/__chaos -H 'content-type: application/json' -d '{"preset":"none","dropRate":1}'
# healthy again
curl -X POST localhost:4000/__chaos -H 'content-type: application/json' -d '{"preset":"none"}'
```

| Preset | Behaviour |
|---|---|
| `none` | Healthy: no latency, no faults |
| `flaky-wifi` | 20-150 ms latency; 15% dropped, 5% hung, 10% HTTP 503, 15% lost acks |
| `dead-zone` | 60% dropped, 20% hung, 10% HTTP 503, 5% lost acks |
| `lost-ack-heavy` | Half of all responses lost after the server has committed |

Any rate can be overridden on top of a preset: `latencyMs: [min, max]`, `dropRate`, `timeoutRate`, `errorRate`, `lostAckRate`. `seed` makes a run repeatable. A lost ack means the server commits the request and then kills the connection, which is what turns a naive retry into a duplicate. The control endpoints (`/__chaos`, `/__debug/*`) are never faulted.

## Test the problem in the app

The reported problem: on a poor connection, appraisals are lost or arrive twice. To see the fix hold:

1. Start the server and the app (above), and confirm `curl localhost:4000/__debug/v1/submissions` prints `[]`.
2. Make the connection bad: apply `flaky-wifi` with `seed` 7.
3. In the app, create several appraisals (fill the required fields, add the required photos, **Submit**). Each submit returns immediately. Open the **Submissions** tab and watch the statuses move through Queued, Uploading and Waiting to retry as requests fail and back off.
4. Go fully offline (`dropRate` 1) and submit one more. It stays queued. Force-quit the app and reopen it: the record is still there and resumes.
5. Restore the connection (`none`). The queue drains by itself, or tap **Retry now**. Every record ends as Submitted.
6. Ask the server what it actually holds:

   ```sh
   curl -s localhost:4000/__debug/v1/submissions
   ```

   Each appraisal appears exactly once with all its photos, including the ones submitted during the bad connection and the outage.

To see the original problem, run the control test. It drives the naive single-request client through the same `flaky-wifi` seed 7 profile; per [DECISIONS.md](DECISIONS.md) the server ends up with 33 rows for 30 submissions (2 lost, 5 duplicated):

```sh
bun run test integration/baseline-loss
```

That test is marked `test.failing`: it passes because the naive client does lose or duplicate submissions, and it would start failing if the harness ever stopped detecting the problem.
The same seed against the real outbox is in `integration/chaos.test.ts`: 30 submissions, exactly 30 on the server.

## Test

```sh
bun run test          # app (jest-expo), server, and integration projects
bun run typecheck
```

Use `bun run test`, not `bun test`: the latter is Bun's own runner and ignores the Jest config.

## Layout

| Path | What |
|---|---|
| `src/features/outbox/` | Persistent outbox: store, state machine and backoff, HTTP transport, Expo adapters, triggers, `OutboxProvider` |
| `src/features/appraisal/`, `src/features/submissions/` | The two screens, their form hook, field renderers and photo capture |
| `src/ui/` | Reusable design-system pieces (theme, buttons, inputs, dialog, sheet); knows nothing about appraisals |
| `src/app/` | Thin expo-router files; `_layout.tsx` is the one place the real outbox is wired in |
| `shared/` | API contract types and the category registry, used by app and server |
| `server/` | Mock server: idempotent create, checksummed photo upload, finalize, fault injector |
| `integration/` | Real outbox against the real mock server under seeded fault profiles |
| `docs/superpowers/specs/` | Design specs written before each piece of work: offline-resilient intake, modular UI structure, tap-to-add photo boxes |
| `transcripts/` | Exports of the AI sessions, see [transcripts/README.md](transcripts/README.md) for what they do and do not cover |
| `src/api/naiveSubmit.ts` | The original single-request client, kept only as the control in `integration/baseline-loss.test.ts` |
