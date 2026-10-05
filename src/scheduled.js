// Tâche planifiée (Cron Trigger) : suppression des données anciennes et rapport quotidien Slack.
import { postSlack, identity, emailLabel, esc, reasonLabel } from "./slack.js";

const SLACK_CHUNK = 3500; // Slack tronque les messages trop longs : on découpe.
const MANUAL_CRON = "* * * * *"; // déclenchement manuel en local : rapport envoyé quelle que soit l'heure

export async function scheduled(controller, env) {
  await purge(env, controller.scheduledTime);
  // Deux crons (4h et 5h UTC) couvrent l'heure d'été et d'hiver : on n'envoie qu'à REPORT_HOUR heure de Chypre.
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: env.REPORT_TZ || "Asia/Nicosia", hour: "numeric", hourCycle: "h23" }).format(
      new Date(controller.scheduledTime)
    )
  );
  if (controller.cron === MANUAL_CRON || hour === Number(env.REPORT_HOUR || 7)) {
    await dailyReport(env, controller.scheduledTime);
  }
}

// Supprime les sessions (et leurs messages) de plus de RETENTION_DAYS jours.
export async function purge(env, now) {
  const days = Number(env.RETENTION_DAYS) || 90;
  const cutoff = new Date(now - days * 86400000).toISOString();
  const [messages, sessions] = await env.DB.batch([
    env.DB.prepare("DELETE FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE created_at < ?) OR created_at < ?").bind(cutoff, cutoff),
    env.DB.prepare("DELETE FROM sessions WHERE created_at < ?").bind(cutoff),
  ]);
  console.log(JSON.stringify({ event: "purge", cutoff, messages: messages.meta.changes, sessions: sessions.meta.changes }));
}

// Rapport des dernières 24 h. Rien n'est envoyé s'il n'y a eu aucune activité.
export async function dailyReport(env, now) {
  const since = new Date(now - 86400000).toISOString();
  const { results: sessions } = await env.DB.prepare(
    `SELECT * FROM sessions s
     WHERE s.created_at >= ?1 OR EXISTS (SELECT 1 FROM messages m WHERE m.session_id = s.id AND m.created_at >= ?1)
     ORDER BY s.created_at`
  )
    .bind(since)
    .all();
  if (!sessions.length) {
    console.log(JSON.stringify({ event: "report", sessions: 0, sent: false }));
    return;
  }

  const { results: rows } = await env.DB.prepare(
    `SELECT u.session_id, u.question_number, u.content, u.unanswered, u.reason, u.topic, COALESCE(a.invite_sent, 0) AS invite_sent
     FROM messages u
     LEFT JOIN messages a ON a.session_id = u.session_id AND a.question_number = u.question_number AND a.role = 'assistant'
     WHERE u.role = 'user' AND u.created_at >= ?
     ORDER BY u.session_id, u.question_number`
  )
    .bind(since)
    .all();

  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: env.REPORT_TZ || "Asia/Nicosia", dateStyle: "long" }).format(new Date(now));
  const blocks = [`📋 *Rapport du ${date}* — ${sessions.length} session${sessions.length > 1 ? "s" : ""}, ${rows.length} question${rows.length > 1 ? "s" : ""} (dernières 24 h)`];
  const toPrepare = new Map(); // sujet -> questions sans réponse

  for (const session of sessions) {
    const questions = rows.filter((r) => r.session_id === session.id);
    const invited = questions.some((q) => q.invite_sent) || session.limit_notified;
    const lines = [
      `*${identity(session)}*`,
      `Email : ${emailLabel(session.email)}${session.phone ? ` · Tél : ${esc(session.phone)}` : ""}`,
      `Invitation à un appel envoyée : ${invited ? "oui" : "non"}${session.limit_notified ? " · 🔔 limite atteinte" : ""}`,
    ];
    if (!questions.length) lines.push("_Aucune question posée._");
    for (const q of questions) {
      lines.push(`${q.question_number}. ${esc(q.content).replace(/\n/g, " ")}${q.unanswered ? `  ‼️ _${reasonLabel(q.reason)}_` : ""}`);
      if (q.unanswered && q.reason !== "refused") {
        const topic = q.topic || "Sans sujet précisé";
        if (!toPrepare.has(topic)) toPrepare.set(topic, []);
        toPrepare.get(topic).push(q.content);
      }
    }
    blocks.push(lines.join("\n"));
  }

  if (toPrepare.size) {
    const lines = ["*À préparer pour l'entretien*"];
    for (const [topic, questions] of toPrepare) {
      lines.push(`• *${esc(topic)}* (${questions.length})`);
      for (const q of questions) lines.push(`    – ${esc(q).replace(/\n/g, " ")}`);
    }
    blocks.push(lines.join("\n"));
  }

  for (const chunk of chunks(blocks)) await postSlack(env, chunk);
  console.log(JSON.stringify({ event: "report", sessions: sessions.length, questions: rows.length, sent: true }));
}

// Regroupe les blocs en messages de moins de SLACK_CHUNK caractères.
function chunks(blocks) {
  const out = [];
  let current = "";
  for (const block of blocks) {
    const piece = block.length > SLACK_CHUNK ? block.slice(0, SLACK_CHUNK - 20) + "\n… (tronqué)" : block;
    if (current && current.length + piece.length + 2 > SLACK_CHUNK) {
      out.push(current);
      current = "";
    }
    current = current ? `${current}\n\n${piece}` : piece;
  }
  if (current) out.push(current);
  return out;
}
