import { submitNaive, type ExcavatorFields } from '../src/api/naiveSubmit';
import { startServer, withTimeout } from './harness';

const SUBMISSIONS = 30;
const DEALER_MAX_TRIES = 3;

const fieldsFor = (i: number): ExcavatorFields => ({
  make: 'CAT',
  model: '320',
  year: '2018',
  hours: '4200',
  serial: `SN-${i}`,
  condition: 'good',
});

// A dealer taps Submit, and taps again on an error, a few times before giving up.
async function dealerSubmitsAll(baseUrl: string, fetchImpl: typeof fetch) {
  for (let i = 0; i < SUBMISSIONS; i++) {
    for (let attempt = 0; attempt < DEALER_MAX_TRIES; attempt++) {
      try {
        await submitNaive(baseUrl, fieldsFor(i), [new Blob(['photo'])], fetchImpl);
        break;
      } catch {
        // dealer sees "Submit failed" and tries again
      }
    }
  }
}

function tally(submissions: { fields: Record<string, unknown> }[]) {
  const counts = new Map<string, number>();
  for (const s of submissions) counts.set(String(s.fields.serial), (counts.get(String(s.fields.serial)) ?? 0) + 1);
  const lost = Array.from({ length: SUBMISSIONS }, (_, i) => `SN-${i}`).filter((sn) => !counts.has(sn));
  const duplicated = [...counts].filter(([, n]) => n > 1).map(([sn]) => sn);
  return { lost, duplicated };
}

describe('baseline naive client', () => {
  test('control: delivers every submission exactly once on a healthy network', async () => {
    const server = await startServer();
    try {
      await dealerSubmitsAll(server.baseUrl, withTimeout(400));
      expect(tally(await server.submissions())).toEqual({ lost: [], duplicated: [] });
    } finally {
      await server.close();
    }
  }, 60_000);

  // Control: the same scenario passes for the outbox client in chaos.test.ts, so this stays
  // `failing` to prove the harness still detects the loss that was reported.
  test.failing('loses or duplicates submissions on flaky wifi', async () => {
    const server = await startServer(7);
    try {
      await server.setChaos({ preset: 'flaky-wifi', seed: 7 });
      await dealerSubmitsAll(server.baseUrl, withTimeout(400));
      expect(tally(await server.submissions())).toEqual({ lost: [], duplicated: [] });
    } finally {
      await server.close();
    }
  }, 60_000);
});
