# 0011 — Ansattporten in the BFF, with the person's token to genki

**Status:** accepted · **Date:** 2026-10-15

## Context

With genki as the backend (0010) the BFF still holds one service key and says
who the person is with `X-User-Id`, which genki takes on trust (0002). genki
also takes a person's Ansattporten access token as `Authorization: Bearer`,
with `GenAI-Acting-For` naming the organisation, for frontends registered as
`browser`. Then genki decides who may use the service, from Altinn, and the
person owns their own conversations and feedback.

genki-test is locked for model calls (genki ADR 0033): only an Entra ID login
through Ansattporten in Digdir's group may use them. Such a token lists no
organisations and has no name, so genki answers `GET /me` with them.

## Decision

**`AUTH_MODE=ansattporten` signs the person in in the BFF.** The code flow
with PKCE, as a confidential client (`client_secret_basic`), with
`scope=openid profile`, `resource` set to genki's audience (`digdir:genai`)
and `authorization_details` for the Altinn resource. The endpoints come from
discovery. The ID token is verified: signature against the issuer's keys,
issuer, audience, expiry and nonce.

**The tokens stay in the server.** They are kept in memory, keyed by a random
id in the signed session cookie. The browser never sees a token. They are
refreshed with the refresh token a minute before they run out, and logout
ends the Ansattporten session with `id_token_hint`.

**Every call to genki carries the person's token.** Conversations, MCP,
models and feedback. `GenAI-Acting-For` only when the person chose among
several organisations. Without a token, with `entra` and `off`, the service
key and `X-User-Id` go as before.

**Organisations from the token, else from genki.** A token without
organisations for the Altinn resource (an Entra ID login) makes the BFF ask
`GET /me`. genki's refusals `locked-environment` and `entra-not-trusted` are
shown to the person in our own words: as a page at sign-in, and as the error
of the turn when they ask.

**Feedback goes through the BFF.** `POST …/feedback` sends a rating of one
run to genki, only for a run that is an answer in the caller's own thread,
since a service key lets anyone holding it rate any run.

## Why

The BFF is a server, so it can keep a client secret and the tokens, and the
clients do not change: they still talk to their own origin with a cookie.
Memory instead of an encrypted cookie, because three JWTs do not fit in one
cookie, and KA already keeps sources and thread filters in memory.

## Alternatives considered

**Tokens in an encrypted cookie.** Survives a restart and needs no sticky
sessions. Not chosen: the access, ID and refresh tokens together are larger
than a cookie may be, and the ask was that tokens never reach the browser.

**Sign-in in the browser** (a public client, as genki's portal). Not chosen:
both clients would need it, and the token would be in the browser.

**The shared secret in the link** (`?secret=`, `apps/web/server/access.ts`).
That gate belongs to the server that deploys `apps/web` alone against
headless-rag, and it is left as it is. The BFF never had it; with
Ansattporten the sign-in is the gate.

## Consequences

- A restart, or a new revision, signs everyone out. The deploy template makes
  ingress sticky in this mode, so a person stays on the replica that holds
  their tokens.
- Without a service key there is nothing to probe filters with, so
  `KA_CAPABILITIES` decides.
- KA's Ansattporten client must be registered in Samarbeidsportalen and, with
  the same client id, as a `browser` frontend in the genki portal, which
  confines those tokens to the KA service.
- Neither client has feedback buttons yet; the route is there for them.
