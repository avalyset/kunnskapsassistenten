import { LiveUploadClient } from './live/LiveUploadClient';
import { MockUploadClient } from './mock/MockUploadClient';
import { apiMode } from './apiMode';
import type { UploadClient } from './uploadClient';

let client: UploadClient | undefined;

/**
 * The upload client, built once. No backend has an upload endpoint yet, so the app refuses in
 * every mode, mock included: mock shows what readers get, a switched-off zone marked «Kommer
 * snart». Only the unit tests (`MODE` is `test` under vitest) get the mock client in mock mode,
 * so the upload flow keeps working for the day there is an endpoint. Cached so `unavailable` is
 * read off one object, and a test that swaps the mode has one place to reset.
 */
export function createUploadClient(): UploadClient {
  client ??=
    apiMode() === 'mock' && import.meta.env.MODE === 'test'
      ? new MockUploadClient()
      : new LiveUploadClient();
  return client;
}

/** Tests only: drop the cached client so the next call reads the mode again. */
export function resetUploadClientForTest(): void {
  client = undefined;
}
