import { defineEventHandler, getRequestHost, setHeader } from "h3";
import { demoPreviewEnabled, loadDemoPreview, readDemoCatalogue } from "../utils/demo-catalogue.ts";

/** SSR must use the original request's transport, not a synthetic local API call. */
export default defineEventHandler((event) => {
  if (!import.meta.dev) return;
  const pathname = event.path.split("?")[0] ?? "";
  if (pathname !== "/courses" && !pathname.startsWith("/courses/")) return;
  const socket = event.node.req.socket;
  const flag = process.env.SKYINNK_DEMO_PREVIEW;
  const host = getRequestHost(event, { xForwardedHost: false });
  const peer = socket?.remoteAddress;
  const local = socket?.localAddress;
  if (!demoPreviewEnabled(true, flag, host, peer, local)) return;
  setHeader(event, "Cache-Control", "private, no-store");
  setHeader(event, "X-Robots-Tag", "noindex, nofollow");
  event.context.skyinnkDemoCatalogue = () => loadDemoPreview(
    true, flag, host, peer, local,
    async () => {
      const { default: prisma } = await import("../utils/prisma.ts");
      return readDemoCatalogue(prisma);
    },
  );
});
