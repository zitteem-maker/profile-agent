// Signature du cookie, empreinte de l'IP, vérification Turnstile, contrôle d'origine.

const encoder = new TextEncoder();
const keyCache = new Map();

async function hmacKey(secret) {
  if (!secret) throw new Error("COOKIE_SECRET manquant (.dev.vars en local, wrangler secret put en production)");
  if (!keyCache.has(secret)) {
    keyCache.set(
      secret,
      crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])
    );
  }
  return keyCache.get(secret);
}

const toBase64Url = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function fromBase64Url(text) {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function sign(secret, value) {
  return toBase64Url(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(value)));
}

// Cookie = "<id de session>.<signature>" : impossible à fabriquer sans COOKIE_SECRET.
export async function signSessionId(env, sessionId) {
  return `${sessionId}.${await sign(env.COOKIE_SECRET, `sid:${sessionId}`)}`;
}

export async function verifySessionCookie(env, cookieValue) {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return null;
  const sessionId = cookieValue.slice(0, dot);
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(env.COOKIE_SECRET),
      fromBase64Url(cookieValue.slice(dot + 1)),
      encoder.encode(`sid:${sessionId}`)
    );
    return ok ? sessionId : null;
  } catch {
    return null;
  }
}

// Empreinte non réversible de l'IP (HMAC) : sert à la limite de débit, l'IP n'est jamais stockée.
export async function ipHash(env, request) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  return sign(env.COOKIE_SECRET, `ip:${ip}`);
}

export async function verifyTurnstile(env, token, request) {
  if (!token || token.length > 2048) return false;
  if (!env.TURNSTILE_SECRET_KEY) throw new Error("TURNSTILE_SECRET_KEY manquant");
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!res.ok) return false;
  const data = await res.json();
  return data.success === true;
}

// Refuse les requêtes POST venues d'un autre site (protection CSRF en plus de SameSite=Lax).
export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // certains navigateurs ne l'envoient pas sur une même origine
  return origin === new URL(request.url).origin;
}
