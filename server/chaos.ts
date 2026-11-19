import type { RequestHandler } from 'express';

export type ChaosProfile = {
  latencyMs: [number, number];
  dropRate: number;
  timeoutRate: number;
  errorRate: number;
  lostAckRate: number;
};

export const PRESETS: Record<string, ChaosProfile> = {
  none: { latencyMs: [0, 0], dropRate: 0, timeoutRate: 0, errorRate: 0, lostAckRate: 0 },
  'flaky-wifi': { latencyMs: [20, 150], dropRate: 0.15, timeoutRate: 0.05, errorRate: 0.1, lostAckRate: 0.15 },
  'dead-zone': { latencyMs: [20, 150], dropRate: 0.6, timeoutRate: 0.2, errorRate: 0.1, lostAckRate: 0.05 },
  'lost-ack-heavy': { latencyMs: [0, 20], dropRate: 0, timeoutRate: 0, errorRate: 0, lostAckRate: 0.5 },
};

export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createChaos(seed = 1) {
  let profile = PRESETS.none;
  let rand = mulberry32(seed);

  const middleware: RequestHandler = (req, res, next) => {
    const roll = rand();
    const [minLatency, maxLatency] = profile.latencyMs;
    const latency = minLatency + rand() * (maxLatency - minLatency);

    setTimeout(() => {
      let threshold = profile.dropRate;
      if (roll < threshold) return void req.socket.destroy();

      threshold += profile.timeoutRate;
      if (roll < threshold) return; // never answer; the client's own timeout fires

      threshold += profile.errorRate;
      if (roll < threshold) {
        return void res.status(503).set('Retry-After', '1').json({ error: 'chaos' });
      }

      threshold += profile.lostAckRate;
      if (roll < threshold) {
        // The handler runs and commits, but the response never reaches the client.
        res.end = (() => {
          res.socket?.destroy();
          return res;
        }) as typeof res.end;
      }
      next();
    }, latency);
  };

  return {
    middleware,
    configure(next: { preset?: string; seed?: number } & Partial<ChaosProfile>) {
      const base = next.preset ? PRESETS[next.preset] : profile;
      if (!base) throw new Error(`Unknown chaos preset: ${next.preset}`);
      const { preset: _preset, seed: nextSeed, ...overrides } = next;
      profile = { ...base, ...overrides };
      if (nextSeed !== undefined) rand = mulberry32(nextSeed);
    },
  };
}
