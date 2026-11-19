# Purple Wave Intake

Expo app for equipment dealers to photograph a machine, describe its condition and submit it for appraisal, plus a mock server that can simulate a bad dealership connection.

See [DECISIONS.md](DECISIONS.md) for assumptions, trade-offs and what is not done.

## Run it

Needs [Bun](https://bun.sh) 1.3+ and Expo Go (SDK 58).

```sh
bun install
bun run server        # mock server on :4000
bun run start         # Expo dev server; open in Expo Go
```

On a physical phone the app reaches the server at the same host Expo is served from (port 4000). Override with `EXPO_PUBLIC_API_URL=http://<lan-ip>:4000 bun run start` if that is wrong for your network.

Bun blocks the `@parcel/watcher` build-from-source postinstall; it is not needed (Metro ships its own watcher).

## Simulate a poor connection

The mock server takes a fault profile at runtime (no restart):

```sh
curl -X POST localhost:4000/__chaos -H 'content-type: application/json' -d '{"preset":"flaky-wifi","seed":7}'
curl -X POST localhost:4000/__chaos -H 'content-type: application/json' -d '{"preset":"none","dropRate":1}'   # fully offline
curl -X POST localhost:4000/__chaos -H 'content-type: application/json' -d '{"preset":"none"}'                # healthy
```

Presets: `none`, `flaky-wifi`, `dead-zone`, `lost-ack-heavy`. Any rate can be overridden: `latencyMs: [min, max]`, `dropRate`, `timeoutRate`, `errorRate`, `lostAckRate`, and `seed` makes a run repeatable. A lost ack means the server commits the request and then kills the connection, which is what turns a naive retry into a duplicate.

Submit something, switch to `none` or `dead-zone`, and watch the banner and the Submissions screen. `GET /__debug/v1/submissions` shows what the server actually holds.

## Test

```sh
bun run test          # app (jest-expo), server, and integration projects
bun run typecheck
```

Use `bun run test`, not `bun test`: the latter is Bun's own runner and ignores the Jest config.

## Layout

| Path | What |
|---|---|
| `src/outbox/` | Persistent outbox: store, state machine and backoff, HTTP transport, Expo adapters, triggers |
| `src/app/`, `src/components/` | Screens and form components |
| `shared/` | API contract types and the category registry, used by app and server |
| `server/` | Mock server: idempotent create, checksummed photo upload, finalize, fault injector |
| `integration/` | Real outbox against the real mock server under seeded fault profiles |
| `src/api/naiveSubmit.ts` | The original single-request client, kept only as the control in `integration/baseline-loss.test.ts` |
