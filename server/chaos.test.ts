import { startServer, withTimeout } from '../integration/harness';
import { submitNaive } from '../src/api/naiveSubmit';

const fields = { make: '', model: '', year: '', hours: '', serial: 'SN', condition: '' };

describe('chaos injector', () => {
  test('lost-ack commits on the server while the client sees a failure', async () => {
    const server = await startServer();
    try {
      await server.setChaos({ preset: 'none', lostAckRate: 1 });
      await expect(submitNaive(server.baseUrl, fields, [], withTimeout(500))).rejects.toThrow();
      expect(await server.submissions()).toHaveLength(1);
    } finally {
      await server.close();
    }
  });

  test('error faults return 503 without reaching the handler', async () => {
    const server = await startServer();
    try {
      await server.setChaos({ preset: 'none', errorRate: 1 });
      await expect(submitNaive(server.baseUrl, fields, [], withTimeout(500))).rejects.toThrow('503');
      expect(await server.submissions()).toHaveLength(0);
    } finally {
      await server.close();
    }
  });

  test('same seed yields the same fault sequence', async () => {
    const outcomes = async () => {
      const server = await startServer(42);
      try {
        await server.setChaos({ preset: 'none', errorRate: 0.5, seed: 42 });
        const results: boolean[] = [];
        for (let i = 0; i < 10; i++) {
          results.push(await submitNaive(server.baseUrl, fields, [], withTimeout(500)).then(() => true, () => false));
        }
        return results;
      } finally {
        await server.close();
      }
    };
    expect(await outcomes()).toEqual(await outcomes());
  });

  test('rejects an unknown preset', async () => {
    const server = await startServer();
    try {
      await expect(server.setChaos({ preset: 'nope' })).rejects.toThrow('400');
    } finally {
      await server.close();
    }
  });
});
