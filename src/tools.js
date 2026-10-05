// Outils donnés au modèle. Les entrées viennent du modèle : elles sont revérifiées ici.

export { getOverlap } from "./overlap.js";

export const REASONS = ["out_of_scope", "undocumented", "to_confirm", "refused"];

export const TOOLS = [
  {
    name: "get_overlap",
    description:
      "Calcule le chevauchement horaire entre la plage de travail d'Emeline (06:30-21:00, Asia/Nicosia) et les horaires de travail de l'équipe d'une ville, à la date du jour (changements d'heure inclus). À appeler pour toute question de fuseau horaire ou de chevauchement : ne jamais calculer un décalage de tête.",
    input_schema: {
      type: "object",
      properties: {
        city_or_timezone: { type: "string", description: "Ville (ex. Paris, New York) ou fuseau IANA (ex. Europe/Paris)." },
        local_start: { type: "string", description: "Début de journée de l'équipe, au format HH:MM. Défaut : 09:00." },
        local_end: { type: "string", description: "Fin de journée de l'équipe, au format HH:MM. Défaut : 17:00." },
      },
      required: ["city_or_timezone"],
      additionalProperties: false,
    },
  },
  {
    name: "report_unanswered",
    description:
      "Signale à Emeline une question à laquelle tu ne peux pas répondre à partir de PROFILE et FAQ. À appeler juste avant d'envoyer le message de renvoi et le bloc contact (voir « Signalement des questions sans réponse »).",
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          enum: REASONS,
          description: "out_of_scope, undocumented, to_confirm ou refused.",
        },
        topic: { type: "string", description: "Sujet en 3 à 8 mots, sans nom de personne ni donnée personnelle du visiteur." },
      },
      required: ["reason", "topic"],
      additionalProperties: false,
    },
  },
  // Outil de recherche web de l'API (exécuté par Anthropic). Version simple : Haiku 4.5 n'a pas le filtrage dynamique.
  { type: "web_search_20250305", name: "web_search", max_uses: 3 },
];

// Vérifie l'entrée de report_unanswered. Renvoie { reason, topic } ou null.
export function parseReport(input) {
  if (!input || !REASONS.includes(input.reason) || typeof input.topic !== "string") return null;
  const topic = input.topic.replace(/\s+/g, " ").trim().slice(0, 120);
  return topic ? { reason: input.reason, topic } : null;
}
