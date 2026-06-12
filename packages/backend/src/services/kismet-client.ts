import type { KismetDevice } from './kismet-parser.js';

export async function fetchKismetDevices(baseUrl: string): Promise<KismetDevice[]> {
  const url = baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${url}/devices/all`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Kismet API returned ${res.status}`);
  }
  return res.json() as Promise<KismetDevice[]>;
}
