import defaultServerEntry from "@tanstack/react-start/server-entry";

type ServerEntry = {
  fetch: (request: Request, env?: unknown, ctx?: unknown) => Promise<Response> | Response;
};

const handler: ServerEntry = (defaultServerEntry as any).default ?? defaultServerEntry;

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      return await handler.fetch(request, env, ctx);
    } catch (error) {
      console.error("[server.ts error]", error);
      return new Response(
        `<!doctype html><meta charset="utf-8"><title>Server error</title><body style="font-family:system-ui;padding:2rem"><h1>Something went wrong</h1><p>Please refresh the page.</p></body>`,
        { status: 500, headers: { "content-type": "text/html; charset=utf-8" } },
      );
    }
  },
};
