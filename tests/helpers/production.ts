import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes, randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { StatelessStateStore } from "@auth0/auth0-server-js";
import type { UserClaims } from "@auth0/auth0-server-js";

export async function sessionCookie(
  secret: string,
  user: UserClaims,
  expired: boolean | "envelope" = false,
) {
  const values: Record<string, string> = {};
  const store = new StatelessStateStore(
    { secret },
    {
      setCookie: (name, value) => {
        values[name] = value;
      },
      getCookie: (name) => values[name],
      getCookies: () => values,
      deleteCookie: (name) => {
        delete values[name];
      },
    },
  );
  const data = {
    user,
    tokenSets: [],
    idToken: undefined,
    refreshToken: undefined,
    internal: { sid: randomUUID(), createdAt: Math.floor(Date.now() / 1000) },
    ...(expired === true
      ? { sessionExpiresAt: Math.floor(Date.now() / 1000) - 60 }
      : {}),
  };
  if (expired === "envelope") {
    // Real authenticated JWE, expired beyond the SDK's 15-second tolerance; no global clock mock.
    const encrypted = await store.encrypt(
      "__a0_session",
      data,
      Math.floor(Date.now() / 1000) - 60,
    );
    for (let i = 0; i * 3072 < encrypted.length; i++)
      values[`__a0_session.${i}`] = encrypted.slice(i * 3072, (i + 1) * 3072);
  } else await store.set("__a0_session", data);
  return Object.entries(values)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("; ");
}

export function isolatedDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url)
    throw new Error(
      "Set TEST_DATABASE_URL to the migrated isolated PostgreSQL 18 database",
    );
  if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname))
    throw new Error("Tests never use production databases");
  return url;
}

export async function startProductionServer(
  databaseUrl = isolatedDatabaseUrl(),
  runtimeEnv: Record<string, string> = {},
) {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const secret = randomBytes(64).toString("hex");
  const app = spawn(process.execPath, [".output/server/index.mjs"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: databaseUrl,
      DIRECT_URL: databaseUrl,
      HOST: "127.0.0.1",
      PORT: String(port),
      NITRO_HOST: "127.0.0.1",
      NITRO_PORT: String(port),
      NUXT_AUTH0_DOMAIN: "local-fixture.example.invalid",
      NUXT_AUTH0_CLIENT_ID: "local-fixture-client",
      NUXT_AUTH0_CLIENT_SECRET: randomBytes(32).toString("hex"),
      NUXT_AUTH0_SESSION_SECRET: secret,
      NUXT_AUTH0_APP_BASE_URL: origin,
      ...runtimeEnv,
    },
    stdio: ["ignore", "ignore", "ignore"],
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (app.exitCode !== null)
      throw new Error(`Production fixture exited: ${app.exitCode}`);
    try {
      if ((await fetch(`${origin}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await setTimeout(100);
  }
  if (!ready) {
    app.kill();
    throw new Error("Production fixture startup timed out");
  }
  return {
    origin,
    cookie: (user: UserClaims, expired: boolean | "envelope" = false) =>
      sessionCookie(secret, user, expired),
    async stop() {
      app.kill("SIGTERM");
      await new Promise<void>((resolve) =>
        app.exitCode !== null ? resolve() : app.once("exit", () => resolve()),
      );
    },
  };
}
