/** The caller always comes from the session, never from a request. */
import type { ConversationDetail, ConversationSummary, Message } from '@ka/contract';
import { backendHeaders, type Caller } from './backend.ts';
import { config } from './config.ts';
import { noteTitleFromBackend } from './capabilities.ts';

const headers = (caller: Caller): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...backendHeaders(caller),
});

interface BackendConversation {
  id: string;
  topic?: string;
  created?: number;
}

const toSummary = (c: BackendConversation): ConversationSummary => ({
  id: c.id,
  topic: c.topic?.trim() || 'Uten tittel',
  created: c.created ?? 0,
});

/** The backend answered, with a status that is not ok. */
export class BackendHttpError extends Error {
  readonly status: number;

  constructor(call: string, status: number) {
    super(`${call} ${status}`);
    this.status = status;
  }
}

/**
 * The body of a 502 for a failed call to the backend: a fixed sentence and,
 * when the failure is known, the code the stream uses for it (mcp.ts).
 */
export function failure(error: string, err: unknown): { error: string; code?: string } {
  if (err instanceof BackendHttpError) return { error, code: `backend_http_${err.status}` };
  // fetch's own TypeError when it cannot reach the backend; any other TypeError
  // is from our code, and says nothing about the backend.
  if (err instanceof TypeError && err.message === 'fetch failed') {
    return { error, code: 'backend_unreachable' };
  }
  return { error };
}

export function topicFrom(query: string): string {
  const one = query.replace(/\s+/g, ' ').trim();
  return one.length <= 60 ? one : `${one.slice(0, 57)}…`;
}

export async function list(caller: Caller): Promise<ConversationSummary[]> {
  const res = await fetch(`${config.apiBase}/api/conversations?page_size=100`, {
    headers: headers(caller),
  });
  if (!res.ok) throw new BackendHttpError('list', res.status);
  const body = (await res.json()) as { conversations?: BackendConversation[] };
  return (body.conversations ?? []).map(toSummary).sort((a, b) => b.created - a.created);
}

export async function create(caller: Caller, topic: string): Promise<ConversationSummary> {
  const res = await fetch(`${config.apiBase}/api/conversations`, {
    method: 'POST',
    headers: headers(caller),
    body: JSON.stringify({ agentId: config.agentId, title: topic }),
  });
  if (!res.ok) throw new BackendHttpError('create', res.status);
  const body = (await res.json()) as { conversation: BackendConversation };
  const summary = toSummary(body.conversation);
  noteTitleFromBackend(topic, summary.topic);
  return summary;
}

export async function detail(caller: Caller, id: string): Promise<ConversationDetail> {
  const res = await fetch(`${config.apiBase}/api/conversations/${encodeURIComponent(id)}`, {
    headers: headers(caller),
  });
  if (!res.ok) throw new BackendHttpError('detail', res.status);
  const body = (await res.json()) as {
    conversation: BackendConversation;
    messages?: Array<{
      id: string;
      role: string;
      text: string;
      created: number;
      task?: unknown;
    }>;
  };
  const messages: Message[] = (body.messages ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      text: m.text ?? '',
      created: m.created ?? 0,
      ...(m.role === 'assistant' && typeof m.task === 'string' && m.task
        ? { taskId: m.task }
        : {}),
    }));
  return { conversation: toSummary(body.conversation), messages };
}

export async function rename(caller: Caller, id: string, title: string): Promise<void> {
  const res = await fetch(`${config.apiBase}/api/conversations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: headers(caller),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new BackendHttpError('rename', res.status);
}

export async function remove(caller: Caller, id: string): Promise<void> {
  const res = await fetch(`${config.apiBase}/api/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(caller),
  });
  if (!res.ok) throw new BackendHttpError('delete', res.status);
}
