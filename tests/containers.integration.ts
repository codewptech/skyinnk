import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdtemp, cp, mkdir, writeFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { sessionCookie } from "./helpers/production.ts";

// This suite never reads production URLs or secrets and never skips missing Docker.
const docker = process.env.DOCKER_BIN || "docker";
async function run(args: string[], env: NodeJS.ProcessEnv = {}) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(docker, args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve(output.trim())
        : reject(new Error(`Docker ${args[0]} failed (${code}):\n${output}`)),
    );
  });
}
async function freePort() {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
}
async function eventually(check: () => Promise<boolean>) {
  for (let i = 0; i < 120; i++) {
    try {
      if (await check()) return;
    } catch {}
    await setTimeout(500);
  }
  throw new Error("Container readiness timed out");
}

test(
  "actual migration/runtime images: native engines, secret boundaries and database behavior",
  { timeout: 900_000 },
  async (t) => {
    await run(["info"]);
    const id = `skyinnk-test-${randomUUID()}`;
    const migration = `${id}:migration`,
      runtime = `${id}:runtime`;
    const pg = `${id}-pg`,
      app = `${id}-app`;
    const context = await mkdtemp("/tmp/skyinnk-container-context-");
    const markers = [randomUUID(), randomUUID()];
    const pgPort = await freePort(),
      appPort = await freePort();
    const origin = `http://127.0.0.1:${appPort}`;
    const secret = randomBytes(64).toString("hex");
    const password = randomBytes(24).toString("hex");
    const database = `postgresql://skyinnk_test:${password}@127.0.0.1:${pgPort}/skyinnk_test`;
    const execNode = (image: string, code: string, extra: string[] = []) =>
      run(["run", "--rm", ...extra, image, "node", "-e", code]);
    const fetchInApp = async (path: string, init: RequestInit = {}) =>
      JSON.parse(
        await run([
          "exec",
          app,
          "node",
          "-e",
          `
    (async () => {const r=await fetch(${JSON.stringify(origin + path)},${JSON.stringify(init)}); console.log(JSON.stringify({status:r.status,headers:Object.fromEntries(r.headers),cookies:r.headers.getSetCookie(),body:await r.text()}));})().catch(e=>{console.error(e);process.exit(1)});
  `,
        ]),
      );
    const assertPrivate = (r: any) => {
      assert.equal(r.headers["cache-control"], "private, no-store, max-age=0");
      assert.equal(r.headers["cdn-cache-control"], "no-store");
      assert.equal(r.headers["cloudflare-cdn-cache-control"], "no-store");
    };
    try {
      // Copy source inputs into a disposable context. Never copy the checkout's actual .env.
      for (const file of [
        "Dockerfile",
        ".dockerignore",
        "package.json",
        "package-lock.json",
        "nuxt.config.ts",
        "tsconfig.json",
        "app",
        "server",
        "prisma",
        "public",
      ])
        await cp(file, join(context, file), { recursive: true });
      await writeFile(
        join(context, ".env"),
        `NUXT_AUTH0_CLIENT_SECRET=${markers[0]}\nNUXT_AUTH0_SESSION_SECRET=${markers[1]}\n`,
      );
      for (const directory of [
        "app/nested",
        "node_modules",
        ".output",
        ".nuxt",
        ".git",
        ".aws",
        "tests",
      ]) {
        await mkdir(join(context, directory), { recursive: true });
        await writeFile(
          join(
            context,
            directory,
            directory === "app/nested" ? ".env.local" : "excluded-sentinel",
          ),
          markers.join("\n"),
        );
      }
      await t.test(
        "build both declared Docker targets from a poisoned disposable context",
        async () => {
          await run([
            "build",
            "--network",
            "host",
            "--target",
            "build",
            "-t",
            migration,
            context,
          ]);
          await run([
            "build",
            "--network",
            "host",
            "--target",
            "runtime",
            "-t",
            runtime,
            context,
          ]);
        },
      );
      await t.test(
        "both images load their native engine and contain no context secret markers",
        async () => {
          for (const [image, client] of [
            [migration, "node_modules/.prisma/client"],
            [runtime, ".output/server/node_modules/.prisma/client"],
          ]) {
            await execNode(
              image!,
              `const fs=require('node:fs'),p=require('node:path');const d=p.resolve(${JSON.stringify(client)});const engine=fs.readdirSync(d).find(f=>f.startsWith('libquery_engine-')&&f.endsWith('.so.node'));if(!engine)throw Error('Missing native engine');require(p.join(d,engine));console.log('Native engine loaded');`,
            );
            await run(["run", "--rm", image!, "openssl", "version"]);
            await execNode(
              image!,
              `
          const fs=require('node:fs'),p=require('node:path'),markers=JSON.parse(process.env.TEST_MARKERS);
          function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=p.join(d,e.name);if(e.name.startsWith('.env')||e.name==='excluded-sentinel')throw Error('Excluded file: '+f);if(e.isDirectory())walk(f);else if(e.isFile()){const b=fs.readFileSync(f);if(markers.some(m=>b.includes(Buffer.from(m))))throw Error('Secret marker in '+f);}}}walk('/app');console.log('Artifact scan passed');
        `,
              ["-e", `TEST_MARKERS=${JSON.stringify(markers)}`],
            );
          }
        },
      );
      await t.test(
        "start disposable PostgreSQL 18 and preserve liveness before schema readiness",
        async () => {
          await run([
            "run",
            "-d",
            "--name",
            pg,
            "--network",
            "host",
            "-e",
            "POSTGRES_USER=skyinnk_test",
            "-e",
            `POSTGRES_PASSWORD=${password}`,
            "-e",
            "POSTGRES_DB=skyinnk_test",
            "postgres:18",
            "postgres",
            "-c",
            "listen_addresses=127.0.0.1",
            "-c",
            `port=${pgPort}`,
          ]);
          await eventually(async () => {
            await run([
              "exec",
              pg,
              "pg_isready",
              "-h",
              "127.0.0.1",
              "-p",
              String(pgPort),
              "-U",
              "skyinnk_test",
            ]);
            return true;
          });
          assert.ok(
            Number(
              await run([
                "exec",
                "-e",
                `PGPASSWORD=${password}`,
                pg,
                "psql",
                "-h",
                "127.0.0.1",
                "-p",
                String(pgPort),
                "-U",
                "skyinnk_test",
                "-Atc",
                "SHOW server_version_num",
              ]),
            ) >= 180000,
          );
          await run([
            "run",
            "-d",
            "--name",
            app,
            "--network",
            "host",
            "-e",
            `DATABASE_URL=${database}`,
            "-e",
            `DIRECT_URL=${database}`,
            "-e",
            `NITRO_PORT=${appPort}`,
            "-e",
            "NUXT_AUTH0_DOMAIN=container.example.invalid",
            "-e",
            "NUXT_AUTH0_CLIENT_ID=container-test",
            "-e",
            `NUXT_AUTH0_CLIENT_SECRET=${randomUUID()}`,
            "-e",
            `NUXT_AUTH0_SESSION_SECRET=${secret}`,
            "-e",
            `NUXT_AUTH0_APP_BASE_URL=${origin}`,
            runtime,
          ]);
          await eventually(
            async () => (await fetchInApp("/api/health")).status === 200,
          );
          const unready = await fetchInApp("/api/ready");
          assert.equal(unready.status, 503);
          assertPrivate(unready);
        },
      );
      await t.test(
        "actual migration image applies migrations; actual runtime synchronizes session identity",
        async () => {
          await run([
            "run",
            "--rm",
            "--network",
            "host",
            "-e",
            `DATABASE_URL=${database}`,
            "-e",
            `DIRECT_URL=${database}`,
            migration,
            "npx",
            "--no-install",
            "prisma",
            "migrate",
            "deploy",
          ]);
          const ready = await fetchInApp("/api/ready");
          assert.equal(ready.status, 200);
          assertPrivate(ready);
          const Cookie = await sessionCookie(secret, {
            sub: id,
            name: "Container identity",
          });
          const synced = await fetchInApp("/api/auth/sync", {
            method: "POST",
            headers: { Cookie, Origin: origin, "X-Auth0-Sync": "1" },
          });
          assert.equal(synced.status, 200);
          assert.deepEqual(JSON.parse(synced.body), { synced: true });
          assertPrivate(synced);
          const row = JSON.parse(
            await run([
              "exec",
              app,
              "node",
              "-e",
              `const {PrismaClient}=require('./.output/server/node_modules/@prisma/client');const p=new PrismaClient();p.user.findUniqueOrThrow({where:{auth0Id:${JSON.stringify(id)}}}).then(r=>console.log(JSON.stringify({name:r.name,id:r.id}))).finally(()=>p.$disconnect());`,
            ]),
          );
          assert.equal(row.name, "Container identity");
          assert.equal(row.id.split("-")[2][0], "7");
          const expired = await sessionCookie(secret, { sub: id }, "envelope");
          const denied = await fetchInApp("/api/auth/sync", {
            method: "POST",
            headers: { Cookie: expired, Origin: origin, "X-Auth0-Sync": "1" },
          });
          assert.equal(denied.status, 401);
          assertPrivate(denied);
          assert.ok(denied.cookies.some((c: string) => /Max-Age=0/i.test(c)));
          const oversized = await fetchInApp("/auth/backchannel-logout", {
            method: "POST",
            body: "x".repeat(16 * 1024 + 1),
          });
          assert.equal(oversized.status, 413);
          assertPrivate(oversized);
          const html = await fetchInApp("/");
          assert.equal(html.status, 200);
          assertPrivate(html);
          assert.ok(!html.body.includes(secret));
          const asset = html.body.match(
            /(?:src|href)="([^"?#]*\/_nuxt\/[^"?#]+\.js)"/,
          )[1];
          const publicAsset = await fetchInApp(asset);
          assert.equal(publicAsset.status, 200);
          assert.match(
            publicAsset.headers["cache-control"],
            /public.*immutable/,
          );
        },
      );
      await t.test(
        "readiness fails during a database outage while public liveness stays available",
        async () => {
          await run(["stop", "--time", "5", pg]);
          const unready = await fetchInApp("/api/ready");
          assert.equal(unready.status, 503);
          assertPrivate(unready);
          assert.equal((await fetchInApp("/api/health")).status, 200);
          assert.equal((await fetchInApp("/")).status, 200);
          await run(["start", pg]);
          await eventually(
            async () => (await fetchInApp("/api/ready")).status === 200,
          );
        },
      );
    } finally {
      await Promise.allSettled([
        run(["rm", "-fv", app]),
        run(["rm", "-fv", pg]),
      ]);
      await Promise.allSettled([run(["image", "rm", migration, runtime])]);
      await rm(context, { recursive: true, force: true });
    }
  },
);
