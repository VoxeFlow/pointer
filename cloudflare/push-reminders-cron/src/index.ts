export interface Env {
  POINTER_APP_URL: string;
  CRON_SECRET: string;
}

type CronExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

async function triggerPushReminders(env: Env) {
  const endpoint = new URL("/api/cron/push-reminders", env.POINTER_APP_URL).toString();

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      authorization: `Bearer ${env.CRON_SECRET}`,
      "user-agent": "Pointer-Cloudflare-Cron/1.0",
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Push reminders cron failed (${response.status}): ${body}`);
  }

  return body;
}

const worker = {
  async scheduled(_controller: unknown, env: Env, ctx: CronExecutionContext) {
    ctx.waitUntil(triggerPushReminders(env));
  },

  async fetch(_request: Request, env: Env) {
    try {
      const body = await triggerPushReminders(env);
      return new Response(body, {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Falha ao acionar lembretes push.",
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/json; charset=utf-8",
          },
        },
      );
    }
  },
};

export default worker;
