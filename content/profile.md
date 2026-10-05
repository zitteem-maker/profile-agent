# Profil — Emeline Zitte

> Source de vérité de l'agent. Uniquement des faits validés par Emeline.
> Tout ce qui est marqué `[À CONFIRMER]` ne doit jamais être affirmé par l'agent.
> Dernière mise à jour : 30 septembre 2026.

---

## 1. Identité et statut

- Nom : Emeline Zitte. Française, basée à Larnaca (Chypre). Français et anglais courants.
- Co-fondatrice de Polyma (polyma.ai), conseil marketing et opérations, détenu à 50/50 avec Grégoire, depuis 2026.
- Travaille via une structure indépendante : compte auto-entrepreneuse, puis via Polyma à partir de 2026. Ouverte à un CDI comme à une mission freelance (facturée via Polyma) ; le format se discute directement avec Emeline.
- Liens : linkedin.com/in/emelinezitte-inbound · polyma.ai

## 2. Ce qu'elle cherche

- Postes Customer Success, Operations, Product Ops.
- Full remote, ou avec déplacements ponctuels, partout dans le monde (plusieurs fois par an). Pas de relocalisation.

## 3. Disponibilité

- Fuseau : Chypre (Asia/Nicosia). UTC+2 en hiver, UTC+3 en été (changement d'heure : dernier dimanche d'octobre et de mars).
- Joignable de 6h30 à 21h00, heure de Chypre.
- Engagement : elle aménage ses horaires dans cette plage pour avoir 2 à 4 heures par jour en commun avec l'équipe (calls, collaboration). Le reste de sa journée est consacré à la production.
- Le chevauchement se calcule pour chaque offre avec l'outil dédié, jamais de tête. Si le minimum n'est pas atteignable dans la fenêtre, l'agent le dit et renvoie vers Emeline.
- Date de disponibilité : à discuter avec Emeline.
- Autorisation de travail hors UE (États-Unis, Royaume-Uni, Australie…) : l'agent n'affirme rien, il renvoie vers Emeline.

## 4. Parcours

- **Juin 2022 – septembre 2026 : Operations Consultant / Project Manager**, engagée par **Consumedias**.
  - Talented Closers est une marque de Consumedias (plateforme talentedclosers.com, interface utilisateur créée avec la tech).
  - Closers Group est un client de Consumedias : Emeline était l'intervenante privilégiée lors de la bascule de leur plateforme.
  - Facturation via son compte auto-entrepreneuse, puis via Polyma à partir de 2026.
  - Mission terminée en septembre 2026 : la plateforme et le support sont désormais entièrement automatisés par IA.
  - Elle a rendu compte directement à la direction (un des associés), avec qui elle travaillait de près sur l'opérationnel.
  - Arrivée comme Operations Consultant (support, onboarding), sa fonction a évolué vers Project Manager en prenant en charge des projets (back-office, agents IA, bascule de plateforme de Closers Group) : l'intitulé a suivi le périmètre.
- **Entre 2020 et juin 2022 : welcomeuse, à son compte, pour Luckey Homes**, marque rachetée par Airbnb : accueil et check-in des voyageurs, participation à la mise en process du service.
- **2020 : Studio Zitte**, décoration d'intérieur et home staging, Rennes. Fondé et dirigé par Emeline.
- **Formation** : Bachelor Graphic Design (MJM Graphic Design & Autograf) ; formation en design d'intérieur.

## 5. Missions et livrables (Consumedias / Talented Closers / Closers Group)

### 5.1 Agent A — agent de support IA construit de zéro

- Conçu avec Claude Code (vibe coding). Modèle : Claude Haiku via l'API. Interface de chat web hébergée sur Cloudflare, code sur GitHub.
- En production à l'été 2026.
- Base de connaissances : une base Notion d'une trentaine d'entrées, 4 catégories, avec un statut par entrée (confirmé, à documenter, brouillon). Une FAQ HTML interactive en est dérivée et n'affiche que les entrées confirmées. Les règles de comportement sont dans un fichier `.md` séparé.
- Règle de confiance définie dans les règles de l'agent : au-dessus de 70 % de confiance, il répond. En dessous, il bascule vers Slack : Emeline est taguée pour mettre à jour la réponse et la base. La réponse est donc correcte pour les demandes suivantes.
- Règle explicite : jamais d'invention.
- 100 % IA dans les réponses : aucun humain ne répondait à la place de l'agent. L'humain intervenait pour corriger la base via l'alerte Slack. Parcours de l'utilisateur : FAQ, puis agent IA, puis un groupe WhatsApp où le manager de l'équipe produit était le dernier niveau d'escalade.
- Aucune métrique de volume ou de qualité documentée pour l'agent A. Ne pas en citer.

### 5.2 Agent B — agent IA Intercom (Fin et Copilot), configuré et optimisé

- Ce n'est pas un outil construit de zéro : c'est un outil du marché, configuré et optimisé par Emeline. La base de connaissances, externe et interne, a été créée par elle.
- Mesure de la résolution IA vs humain via Intercom.
- Volume : 500 à 700 tickets par mois.
- Entre 40 et 60 % des tickets résolus sans escalade. Le reste est escaladé et traité en moins de 2 heures.
- CSAT d'environ 70 %, mesuré par une enquête en fin de conversation.
- Améliorations apportées :
  - Glossaire commun avec la tech, car l'IA confondait des termes dans un écosystème startup qui évoluait vite. Cela a permis de résoudre plus de cas sans traduire en termes dev les problèmes des utilisateurs.
  - Ticketing plus précis et règles d'escalade dans la base interne, après des soucis de routage (demandes mal comprises). Les utilisateurs ont été responsabilisés et transmettent des tickets documentés. L'IA répond directement ou route vers la bonne équipe, personne ou canal, sans intervention humaine.

### 5.3 Back-office et plateforme talentedclosers.com

- Rôle d'Emeline : recueil des besoins, rédaction des specs en tickets (canal Slack dédié), transmission à Linear via les connecteurs. Le développement était fait par la tech.
- Besoins recueillis :
  - **Managers et évaluateurs** : améliorer leur suivi.
  - **Côté client** : points de friction et analyse du comportement sur le site, pour optimiser le parcours, la présentation de la plateforme et réduire les tickets.
  - **Service facturation** : rendre la tâche moins fastidieuse (exports, champs, filtres, présentation).
  - **Dirigeants** : accès à des reportings et des données via un agent IA qui parcourt les données du site (taux de rétention, tableau des abandons, montants des impayés). Emeline a identifié le besoin et appuyé la tech, qui a implémenté la solution.
  - **Suivi des équipes de formation** (setters et closers, qui constituent la RH de Closers Group) : savoir si chaque personne est active, à quel degré, sur quels produits.

### 5.4 Formation (LMS)

- Plateforme : TalentLMS `[À CONFIRMER : nom exact]`, outil fourni par le client.
- Emeline a construit la structure des cours et tourné une partie des 34 vidéos (hébergées sur Loom). Les questions et quiz ont été fournis par le client.
- Taux de réussite global : environ 75 à 80 %. Le quiz servait de filtre d'accès au produit vendu par le client : sans validation, la personne était considérée comme non qualifiée.
- Emeline ne gérait ni le seuil de validation ni les résultats.
- Cohortes d'onboarding : jusqu'à 150 personnes par semaine, pour une communauté de 900 à 1 200 utilisateurs actifs.

### 5.5 Bascule de plateforme pour Closers Group

- Intervenante privilégiée : recueil des besoins ops et produit pour améliorer l'expérience du back-office et les parcours utilisateurs, la rétention et l'onboarding.
- Sa part : onboarding, parcours et implémentation produit, suivi des parcours utilisateurs sur talentedclosers.com.

### 5.6 Automatisations et relations prestataires

- Création automatisée de comptes via Cowork : déployée et validée. Choix client (plus simple pour vérifier les créations) et contournement d'un bug de l'app Desktop Claude Code.
- Automatisations emailing, SMS et activités pour les utilisateurs et clients.
- Emails d'onboarding pour les nouveaux membres, avec redirection vers le dashboard.
- Communication avec les prestataires téléphonie et CRM (Pipedrive) avant l'internalisation de l'outil, du CRM, du back-office et de l'espace utilisateur.
- Reporting Intercom hebdomadaire automatisé : **proposé et scopé, non livré**.
- Désactivation automatisée de comptes : `[À CONFIRMER]`, ne pas présenter comme déployée.

### 5.7 Opérations, CRM, facturation

- Administration Pipedrive. Contribution à la migration CRM : elle a contribué, elle ne l'a pas pilotée seule.
- Gestion du cycle de facturation et de la réconciliation mensuelle, dont TVA UE et autoliquidation.
- Suivi des jours travaillés, des congés et de la performance via Intercom (tags, filtres, KPI).

### 5.8 Équipe

- Équipe de 4 à 6 personnes sur plusieurs années, selon les besoins : recrutement, formation, gestion des présences et congés.

## 6. Situations et bugs résolus

**Bug 1 — Désynchronisation onboarding BO / dashboard (juillet 2026).**
Cinq sales arrivés via une plateforme partenaire apparaissaient en « onboarding » sur le BO, mais leur dashboard les renvoyait soit vers la page de paiement (2 offres), soit vers un message d'entretien qui ne les concernait pas. Détection : en croisant les demandes de création d'accès (canal dédié) avec leur statut sur le BO. Cause : une erreur de process humain, les droits de modification manuelle de l'étape d'onboarding n'étaient pas à jour. Correctif : modification limitée aux équipes support (le Board n'est pas autorisé). Toute demande, cas particuliers et escalades compris, passe ainsi par le même process et les mêmes personnes. Une première hypothèse (paiement partenaire non synchronisé) n'était pas la cause.

**Bug 2 — Erreur de calcul de commission (lancement de la plateforme).**
Un closer signale un montant de commission mensuelle erroné. Après recherche approfondie, Emeline identifie que la règle de calcul côté tech ne traitait pas correctement ce cas de figure. Elle transmet immédiatement un ticket complet à la tech. Impact : aucun, la facturation n'avait pas encore eu lieu et la règle a été corrigée à temps.

**Bug 3 — Seconde commission sur un même lead (vente puis upsell, juin 2026).**
La plateforme interdit une deuxième commission sur un même lead, par sécurité contre les doublons. Le cas vente puis upsell n'était donc pas couvert. Solution actuelle : une fonctionnalité de saisie manuelle côté facturation, réservée à la personne qui gère la facturation. Statut : en attente de la tech pour contourner la règle dans ce cas précis tout en gardant la protection contre la double commission.

**Bug 4 — Entrée contradictoire dans la base de l'agent.**
Les utilisateurs disaient « facturation » en pensant « abonnement ». L'agent suivait le mauvais workflow et donnait des réponses erronées. Cause : une entrée de la base de connaissances se contredisait, et le même mot ne désignait pas la même chose pour les utilisateurs et pour la base. Correctif : règle ajoutée dans les consignes Intercom, l'agent pose des questions pour confirmer ou infirmer la demande avant de répondre. Agent concerné : agent B (Fin, Intercom).

**Bug 5 — App Desktop Claude Code (automatisations).**
Erreur « No CLI session ID available », non résolue par la réinstallation. Contournement : utilisation du CLI dans le terminal. Ce blocage a pesé dans le choix de Cowork pour les automatisations.

**Bugs 6 et 7 — Agent B.** Voir section 5.2 : confusion de termes (glossaire commun) et routage mal compris (ticketing et règles d'escalade). **Bug 8 — Agent A.** Réponses à faible confiance : alerte Slack, mise à jour de la réponse et de la base.

## 7. Chiffres clés (toujours avec leur périmètre)

- Communauté : 900 à 1 200 utilisateurs actifs.
- Abonnement mensuel : 200 €. Option premium : 950 € (formation), en plus de l'abonnement, + 10 % de commission.
- Tickets support : 500 à 700 par mois.
- Agent B : 40 à 60 % résolus sans escalade, escaladés traités en moins de 2 h, CSAT ~70 %.
- Agent A : seuil de confiance à 70 %. Ce chiffre n'a rien à voir avec le CSAT de l'agent B.
- LMS : ~75 à 80 % de réussite, 34 vidéos, cohortes jusqu'à 150 personnes par semaine.
- Rétention : pertes surtout au début, stabilisation grâce aux améliorations (outils, support, produit). Aucun chiffre documenté.

## 8. Outils

- Utilisés dans les missions ci-dessus : Intercom (tags, filtres, KPI ; Fin et Copilot), Linear (transfert de tickets via connecteurs), Slack, Notion, Make, Pipedrive, TalentLMS, Loom, OnOff, Claude, Claude Code, Cowork.
- Niveaux (Expert : configuration complète, optimisation, administration, capable de former · Avancé : usage autonome, workflows, automatisations ou agents de bout en bout · Opérationnel : usage quotidien fiable · Notions : usage ponctuel) :
  - Expert : Intercom (Fin et Copilot), OnOff (administration complète de la console, facturation, licences, autorisations, reporting, extensions et API dans Pipedrive et Intercom).
  - Avancé : Claude et ChatGPT, Claude Code, Make, Notion (dont un skill de facturation `/facture` pour Polyma avec autoliquidation de TVA européenne), Pipedrive (administration et usage quotidien).
  - Opérationnel : Cowork, Slack, Linear, Loom, TalentLMS.

## 9. Limites assumées

- Pas de portefeuille structuré de « grands comptes » au sens Customer Success enterprise : gestion d'un grand volume de comptes, et relation directe avec la direction.
- Migration Pipedrive : contribution, pas pilotage.
- Management : équipe de 4 à 6 personnes. Pas d'équipe formelle de 8 personnes documentée.
- Intégrations techniques (API REST, HRIS) : uniquement du no-code avec Make.
- Aucune expérience directe en cybersécurité, logistique et intralogistique.
- Agent B : outil du marché configuré, pas construit de zéro.
- Reporting Intercom automatisé : proposé, pas livré.

## 10. Contact

- Email : zitte.em@gmail.com
- WhatsApp : https://wa.me/35799735606?text=Hi%20Emeline%2C%20I%27m%20reaching%20out%20from%20your%20profile%20agent.
- Calendly (30 minutes) : https://calendly.com/emelineintrocall/30min
