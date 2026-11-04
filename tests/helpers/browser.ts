import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";

export async function openBrowser(executable: string) {
  const profile = await mkdtemp("/tmp/skyinnk-sync-browser-");
  const browser = spawn(
    executable,
    [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-background-networking",
      "--no-first-run",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const endpoint = await new Promise<string>((resolve, reject) => {
    let output = "";
    const timer = setTimeout(
      () => reject(new Error("Browser startup timed out")),
      15000,
    );
    browser.once("error", reject);
    browser.stderr.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]!);
      }
    });
  });
  const socket = new WebSocket(endpoint);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  const listeners = new Map<string, ((params: any) => void)[]>();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const request = pending.get(message.id);
      if (request) {
        pending.delete(message.id);
        clearTimeout(request.timer);
        message.error
          ? request.reject(new Error(JSON.stringify(message.error)))
          : request.resolve(message.result);
      }
    }
    for (const listener of listeners.get(message.method) ?? [])
      listener(message.params);
  });
  const rpc = (method: string, params = {}, sessionId?: string) =>
    new Promise<any>((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Browser command timed out: ${method}`));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
      socket.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      );
    });
  const { targetId } = await rpc("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await rpc("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  return {
    send: (method: string, params = {}) => rpc(method, params, sessionId),
    on(method: string, listener: (params: any) => void) {
      const list = listeners.get(method) ?? [];
      list.push(listener);
      listeners.set(method, list);
    },
    async evaluate(expression: string) {
      const response = await rpc(
        "Runtime.evaluate",
        { expression, awaitPromise: true, returnByValue: true },
        sessionId,
      );
      if (response.exceptionDetails)
        throw new Error(
          "Browser evaluation failed: " + response.exceptionDetails.text,
        );
      return response.result.value;
    },
    async close() {
      socket.close();
      browser.kill();
      await new Promise<void>((resolve) =>
        browser.exitCode !== null
          ? resolve()
          : browser.once("exit", () => resolve()),
      );
      // Chrome subprocesses can briefly keep writing after the main process exits.
      await rm(profile, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    },
  };
}
