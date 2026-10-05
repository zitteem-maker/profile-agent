import { renderMarkdown } from "/md.js";

// Textes de l'interface (FR / EN). Les textes de contenu (bandeau, notice, mention) viennent de /api/ui.
const I18N = {
  fr: {
    brandSub: "Agent de profil",
    about: "Pourquoi cet agent",
    loading: "Chargement…",
    contact: "Contacter Emeline",
    entryTitle: "Avant votre première question",
    entryIntro: "Présentez-vous en quelques champs : Emeline saura qui a consulté son profil et pourra vous recontacter.",
    deletedOk: "Vos données ont été supprimées.",
    firstName: "Prénom",
    lastName: "Nom",
    company: "Entreprise",
    role: "Poste",
    email: "Email professionnel",
    phone: "Téléphone",
    optional: "(facultatif)",
    consentText: "J'ai lu la notice ci-dessus et j'accepte le traitement de mes données décrit dans la",
    privacyLink: "politique de confidentialité",
    start: "Commencer",
    submitHint: "Remplissez les champs obligatoires, cochez la case et validez la vérification anti-robots.",
    yourQuestion: "Votre question",
    placeholder: "Posez votre question…",
    send: "Envoyer",
    deleteData: "Supprimer mes données",
    questionsLeft: (n) => `Questions restantes : ${n}`,
    noQuestionsLeft: "Plus de questions disponibles dans cette session : contactez directement Emeline.",
    privacy: "Confidentialité",
    howBuilt: "Comment cet agent est construit",
    contactTitle: "Contacter Emeline",
    calendly: "Réserver 30 minutes (Calendly)",
    close: "Fermer",
    deleteTitle: "Supprimer mes données ?",
    deleteBody: "Votre identité, vos coordonnées et les messages de cette session seront effacés immédiatement. La conversation s'arrêtera.",
    cancel: "Annuler",
    deleteConfirm: "Supprimer",
    editPlaceholder: "Complétez la partie entre crochets, puis envoyez.",
    tooLong: "Votre message dépasse 1 000 caractères.",
    errors: {
      invalid_field: "Vérifiez les champs : tous sont obligatoires sauf le téléphone, et l'email doit être valide.",
      turnstile_failed: "La vérification anti-robots a échoué. Réessayez.",
      rate_limited: "Trop de requêtes en peu de temps. Patientez une minute puis réessayez.",
      no_session: "Votre session a expiré. Merci de remplir à nouveau le formulaire.",
      limit_reached: "Vous avez atteint la limite de questions de cette session.",
      message_too_long: "Votre message dépasse 1 000 caractères.",
      network: "Connexion impossible. Vérifiez votre réseau et réessayez.",
      busy: "L'agent est très sollicité en ce moment. Votre question n'a pas été décomptée : réessayez dans une minute.",
      server_error: "Une erreur est survenue. Votre question n'a pas été décomptée : réessayez dans un instant.",
      load: "La page n'a pas pu se charger. Rechargez-la dans un instant.",
    },
  },
  en: {
    brandSub: "Profile agent",
    about: "Why this agent",
    loading: "Loading…",
    contact: "Contact Emeline",
    entryTitle: "Before your first question",
    entryIntro: "Introduce yourself in a few fields: Emeline will know who viewed her profile and can get back to you.",
    deletedOk: "Your data has been deleted.",
    firstName: "First name",
    lastName: "Last name",
    company: "Company",
    role: "Job title",
    email: "Work email",
    phone: "Phone",
    optional: "(optional)",
    consentText: "I have read the notice above and agree to the processing of my data described in the",
    privacyLink: "privacy policy",
    start: "Start",
    submitHint: "Fill in the required fields, tick the box and complete the anti-bot check.",
    yourQuestion: "Your question",
    placeholder: "Ask your question…",
    send: "Send",
    deleteData: "Delete my data",
    questionsLeft: (n) => `Questions left: ${n}`,
    noQuestionsLeft: "No questions left in this session: please contact Emeline directly.",
    privacy: "Privacy",
    howBuilt: "How this agent is built",
    contactTitle: "Contact Emeline",
    calendly: "Book 30 minutes (Calendly)",
    close: "Close",
    deleteTitle: "Delete my data?",
    deleteBody: "Your identity, contact details and this session's messages will be erased immediately. The conversation will end.",
    cancel: "Cancel",
    deleteConfirm: "Delete",
    editPlaceholder: "Fill in the part in brackets, then send.",
    tooLong: "Your message is longer than 1,000 characters.",
    errors: {
      invalid_field: "Please check the fields: all are required except phone, and the email must be valid.",
      turnstile_failed: "The anti-bot check failed. Please try again.",
      rate_limited: "Too many requests in a short time. Please wait a minute and try again.",
      no_session: "Your session has expired. Please fill in the form again.",
      limit_reached: "You've reached this session's question limit.",
      message_too_long: "Your message is longer than 1,000 characters.",
      network: "Connection failed. Check your network and try again.",
      busy: "The agent is very busy right now. Your question wasn't counted: please try again in a minute.",
      server_error: "Something went wrong. Your question wasn't counted: please try again in a moment.",
      load: "The page couldn't load. Please reload it in a moment.",
    },
  },
};

const MAX_MESSAGE = 1000;
const $ = (id) => document.getElementById(id);

const state = {
  lang: (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en",
  config: null,
  ui: null,
  faq: null,
  faqEn: {},
  questionsLeft: null,
  busy: false,
  turnstileToken: null,
  turnstileWidget: null,
  openTheme: null,
};

const t = (key) => I18N[state.lang][key];
const errorText = (code) => I18N[state.lang].errors[code] || I18N[state.lang].errors.server_error;

// ---------- Langue ----------

function applyLanguage() {
  document.documentElement.lang = state.lang;
  $("lang-toggle").textContent = state.lang === "fr" ? "EN" : "FR";
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const value = t(el.dataset.i18n);
    if (typeof value === "string") el.textContent = value;
  }
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  }
  if (state.ui) {
    $("notice").innerHTML = renderMarkdown(state.ui.notice[state.lang]);
    $("welcome-text").textContent = state.ui.welcome[state.lang];
    $("disclaimer").textContent = state.ui.disclaimer[state.lang];
  }
  renderThemes();
  renderCounter();
  if (state.turnstileWidget !== null) renderTurnstile();
}

// ---------- Chargement ----------

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function init() {
  applyLanguage();
  try {
    const [config, ui, faq, faqEn, session] = await Promise.all([
      getJson("/api/config"),
      getJson("/api/ui"),
      getJson("/api/faq"),
      getJson("/faq-en.json").catch(() => ({})),
      getJson("/api/session"),
    ]);
    Object.assign(state, { config, ui, faq, faqEn });
    setupContact();
    if (session.active) showChat(session.questionsLeft, session.messages);
    else showEntry();
  } catch (err) {
    console.error(err);
    showGlobalError(errorText("load"));
  } finally {
    $("loading").hidden = true;
  }
}

function showGlobalError(message) {
  $("global-error").textContent = message;
  $("global-error").hidden = false;
}

// ---------- Formulaire d'entrée ----------

function showEntry({ deleted = false } = {}) {
  $("chat").hidden = true;
  $("entry").hidden = false;
  $("deleted-ok").hidden = !deleted;
  $("entry-form").reset();
  state.turnstileToken = null;
  applyLanguage();
  loadTurnstile();
  updateSubmitState();
}

function loadTurnstile() {
  if (typeof window.turnstile?.render === "function") return renderTurnstile();
  if (document.getElementById("turnstile-script")) return;
  window.onTurnstileLoad = renderTurnstile;
  const script = document.createElement("script");
  script.id = "turnstile-script";
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
  script.async = true;
  document.head.appendChild(script);
}

function renderTurnstile() {
  if (typeof window.turnstile?.render !== "function" || !state.config || $("entry").hidden) return;
  if (state.turnstileWidget !== null) window.turnstile.remove(state.turnstileWidget);
  state.turnstileToken = null;
  state.turnstileWidget = window.turnstile.render("#turnstile-box", {
    sitekey: state.config.turnstileSiteKey,
    language: state.lang,
    callback: (token) => {
      state.turnstileToken = token;
      updateSubmitState();
    },
    "expired-callback": () => {
      state.turnstileToken = null;
      updateSubmitState();
    },
    "error-callback": () => {
      state.turnstileToken = null;
      updateSubmitState();
    },
  });
  updateSubmitState();
}

function formValues() {
  const data = Object.fromEntries(new FormData($("entry-form")));
  for (const key of Object.keys(data)) if (typeof data[key] === "string") data[key] = data[key].trim();
  data.consent = $("consent").checked;
  return data;
}

function isFormComplete() {
  const v = formValues();
  const required = ["firstName", "lastName", "company", "role", "email"].every((k) => v[k]);
  const emailOk = $("entry-form").elements.email.checkValidity();
  return required && emailOk && v.consent && Boolean(state.turnstileToken);
}

function updateSubmitState() {
  const ready = isFormComplete();
  $("entry-submit").disabled = !ready;
  $("submit-hint").hidden = ready;
}

async function submitEntry(event) {
  event.preventDefault();
  if (!isFormComplete()) return;
  const form = $("form-error");
  form.hidden = true;
  $("entry-submit").disabled = true;
  try {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...formValues(), turnstileToken: state.turnstileToken, lang: state.lang }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error("session"), { code: data.error });
    showChat(data.questionsLeft);
  } catch (err) {
    form.textContent = errorText(err.code || "network");
    form.hidden = false;
    renderTurnstile(); // un jeton Turnstile ne sert qu'une fois
  }
}

// ---------- Chat ----------

function showChat(questionsLeft, history = []) {
  $("entry").hidden = true;
  $("chat").hidden = false;
  state.questionsLeft = questionsLeft;
  for (const { role, content } of history) {
    const el = addMessage(role === "user" ? "user" : "bot", content);
    if (role !== "user") el.innerHTML = renderMarkdown(content, { headingOffset: 2 });
  }
  if (history.length) $("welcome").open = false;
  applyLanguage();
  $("message").focus();
}

function renderCounter() {
  const el = $("questions-left");
  if (state.questionsLeft === null) return (el.textContent = "");
  el.textContent = t("questionsLeft")(state.questionsLeft);
  const exhausted = state.questionsLeft <= 0;
  $("message").disabled = exhausted || state.busy;
  $("send").disabled = exhausted || state.busy;
  if (exhausted) $("message").placeholder = t("noQuestionsLeft");
}

function questionLabel(fr) {
  return state.lang === "en" ? state.faqEn[fr] || fr : fr;
}

function renderThemes() {
  const row = $("theme-row");
  const panel = $("theme-panel");
  if (!state.faq) return;
  row.replaceChildren(
    ...state.faq.sections.map((section) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.role = "tab";
      button.textContent = section.label[state.lang];
      button.setAttribute("aria-selected", String(state.openTheme === section.id));
      button.addEventListener("click", () => {
        state.openTheme = state.openTheme === section.id ? null : section.id;
        renderThemes();
      });
      return button;
    })
  );
  const open = state.faq.sections.find((s) => s.id === state.openTheme);
  panel.hidden = !open;
  if (!open) return panel.replaceChildren();
  panel.replaceChildren(
    ...open.questions.map((fr) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "question";
      button.textContent = questionLabel(fr);
      button.addEventListener("click", () => pickQuestion(questionLabel(fr)));
      return button;
    })
  );
}

function pickQuestion(text) {
  state.openTheme = null;
  renderThemes();
  // Une question à compléter ([ville], [city]) va dans la zone de saisie au lieu d'être envoyée.
  const blank = text.match(/\[[^\]]+\]/);
  if (blank) {
    const input = $("message");
    input.value = text;
    input.focus();
    input.setSelectionRange(blank.index, blank.index + blank[0].length);
    showChatError(t("editPlaceholder"));
    autoGrow();
    return;
  }
  sendMessage(text);
}

function addMessage(role, text = "") {
  const el = document.createElement("div");
  el.className = `msg msg-${role}`;
  if (role === "user") el.textContent = text;
  else el.innerHTML = '<span class="typing" aria-hidden="true"><i></i><i></i><i></i></span>';
  $("messages").appendChild(el);
  el.scrollIntoView({ block: "end", behavior: "smooth" });
  return el;
}

function showChatError(message) {
  const el = $("chat-error");
  el.textContent = message || "";
  el.hidden = !message;
}

function setBusy(busy) {
  state.busy = busy;
  renderCounter();
}

async function sendMessage(text) {
  const message = text.trim();
  if (!message || state.busy || state.questionsLeft <= 0) return;
  if (message.length > MAX_MESSAGE) return showChatError(t("tooLong"));
  showChatError("");
  addMessage("user", message);
  $("welcome").open = false;
  $("message").value = "";
  autoGrow();
  const bot = addMessage("bot");
  setBusy(true);

  let answer = "";
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, lang: state.lang }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw Object.assign(new Error("chat"), { code: data.error });
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "text") {
          answer += event.text;
          bot.innerHTML = renderMarkdown(answer, { headingOffset: 2 });
        } else if (event.type === "done") {
          state.questionsLeft = event.questionsLeft;
        } else if (event.type === "error") {
          throw Object.assign(new Error("stream"), { code: event.code });
        }
      }
    }
  } catch (err) {
    if (!answer) bot.remove();
    showChatError(errorText(err.code || "network"));
    if (err.code === "no_session") return setTimeout(() => showEntry(), 1500);
  } finally {
    setBusy(false);
    bot.scrollIntoView({ block: "end", behavior: "smooth" });
    if (state.questionsLeft > 0) $("message").focus();
  }
}

function autoGrow() {
  const input = $("message");
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
}

// ---------- Contact et suppression ----------

function setupContact() {
  const { calendly, email, whatsapp } = state.ui.contact;
  $("contact-calendly").href = calendly;
  $("contact-email").href = `mailto:${email}`;
  $("contact-email").textContent = email;
  $("contact-whatsapp").href = whatsapp;
}

async function deleteData() {
  const button = $("delete-confirm");
  button.disabled = true;
  try {
    const res = await fetch("/api/delete", { method: "POST" });
    if (!res.ok) throw new Error("delete");
    $("delete-dialog").close();
    $("messages").replaceChildren();
    state.questionsLeft = null;
    showEntry({ deleted: true });
  } catch {
    $("delete-dialog").close();
    showChatError(errorText("server_error"));
  } finally {
    button.disabled = false;
  }
}

// ---------- Événements ----------

$("lang-toggle").addEventListener("click", () => {
  state.lang = state.lang === "fr" ? "en" : "fr";
  applyLanguage();
});
$("entry-form").addEventListener("input", updateSubmitState);
$("entry-form").addEventListener("submit", submitEntry);
$("composer").addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage($("message").value);
});
$("message").addEventListener("input", autoGrow);
$("message").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    sendMessage($("message").value);
  }
});
$("contact-open").addEventListener("click", () => $("contact-dialog").showModal());
$("delete-open").addEventListener("click", () => $("delete-dialog").showModal());
$("delete-confirm").addEventListener("click", deleteData);
for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog || e.target.closest("[data-close]")) dialog.close();
  });
}

init();
