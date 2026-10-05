// Export CSV de toutes les questions : npm run export  (base en ligne)
//                                      npm run export -- --local  (copie locale de test)
// Le fichier est écrit dans exports/ (ignoré par Git : il contient des données personnelles).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const local = process.argv.includes("--local");
const SQL = `
SELECT u.created_at, s.first_name, s.last_name, s.company, s.role, s.email, s.phone,
       u.question_number, u.content AS question, COALESCE(a.invite_sent, 0) AS invite_sent,
       u.unanswered, u.reason, u.topic
FROM messages u
JOIN sessions s ON s.id = u.session_id
LEFT JOIN messages a ON a.session_id = u.session_id AND a.question_number = u.question_number AND a.role = 'assistant'
WHERE u.role = 'user'
ORDER BY u.created_at`;

const output = execFileSync(
  "npx",
  ["wrangler", "d1", "execute", "profile-agent-db", local ? "--local" : "--remote", "--json", "--command", SQL],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "inherit"] }
);
const rows = JSON.parse(output)[0].results;

const cyprus = new Intl.DateTimeFormat("fr-FR", { timeZone: "Asia/Nicosia", dateStyle: "short", timeStyle: "short" });
const cell = (value) => {
  const text = String(value ?? "");
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const header = ["Date (Chypre)", "Prénom", "Nom", "Entreprise", "Poste", "Email", "Téléphone", "N° question", "Question", "Invitation envoyée", "Sans réponse", "Raison", "Sujet"];
const lines = rows.map((r) =>
  [
    cyprus.format(new Date(r.created_at)), r.first_name, r.last_name, r.company, r.role, r.email, r.phone,
    r.question_number, r.question, r.invite_sent ? "oui" : "non", r.unanswered ? "oui" : "non", r.reason, r.topic,
  ].map(cell).join(";")
);

// Point-virgule et BOM UTF-8 : s'ouvre directement dans Excel en français, accents compris.
mkdirSync("exports", { recursive: true });
const file = `exports/questions-${new Date().toISOString().slice(0, 10)}${local ? "-local" : ""}.csv`;
writeFileSync(file, "﻿" + [header.join(";"), ...lines].join("\r\n") + "\r\n");
console.log(`${rows.length} question(s) exportée(s) dans ${file}`);
