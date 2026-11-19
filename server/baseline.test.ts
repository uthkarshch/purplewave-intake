import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { createApp } from './app';
import { submitNaive } from '../src/api/naiveSubmit';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

test('baseline submit stores one submission with its photos', async () => {
  const fields = { make: 'CAT', model: '320', year: '2018', hours: '4200', serial: 'X1', condition: 'good' };
  const photos = [new Blob(['a']), new Blob(['b'])];

  const { id } = await submitNaive(baseUrl, fields, photos);

  const stored = await (await fetch(`${baseUrl}/__debug/submissions`)).json();
  expect(stored).toEqual([{ id, fields, photoCount: 2 }]);
});
