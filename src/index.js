// Point d'entrée du Worker. Les pages de public/ sont servies directement par Cloudflare ;
// seules les routes /api/* arrivent ici.
import { getFaq, getUiTexts, getPrivacy } from "./content.js";
import { json } from "./http.js";
import { isSameOrigin } from "./security.js";
import { getSession, createSession, deleteSession } from "./session.js";
import { chat } from "./chat.js";
import { scheduled } from "./scheduled.js";

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const route = `${request.method} ${pathname}`;
    if (request.method === "POST" && !isSameOrigin(request)) return json({ error: "forbidden" }, 403);
    try {
      switch (route) {
        case "GET /api/config":
          return json({
            turnstileSiteKey: env.TURNSTILE_SITE_KEY,
            maxQuestions: Number(env.MAX_QUESTIONS) || 9,
          });
        case "GET /api/ui":
          return json(getUiTexts(env));
        case "GET /api/faq":
          return json(getFaq());
        case "GET /api/privacy":
          return json(getPrivacy(env));
        case "GET /api/session":
          return await getSession(request, env);
        case "POST /api/session":
          return await createSession(request, env, ctx);
        case "POST /api/chat":
          return await chat(request, env, ctx);
        case "POST /api/delete":
          return await deleteSession(request, env);
        default:
          return json({ error: "not_found" }, 404);
      }
    } catch (err) {
      console.error(err);
      return json({ error: "server_error" }, 500);
    }
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(scheduled(controller, env));
  },
};
