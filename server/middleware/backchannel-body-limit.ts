import {
  createError,
  defineEventHandler,
  getRequestURL,
  setResponseHeader,
} from "h3";

// Includes the encoded logout_token and protocol fields; normal signed JWTs fit comfortably.
const maxBytes = 16 * 1024;

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") return;
  const route = useRuntimeConfig(event).public.auth0.routes.backchannelLogout;
  let path: string;
  try {
    path = decodeURIComponent(getRequestURL(event).pathname).replace(
      /\/+$/,
      "",
    );
  } catch {
    return; // Leave malformed URLs to the router's normal handling.
  }
  if (path.toLowerCase() !== route.toLowerCase()) return;

  const reject = () => {
    // Do not keep an HTTP/1 connection with an unread oversized body reusable.
    setResponseHeader(event, "Connection", "close");
    throw createError({ statusCode: 413, statusMessage: "Payload Too Large" });
  };
  const declared = event.node.req.headers["content-length"];
  if (declared !== undefined && Number(declared) > maxBytes) reject();

  const chunks: Buffer[] = [];
  let bytes = 0;
  // Node 24's iterator removes its listeners on return without destroying the socket,
  // so we can send 413 immediately, even when a chunked sender has not ended the body.
  for await (const chunk of event.node.req.iterator({
    destroyOnReturn: false,
  })) {
    bytes += chunk.length;
    if (bytes > maxBytes) reject();
    chunks.push(chunk);
  }
  // Give h3 its supported pre-read body input; the SDK still parses and verifies the token.
  // A byte array stays truthy for an empty chunked body, so h3 never re-reads an ended stream.
  event._requestBody = new Uint8Array(Buffer.concat(chunks, bytes));
});
