import { fetchKismetDevices } from './kismet-client.js';
import { parseKismetDevices } from './kismet-parser.js';
import type { ParsedTelemetry } from './kismet-parser.js';

export function createKismetPoller(kismetUrl: string): () => Promise<ParsedTelemetry[]> {
  return async () => {
    const devices = await fetchKismetDevices(kismetUrl);
    return parseKismetDevices(devices);
  };
}
