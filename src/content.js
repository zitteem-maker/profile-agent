// Lecture des fichiers de content/ (importés comme texte, jamais modifiés par le code).
import systemPromptMd from "../content/system-prompt.md";
import profileMd from "../content/profile.md";
import faqMd from "../content/faq.md";
import privacyMd from "../content/politique-confidentialite.md";

// Libellés courts des boutons de thèmes, par numéro de section de faq.md
// (liste FR de la section « Éléments d'interface » de system-prompt.md).
const THEME_LABELS = {
  1: { fr: "Disponibilité", en: "Availability" },
  2: { fr: "Statut et rémunération", en: "Status and pay" },
  3: { fr: "Parcours", en: "Background" },
  4: { fr: "IA et construction", en: "AI and building" },
  5: { fr: "Support et CS", en: "Support and CS" },
  6: { fr: "Ops et outils", en: "Ops and tools" },
  7: { fr: "Management", en: "Management" },
  8: { fr: "Facturation", en: "Billing" },
  9: { fr: "Offres spécifiques", en: "Specific roles" },
  10: { fr: "Motivation", en: "Motivation" },
  11: { fr: "Vérifier les faits", en: "Fact check" },
};

function withRetention(text, env) {
  return text.replaceAll("{{RETENTION_DAYS}}", String(env.RETENTION_DAYS || "90"));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// « Ignorez… » / « donnez… »  ->  Ignorez… / donnez…   ;   Pourquoi « X » ?  ->  Pourquoi "X" ?
function cleanQuestion(raw) {
  let text = raw.replace(/\s+/g, " ").trim().replace(/\s*»\s*\/\s*«\s*/g, " / ");
  if (text.startsWith("«") && text.endsWith("»")) text = text.slice(1, -1).trim();
  return text.replace(/«\s*/g, '"').replace(/\s*»/g, '"');
}

// Thèmes et questions de faq.md : sections « ## N. Titre », questions « **…** ✅ / ❓ ».
export function getFaq() {
  const sections = [];
  let current = null;
  for (const line of faqMd.split("\n")) {
    const heading = line.match(/^##\s+(\d+)\.\s+(.+?)\s*$/);
    if (heading) {
      const id = Number(heading[1]);
      current = {
        id,
        label: THEME_LABELS[id] || { fr: heading[2], en: heading[2] },
        questions: [],
      };
      sections.push(current);
      continue;
    }
    const question = line.match(/^\*\*(.+?)\*\*\s*(✅|❓)/);
    if (question && current) current.questions.push(cleanQuestion(question[1]));
  }
  return { sections };
}

// Textes d'interface et bloc contact, tirés de system-prompt.md.
export function getUiTexts(env) {
  const grab = (label) => {
    const re = new RegExp(`^- \\*\\*${escapeRegExp(label)}\\*\\* : « ([\\s\\S]+?) »\\s*$`, "m");
    const match = systemPromptMd.match(re);
    if (!match) throw new Error(`Texte d'interface introuvable dans system-prompt.md : ${label}`);
    return withRetention(match[1], env);
  };
  const contact = (re, name) => {
    const match = systemPromptMd.match(re);
    if (!match) throw new Error(`Contact introuvable dans system-prompt.md : ${name}`);
    return match[1];
  };
  return {
    welcome: { fr: grab("Bandeau d'accueil (FR)"), en: grab("Bandeau d'accueil (EN)") },
    disclaimer: { fr: grab("Mention permanente"), en: grab("Mention permanente (EN)") },
    notice: { fr: grab("Notice (FR)"), en: grab("Notice (EN)") },
    contact: {
      calendly: contact(/^- Calendly \(30 minutes\) : (\S+)/m, "Calendly"),
      email: contact(/^- Email : (\S+)/m, "Email"),
      whatsapp: contact(/^- WhatsApp : (\S+)/m, "WhatsApp"),
    },
  };
}

// Politique de confidentialité, affichée telle quelle (RETENTION_DAYS remplacé).
export function getPrivacy(env) {
  return { markdown: withRetention(privacyMd, env) };
}

// ---------- System prompt envoyé au modèle ----------

// Remplace les variables sans interpréter les « $ » éventuels du contenu.
function fill(text, values) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name) => (name in values ? values[name] : match));
}

// Partie de system-prompt.md envoyée au modèle : entre le premier séparateur « --- »
// (avant, ce sont des notes pour la construction) et la ligne « ## HORS PROMPT ».
// Le texte est identique d'une question à l'autre (seule la date change chaque jour) : il est mis en cache en entier.
export function buildSystemPrompt(env, { now = new Date() } = {}) {
  const start = systemPromptMd.search(/^---\s*$/m);
  const end = systemPromptMd.search(/^## HORS PROMPT/m);
  if (start < 0 || end < 0) throw new Error("system-prompt.md : séparateur « --- » ou « ## HORS PROMPT » introuvable");
  const body = systemPromptMd.slice(start, end).replace(/^---\s*/, "").replace(/\s*---\s*$/, "").trim();

  const base = {
    TODAY: new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Asia/Nicosia" }).format(now),
    RETENTION_DAYS: String(env.RETENTION_DAYS || "90"),
  };
  const values = { ...base, PROFILE: fill(profileMd, base).trim(), FAQ: fill(faqMd, base).trim() };
  return [{ type: "text", text: fill(body, values), cache_control: { type: "ephemeral" } }];
}

// ---------- Textes ajoutés par le serveur (sans passer par le modèle) ----------

export function contactBlock(env, lang) {
  const { contact } = getUiTexts(env);
  return lang === "en"
    ? `- Calendly (30 minutes): ${contact.calendly}\n- Email: ${contact.email}\n- WhatsApp: ${contact.whatsapp}`
    : `- Calendly (30 minutes) : ${contact.calendly}\n- Email : ${contact.email}\n- WhatsApp : ${contact.whatsapp}`;
}

export function callInvite(env, lang) {
  const intro =
    lang === "en"
      ? "Interested in her profile? Book a call with Emeline:"
      : "Son profil semble vous intéresser ? Planifiez un appel avec Emeline :";
  return `${intro}\n\n${contactBlock(env, lang)}`;
}

// Message de fin de session : texte FR / EN des « Éléments d'interface » de system-prompt.md (hors prompt).
export function sessionEndMessage(env, lang) {
  const label = lang === "en" ? "Message de fin de session (EN)" : "Message de fin de session (FR)";
  const match = systemPromptMd.match(new RegExp(`^- \\*\\*${escapeRegExp(label)}\\*\\*[^«]*« ([\\s\\S]+?) »\\s*$`, "m"));
  if (!match) throw new Error(`system-prompt.md : ${label} introuvable`);
  return `${match[1].trim()}\n\n${contactBlock(env, lang)}`;
}

// Filet de sécurité « detected_by_phrase » : phrase de renvoi de la règle 2 sans appel à report_unanswered.
// Volontairement limité à la phrase exacte : une version élargie (« n'est pas documenté »…) signalait à tort
// les réponses justes qui rappellent une limite (26 fausses alertes sur 88 questions avec Sonnet 5.5).
export const REDIRECT_PATTERNS = [/Je n'ai pas accès à cette réponse/i, /I don't have access to that answer/i];
