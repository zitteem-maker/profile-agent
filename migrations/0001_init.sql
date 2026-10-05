-- Schéma initial. Dates en ISO 8601 UTC (ex. 2026-10-04T09:30:00.000Z).

-- Une session = un visiteur qui a rempli le formulaire d'entrée.
CREATE TABLE sessions (
  id               TEXT PRIMARY KEY,                 -- identifiant aléatoire (UUID)
  created_at       TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  company          TEXT NOT NULL,
  role             TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,                             -- facultatif
  lang             TEXT NOT NULL DEFAULT 'fr',       -- langue de l'interface au moment du formulaire
  consent_at       TEXT NOT NULL,                    -- date du consentement
  ip_hash          TEXT NOT NULL,                    -- empreinte HMAC de l'IP, jamais l'IP en clair
  questions_used   INTEGER NOT NULL DEFAULT 0,       -- compteur incrémenté côté serveur
  limit_notified   INTEGER NOT NULL DEFAULT 0        -- alerte 🔔 déjà envoyée (0/1)
);
CREATE INDEX idx_sessions_created ON sessions (created_at);

-- Journal : chaque question et chaque réponse. Les signalements « sans réponse »
-- sont portés par la ligne de la question (unanswered, reason, topic).
CREATE TABLE messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  created_at      TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  question_number INTEGER NOT NULL,                  -- n° de la question dans la session (1 à 9)
  content         TEXT NOT NULL,                     -- texte affiché au visiteur
  api_content     TEXT,                              -- texte du modèle seul (sans ajouts du serveur), renvoyé dans l'historique
  invite_sent     INTEGER NOT NULL DEFAULT 0,        -- invitation à un appel ajoutée à cette réponse (0/1)
  unanswered      INTEGER NOT NULL DEFAULT 0,        -- question restée sans réponse (0/1)
  reason          TEXT,                              -- out_of_scope | undocumented | to_confirm | refused | detected_by_phrase
  topic           TEXT
);
CREATE INDEX idx_messages_session ON messages (session_id, id);
CREATE INDEX idx_messages_created ON messages (created_at);
