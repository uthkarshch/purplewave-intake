export type ExcavatorFields = {
  make: string;
  model: string;
  year: string;
  hours: string;
  serial: string;
  condition: string;
};

// Baseline client: one multipart request, no retry, no persistence.
export async function submitNaive(
  baseUrl: string,
  fields: ExcavatorFields,
  photos: Blob[],
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string }> {
  const form = new FormData();
  form.append('payload', JSON.stringify(fields));
  photos.forEach((photo, i) => form.append('photos', photo, `photo-${i}.jpg`));

  const res = await fetchImpl(`${baseUrl}/v0/submissions`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
  return res.json();
}
