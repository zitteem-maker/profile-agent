import { renderMarkdown } from "/md.js";

// Page « Comment cet agent est construit » : contenu dans construction.fr.md et construction.en.md.
let lang = (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
const cache = {};

const LABELS = {
  fr: { sub: "Agent de profil", back: "← Retour à l'agent", error: "La page n'a pas pu se charger." },
  en: { sub: "Profile agent", back: "← Back to the agent", error: "The page couldn't load." },
};

async function render() {
  document.documentElement.lang = lang;
  document.getElementById("lang-toggle").textContent = lang === "fr" ? "EN" : "FR";
  document.getElementById("brand-sub").textContent = LABELS[lang].sub;
  document.getElementById("back").textContent = LABELS[lang].back;
  try {
    if (!cache[lang]) {
      const res = await fetch(`/construction.${lang}.md`);
      if (!res.ok) throw new Error(String(res.status));
      cache[lang] = await res.text();
    }
    document.getElementById("doc").innerHTML = renderMarkdown(cache[lang]);
  } catch {
    document.getElementById("doc").textContent = LABELS[lang].error;
  }
}

document.getElementById("lang-toggle").addEventListener("click", () => {
  lang = lang === "fr" ? "en" : "fr";
  render();
});

render();
