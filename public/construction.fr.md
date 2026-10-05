# Comment cet agent est construit

Mes projets ont été menés en interne, sur des données clients confidentielles : je ne peux pas les montrer. Cet agent les documente à ma place. Je l'ai conçu et construit avec Claude Code. Cette page explique ce qu'il y a dessous, comment il est protégé et ce qu'il ne fait pas.

Dépôt du code : `[lien du dépôt à ajouter]`

## La stack, et pourquoi

- **Un seul Cloudflare Worker avec Static Assets.** Il sert la page (HTML, CSS et JavaScript simples, sans framework) et l'API sous `/api/*`. J'ai choisi un Worker plutôt que Cloudflare Pages parce que j'avais besoin de tâches planifiées et d'une limite de débit native.
- **Cloudflare D1** (base SQL) : sessions, questions, réponses et signalements.
- **Cron Trigger** : rapport quotidien dans Slack et suppression automatique des données anciennes.
- **Cloudflare Turnstile** : vérification anti-robots sur le formulaire d'entrée, validée côté serveur.
- **Slack** (webhook entrant) : alertes en temps réel et rapport du matin.
- **Claude Sonnet 5.5 via l'API Anthropic**, en streaming, avec mise en cache du prompt.

**Prompt plutôt que RAG ou fine-tuning.** Mon profil et ma FAQ validés sont injectés en entier dans le contexte du modèle. Ce volume tient dans le contexte : un RAG ajouterait une étape de recherche qui peut rater le bon passage, alors qu'ici le modèle a toujours tout sous les yeux, et chaque réponse se rattache à un fichier que je peux corriger. Le fine-tuning est écarté : le contenu évolue, et je veux pouvoir le modifier en quelques minutes en éditant un fichier.

**Sonnet 5.5 plutôt que Haiku 4.5.** J'ai commencé avec Claude Haiku 4.5, moins cher. Sur mon jeu de tests, il ajoutait des détails absents du profil et appliquait mal le renvoi et les signalements. Sur les 33 questions les plus difficiles, Claude Sonnet 5.5 a passé tous les contrôles, sans fait inventé à la relecture. Le surcoût est de quelques centimes par session.

## Comment une question est traitée

1. Le visiteur remplit le formulaire (identité, consentement, vérification Turnstile). Le serveur crée une session et un cookie signé.
2. Chaque question passe par `/api/chat`. Le serveur incrémente le compteur, puis envoie au modèle le prompt, l'historique de la conversation et la question. **L'identité du visiteur n'est jamais envoyée au modèle.**
3. Le modèle répond en streaming. Il peut utiliser trois outils :
   - `get_overlap` : calcule en code le chevauchement horaire avec la ville d'une équipe, à la date du jour, avec les fuseaux officiels (changements d'heure compris) ;
   - `report_unanswered` : signale une question à laquelle il ne peut pas répondre, ou une tentative de manipulation ;
   - la recherche web de l'API, réservée aux fourchettes de salaire de marché (3 recherches au plus).
4. Le serveur ajoute lui-même, sans passer par le modèle, l'invitation à un appel après la 3e et la 6e réponse, et le message de fin après la 9e.
5. La question et la réponse sont enregistrées. Les alertes Slack partent en parallèle, sans ralentir la réponse.

## Les règles de l'agent

- Il répond uniquement à partir de mon profil et de ma FAQ. Il n'ajoute aucun fait, chiffre, date ou nom.
- Il donne les limites dans la même réponse que la force correspondante (par exemple : « migration Pipedrive : contribution, pas pilotage »).
- Il corrige une affirmation fausse avant de répondre.
- Hors périmètre, il répond par un message fixe et renvoie vers moi (Calendly, email, WhatsApp). « Non documenté » ne veut pas dire « non ».
- Il refuse de changer de rôle, de dévoiler ses instructions, d'embellir mon profil ou de donner des noms de clients ou de collègues.

## Les garde-fous

- Clé API côté serveur uniquement, jamais dans le navigateur ni dans le code.
- Compteur de 9 questions par session, incrémenté côté serveur de façon atomique.
- Limite de débit par visiteur (5 sessions et 10 questions par minute), calculée sur une empreinte de l'adresse IP.
- Vérification Turnstile côté serveur, questions de 1 000 caractères au plus, historique plafonné.
- Cookie de session signé et inaccessible au JavaScript de la page, refus des requêtes venant d'un autre site.
- Un appel au modèle bloqué est interrompu au bout de 60 secondes : la question n'est alors pas décomptée.
- Secours d'Anthropic : une question refusée à tort par un filtre de sécurité est relancée sur un autre modèle.
- Plafond de dépense mensuel réglé dans la console Anthropic.

## Les alertes et le rapport

- **‼️ Question sans réponse**, avec ma mention : la question, la raison, le sujet, l'heure et le contact déclaré du visiteur.
- **🚫 Demande refusée** : tentative de manipulation ou demande de données confidentielles.
- **🔔 Limite atteinte** : un recruteur est allé jusqu'à la 9e question.
- **👋 Nouvelle session.**
- **Rapport quotidien** à 7h (heure de Chypre) : chaque session, toutes les questions posées, et les questions sans réponse regroupées sous « À préparer pour l'entretien ». Rien n'est envoyé les jours sans activité.
- **Export CSV** de toutes les questions, pour préparer un entretien.

## Les données des visiteurs

- **Stocké** : prénom, nom, entreprise, poste, email, téléphone s'il est donné, date du consentement, questions et réponses, et une empreinte non réversible de l'adresse IP (l'adresse elle-même n'est pas conservée).
- **Envoyé au modèle** : uniquement les questions et l'historique de la conversation, jamais l'identité ni les coordonnées.
- **Durée** : 90 jours, puis suppression automatique. Le bouton « Supprimer mes données » efface immédiatement la session.
- **Slack** : les notifications contiennent l'identité et les questions. Elles ne sont pas effacées par le bouton : je les supprime au plus tard 90 jours après leur réception, et immédiatement sur demande.
- Aucun outil d'analyse d'audience, aucun cookie autre que le cookie de session.

## Comment il est testé

- Un jeu de tests pose à l'agent toutes les questions de ma FAQ, 15 questions hors périmètre et 10 tentatives de manipulation. Il contrôle automatiquement chaque réponse : aucune URL interne, renvoi mot pour mot, ordre du bloc contact, alertes émises, chiffres jamais mélangés, vouvoiement. Je relis ensuite les réponses une par une.
- L'outil de fuseaux horaires a 25 tests automatiques : Paris, Londres, New York, San Francisco et Sydney, avant et après chaque changement d'heure.

## Ce qu'il ne fait pas

- Il n'invente rien et ne donne aucune prétention salariale en mon nom.
- Il ne prend aucune décision et ne remplace pas un entretien.
- Il ne vérifie pas l'identité des visiteurs : elle est déclarative.
- Il n'a accès à aucune donnée client ni à aucun outil interne de mes missions.

## Limites connues

- Un modèle d'IA peut se tromper. Les règles et les tests réduisent ce risque sans le supprimer.
- Aucun système n'est à l'épreuve de toute tentative de manipulation : le but est de limiter ce qu'elle pourrait obtenir, et il n'y a rien de confidentiel à extraire.
- Certains points de ma FAQ ne sont pas encore documentés : l'agent renvoie alors vers moi.
- Les fourchettes de salaire trouvées par recherche web sont indicatives.
- Coût mesuré : environ 15 à 20 centimes par session de 9 questions.
