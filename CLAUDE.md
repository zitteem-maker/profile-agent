# Agent de profil d'Emeline — règles du projet

Agent conversationnel « profil consultable » pour recruteurs. Un seul Cloudflare Worker avec Static Assets (page de chat en HTML/CSS/JS simples, mobile d'abord, API sous `/api/*`), base D1, Cron Trigger, alertes Slack par webhook entrant, Turnstile sur le formulaire d'entrée, modèle Claude via l'API Anthropic (identifiant dans la variable `MODEL`).

Emeline débute en ligne de commande : avant chaque commande, expliquer en français simple ce qu'elle fait et ce qu'il faut installer.

## Règles impératives

1. **Contenu protégé** : ne jamais modifier `profile.md`, `faq.md` ou `system-prompt.md` sans l'accord explicite d'Emeline. Le code les lit, il ne les réécrit pas. Pour proposer un changement, montrer le texte avant / après et attendre son accord.
2. **Aucun secret dans le code ni dans Git** : aucune clé API, URL de webhook Slack, clé secrète Turnstile, `COOKIE_SECRET` ou autre secret dans un fichier suivi par Git. En local : fichier `.dev.vars` (ignoré par Git). En production : `npx wrangler secret put NOM`. Ne jamais demander à Emeline de coller un secret dans la conversation.
3. **Bilingue** : tout texte affiché au visiteur (interface, formulaire, notice, messages d'erreur, invitation à un appel, message de fin de session, pages annexes) existe en français et en anglais.
4. **Identité jamais envoyée au modèle** : prénom, nom, entreprise, poste, email, téléphone et empreinte d'IP restent dans D1 et Slack. Seuls les questions du visiteur, l'historique de la conversation et le system prompt partent vers l'API Anthropic.
