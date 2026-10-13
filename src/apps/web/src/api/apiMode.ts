import { resolveApiMode, type ApiMode } from '../../shared/apiMode.ts';

export type { ApiMode };

/**
 * `VITE_API_MODE` as built, never set at runtime, so the bundler can leave the
 * unused clients out (`createChatClient`). Unset: `bff` in production, else
 * `live`; the mock only when named, and an unknown value throws
 * (shared/apiMode.ts). `?.` for plain Node (runtimeConfig.ts).
 */
export function apiMode(): ApiMode {
  const env = import.meta.env;
  return resolveApiMode(env?.VITE_API_MODE, Boolean(env?.PROD));
}
