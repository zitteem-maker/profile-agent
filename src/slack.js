// Alertes Slack via le webhook entrant (secret SLACK_WEBHOOK_URL).
// SLACK_DRY_RUN = "true" : les messages sont affichés dans les logs au lieu d'être envoyés.

const PERSONAL_DOMAINS = [
  /^gmail\.com$/, /^googlemail\.com$/, /^outlook\./, /^hotmail\./, /^live\./, /^msn\.com$/, /^yahoo\./, /^ymail\.com$/,
  /^icloud\.com$/, /^me\.com$/, /^mac\.com$/, /^aol\.com$/, /^proton\.me$/, /^protonmail\./, /^pm\.me$/, /^gmx\./,
  /^orange\.fr$/, /^wanadoo\.fr$/, /^free\.fr$/, /^sfr\.fr$/, /^laposte\.net$/, /^bbox\.fr$/, /^neuf\.fr$/, /^yandex\./, /^mail\.ru$/,
];

// Texte venant du visiteur ou du modèle : Slack interprète &, < et > (liens, mentions).
export const esc = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function identity(session) {
  return `${esc(session.first_name)} ${esc(session.last_name)} (${esc(session.company)}, ${esc(session.role)})`;
}

export function emailLabel(email) {
  const domain = String(email).split("@")[1]?.toLowerCase() || "";
  const personal = PERSONAL_DOMAINS.some((re) => re.test(domain));
  return `${esc(email)} (${personal ? "email personnel" : `domaine : ${esc(domain)}`})`;
}

export function contactLine(session) {
  return `*Contact :* ${emailLabel(session.email)}${session.phone ? ` · ${esc(session.phone)}` : ""}`;
}

export function cyprusTime(iso, env) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: env.REPORT_TZ || "Asia/Nicosia", dateStyle: "short", timeStyle: "short",
  }).format(new Date(iso));
}

export async function postSlack(env, text) {
  if (env.SLACK_DRY_RUN === "true" || !env.SLACK_WEBHOOK_URL) {
    console.log(`[SLACK_DRY_RUN]\n${text}`);
    return;
  }
  try {
    const res = await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) console.error("slack_error", res.status, await res.text());
  } catch (err) {
    console.error("slack_error", err?.message || err);
  }
}

const REASON_LABELS = {
  out_of_scope: "hors périmètre",
  undocumented: "non documenté",
  to_confirm: "point à confirmer",
  refused: "demande refusée",
  detected_by_phrase: "détecté par la phrase de renvoi",
};
export const reasonLabel = (reason) => REASON_LABELS[reason] || reason || "";

// ‼️ question sans réponse (avec mention) ; 🚫 pour une demande refusée (sans mention).
export function alertUnanswered(env, session, { question, reason, topic, questionNumber, max, at }) {
  const refused = reason === "refused";
  const mention = !refused && env.SLACK_USER_ID ? ` <@${env.SLACK_USER_ID}>` : "";
  const title = refused ? "🚫 Demande refusée" : "‼️ Question sans réponse";
  return postSlack(
    env,
    [
      `${title} — ${identity(session)}${mention}`,
      `> ${esc(question).replace(/\n/g, "\n> ")}`,
      `*Raison :* ${reasonLabel(reason)}${topic ? ` · *Sujet :* ${esc(topic)}` : ""}`,
      `*Heure (Chypre) :* ${cyprusTime(at, env)} · *Question* ${questionNumber}/${max}`,
      contactLine(session),
    ].join("\n")
  );
}

export function alertLimit(env, session) {
  return postSlack(env, [`🔔 Limite atteinte — ${identity(session)}`, "Toutes les questions de la session ont été utilisées : contact chaud.", contactLine(session)].join("\n"));
}

export function alertNewSession(env, session) {
  if (env.NOTIFY_NEW_SESSION !== "true") return Promise.resolve();
  return postSlack(env, [`👋 Nouvelle session — ${identity(session)}`, contactLine(session)].join("\n"));
}
