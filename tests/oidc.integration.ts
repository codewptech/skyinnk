import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request as httpsRequest } from "node:https";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { SignJWT, generateKeyPair, exportJWK } from "jose";
import { PrismaClient } from "@prisma/client";
import {
  isolatedDatabaseUrl,
  startProductionServer,
} from "./helpers/production.ts";

test(
  "local OIDC login, callback, logout and backchannel signature verification",
  { skip: !process.env.TEST_DATABASE_URL, timeout: 60_000 },
  async () => {
    const temp = await mkdtemp("/tmp/skyinnk-oidc-");
    const keyFile = join(temp, "key.pem"),
      certFile = join(temp, "cert.pem");
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        keyFile,
        "-out",
        certFile,
        "-subj",
        "/CN=localhost",
        "-addext",
        "subjectAltName=DNS:localhost",
        "-days",
        "1",
      ],
      { stdio: "ignore" },
    );
    const cert = await readFile(certFile);
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = {
      ...(await exportJWK(publicKey)),
      kid: "fixture",
      alg: "RS256",
      use: "sig",
    };
    const clientId = "oidc-fixture",
      clientSecret = randomBytes(32).toString("hex");
    const user = {
      sub: `oidc-test|${randomUUID()}`,
      name: "Signed fixture identity",
      email: "oidc@example.invalid",
    };
    let issuer = "",
      origin = "",
      providerError: unknown,
      tokenRequests = 0,
      jwksRequests = 0;
    const codes = new Map<string, string>();
    const provider = createServer(
      { key: await readFile(keyFile), cert },
      async (req, res) => {
        try {
          const url = new URL(req.url!, issuer);
          const json = (body: unknown) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
          };
          if (url.pathname === "/.well-known/openid-configuration")
            return json({
              issuer,
              authorization_endpoint: `${issuer}authorize`,
              token_endpoint: `${issuer}oauth/token`,
              jwks_uri: `${issuer}jwks`,
              end_session_endpoint: `${issuer}oidc/logout`,
              response_types_supported: ["code"],
              subject_types_supported: ["public"],
              id_token_signing_alg_values_supported: ["RS256"],
              token_endpoint_auth_methods_supported: ["client_secret_post"],
              code_challenge_methods_supported: ["S256"],
            });
          if (url.pathname === "/jwks") {
            jwksRequests++;
            return json({ keys: [jwk] });
          }
          if (url.pathname === "/authorize") {
            assert.equal(url.searchParams.get("client_id"), clientId);
            assert.equal(
              url.searchParams.get("redirect_uri"),
              `${origin}/auth/callback`,
            );
            assert.equal(url.searchParams.get("code_challenge_method"), "S256");
            for (const scope of ["openid", "profile", "email"])
              assert.ok(
                url.searchParams.get("scope")!.split(" ").includes(scope),
              );
            const code = randomUUID();
            codes.set(code, url.searchParams.get("code_challenge")!);
            const callback = new URL(`${origin}/auth/callback`);
            callback.searchParams.set("code", code);
            if (url.searchParams.has("state"))
              callback.searchParams.set(
                "state",
                url.searchParams.get("state")!,
              );
            res.writeHead(302, { Location: callback.href });
            return res.end();
          }
          if (url.pathname === "/oauth/token") {
            let body = "";
            for await (const chunk of req) body += chunk;
            const params = new URLSearchParams(body);
            assert.equal(params.get("client_id"), clientId);
            assert.equal(params.get("client_secret"), clientSecret);
            assert.equal(params.get("grant_type"), "authorization_code");
            assert.equal(params.get("redirect_uri"), `${origin}/auth/callback`);
            const code = params.get("code")!;
            assert.ok(codes.has(code));
            assert.equal(
              createHash("sha256")
                .update(params.get("code_verifier")!)
                .digest("base64url"),
              codes.get(code),
            );
            codes.delete(code);
            tokenRequests++;
            const token = await new SignJWT(user)
              .setProtectedHeader({ alg: "RS256", kid: "fixture" })
              .setIssuer(issuer)
              .setAudience(clientId)
              .setIssuedAt()
              .setExpirationTime("1h")
              .sign(privateKey);
            return json({
              access_token: "fixture-private-access-token",
              token_type: "Bearer",
              expires_in: 3600,
              id_token: token,
              scope: "openid profile email",
            });
          }
          res.writeHead(404);
          res.end();
        } catch (error) {
          providerError = error;
          res.writeHead(500);
          res.end("Fixture assertion failed");
        }
      },
    );
    await new Promise<void>((resolve) =>
      provider.listen(0, "127.0.0.1", resolve),
    );
    issuer = `https://localhost:${(provider.address() as { port: number }).port}/`;
    const db = new PrismaClient({ datasourceUrl: isolatedDatabaseUrl() });
    let server: Awaited<ReturnType<typeof startProductionServer>> | undefined;
    try {
      server = await startProductionServer(isolatedDatabaseUrl(), {
        NUXT_AUTH0_DOMAIN: new URL(issuer).host,
        NUXT_AUTH0_CLIENT_ID: clientId,
        NUXT_AUTH0_CLIENT_SECRET: clientSecret,
        NODE_EXTRA_CA_CERTS: certFile,
      });
      origin = server.origin;
      const jar = new Map<string, string>();
      const call = async (path: string, init: RequestInit = {}) => {
        const response = await fetch(origin + path, {
          redirect: "manual",
          signal: AbortSignal.timeout(10_000),
          ...init,
          headers: {
            Accept: "application/json",
            Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
            ...init.headers,
          },
        });
        for (const cookie of response.headers.getSetCookie()) {
          const pair = cookie.split(";")[0]!,
            eq = pair.indexOf("="),
            name = pair.slice(0, eq),
            value = pair.slice(eq + 1);
          if (!value || /Max-Age=0/i.test(cookie)) jar.delete(name);
          else jar.set(name, value);
        }
        assert.equal(
          response.headers.get("cache-control"),
          "private, no-store, max-age=0",
        );
        assert.equal(response.headers.get("cdn-cache-control"), "no-store");
        assert.equal(
          response.headers.get("cloudflare-cdn-cache-control"),
          "no-store",
        );
        return response;
      };
      assert.ok((await call("/auth/callback?code=untrusted")).status >= 400);
      assert.equal(tokenRequests, 0);
      let response = await call(
        "/auth/login?returnTo=https%3A%2F%2Foutside.example.invalid",
      );
      assert.equal(response.status, 302);
      assert.ok(
        response.headers
          .getSetCookie()
          .some((c) => /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c)),
      );
      const authorization = new URL(response.headers.get("location")!);
      assert.equal(authorization.origin, new URL(issuer).origin);
      // Only the local fixture certificate is trusted by this request; TLS verification stays on.
      const callbackUrl = await new Promise<string>((resolve, reject) => {
        const req = httpsRequest(authorization, { ca: cert }, (res) => {
          res.resume();
          resolve(res.headers.location!);
        });
        req.on("error", reject);
        req.end();
      });
      const callback = new URL(callbackUrl);
      response = await call(callback.pathname + callback.search);
      if (providerError) throw providerError;
      assert.equal(response.status, 302);
      assert.equal(
        new URL(response.headers.get("location")!).href,
        origin + "/",
      );
      assert.equal(tokenRequests, 1);
      assert.ok(
        response.headers
          .getSetCookie()
          .some(
            (c) =>
              c.startsWith("__a0_session.") &&
              /Secure/i.test(c) &&
              /HttpOnly/i.test(c) &&
              /SameSite=Lax/i.test(c),
          ),
      );
      response = await call("/auth/profile");
      const profile = await response.json();
      assert.equal(profile.sub, user.sub);
      assert.equal(profile.name, user.name);
      assert.ok(
        !JSON.stringify(profile).includes("fixture-private-access-token"),
      );
      const html = await (await call("/")).text();
      assert.ok(!html.includes(user.sub) && !html.includes(clientSecret));
      response = await call("/api/auth/sync", {
        method: "POST",
        headers: { Origin: origin, "X-Auth0-Sync": "1" },
      });
      assert.equal(response.status, 200);
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { auth0Id: user.sub } }))
          .name,
        user.name,
      );

      const makeLogout = (key: CryptoKey) =>
        new SignJWT({
          sub: user.sub,
          sid: "fixture-session",
          jti: randomUUID(),
          events: { "http://schemas.openid.net/event/backchannel-logout": {} },
        })
          .setProtectedHeader({ alg: "RS256", kid: "fixture" })
          .setIssuer(issuer)
          .setAudience(clientId)
          .setIssuedAt()
          .setExpirationTime("5m")
          .sign(key);
      response = await call("/auth/backchannel-logout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          logout_token: await makeLogout(privateKey),
        }).toString(),
      });
      assert.equal(response.status, 400);
      // Signature/claims verification completed; the existing stateless store cannot revoke by token.
      assert.match(
        (await response.json()).statusMessage,
        /Backchannel logout is not available when using Stateless Storage/,
      );
      assert.ok(jwksRequests > 0);
      const other = await generateKeyPair("RS256");
      response = await call("/auth/backchannel-logout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          logout_token: await makeLogout(other.privateKey),
        }).toString(),
      });
      assert.equal(response.status, 400);
      assert.doesNotMatch(
        (await response.json()).statusMessage,
        /Stateless Storage/,
      );

      const saved = [...jar];
      response = await call("/auth/logout");
      assert.equal(response.status, 302);
      const logout = new URL(response.headers.get("location")!);
      assert.equal(logout.origin, new URL(issuer).origin);
      assert.equal(logout.pathname, "/oidc/logout");
      assert.equal(logout.searchParams.get("post_logout_redirect_uri"), origin);
      assert.ok(![...jar.keys()].some((k) => k.startsWith("__a0_session")));
      assert.equal((await call("/auth/profile")).status, 204);
      const [name, value] = saved.find(([k]) => k.startsWith("__a0_session."))!;
      jar.set(name, value.slice(0, -20) + "tampered-fixture");
      assert.equal((await call("/auth/profile")).status, 204);
      if (providerError) throw providerError;
    } finally {
      await server?.stop();
      await new Promise<void>((resolve) => provider.close(() => resolve()));
      await db.user.deleteMany({ where: { auth0Id: user.sub } });
      await db.$disconnect();
      await rm(temp, { recursive: true, force: true });
    }
  },
);
