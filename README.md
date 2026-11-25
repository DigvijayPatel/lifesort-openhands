# LifeSort OpenHands Control

A Cloudflare Worker exposing an OAuth-protected Streamable HTTP MCP endpoint for OpenHands Cloud, restricted in code to `DigvijayPatel/LifeSort`.

## Cloudflare Git integration

This repository is the Worker repository. Set the Cloudflare build root to `/` (repository root), install command to `npm install`, and deploy command to `npx wrangler deploy`.

## Required Cloudflare resources

1. Create a KV namespace named `lifesort-openhands-oauth`.
2. Replace `REPLACE_WITH_KV_NAMESPACE_ID` in `wrangler.jsonc` with its namespace ID.
3. Add these Worker secrets in Cloudflare:
   - `OPENHANDS_CLOUD_API_KEY`: OpenHands Cloud API key.
   - `BRIDGE_LOGIN_PASSWORD`: unique high-entropy password for the private bridge login.
   - `SESSION_SIGNING_SECRET`: separate random secret of at least 32 bytes.
4. Deploy, then test the MCP endpoint and OAuth flow before connecting ChatGPT.

Never commit credentials, `.dev.vars`, or API keys. Do not share secrets in ChatGPT messages.

## MCP tools

- `openhands_account`
- `openhands_list_conversations`
- `openhands_start_lifesort_task`
- `openhands_get_start_task`
- `openhands_get_conversation`
- `openhands_send_message`
- `openhands_get_events`
- `openhands_pause_conversation`
- `openhands_resume_conversation`

The first implementation still requires build verification and live endpoint/schema validation before production use.
