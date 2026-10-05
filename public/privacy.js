import { renderMarkdown } from "/md.js";

// Affiche content/politique-confidentialite.md tel quel : l'en-tête, puis la section de la langue choisie.
let lang = (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
let parts = null;

const LABELS = {
  fr: { sub: "Agent de profil", back: "← Retour à l'agent", error: "La politique n'a pas pu se charger." },
  en: { sub: "Profile agent", back: "← Back to the agent", error: "The policy couldn't load." },
};

function split(markdown) {
  const fr = markdown.search(/^## Français\s*$/m);
  const en = markdown.search(/^## English\s*$/m);
  if (fr < 0 || en < 0) return { header: "", fr: markdown, en: markdown };
  return {
    header: markdown.slice(0, fr).replace(/\n-{3,}\s*$/, ""),
    fr: markdown.slice(fr, en).replace(/\n-{3,}\s*$/, ""),
    en: markdown.slice(en),
  };
}

function render() {
  document.documentElement.lang = lang;
  document.getElementById("lang-toggle").textContent = lang === "fr" ? "EN" : "FR";
  document.getElementById("brand-sub").textContent = LABELS[lang].sub;
  document.getElementById("back").textContent = LABELS[lang].back;
  if (parts) document.getElementById("doc").innerHTML = renderMarkdown(`${parts.header}\n\n${parts[lang]}`);
}

document.getElementById("lang-toggle").addEventListener("click", () => {
  lang = lang === "fr" ? "en" : "fr";
  render();
});

render();
try {
  const res = await fetch("/api/privacy");
  if (!res.ok) throw new Error(String(res.status));
  parts = split((await res.json()).markdown);
  render();
} catch {
  document.getElementById("doc").textContent = LABELS[lang].error;
}
