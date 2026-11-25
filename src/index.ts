import { OAuthProvider, AuthorizationError, type AuthRequest } from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

interface Env {
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: { parseAuthRequest(r: Request): Promise<AuthRequest>; lookupClient(id: string): Promise<{ clientName?: string } | null>; completeAuthorization(args: unknown): Promise<{ redirectTo: string }> };
  OPENHANDS_CLOUD_API_KEY: string;
  BRIDGE_LOGIN_PASSWORD: string;
  SESSION_SIGNING_SECRET: string;
}

const REPOSITORY = "DigvijayPatel/LifeSort";
const OPENHANDS_BASE = "https://app.all-hands.dev/api/v1";
const SESSION_COOKIE = "lifesort_bridge_session";

function html(body: string, status = 200): Response {
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>LifeSort OpenHands Control</title><style>body{font:16px system-ui;background:#101114;color:#f5f5f5;display:grid;place-items:center;min-height:90vh}.card{width:min(420px,90vw);padding:28px;border:1px solid #333;border-radius:16px;background:#191a1f}input,button{box-sizing:border-box;width:100%;padding:12px;margin-top:12px;border-radius:8px}input{background:#101114;border:1px solid #444;color:white}button{background:#f97316;border:0;color:white;font-weight:600;cursor:pointer}.muted{color:#aaa;font-size:14px}</style></head><body><main class="card">${body}</main></body></html>`, {
    status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" }
  });
}

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}
async function validSession(request: Request, env: Env): Promise<boolean> {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.split(";").map(v => v.trim()).find(v => v.startsWith(SESSION_COOKIE + "="));
  if (!match) return false;
  const token = match.slice(SESSION_COOKIE.length + 1);
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature || !/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;
  const expected = await sign(expiry, env.SESSION_SIGNING_SECRET);
  const a = new TextEncoder().encode(signature);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
async function createSession(env: Env): Promise<string> {
  const expiry = String(Date.now() + 8 * 60 * 60 * 1000);
  return `${expiry}.${await sign(expiry, env.SESSION_SIGNING_SECRET)}`;
}
function safeReturnTo(value: string): string {
  if (!value.startsWith("/authorize?") || value.startsWith("//") || value.includes("\\") || value.includes("\r") || value.includes("\n")) return "/authorize";
  return value;
}

async function authorizeHandler(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/login" && request.method === "POST") {
    const form = await request.formData();
    const password = String(form.get("password") ?? "");
    const returnTo = safeReturnTo(String(form.get("return_to") ?? "/authorize"));
    const supplied = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
    const expected = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.BRIDGE_LOGIN_PASSWORD));
    const a = new Uint8Array(supplied), b = new Uint8Array(expected);
    const ok = a.every((v, i) => v === b[i]);
    if (!ok) return html('<h2>Sign-in failed</h2><p class="muted">The password was not accepted.</p><a href="/authorize">Try again</a>', 401);
    return new Response(null, { status: 303, headers: { location: returnTo, "set-cookie": `${SESSION_COOKIE}=${await createSession(env)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`, "cache-control": "no-store" } });
  }

  if (url.pathname !== "/authorize" || (request.method !== "GET" && request.method !== "POST")) return new Response("Not found", { status: 404 });
  let oauthRequest: AuthRequest;
  try {
    oauthRequest = await (env as Env & { OAUTH_PROVIDER: { parseAuthRequest(r: Request): Promise<AuthRequest> } }).OAUTH_PROVIDER.parseAuthRequest(new Request(url.toString(), { method: "GET", headers: request.headers }));
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    if (!error.redirectUri) return html(`<h2>Authorization request rejected</h2><p>${escapeHtml(error.description)}</p>`, 400);
    const redirect = new URL(error.redirectUri);
    redirect.searchParams.set("error", error.code);
    redirect.searchParams.set("error_description", error.description);
    if (error.state) redirect.searchParams.set("state", error.state);
    if (error.issuer) redirect.searchParams.set("iss", error.issuer);
    return Response.redirect(redirect.toString(), 302);
  }

  if (!(await validSession(request, env))) {
    const returnTo = safeReturnTo(url.pathname + url.search);
    return html(`<h2>LifeSort OpenHands Control</h2><p class="muted">Sign in to authorize ChatGPT to operate your OpenHands conversations for the LifeSort repository.</p><form method="post" action="/login"><input type="hidden" name="return_to" value="${escapeHtml(returnTo)}"><label for="password">Bridge password</label><input id="password" name="password" type="password" required autocomplete="current-password"><button type="submit">Continue</button></form>`);
  }

  const provider = (env as Env & { OAUTH_PROVIDER: { lookupClient(id: string): Promise<{ clientName?: string } | null>; completeAuthorization(args: unknown): Promise<{ redirectTo: string }> } }).OAUTH_PROVIDER;
  const client = await provider.lookupClient(oauthRequest.clientId);
  if (!client) return html("<h2>Unknown OAuth client</h2>", 400);
  const returnTo = safeReturnTo(url.pathname + url.search);
  if (request.method === "GET") {
    return html(`<h2>Authorize ChatGPT?</h2><p class="muted">Client: ${escapeHtml(client.clientName ?? "MCP client")}</p><p>This grants access to control OpenHands conversations in <strong>${REPOSITORY}</strong>. It can start tasks, read events, send instructions, and pause or resume sandboxes.</p><form method="post" action="${escapeHtml(returnTo)}"><input type="hidden" name="return_to" value="${escapeHtml(returnTo)}"><button type="submit">Approve access</button></form><p class="muted">You can revoke this connection from ChatGPT's connected apps.</p>`);
  }
  const form = await request.formData();
  if (String(form.get("return_to") ?? "") !== returnTo) return html("<h2>Invalid authorization request</h2>", 400);
  const { redirectTo } = await provider.completeAuthorization({
    request: oauthRequest, userId: "lifesort-owner", metadata: { clientName: client.clientName ?? "MCP client" },
    scope: oauthRequest.scope.filter((scope: string) => scope === "openhands:control"),
    props: { userId: "lifesort-owner", repository: REPOSITORY }
  });
  return Response.redirect(redirectTo, 302);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

async function oh(env: Env, path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${OPENHANDS_BASE}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${env.OPENHANDS_CLOUD_API_KEY}`, accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`OpenHands API ${response.status}: ${text.slice(0, 1200)}`);
  if (!text) return { ok: true };
  try { return JSON.parse(text); } catch { return { text }; }
}
function jsonText(value: unknown) { return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] }; }

function createServer(env: Env) {
  const server = new McpServer({ name: "LifeSort OpenHands Control", version: "0.1.0" });
  server.registerTool("openhands_account", { description: "Verify the configured OpenHands Cloud API key and show the authenticated account.", inputSchema: {} }, async () => jsonText(await oh(env, "/users/me")));
  server.registerTool("openhands_list_conversations", { description: "List recent OpenHands Cloud conversations. Results are restricted to the LifeSort repository.", inputSchema: { limit: z.number().int().min(1).max(50).default(10) } }, async ({ limit }) => {
    const data = await oh(env, `/app-conversations/search?limit=${limit}`);
    const items = Array.isArray(data) ? data : ((data as { items?: unknown[] }).items ?? []);
    return jsonText(items.filter((item: any) => item?.selected_repository === REPOSITORY));
  });
  server.registerTool("openhands_start_lifesort_task", { description: "Start a new OpenHands Cloud task in DigvijayPatel/LifeSort. This creates a sandbox and consumes OpenHands resources. Never start tasks that target another repository.", inputSchema: { task: z.string().min(10).max(12000), branch: z.string().max(120).optional(), title: z.string().max(120).optional() } }, async ({ task, branch, title }) => {
    const body: Record<string, unknown> = { selected_repository: REPOSITORY, initial_message: { content: [{ type: "text", text: task }] } };
    if (branch) body.selected_branch = branch;
    if (title) body.title = title;
    return jsonText(await oh(env, "/app-conversations", { method: "POST", body: JSON.stringify(body) }));
  });
  server.registerTool("openhands_get_start_task", { description: "Check whether an OpenHands Cloud task has finished starting.", inputSchema: { start_task_id: z.string().uuid() } }, async ({ start_task_id }) => jsonText(await oh(env, `/app-conversations/start-tasks?ids=${encodeURIComponent(start_task_id)}`)));
  server.registerTool("openhands_send_message", { description: "Send a follow-up instruction to an existing LifeSort OpenHands conversation.", inputSchema: { conversation_id: z.string().uuid(), message: z.string().min(1).max(12000) } }, async ({ conversation_id, message }) => {
    const conv: any = await oh(env, `/app-conversations?ids=${encodeURIComponent(conversation_id)}`);
    const items = Array.isArray(conv) ? conv : (conv.items ?? []);
    if (!items.some((v: any) => v.id === conversation_id && v.selected_repository === REPOSITORY)) throw new Error("Conversation not found in the allowed LifeSort repository.");
    return jsonText(await oh(env, `/app-conversations/${encodeURIComponent(conversation_id)}/send-message`, { method: "POST", body: JSON.stringify({ message }) }));
  });
  server.registerTool("openhands_get_conversation", { description: "Fetch status and metadata for a LifeSort OpenHands conversation.", inputSchema: { conversation_id: z.string().uuid() } }, async ({ conversation_id }) => {
    const data: any = await oh(env, `/app-conversations?ids=${encodeURIComponent(conversation_id)}`);
    const items = Array.isArray(data) ? data : (data.items ?? []);
    const item = items.find((v: any) => v.id === conversation_id);
    if (!item || item.selected_repository !== REPOSITORY) throw new Error("Conversation not found in the allowed LifeSort repository.");
    return jsonText(item);
  });
  server.registerTool("openhands_get_events", { description: "Read recent execution events for a LifeSort OpenHands conversation.", inputSchema: { conversation_id: z.string().uuid(), limit: z.number().int().min(1).max(100).default(30) } }, async ({ conversation_id, limit }) => {
    const conv: any = await oh(env, `/app-conversations?ids=${encodeURIComponent(conversation_id)}`);
    const items = Array.isArray(conv) ? conv : (conv.items ?? []);
    if (!items.some((v: any) => v.id === conversation_id && v.selected_repository === REPOSITORY)) throw new Error("Conversation not found in the allowed LifeSort repository.");
    return jsonText(await oh(env, `/conversation/${encodeURIComponent(conversation_id)}/events/search?limit=${limit}`));
  });
  async function sandboxAction(conversation_id: string, action: "pause" | "resume") {
    const conv: any = await oh(env, `/app-conversations?ids=${encodeURIComponent(conversation_id)}`);
    const items = Array.isArray(conv) ? conv : (conv.items ?? []);
    const item = items.find((v: any) => v.id === conversation_id && v.selected_repository === REPOSITORY);
    if (!item) throw new Error("Conversation not found in the allowed LifeSort repository.");
    const sandboxId = item.sandbox_id ?? item.sandbox?.id;
    if (!sandboxId) throw new Error("No sandbox ID is available for this conversation.");
    return oh(env, `/sandboxes/${encodeURIComponent(sandboxId)}/${action}`, { method: "POST" });
  }
  server.registerTool("openhands_pause_conversation", { description: "Pause the sandbox for a LifeSort OpenHands conversation.", inputSchema: { conversation_id: z.string().uuid() } }, async ({ conversation_id }) => jsonText(await sandboxAction(conversation_id, "pause")));
  server.registerTool("openhands_resume_conversation", { description: "Resume the sandbox for a LifeSort OpenHands conversation.", inputSchema: { conversation_id: z.string().uuid() } }, async ({ conversation_id }) => jsonText(await sandboxAction(conversation_id, "resume")));
  return server;
}

const mcpHandler = (request: Request, env: Env, ctx: ExecutionContext) => createMcpHandler(() => createServer(env))(request, env, ctx);

export default new OAuthProvider<Env>({
  apiRoute: "/mcp",
  apiHandler: mcpHandler,
  defaultHandler: async (request, env) => authorizeHandler(request, env),
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",
  scopesSupported: ["openhands:control"],
  requiredScopes: ["openhands:control"],
  clientIdMetadataDocumentEnabled: true,
});
