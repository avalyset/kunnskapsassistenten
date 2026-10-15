import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChatClient } from './index';
import { resetLiveConversation } from './live/LiveChatClient';

/**
 * Verktøyet når fram til live-klienten fra begge steder klientinnstillingene
 * kommer fra: `.env.local` i utvikling, og `/config.js` fra serveren i
 * containeren (runtimeConfig.ts).
 */
describe('createChatClient og verktøyet', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv('VITE_API_MODE', 'live');
    resetLiveConversation();
    fetchMock = vi.fn(async () => new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete window.__KA_CONFIG__;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  /** Navnet `tools/call` ble sendt med. */
  async function toolAsked(): Promise<string | undefined> {
    for await (const _event of createChatClient().ask({ query: 'Hva rapporterer Nkom?' })) {
      // drained on purpose
    }
    const calls = fetchMock.mock.calls as unknown as [unknown, RequestInit | undefined][];
    const call = calls.find(([url]) => String(url).endsWith('/mcp'));
    return (JSON.parse(String(call?.[1]?.body)) as { params: { name?: string } }).params.name;
  }

  it('tar verktøyet fra .env.local i utvikling', async () => {
    vi.stubEnv('VITE_KA_TOOL', 'kunnskapsassistenten__default');

    expect(await toolAsked()).toBe('kunnskapsassistenten__default');
  });

  it('tar verktøyet fra kjøretidsoppsettet i containeren', async () => {
    window.__KA_CONFIG__ = { VITE_KA_TOOL: 'kunnskapsassistenten__default' };

    expect(await toolAsked()).toBe('kunnskapsassistenten__default');
  });

  it('spør standardverktøyet når ingen av dem har sagt noe', async () => {
    expect(await toolAsked()).toBe('builtin.agent-rag-agent__agent-rag-graph-bundled');
  });
});
