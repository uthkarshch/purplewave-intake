import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

import { createApp } from '../server/app';
import type { NaiveSubmission } from '../server/app';

export async function startServer(seed = 1) {
  const server = createApp({ seed }).listen(0);
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    baseUrl,
    async setChaos(body: Record<string, unknown>) {
      const res = await fetch(`${baseUrl}/__chaos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`setChaos failed: ${res.status}`);
    },
    async submissions(): Promise<NaiveSubmission[]> {
      return (await fetch(`${baseUrl}/__debug/submissions`)).json();
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

export const withTimeout =
  (ms: number): typeof fetch =>
  (input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(ms) });
