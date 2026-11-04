import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { PrismaClient } from "@prisma/client";
import { openBrowser } from "./helpers/browser.ts";
import {
  isolatedDatabaseUrl,
  startProductionServer,
} from "./helpers/production.ts";

const executable = process.env.CHROME_BIN || "/opt/google/chrome/chrome";
async function until(check: () => unknown | Promise<unknown>) {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await setTimeout(50);
  }
  throw new Error("Browser condition timed out");
}

test(
  "real browser SDK initialization, scoped synchronization and public-page resilience",
  { skip: !process.env.TEST_DATABASE_URL || !existsSync(executable) },
  async (t) => {
    const db = new PrismaClient({ datasourceUrl: isolatedDatabaseUrl() });
    const [version] = await db.$queryRaw<
      { version: number }[]
    >`SELECT current_setting('server_version_num')::int AS version`;
    assert.ok(version!.version >= 180000);
    const server = await startProductionServer();
    const browser = await openBrowser(executable);
    const prefix = `browser-test|${randomUUID()}`;
    const a = {
      sub: prefix,
      name: "Browser Test User",
      email: "browser@example.invalid",
      picture: `${server.origin}/favicon.ico`,
    };
    const b = { sub: `${prefix}-b`, name: "Second User" };
    const profileRequests: string[] = [];
    const syncRequests: string[] = [];
    const syncResponses: number[] = [];
    const exceptions: unknown[] = [];
    const paused: string[] = [];
    browser.on("Runtime.exceptionThrown", (e) =>
      exceptions.push(e.exceptionDetails.text),
    );
    browser.on("Network.requestWillBeSent", (e) => {
      const path = new URL(e.request.url).pathname;
      if (path === "/api/auth/sync") {
        assert.equal(e.request.method, "POST");
        syncRequests.push(e.requestId);
      }
      if (path === "/auth/profile") profileRequests.push(e.requestId);
    });
    browser.on("Network.responseReceived", (e) => {
      if (new URL(e.response.url).pathname === "/api/auth/sync")
        syncResponses.push(e.response.status);
    });
    browser.on("Fetch.requestPaused", (e) => paused.push(e.requestId));
    const setCookie = async (cookie: string, origin = server.origin) => {
      await browser.send("Network.clearBrowserCookies");
      await browser.send("Network.setCookies", {
        cookies: cookie.split("; ").map((pair) => {
          const eq = pair.indexOf("=");
          return {
            name: pair.slice(0, eq),
            value: pair.slice(eq + 1),
            url: origin,
            path: "/",
            httpOnly: true,
            sameSite: "Lax",
          };
        }),
      });
    };
    const releaseProfile = async () => {
      await until(() => paused.length);
      await browser.send("Fetch.continueRequest", {
        requestId: paused.shift()!,
      });
    };
    const nuxt =
      "document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$nuxt";
    const router =
      "document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router";
    try {
      await browser.send("Page.enable");
      await browser.send("Runtime.enable");
      await browser.send("Network.enable");
      await browser.send("Fetch.enable", {
        patterns: [{ urlPattern: "*/auth/profile", requestStage: "Response" }],
      });
      await t.test(
        "anonymous page makes no sync request; delayed SDK profile is awaited",
        async () => {
          await browser.send("Page.navigate", { url: server.origin + "/" });
          await until(() => paused.length);
          assert.equal(syncRequests.length, 0);
          await releaseProfile();
          await setTimeout(150);
          assert.equal(syncRequests.length, 0);
          assert.equal(profileRequests.length, 1);
          assert.equal(
            await browser.evaluate("document.querySelector('h1').textContent"),
            "Coming Soon...",
          );
          await setCookie(await server.cookie(a));
          await browser.send("Page.navigate", { url: server.origin + "/" });
          await until(() => paused.length);
          await setTimeout(150);
          assert.equal(syncRequests.length, 0);
          assert.equal(await db.user.count({ where: { auth0Id: prefix } }), 0);
          await releaseProfile();
          await until(() => syncResponses.length === 1);
          assert.equal(syncRequests.length, 1);
          assert.equal(syncResponses[0], 200);
          assert.equal(await db.user.count({ where: { auth0Id: prefix } }), 1);
          assert.equal(
            await browser.evaluate(
              "document.querySelector('.profile-name')?.textContent",
            ),
            a.name,
          );
        },
      );
      await t.test(
        "responsive UI stays balanced after authenticated client profile loading",
        async () => {
          for (const [width, height] of [
            [320, 568],
            [390, 844],
            [768, 1024],
            [1440, 900],
          ]) {
            await browser.send("Emulation.setDeviceMetricsOverride", {
              width,
              height,
              deviceScaleFactor: 1,
              mobile: width < 768,
            });
            assert.equal(
              await browser.evaluate(
                "document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight",
              ),
              false,
            );
            const screenshot = await browser.send("Page.captureScreenshot", {
              format: "png",
            });
            if (width === 390)
              await writeFile(
                "/tmp/skyinnk-sync-mobile.png",
                Buffer.from(screenshot.data, "base64"),
              );
          }
          assert.equal(syncRequests.length, 1);
        },
      );
      await t.test(
        "navigation freshness skips database updates and account switches are identity-scoped",
        async () => {
          await browser.evaluate(
            `${router}.addRoute({path:'/non-eligible-test',component:{render:()=>null},meta:{}})`,
          );
          const original = await db.user.findUniqueOrThrow({
            where: { auth0Id: prefix },
          });
          await browser.evaluate(`${router}.push('/non-eligible-test')`);
          await browser.evaluate(`${router}.push('/')`);
          await setTimeout(100);
          assert.equal(syncRequests.length, 1);
          assert.equal(
            (
              await db.user.findUniqueOrThrow({ where: { auth0Id: prefix } })
            ).updatedAt.getTime(),
            original.updatedAt.getTime(),
          );
          await browser.evaluate(`${router}.push('/non-eligible-test')`);
          await setCookie(await server.cookie(b));
          await browser.evaluate(
            `(() => { const state = ${nuxt}.payload.state; const key = Object.keys(state).find(k => k.endsWith("auth0_user")); if (!key) throw new Error("SDK state missing"); state[key] = ${JSON.stringify(b)}; })()`,
          );
          await setTimeout(100);
          assert.equal(syncRequests.length, 1);
          await browser.evaluate(`${router}.push('/')`);
          await until(() => syncResponses.length === 2);
          assert.equal(syncResponses[1], 200);
          assert.equal(await db.user.count({ where: { auth0Id: b.sub } }), 1);
          await setCookie(await server.cookie(a));
          await browser.evaluate(
            `(() => { const state = ${nuxt}.payload.state; const key = Object.keys(state).find(k => k.endsWith("auth0_user")); if (!key) throw new Error("SDK state missing"); state[key] = ${JSON.stringify(a)}; })()`,
          );
          await until(() => syncResponses.length === 3);
          assert.equal(syncResponses[2], 200);
        },
      );
      await t.test(
        "database outage cannot block or redirect the public homepage",
        async () => {
          const unavailable = await startProductionServer(
            "postgresql://test@127.0.0.1:1/unavailable?connect_timeout=1",
          );
          try {
            await setCookie(await unavailable.cookie(a), unavailable.origin);
            await browser.send("Page.navigate", {
              url: unavailable.origin + "/",
            });
            await releaseProfile();
            await until(() => syncResponses.length === 4);
            assert.equal(syncResponses[3], 503);
            assert.equal(
              await browser.evaluate(
                "document.querySelector('h1').textContent",
              ),
              "Coming Soon...",
            );
            assert.equal(await browser.evaluate("location.pathname"), "/");
          } finally {
            await unavailable.stop();
          }
        },
      );
      await t.test(
        "429 respects Retry-After in the real client and leaves the public page authenticated",
        async () => {
          const limited = { sub: `${prefix}-rate`, name: "Rate Limited User" };
          const cookie = await server.cookie(limited);
          const init = {
            method: "POST",
            headers: {
              Origin: server.origin,
              "X-Auth0-Sync": "1",
              Cookie: cookie,
            },
          };
          for (let i = 0; i < 10; i++)
            assert.equal(
              (await fetch(server.origin + "/api/auth/sync", init)).status,
              200,
            );
          const before = syncResponses.length;
          await browser.send("Page.addScriptToEvaluateOnNewDocument", {
            source:
              "window.__rateLimitNow = Date.now(); Date.now = () => window.__rateLimitNow;",
          });
          await setCookie(cookie);
          await browser.send("Page.navigate", { url: server.origin + "/" });
          await releaseProfile();
          await until(() => syncResponses.length === before + 1);
          assert.equal(syncResponses[before], 429);
          assert.equal(
            await browser.evaluate("document.querySelector('h1').textContent"),
            "Coming Soon...",
          );
          assert.equal(
            await browser.evaluate(
              "document.querySelector('.profile-name').textContent",
            ),
            limited.name,
          );
          await browser.evaluate(
            `${router}.addRoute({path:'/non-eligible-test',component:{render:()=>null},meta:{}})`,
          );
          await browser.evaluate("window.__rateLimitNow += 30000");
          await browser.evaluate(`${router}.push('/non-eligible-test')`);
          await browser.evaluate(`${router}.push('/')`);
          await setTimeout(100);
          assert.equal(syncResponses.length, before + 1);
          await browser.evaluate("window.__rateLimitNow += 31000");
          await browser.evaluate(`${router}.push('/non-eligible-test')`);
          await browser.evaluate(`${router}.push('/')`);
          await until(() => syncResponses.length === before + 2);
          // Only the browser clock advanced: the real server correctly still denies it.
          assert.equal(syncResponses[before + 1], 429);
          assert.equal(await browser.evaluate("location.pathname"), "/");
        },
      );
      assert.deepEqual(exceptions, []);
    } finally {
      await browser.close();
      await server.stop();
      await db.user.deleteMany({ where: { auth0Id: { startsWith: prefix } } });
      await db.$disconnect();
    }
  },
);
