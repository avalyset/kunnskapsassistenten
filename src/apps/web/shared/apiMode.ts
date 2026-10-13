export type ApiMode = 'mock' | 'live' | 'bff';

/**
 * On the dev server's answer to `/api/*` in live without `KA_API_URL`
 * (vite.config.ts): a missing setting, which a retry cannot fix, and which the
 * client then says is missing (src/api/backendErrors.ts).
 */
export const SETUP_MISSING_HEADER = 'x-ka-setup-missing';

const modes: readonly string[] = ['mock', 'live', 'bff'] satisfies ApiMode[];

/**
 * The client's mode from `VITE_API_MODE`, here and not in src/api/ because
 * vite.config.ts runs it too, so a misspelt mode stops the dev server and the
 * build before anything is served.
 *
 * Unset: `bff` in production, where the BFF serves the client, else `live`,
 * the real backend through the dev server's proxy. The mock only when it is
 * named, as the tests name it: its answers look real and are not, so nobody
 * should get them by leaving a variable out. A value it does not know is an
 * error, not a guess.
 */
export function resolveApiMode(named: string | undefined, production: boolean): ApiMode {
  if (named === undefined) return production ? 'bff' : 'live';
  if (modes.includes(named)) return named as ApiMode;
  throw new Error(`VITE_API_MODE må være live, bff eller mock. Fikk "${named}".`);
}
