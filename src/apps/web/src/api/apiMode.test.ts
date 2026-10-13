import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveApiMode } from '../../shared/apiMode.ts';
import { apiMode } from './apiMode';
import { BffChatClient } from './bff';
import { createChatClient } from './index';
import { LiveChatClient } from './live';
import { MockChatClient } from './mock';

/**
 * Which backend the app talks to is decided when it is built, and only then.
 *
 * Read at runtime, the mode kept every client in the bundle, the mock corpus
 * included, because nothing could tell the bundler which one would be used.
 * And a production build without a mode answered from the mock: invented
 * answers that look like real ones, with nothing saying so. In development a
 * mode left out did the same, and so did a misspelt one.
 */
afterEach(() => {
  delete window.__KA_CONFIG__;
  vi.unstubAllEnvs();
});

describe('modusen', () => {
  it('er bff i et produksjonsbygg uten VITE_API_MODE', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_MODE', undefined);

    expect(createChatClient()).toBeInstanceOf(BffChatClient);
  });

  it('er live i utvikling uten VITE_API_MODE', () => {
    vi.stubEnv('VITE_API_MODE', undefined);

    expect(createChatClient()).toBeInstanceOf(LiveChatClient);
  });

  it('er mock i testene, fordi testoppsettet sier det', () => {
    expect(apiMode()).toBe('mock');
    expect(createChatClient()).toBeInstanceOf(MockChatClient);
  });

  it.each(['liv', 'Live', 'mock ', ''])(
    'nekter VITE_API_MODE=%j i stedet for å gjette',
    (named) => {
      vi.stubEnv('VITE_API_MODE', named as 'live');

      expect(() => apiMode()).toThrow('VITE_API_MODE må være live, bff eller mock');
      expect(() => createChatClient()).toThrow('VITE_API_MODE må være live, bff eller mock');
    },
  );

  it('følger VITE_API_MODE fra bygget', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_MODE', 'live');

    expect(createChatClient()).toBeInstanceOf(LiveChatClient);
  });

  it('kan ikke byttes av /config.js etter bygget', () => {
    vi.stubEnv('VITE_API_MODE', 'bff');
    window.__KA_CONFIG__ = { VITE_API_MODE: 'live' };

    expect(createChatClient()).toBeInstanceOf(BffChatClient);
  });
});

describe('apiMode() og createChatClient', () => {
  /*
   * The rule is written out twice: in `createChatClient`, where the build can
   * fold it, and in `apiMode()`, which the thread actions, the sign-in, the
   * upload and the corpus read. A bff build where the two disagreed would
   * ask the BFF and rename threads in the mock, with no «Logg ut».
   */
  const clientFor = { bff: BffChatClient, live: LiveChatClient, mock: MockChatClient };

  it.each([
    { built: 'mock', production: false },
    { built: 'live', production: false },
    { built: 'bff', production: false },
    { built: 'mock', production: true },
    { built: 'live', production: true },
    { built: 'bff', production: true },
    { built: undefined, production: true },
    { built: undefined, production: false },
  ] as const)('velger det samme med $built, produksjon $production', ({ built, production }) => {
    vi.stubEnv('PROD', production);
    vi.stubEnv('VITE_API_MODE', built);

    expect(createChatClient()).toBeInstanceOf(clientFor[apiMode()]);
  });
});

describe('resolveApiMode, som vite.config.ts også kjører', () => {
  it.each([
    { named: undefined, production: false, mode: 'live' },
    { named: undefined, production: true, mode: 'bff' },
    { named: 'mock', production: false, mode: 'mock' },
    { named: 'mock', production: true, mode: 'mock' },
    { named: 'bff', production: false, mode: 'bff' },
    { named: 'live', production: true, mode: 'live' },
  ])('gir $mode med $named, produksjon $production', ({ named, production, mode }) => {
    expect(resolveApiMode(named, production)).toBe(mode);
  });

  it('sier hva den fikk', () => {
    expect(() => resolveApiMode('liv', false)).toThrow('Fikk "liv".');
  });
});
