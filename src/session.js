// Routes /api/session (création, lecture) et /api/delete, avec stockage dans D1.
import { json, readCookie } from "./http.js";
import { signSessionId, verifySessionCookie, ipHash, verifyTurnstile } from "./security.js";
import { alertNewSession } from "./slack.js";

const COOKIE = "sid";

const FIELDS = {
  firstName: { max: 80, required: true },
  lastName: { max: 80, required: true },
  company: { max: 120, required: true },
  role: { max: 120, required: true },
  email: { max: 254, required: true },
  phone: { max: 30, required: false },
};
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
const PHONE_RE = /^[0-9+().\s-]{6,30}$/;

function sessionCookie(request, value, maxAge) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const age = maxAge === undefined ? "" : `; Max-Age=${maxAge}`;
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax${secure}${age}`;
}

// Nettoie et vérifie le formulaire. Renvoie les valeurs, ou null si un champ est invalide.
function validate(body) {
  const values = {};
  for (const [name, rule] of Object.entries(FIELDS)) {
    const value = typeof body[name] === "string" ? body[name].replace(/\s+/g, " ").trim() : "";
    if (rule.required && !value) return null;
    if (value.length > rule.max || /[<>]/.test(value)) return null; // pas de HTML
    values[name] = value || null;
  }
  if (!EMAIL_RE.test(values.email)) return null;
  if (values.phone && !PHONE_RE.test(values.phone)) return null;
  if (body.consent !== true) return null;
  values.lang = body.lang === "en" ? "en" : "fr";
  return values;
}

// Session courante à partir du cookie signé, ou null.
export async function currentSession(request, env) {
  const sessionId = await verifySessionCookie(env, readCookie(request, COOKIE));
  if (!sessionId) return null;
  return env.DB.prepare("SELECT * FROM sessions WHERE id = ?").bind(sessionId).first();
}

export function questionsLeft(session, env) {
  return Math.max(0, (Number(env.MAX_QUESTIONS) || 9) - session.questions_used);
}

export async function getSession(request, env) {
  const session = await currentSession(request, env);
  if (!session) return json({ active: false });
  const { results } = await env.DB.prepare(
    "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id"
  )
    .bind(session.id)
    .all();
  return json({ active: true, questionsLeft: questionsLeft(session, env), messages: results });
}

export async function createSession(request, env, ctx) {
  const hash = await ipHash(env, request);
  const { success } = await env.SESSION_LIMITER.limit({ key: hash });
  if (!success) return json({ error: "rate_limited" }, 429);

  const body = await request.json().catch(() => ({}));
  const values = validate(body);
  if (!values) return json({ error: "invalid_field" }, 400);
  if (!(await verifyTurnstile(env, body.turnstileToken, request))) return json({ error: "turnstile_failed" }, 403);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO sessions (id, created_at, last_activity_at, first_name, last_name, company, role, email, phone, lang, consent_at, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, now, now, values.firstName, values.lastName, values.company, values.role, values.email, values.phone, values.lang, now, hash)
    .run();

  ctx.waitUntil(
    alertNewSession(env, {
      first_name: values.firstName, last_name: values.lastName, company: values.company,
      role: values.role, email: values.email, phone: values.phone,
    })
  );

  return json({ ok: true, questionsLeft: Number(env.MAX_QUESTIONS) || 9 }, 200, {
    "set-cookie": sessionCookie(request, await signSessionId(env, id)),
  });
}

// « Supprimer mes données » : efface immédiatement la session et ses messages.
export async function deleteSession(request, env) {
  const sessionId = await verifySessionCookie(env, readCookie(request, COOKIE));
  if (sessionId) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM messages WHERE session_id = ?").bind(sessionId),
      env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId),
    ]);
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(request, "", 0) });
}
