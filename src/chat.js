// Route /api/chat : une question du visiteur -> réponse du modèle en streaming.
// L'identité du visiteur n'est jamais envoyée au modèle : seulement ses questions et l'historique.
import Anthropic from "@anthropic-ai/sdk";
import { json } from "./http.js";
import { currentSession } from "./session.js";
import { ipHash } from "./security.js";
import { buildSystemPrompt, callInvite, sessionEndMessage, getUiTexts, contactBlock, REDIRECT_PATTERNS } from "./content.js";
import { TOOLS, getOverlap, parseReport } from "./tools.js";
import { alertUnanswered, alertLimit } from "./slack.js";

const MAX_MESSAGE = 1000; // caractères par question
const MAX_HISTORY_CHARS = 30000; // plafond de longueur de la conversation renvoyée au modèle
const MAX_MODEL_CALLS = 6; // tours modèle <-> outils par question
const MAX_TOKENS = 1500; // longueur maximale d'une réponse du modèle
const CALL_TIMEOUT_MS = 60000; // un appel au modèle bloqué est interrompu au bout de 60 s

export async function chat(request, env, ctx) {
  const session = await currentSession(request, env);
  if (!session) return json({ error: "no_session" }, 401);

  const { success } = await env.CHAT_LIMITER.limit({ key: await ipHash(env, request) });
  if (!success) return json({ error: "rate_limited" }, 429);

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return json({ error: "invalid_field" }, 400);
  if (message.length > MAX_MESSAGE) return json({ error: "message_too_long" }, 400);
  const lang = body.lang === "en" ? "en" : "fr";

  // Compteur atomique : la mise à jour échoue si la limite est déjà atteinte.
  const max = Number(env.MAX_QUESTIONS) || 9;
  const now = new Date().toISOString();
  const updated = await env.DB.prepare(
    "UPDATE sessions SET questions_used = questions_used + 1, last_activity_at = ? WHERE id = ? AND questions_used < ? RETURNING questions_used"
  )
    .bind(now, session.id, max)
    .first();
  if (!updated) return json({ error: "limit_reached" }, 403);
  const questionNumber = updated.questions_used;

  const history = await loadHistory(env, session.id);
  const userRow = await env.DB.prepare(
    "INSERT INTO messages (session_id, created_at, role, question_number, content) VALUES (?, ?, 'user', ?, ?) RETURNING id"
  )
    .bind(session.id, now, questionNumber, message)
    .first();

  const { readable, writable } = new TransformStream();
  ctx.waitUntil(
    answer({ env, ctx, writer: writable.getWriter(), session, questionNumber, max, message, lang, history, userRowId: userRow.id, askedAt: now })
  );
  return new Response(readable, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}

// Historique de la session au format de l'API : paires question / réponse complètes,
// réponses du modèle seules (sans l'invitation ajoutée par le serveur), les plus anciennes retirées si trop long.
async function loadHistory(env, sessionId) {
  const { results } = await env.DB.prepare(
    "SELECT role, question_number, content, api_content FROM messages WHERE session_id = ? ORDER BY id"
  )
    .bind(sessionId)
    .all();
  const pairs = new Map();
  for (const row of results) {
    const pair = pairs.get(row.question_number) || {};
    if (row.role === "user") pair.user = row.content;
    else pair.assistant = row.api_content || row.content;
    pairs.set(row.question_number, pair);
  }
  const complete = [...pairs.values()].filter((p) => p.user && p.assistant);
  let size = complete.reduce((n, p) => n + p.user.length + p.assistant.length, 0);
  while (complete.length && size > MAX_HISTORY_CHARS) {
    const dropped = complete.shift();
    size -= dropped.user.length + dropped.assistant.length;
  }
  return complete.flatMap((p) => [
    { role: "user", content: p.user },
    { role: "assistant", content: p.assistant },
  ]);
}

async function answer({ env, ctx, writer, session, questionNumber, max, message, lang, history, userRowId, askedAt }) {
  const encoder = new TextEncoder();
  const send = (event) => writer.write(encoder.encode(JSON.stringify(event) + "\n"));
  let modelText = ""; // texte écrit par le modèle (renvoyé dans l'historique aux questions suivantes)
  let shown = ""; // texte affiché au visiteur (modèle + ajouts du serveur)
  let report = null;
  const sources = new Map();

  const emit = async (text, { fromModel = false } = {}) => {
    if (fromModel) modelText += text;
    shown += text;
    await send({ type: "text", text });
  };
  const markUnanswered = (reason, topic) =>
    env.DB.prepare("UPDATE messages SET unanswered = 1, reason = ?, topic = ? WHERE id = ?").bind(reason, topic, userRowId).run();

  try {
    if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY manquant (.dev.vars en local, wrangler secret put en production)");
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: CALL_TIMEOUT_MS });
    // Le nombre de questions n'est pas donné au modèle : le serveur gère compteur, invitation et fin de session.
    const system = buildSystemPrompt(env);
    const messages = [...history, { role: "user", content: message }];

    for (let call = 0; call < MAX_MODEL_CALLS; call++) {
      const params = {
        model: env.MODEL, max_tokens: MAX_TOKENS, system, tools: TOOLS, messages,
        ...(env.EFFORT ? { output_config: { effort: env.EFFORT } } : {}),
      };
      // Délai maximal par appel, streaming compris : sans lui, un flux bloqué laisserait le visiteur attendre indéfiniment.
      const options = { signal: AbortSignal.timeout(CALL_TIMEOUT_MS) };
      const stream = env.FALLBACKS
        ? client.beta.messages.stream({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: env.FALLBACKS }, options)
        : client.messages.stream(params, options);
      const pending = [];
      stream.on("text", (delta) => pending.push(emit(delta, { fromModel: true })));
      const result = await stream.finalMessage();
      await Promise.all(pending);
      logUsage(env, result);
      collectSources(result, sources);

      // Refus d'un filtre de sécurité que le secours n'a pas pu rattraper : renvoi vers Emeline plutôt qu'une réponse vide.
      if (result.stop_reason === "refusal") {
        report = { reason: "refused", topic: `Refus du modèle (${result.stop_details?.category || "sans catégorie"})` };
        await markUnanswered(report.reason, report.topic);
        const redirect = lang === "en"
          ? "I don't have access to that answer. I suggest contacting Emeline directly to discuss it:"
          : "Je n'ai pas accès à cette réponse. Je vous propose de contacter directement Emeline pour en discuter :";
        await emit(`${modelText ? "\n\n" : ""}${redirect}\n\n${contactBlock(env, lang)}`, { fromModel: true });
        break;
      }

      // Recherche web longue : l'API met le tour en pause, on le renvoie tel quel pour continuer.
      if (result.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: result.content });
        continue;
      }
      const toolUses = result.content.filter((b) => b.type === "tool_use");
      if (result.stop_reason !== "tool_use" || toolUses.length === 0) break;

      messages.push({ role: "assistant", content: result.content });
      const toolResults = [];
      for (const toolUse of toolUses) {
        const { content, isError, reported } = await runTool(toolUse, markUnanswered);
        if (reported) report = reported;
        toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content, ...(isError ? { is_error: true } : {}) });
      }
      messages.push({ role: "user", content: toolResults });
      if (modelText && !modelText.endsWith("\n\n")) await emit("\n\n", { fromModel: true });
    }

    if (!modelText.trim()) throw new Error("empty_answer");

    // Sources de la recherche web (obligatoire quand on affiche des résultats de recherche).
    if (sources.size) {
      const list = [...sources].map(([url, title]) => `- [${title.replace(/[[\]]/g, "")}](${url})`).join("\n");
      await emit(`\n\n${lang === "en" ? "Sources:" : "Sources :"}\n${list}`);
    }

    // Filet de sécurité : phrase de renvoi sans appel à report_unanswered.
    const normalized = modelText.replace(/[’‘]/g, "'");
    if (!report && REDIRECT_PATTERNS.some((pattern) => pattern.test(normalized))) {
      report = { reason: "detected_by_phrase", topic: null };
      await markUnanswered(report.reason, report.topic);
    }
    // Alertes Slack envoyées en parallèle, sans ralentir la réponse au visiteur.
    if (report) ctx.waitUntil(alertUnanswered(env, session, { question: message, ...report, questionNumber, max, at: askedAt }));

    // Ajouts du serveur : invitation après les questions de CALL_INVITE_AT, message de fin après la dernière.
    // Si l'agent a déjà donné le bloc contact, l'invitation n'est pas répétée mais compte comme envoyée.
    const inviteAt = String(env.CALL_INVITE_AT || "3,6").split(",").map(Number);
    const isLast = questionNumber >= max;
    const invite = !isLast && inviteAt.includes(questionNumber);
    const contactAlreadyGiven = modelText.includes(getUiTexts(env).contact.calendly);
    if (invite && !contactAlreadyGiven) await emit(`\n\n${callInvite(env, lang)}`);
    if (isLast) {
      await emit(`\n\n${sessionEndMessage(env, lang)}`);
      await env.DB.prepare("UPDATE sessions SET limit_notified = 1 WHERE id = ?").bind(session.id).run();
      ctx.waitUntil(alertLimit(env, session));
    }

    await env.DB.prepare(
      "INSERT INTO messages (session_id, created_at, role, question_number, content, api_content, invite_sent) VALUES (?, ?, 'assistant', ?, ?, ?, ?)"
    )
      .bind(session.id, new Date().toISOString(), questionNumber, shown.trim(), modelText.trim(), invite ? 1 : 0)
      .run();
    await send({ type: "done", questionsLeft: max - questionNumber });
  } catch (err) {
    console.error("chat_error", err?.status || "", err?.message || err);
    // La question n'a pas reçu de réponse : on la retire du journal et on rend la question au visiteur.
    await env.DB.batch([
      env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(userRowId),
      env.DB.prepare("UPDATE sessions SET questions_used = questions_used - 1 WHERE id = ? AND questions_used > 0").bind(session.id),
    ]).catch((e) => console.error("refund_error", e?.message));
    await send({ type: "error", code: errorCode(err) }).catch(() => {});
  } finally {
    await writer.close().catch(() => {});
  }
}

async function runTool(toolUse, markUnanswered) {
  if (toolUse.name === "get_overlap") {
    const result = getOverlap(toolUse.input);
    return { content: JSON.stringify(result), isError: Boolean(result.error) };
  }
  if (toolUse.name === "report_unanswered") {
    const parsed = parseReport(toolUse.input);
    if (!parsed) return { content: "Entrée invalide : reason doit être out_of_scope, undocumented, to_confirm ou refused, et topic un texte court.", isError: true };
    await markUnanswered(parsed.reason, parsed.topic);
    return { content: "Signalement enregistré.", isError: false, reported: parsed };
  }
  return { content: `Outil inconnu : ${toolUse.name}`, isError: true };
}

function collectSources(result, sources) {
  for (const block of result.content) {
    if (block.type !== "text" || !block.citations) continue;
    for (const c of block.citations) {
      if (c.type === "web_search_result_location" && c.url && !sources.has(c.url)) sources.set(c.url, c.title || c.url);
    }
  }
}

// Consommation de tokens dans les logs (sans aucun contenu), pour vérifier le cache et le coût.
function logUsage(env, result) {
  const u = result.usage || {};
  console.log(
    JSON.stringify({
      event: "usage",
      model: result.model || env.MODEL,
      stop: result.stop_reason,
      input: u.input_tokens,
      cache_read: u.cache_read_input_tokens,
      cache_write: u.cache_creation_input_tokens,
      output: u.output_tokens,
      web_search: u.server_tool_use?.web_search_requests || 0,
    })
  );
}

function errorCode(err) {
  if (err instanceof Anthropic.APIUserAbortError || err?.name === "TimeoutError" || err?.name === "AbortError") return "busy";
  if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.APIConnectionError) return "busy";
  if (err instanceof Anthropic.APIError && (err.status === 529 || err.status >= 500)) return "busy";
  return "server_error";
}
