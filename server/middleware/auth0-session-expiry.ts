import {
  defineEventHandler,
  deleteCookie,
  parseCookies,
  type H3Event,
} from "h3";
import type { Auth0ClientOptions } from "@auth0/auth0-nuxt";
import type { ServerClient } from "@auth0/auth0-server-js";
import { readWithSessionExpiry } from "../utils/session-expiry.ts";

export default defineEventHandler((event) => {
  const options = event.context.auth0ClientOptions as Auth0ClientOptions;
  const identifier = options.stateIdentifier || "__a0_session";
  const names = Object.keys(parseCookies(event)).filter((name) =>
    name.startsWith(identifier),
  );
  if (!names.length) return;

  // Initialize the SDK's request-scoped client; its routes and verification stay intact.
  useAuth0(event);
  const client = event.context.auth0Client as ServerClient<{ event: H3Event }>;
  const cookie = options.sessionConfiguration?.cookie;
  const clear = () => {
    for (const name of names) {
      deleteCookie(event, name, {
        path: cookie?.path ?? "/",
        secure: cookie?.secure ?? true,
        httpOnly: true,
        sameSite: cookie?.sameSite ?? "lax",
      });
    }
  };
  const getSession = client.getSession.bind(client);
  const getUser = client.getUser.bind(client);
  client.getSession = (...args) =>
    readWithSessionExpiry(() => getSession(...args), clear);
  client.getUser = (...args) =>
    readWithSessionExpiry(() => getUser(...args), clear);
});
