# 0010 — genki as the backend, through the same BFF

**Status:** accepted · **Date:** 2026-10-15

## Context

genki is the new GenAI platform, and it is to replace `digdir-headless-rag`
behind Kunnskapsassistenten. It keeps headless-rag's routes for compatibility:
`POST /api/mcp` with `tools/call`, `GET /v1/models` and the conversation API
under `/api/conversations`, with a service key and `X-User-Id`. It names tools
`<service>__<variant>` and conversations by service, and it maps the tenant
`public-sector-knowledge` with the dataset key `default` to its Kudos dataset.

Measured 2026-10-15 against `https://api.genki-test.digdir.cloud` with a
service key: the BFF answered with sources after changing only
`DIGDIR_API_BASE` and `DIGDIR_TOOL`.

## Decision

**The BFF talks to genki the way it talks to headless-rag.** No new code path.
The backend is chosen by configuration: `DIGDIR_API_BASE`, `DIGDIR_TOOL` and
`DIGDIR_AGENT_ID`, with `DIGDIR_TENANT` and `DIGDIR_DATASET_CONFIG_KEY` as
before. The deploy template takes the same as parameters.

**The defaults stay headless-rag.** A deployment or an `.env` that sets
nothing new behaves as before. The genki values are documented in
`apps/server/.env.example`, `README.md` and `deploy/README.md`.

## Why

The switch should be the smallest change that can be reviewed and rolled
back: a few settings, not a rewrite. The OpenAI-compatible `/v1` API is what
genki recommends for new frontends, but moving to it would change the
protocol and the backend at once (see 0003).

## Consequences

- Signing in people with Ansattporten and sending their token to genki is a
  separate change. Until then the BFF uses a service key, as with
  headless-rag.
- genki-test is locked for model calls: the service key must be made by a
  trusted Entra ID login in the genki portal.
- `DIGDIR_AGENT_ID` names the genki service (`kunnskapsassistenten`). Read in
  genki's code, not measured: `POST /api/conversations` looks the agent up
  among the services the key may use, and headless-rag's
  `builtin/agent-rag-agent` is not one of them.
