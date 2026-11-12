/** Standalone, metadata-only GitHub App webhook server. Deploy independently. */
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { GithubAppClient, evaluateOpenPulls, verifySignature } from './github-app.mjs';
import { REPOSITORY } from './policy.mjs';

const MAX_BODY_BYTES = 1024 * 1024;

export function webhookServer({ secret, repository, installationId, evaluate, log = console }) {
  if (!secret || secret.length < 20) throw new Error('Long webhook secret required');
  if (repository !== REPOSITORY) throw new Error('Wrong fixed repository');
  if (!/^\d+$/.test(String(installationId))) throw new Error('Expected GitHub installation required');
  // All reconciliations serialize so a delayed evaluation cannot replace a newer result.
  let queue = Promise.resolve();
  let lastSuccessAt = null;
  function enqueue(reason) {
    queue = queue.then(async () => {
      const results = await evaluate();
      lastSuccessAt = new Date().toISOString();
      log.info('trusted governance evaluated', reason, results.map(r => ({ number: r.number, ok: r.ok, skipped: !!r.skipped })));
    }).catch(error => {
      // A failed scan MUST NOT publish a success. Next webhook/periodic scan retries.
      log.error('trusted governance scan failed', String(error.message || error));
    });
    return queue;
  }
  const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ status: 'up', lastSuccessAt })); return;
    }
    if (req.method !== 'POST' || req.url !== '/github/webhook') {
      res.writeHead(404); res.end(); return;
    }
    let body;
    try {
      const chunks = []; let size = 0;
      for await (const part of req) {
        size += part.length;
        if (size > MAX_BODY_BYTES) throw new Error('oversized');
        chunks.push(part);
      }
      body = Buffer.concat(chunks);
    } catch {
      res.writeHead(413); res.end(); return;
    }
    if (!verifySignature(secret, body, req.headers['x-hub-signature-256'])) {
      res.writeHead(401); res.end(); return;
    }
    let data;
    try { data = JSON.parse(body.toString('utf8')); }
    catch { res.writeHead(400); res.end(); return; }
    if (data.repository?.full_name !== repository ||
        data.installation?.id !== Number(installationId)) {
      res.writeHead(403); res.end(); return;
    }
    const event = req.headers['x-github-event'];
    if (!['pull_request', 'issues', 'push'].includes(event)) {
      res.writeHead(202); res.end(); return;
    }
    // Ignore pushes outside the integration ref. Never run PR-controlled code.
    if (event === 'push' && data.ref !== 'refs/heads/development/v1-public-launch') {
      res.writeHead(202); res.end(); return;
    }
    res.writeHead(202); res.end();
    enqueue(event);
  });
  return { server, enqueue, waitUntilIdle: () => queue };
}

export function runFromEnvironment(env = process.env) {
  const repository = env.GITHUB_REPOSITORY;
  if (repository !== REPOSITORY) throw new Error('GITHUB_REPOSITORY mismatch');
  const client = new GithubAppClient({
    appId: env.GITHUB_APP_ID,
    privateKey: (env.GITHUB_APP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    installationId: env.GITHUB_APP_INSTALLATION_ID,
    repository,
  });
  const port = Number(env.PORT || 8080);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const { server, enqueue } = webhookServer({
    secret: env.GITHUB_WEBHOOK_SECRET,
    repository, installationId: env.GITHUB_APP_INSTALLATION_ID,
    evaluate: () => evaluateOpenPulls(client),
  });
  server.listen(port, env.LISTEN_HOST || '0.0.0.0', () => {
    console.info('trusted governance webhook listening', port);
    enqueue('initial');
  });
  const interval = setInterval(() => enqueue('periodic'), 5 * 60 * 1000);
  const stop = () => { clearInterval(interval); server.close(); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runFromEnvironment();
}
