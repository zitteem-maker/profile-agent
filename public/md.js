// Rendu Markdown minimal et sûr (tout le HTML d'origine est échappé).
// Gère : titres, paragraphes, listes, citations, séparateurs, gras, code, liens, URL et emails.

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function link(href, label) {
  const external = /^https?:/i.test(href);
  const attrs = external ? ' target="_blank" rel="noopener"' : "";
  return `<a href="${escapeHtml(href)}"${attrs}>${label}</a>`;
}

function inline(text) {
  const tokens = [];
  const keep = (html) => `\u0000${tokens.push(html) - 1}\u0000`;
  let s = text
    .replace(/`([^`]+)`/g, (_, code) => keep(`<code>${escapeHtml(code)}</code>`))
    .replace(/\[([^\]]+)\]\(((?:https?:|mailto:)[^)\s]+)\)/gi, (_, label, href) => keep(link(href, escapeHtml(label))))
    .replace(/https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/gi, (url) => keep(link(url, escapeHtml(url))))
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, (mail) => keep(link(`mailto:${mail}`, escapeHtml(mail))));
  s = escapeHtml(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)]);
}

export function renderMarkdown(src, { headingOffset = 0 } = {}) {
  const out = [];
  let paragraph = [];
  let list = null; // "ul" | "ol"
  let quote = [];

  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(inline).join("<br>")}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote>${renderMarkdown(quote.join("\n"), { headingOffset })}</blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    closeList();
    flushQuote();
  };

  for (const raw of String(src).replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^\s*>\s?(.*)$/))) {
      flushParagraph();
      closeList();
      quote.push(m[1]);
      continue;
    }
    flushQuote();
    if (!line.trim()) {
      flushParagraph();
      closeList();
    } else if (/^\s*-{3,}\s*$/.test(line)) {
      flushAll();
      out.push("<hr>");
    } else if ((m = line.match(/^(#{1,6})\s+(.+)$/))) {
      flushAll();
      const level = Math.min(6, m[1].length + headingOffset);
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if ((m = line.match(/^\s*[-*]\s+(.+)$/)) || (m = line.match(/^\s*\d+[.)]\s+(.+)$/))) {
      flushParagraph();
      const type = /^\s*\d/.test(line) ? "ol" : "ul";
      if (list !== type) {
        closeList();
        out.push(`<${type}>`);
        list = type;
      }
      out.push(`<li>${inline(m[1])}</li>`);
    } else {
      closeList();
      paragraph.push(line.trim());
    }
  }
  flushAll();
  return out.join("");
}
