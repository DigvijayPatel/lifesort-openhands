import {
  OAuthProvider,
  AuthorizationError,
  type AuthRequest,
} from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler, getMcpAuthContext } from "agents/mcp/server";
import { z } from "zod";
import { env as workerEnv } from "cloudflare:workers";

interface Env {
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: {
    parseAuthRequest(request: Request): Promise<AuthRequest>;
    describeConsent(request: AuthRequest): Promise<{ clientName?: string; redirectUriHostname?: string }>;
    beginConsent(request: AuthRequest): Promise<{ handle: string; headers: Headers }>;
    approveConsent(request: Request, handle: string, options?: { scope?: string[] }): Promise<{ request: AuthRequest; headers: Headers }>;
    denyConsent(request: Request, handle: string): Promise<{ headers: Headers }>;
    completeAuthorization(args: {
      request: AuthRequest;
      userId: string;
      metadata: Record<string, unknown>;
      scope: string[];
      props: { userId: string; repository: string };
    }): Promise<{ redirectTo: string }>;
  };
  OPENHANDS_CLOUD_API_KEY: string;
  BRIDGE_LOGIN_PASSWORD: string;
  SESSION_SIGNING_SECRET: string;
}

const REPOSITORY = "DigvijayPatel/LifeSort";
const OWNER_ID = "lifesort-owner";
const OPENHANDS_BASE = "https://app.all-hands.dev/api/v1";
const OPENHANDS_WEB_BASE = "https://app.all-hands.dev";
const SESSION_COOKIE = "__Host-LIFESORT_SESSION";
const CONTROL_SCOPE = "openhands:control";
const MAX_EVENTS = 100;

function page(body: string, status = 200, extraHeaders?: HeadersInit): Response {
  // Keep OAuth provider headers intact. In particular, beginConsent() returns a
  // browser-binding Set-Cookie header; cloning Headers can coalesce Set-Cookie
  // values on some runtimes and strip the consent cookie from the response.
  const headers = extraHeaders instanceof Headers ? extraHeaders : new Headers(extraHeaders);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  const document = "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>LifeSort OpenHands Control</title><style>body{font:16px system-ui;background:#101114;color:#f5f5f5;display:grid;place-items:center;min-height:90vh;margin:0}.card{width:min(480px,90vw);padding:28px;border:1px solid #333;border-radius:16px;background:#191a1f}input,button{box-sizing:border-box;width:100%;padding:12px;margin-top:12px;border-radius:8px}input{background:#101114;border:1px solid #444;color:white}button{background:#f97316;border:0;color:white;font-weight:600;cursor:pointer}.secondary{background:#333}.muted{color:#aaa;font-size:14px}a{color:#f97316}</style></head><body><main class=\"card\">" + body + "</main></body></html>";
  return new Response(document, { status, headers });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[ch]!);
}

function safeReturnTo(value: string): string {
  if (!value.startsWith("/authorize?") || value.startsWith("//") || value.includes("\\") || value.includes("\r") || value.includes("\n")) {
    return "/authorize";
  }
  return value;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return b64url(new Uint8Array(signature));
}

async function validSession(request: Request, env: Env): Promise<boolean> {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.split(";").map((value) => value.trim()).find((value) => value.startsWith(SESSION_COOKIE + "="));
  if (!match) return false;
  const token = match.slice(SESSION_COOKIE.length + 1);
  const parts = token.split(".");
  const expiry = parts[0];
  const signature = parts[1];
  if (!expiry || !signature || !/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;
  const expected = await sign(expiry, env.SESSION_SIGNING_SECRET);
  const a = new TextEncoder().encode(signature);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

interface ConsentCookieBinding {
  name: string;
  value: string;
}

interface CsrfValidation {
  valid: boolean;
  binding?: ConsentCookieBinding;
}

async function createCsrfToken(
  env: Env,
  purpose: "login" | "authorize",
  binding?: ConsentCookieBinding
): Promise<string> {
  const expiry = String(Date.now() + 15 * 60 * 1000);
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const encodedBinding = binding
    ? b64url(new TextEncoder().encode(binding.name + "=" + binding.value))
    : "-";
  const payload = purpose + "." + expiry + "." + nonce + "." + encodedBinding;
  return expiry + "." + nonce + "." + encodedBinding + "." + await sign(payload, env.SESSION_SIGNING_SECRET);
}

async function validCsrfToken(
  token: string,
  purpose: "login" | "authorize",
  env: Env
): Promise<CsrfValidation> {
  const parts = token.split(".");
  const expiry = parts[0];
  const nonce = parts[1];
  const encodedBinding = parts[2];
  const signature = parts[3];
  if (!expiry || !nonce || !encodedBinding || !signature || !/^\\d+$/.test(expiry)) {
    return { valid: false };
  }
  const expiresAt = Number(expiry);
  if (expiresAt < Date.now() || expiresAt > Date.now() + 16 * 60 * 1000) {
    return { valid: false };
  }
  const payload = purpose + "." + expiry + "." + nonce + "." + encodedBinding;
  const expected = await sign(payload, env.SESSION_SIGNING_SECRET);
  const a = new TextEncoder().encode(signature);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return { valid: false };
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  if (difference !== 0) return { valid: false };

  if (encodedBinding === "-") return { valid: true };
  try {
    const normalized = encodedBinding.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = new TextDecoder().decode(Uint8Array.from(
      atob(normalized + "=".repeat((4 - normalized.length % 4) % 4)),
      (char) => char.charCodeAt(0),
    ));
    const separator = decoded.indexOf("=");
    if (separator <= 0) return { valid: false };
    const name = decoded.slice(0, separator);
    const value = decoded.slice(separator + 1);
    if (!/^__Host-[A-Za-z0-9_-]+$/.test(name) || !/^[a-f0-9]{64}$/.test(value)) {
      return { valid: false };
    }
    return { valid: true, binding: { name, value } };
  } catch {
    return { valid: false };
  }
}

function withConsentCookie(request: Request, binding: ConsentCookieBinding): Request {
  const headers = new Headers(request.headers);
  const current = headers.get("cookie") ?? "";
  const existingNames = current.split(";").map((part) => {
    const separator = part.indexOf("=");
    return (separator < 0 ? part : part.slice(0, separator)).trim();
  });
  if (!existingNames.includes(binding.name)) {
    headers.set("cookie", current ? current + "; " + binding.name + "=" + binding.value : binding.name + "=" + binding.value);
  }
  return new Request(request.url, { method: request.method, headers });
}

async function createSession(env: Env): Promise<string> {
  const expiry = String(Date.now() + 8 * 60 * 60 * 1000);
  return expiry + "." + await sign(expiry, env.SESSION_SIGNING_SECRET);
}

async function loginPage(returnTo: string, env: Env, status = 200): Promise<Response> {
  const csrfToken = await createCsrfToken(env, "login");
  const body = "<h2>LifeSort OpenHands Control</h2><p class=\"muted\">Sign in to authorize ChatGPT to access your OpenHands account for <strong>" + REPOSITORY + "</strong>.</p><form method=\"post\" action=\"/login\"><input type=\"hidden\" name=\"_csrf\" value=\"" + escapeHtml(csrfToken) + "\"><input type=\"hidden\" name=\"return_to\" value=\"" + escapeHtml(returnTo) + "\"><label for=\"password\">Bridge password</label><input id=\"password\" name=\"password\" type=\"password\" required autocomplete=\"current-password\"><button type=\"submit\">Continue</button></form>";
  return page(body, status);
}

function oauthErrorResponse(error: AuthorizationError): Response {
  if (!error.redirectUri) {
    return page("<h2>Authorization request rejected</h2><p class=\"muted\">" + escapeHtml(error.description) + "</p>", 400);
  }
  const redirect = new URL(error.redirectUri);
  redirect.searchParams.set("error", error.code);
  redirect.searchParams.set("error_description", error.description);
  if (error.state) redirect.searchParams.set("state", error.state);
  if (error.issuer) redirect.searchParams.set("iss", error.issuer);
  return Response.redirect(redirect.toString(), 302);
}

async function authorizeHandler(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/healthz" && request.method === "GET") {
    return Response.json({
      ok: true,
      service: "lifesort-openhands-control",
      mcp_endpoint: "/mcp",
      oauth: "enabled",
      repository: REPOSITORY,
    });
  }

  if (url.pathname === "/login" && request.method === "POST") {
    const form = await request.formData();
    const csrf = await validCsrfToken(String(form.get("_csrf") ?? ""), "login", env);
    if (!csrf.valid) {
      return page("<h2>Login form expired</h2><p class=\"muted\">Refresh the authorization page and try again.</p>", 403);
    }
    const password = String(form.get("password") ?? "");
    const returnTo = safeReturnTo(String(form.get("return_to") ?? "/authorize"));
    const supplied = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password)));
    const expected = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.BRIDGE_LOGIN_PASSWORD)));
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= supplied[i] ^ expected[i];
    if (difference !== 0) {
      return page("<h2>Sign-in failed</h2><p class=\"muted\">The password was not accepted.</p><a href=\"/authorize\">Try again</a>", 401);
    }
    return new Response(null, {
      status: 303,
      headers: {
        location: returnTo,
        "set-cookie": SESSION_COOKIE + "=" + await createSession(env) + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800",
        "cache-control": "no-store",
      },
    });
  }

  if (url.pathname !== "/authorize") return new Response("Not found", { status: 404 });
  const provider = env.OAUTH_PROVIDER;

  if (request.method === "GET") {
    let oauthRequest: AuthRequest;
    try {
      // Parse only the initial browser redirect, which contains the OAuth query.
      oauthRequest = await provider.parseAuthRequest(request);
    } catch (error) {
      if (error instanceof AuthorizationError) return oauthErrorResponse(error);
      throw error;
    }

    if (!(await validSession(request, env))) return loginPage(safeReturnTo(url.pathname + url.search), env);

    // Resolve client metadata before creating the one-time consent transaction.
    const details = await provider.describeConsent(oauthRequest);
    const consent = await provider.beginConsent(oauthRequest);
    const setCookie = consent.headers.get("set-cookie") ?? "";
    const cookiePair = setCookie.split(";", 1)[0];
    const cookieSeparator = cookiePair.indexOf("=");
    if (cookieSeparator <= 0) throw new Error("OAuth provider did not create a consent binding cookie.");
    const binding = {
      name: cookiePair.slice(0, cookieSeparator).trim(),
      value: cookiePair.slice(cookieSeparator + 1).trim(),
    };
    const csrfToken = await createCsrfToken(env, "authorize", binding);
    const requestedScopes = oauthRequest.scope.filter((scope) => scope === CONTROL_SCOPE || scope === "offline_access");
    const scopeText = requestedScopes.length ? requestedScopes.map(escapeHtml).join(", ") : CONTROL_SCOPE;
    const body = "<h2>Authorize ChatGPT?</h2><p class=\"muted\">Client: " + escapeHtml(details.clientName ?? "MCP client") + "</p><p class=\"muted\">Redirect destination: " + escapeHtml(details.redirectUriHostname ?? "verified client") + "</p><p>This grants access to OpenHands Cloud for <strong>" + REPOSITORY + "</strong>. ChatGPT can list and inspect conversations, start LifeSort tasks, send follow-up instructions, and pause or resume their sandboxes.</p><p class=\"muted\">Permission requested: " + scopeText + "</p><form method=\"post\" action=\"/authorize\"><input type=\"hidden\" name=\"_csrf\" value=\"" + escapeHtml(csrfToken) + "\"><input type=\"hidden\" name=\"handle\" value=\"" + escapeHtml(consent.handle) + "\">" + requestedScopes.map((scope) => "<input type=\"hidden\" name=\"scope\" value=\"" + escapeHtml(scope) + "\">").join("") + "<button name=\"decision\" value=\"approve\" type=\"submit\">Approve access</button><button class=\"secondary\" name=\"decision\" value=\"deny\" type=\"submit\">Deny</button></form><p class=\"muted\">You can revoke this connection from ChatGPT's connected-app settings.</p>";
    return page(body, 200, consent.headers);
  }

  if (request.method === "POST") {
    if (!(await validSession(request, env))) {
      return page("<h2>Session expired</h2><p class=\"muted\">Restart the connection from ChatGPT to begin a fresh authorization request.</p>", 401);
    }

    const form = await request.formData();
    const csrf = await validCsrfToken(String(form.get("_csrf") ?? ""), "authorize", env);
    if (!csrf.valid || !csrf.binding) {
      return page("<h2>Authorization form expired</h2><p class=\"muted\">Restart the connection from ChatGPT.</p>", 403);
    }
    const providerRequest = withConsentCookie(request, csrf.binding);
    const handle = String(form.get("handle") ?? "");
    if (!handle) return page("<h2>Authorization expired</h2><p class=\"muted\">Restart the connection from ChatGPT.</p>", 400);

    if (String(form.get("decision") ?? "") !== "approve") {
      try {
        const denied = await provider.denyConsent(providerRequest, handle);
        return new Response(null, { status: 302, headers: denied.headers });
      } catch (error) {
        if (error instanceof AuthorizationError) return oauthErrorResponse(error);
        throw error;
      }
    }

    try {
      // The single-use handle retrieves the validated OAuth request from KV.
      // Do not re-parse the POST URL: it intentionally has no OAuth query string.
      const approved = await provider.approveConsent(providerRequest, handle, {
        scope: form.getAll("scope").map(String),
      });
      const details = await provider.describeConsent(approved.request);
      const completed = await provider.completeAuthorization({
        request: approved.request,
        userId: OWNER_ID,
        metadata: { clientName: details.clientName ?? "MCP client" },
        scope: approved.request.scope.filter((scope) => scope === CONTROL_SCOPE || scope === "offline_access"),
        props: { userId: OWNER_ID, repository: REPOSITORY },
      });
      const headers = new Headers(approved.headers);
      headers.set("location", completed.redirectTo);
      headers.set("cache-control", "no-store");
      return new Response(null, { status: 302, headers });
    } catch (error) {
      if (error instanceof AuthorizationError) return oauthErrorResponse(error);
      throw error;
    }
  }

  return new Response("Method not allowed", { status: 405, headers: { allow: "GET, POST" } });
}

async function oh(env: Env, path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(OPENHANDS_BASE + path, {
    ...init,
    headers: {
      authorization: "Bearer " + env.OPENHANDS_CLOUD_API_KEY,
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error("OpenHands API " + response.status + ": " + responseText.slice(0, 1000));
  if (!responseText) return { ok: true };
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    throw new Error("OpenHands API returned a non-JSON response.");
  }
}

function jsonText(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function assertOwner(): void {
  const auth = getMcpAuthContext() as { props?: { userId?: string; repository?: string } } | undefined;
  if (auth?.props?.userId !== OWNER_ID || auth?.props?.repository !== REPOSITORY) {
    throw new Error("This OpenHands bridge is not authorized for this user.");
  }
}

function arrayFromResponse(data: unknown, label: string): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: any[] }).items;
  }
  throw new Error("Unexpected OpenHands " + label + " response shape.");
}

function isLifeSortConversation(item: any): boolean {
  return typeof item?.selected_repository === "string" &&
    item.selected_repository.trim().toLowerCase() === REPOSITORY.toLowerCase();
}

async function getLifeSortConversation(env: Env, conversationId: string): Promise<any> {
  const data = await oh(env, "/app-conversations?ids=" + encodeURIComponent(conversationId));
  const items = arrayFromResponse(data, "conversation lookup");
  const item = items.find((value: any) => value?.id === conversationId && isLifeSortConversation(value));
  if (!item) throw new Error("Conversation not found in the allowed LifeSort repository.");
  return item;
}

function conversationSummary(item: any) {
  const id = String(item.id);
  return {
    id,
    title: item.title ?? "Untitled conversation",
    sandbox_status: item.sandbox_status ?? null,
    execution_status: item.execution_status ?? null,
    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? item.last_updated_at ?? null,
    conversation_url: item.conversation_ui_url ??
      (OPENHANDS_WEB_BASE + "/canvas/conversations/" + encodeURIComponent(id)),
  };
}

function createServer() {
  const env = workerEnv as unknown as Env;
  const server = new McpServer({ name: "LifeSort OpenHands Control", version: "0.2.0" });

  server.registerTool("openhands_account", {
    scopeChallenge: ({ authInfo }) =>
      authInfo?.scopes.includes(CONTROL_SCOPE)
        ? undefined
        : { scopes: [CONTROL_SCOPE], errorDescription: "Connect your OpenHands account to use this tool." },
    description: "Verify the configured OpenHands Cloud API key and show the authenticated account profile. Read-only.",
    inputSchema: {},
  }, async () => {
    assertOwner();
    const data = await oh(env, "/users/me") as any;
    const user = data?.user ?? data;
    return jsonText({
      authenticated: true,
      id: user?.id ?? null,
      name: user?.name ?? user?.username ?? null,
      email: user?.email ?? null,
    });
  });

  server.registerTool("openhands_list_conversations", {
    scopeChallenge: ({ authInfo }) =>
      authInfo?.scopes.includes(CONTROL_SCOPE)
        ? undefined
        : { scopes: [CONTROL_SCOPE], errorDescription: "Connect your OpenHands account to use this tool." },
    description: "List recent OpenHands Cloud conversations for DigvijayPatel/LifeSort only. Read-only.",
    inputSchema: { limit: z.number().int().min(1).max(50).default(10) },
  }, async ({ limit }) => {
    assertOwner();
    const data = await oh(env, "/app-conversations/search?limit=" + limit);
    const items = arrayFromResponse(data, "conversation search");
    const conversations = items.filter(isLifeSortConversation).map(conversationSummary);
    return jsonText({
      repository: REPOSITORY,
      count: conversations.length,
      conversations,
      next_page_id: data && typeof data === "object"
        ? (data as { next_page_id?: string | null }).next_page_id ?? null
        : null,
    });
  });

  server.registerTool("openhands_start_lifesort_task", {
    scopeChallenge: ({ authInfo }) =>
      authInfo?.scopes.includes(CONTROL_SCOPE)
        ? undefined
        : { scopes: [CONTROL_SCOPE], errorDescription: "Connect your OpenHands account to use this tool." },
    description: "Start a new OpenHands Cloud task in DigvijayPatel/LifeSort. This creates a sandbox and consumes OpenHands resources. Use only when explicitly asked to start work.",
    inputSchema: {
      task: z.string().min(10).max(12000),
      branch: z.string().max(120).optional(),
      title: z.string().max(120).optional(),
    },
  }, async ({ task, branch, title }) => {
    assertOwner();
    const body: Record<string, unknown> = {
      selected_repository: REPOSITORY,
      initial_message: {
        role: "user",
        content: [{ type: "text", text: task }],
        run: true,
      },
    };
    if (branch) body.selected_branch = branch;
    if (title) body.title = title;
    return jsonText(await oh(env, "/app-conversations", {
      method: "POST",
      body: JSON.stringify(body),
    }));
  });

  server.registerTool("openhands_get_start_task", {
    scopeChallenge: ({ authInfo }) =>
      authInfo?.scopes.includes(CONTROL_SCOPE)
        ? undefined
        : { scopes: [CONTROL_SCOPE], errorDescription: "Connect your OpenHands account to use this tool." },
    description: "Check the asynchronous startup state for an OpenHands task returned by openhands_start_lifesort_task.",
    inputSchema: { start_task_id: z.string().uuid() },
  }, async ({ start_task_id }) => {
    assertOwner();
    const data = await oh(env, "/app-conversations/start-tasks?ids=" + encodeURIComponent(start_task_id));
    return jsonText(arrayFromResponse(data, "start-task lookup"));
  });

  server.registerTool("openhands_get_conversation", {
    scopeChallenge: ({ authInfo }) =>
      authInfo?.scopes.includes(CONTROL_SCOPE)
        ? undefined
        : { scopes: [CONTROL_SCOPE], errorDescription: "Connect your OpenHands account to use this tool." },
    description: "Fetch status and metadata for one conversation, restricted to DigvijayPatel/LifeSort. Read-only.",
    inputSchema: { conversation_id: z.string().uuid() },
  }, async ({ conversation_id }) => {
    assertOwner();
    const item = await getLifeSortConversation(env, conversation_id);
    return jsonText(conversationSummary(item));
  });

  server.registerTool("openhands_send_message", {
    scopeChallenge: ({ authInfo }) =>
      authInfo?.scopes.includes(CONTROL_SCOPE)
        ? undefined
        : { scopes: [CONTROL_SCOPE], errorDescription: "Connect your OpenHands account to use this tool." },
    description: "Send a follow-up instruction to an existing LifeSort OpenHands conversation. The sandbox must be running.",
    inputSchema: {
      conversation_id: z.string().uuid(),
      message: z.string().min(1).max(12000),
    },
  }, async ({ conversation_id, message }) => {
    assertOwner();
    await getLifeSortConversation(env, conversation_id);
    return jsonText(await oh(env, "/app-conversations/" + encodeURIComponent(conversation_id) + "/send-message", {
      method: "POST",
      body: JSON.stringify({
        role: "user",
        content: [{ type: "text", text: message }],
        run: true,
      }),
    }));
  });

  server.registerTool("openhands_get_events", {
    scopeChallenge: ({ authInfo }) =>
      authInfo?.scopes.includes(CONTROL_SCOPE)
        ? undefined
        : { scopes: [CONTROL_SCOPE], errorDescription: "Connect your OpenHands account to use this tool." },
    description: "Read recent execution events for a LifeSort OpenHands conversation. Read-only.",
    inputSchema: {
      conversation_id: z.string().uuid(),
      limit: z.number().int().min(1).max(MAX_EVENTS).default(30),
    },
  }, async ({ conversation_id, limit }) => {
    assertOwner();
    await getLifeSortConversation(env, conversation_id);
    const data = await oh(env, "/conversation/" + encodeURIComponent(conversation_id) + "/events/search?limit=" + limit);
    return jsonText(data);
  });

  async function sandboxAction(conversationId: string, action: "pause" | "resume") {
    const item = await getLifeSortConversation(env, conversationId);
    const sandboxId = item.sandbox_id ?? item.sandbox?.id;
    if (typeof sandboxId !== "string" || !sandboxId) throw new Error("No sandbox ID is available for this conversation.");
    return oh(env, "/sandboxes/" + encodeURIComponent(sandboxId) + "/" + action, { method: "POST" });
  }

  server.registerTool("openhands_pause_conversation", {
    scopeChallenge: ({ authInfo }) =>
      authInfo?.scopes.includes(CONTROL_SCOPE)
        ? undefined
        : { scopes: [CONTROL_SCOPE], errorDescription: "Connect your OpenHands account to use this tool." },
    description: "Pause the sandbox for a LifeSort OpenHands conversation. This changes execution state.",
    inputSchema: { conversation_id: z.string().uuid() },
  }, async ({ conversation_id }) => {
    assertOwner();
    return jsonText(await sandboxAction(conversation_id, "pause"));
  });

  server.registerTool("openhands_resume_conversation", {
    scopeChallenge: ({ authInfo }) =>
      authInfo?.scopes.includes(CONTROL_SCOPE)
        ? undefined
        : { scopes: [CONTROL_SCOPE], errorDescription: "Connect your OpenHands account to use this tool." },
    description: "Resume the sandbox for a LifeSort OpenHands conversation. This changes execution state.",
    inputSchema: { conversation_id: z.string().uuid() },
  }, async ({ conversation_id }) => {
    assertOwner();
    return jsonText(await sandboxAction(conversation_id, "resume"));
  });

  // Emit OpenAI's per-tool OAuth metadata at the MCP wire boundary.
  // The installed MCP SDK exposes scopeChallenge but not securitySchemes in
  // registerTool's config type, so add the OpenAI extension to tools/list here.
  const protocolWithMiddleware = server.server as unknown as {
    use(
      method: string,
      middleware: (
        request: unknown,
        context: unknown,
        next: (request: unknown, context: unknown) => Promise<unknown>,
      ) => unknown,
    ): unknown;
  };
  protocolWithMiddleware.use("tools/list", async (request, context, next) => {
    const result = await next(request, context);
    const listing = result as { tools?: Array<Record<string, unknown>> };
    if (!Array.isArray(listing?.tools)) return result;
    return {
      ...listing,
      tools: listing.tools.map((tool) => ({
        ...tool,
        securitySchemes: [{ type: "oauth2", scopes: [CONTROL_SCOPE] }],
      })),
    };
  });

  return server;
}

const mcpHandler = createMcpHandler(createServer);

const apiHandler = {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return mcpHandler(request, env, ctx);
  },
};

export default new OAuthProvider<Env>({
  apiRoute: "/mcp",
  apiHandler,
  defaultHandler: {
    async fetch(request: Request, env: Env): Promise<Response> {
      return authorizeHandler(request, env);
    },
  },
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",
  scopesSupported: [CONTROL_SCOPE, "offline_access"],
  clientIdMetadataDocumentEnabled: true,
  resourceMetadata: { resource: "https://lifesort-openhands.digvijay-j-patel.workers.dev/mcp" },
});
