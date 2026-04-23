export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env, "cron"));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      });
    }
    if (url.pathname === "/run" && request.method === "POST") {
      const result = await run(env, "manual");
      return new Response(JSON.stringify(result), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("Not found", { status: 404 });
  },
};

async function run(env, source) {
  return {
    ok: true,
    source,
    message: "email-scheduler worker is configured",
    now: new Date().toISOString(),
  };
}
