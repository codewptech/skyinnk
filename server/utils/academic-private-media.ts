import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, join, resolve, sep } from "node:path";
import { matchesResourceFormat } from "../../scripts/validate-public-content.ts";

const extensions: Record<string, string> = {
  "application/pdf":"pdf", "text/plain":"txt", "image/png":"png",
  "image/jpeg":"jpg", "image/webp":"webp",
};
export function academicResourcePath(sha256: string, mimeType: string): string {
  const ext = extensions[mimeType];
  if (!/^[a-f0-9]{64}$/.test(sha256) || !ext) throw new Error("Invalid academic resource metadata");
  return "/resources/public/" + sha256 + "." + ext;
}
/** Read bounded bytes from an operator-configured private content-addressed directory.
 * The operator must keep this directory outside all public/static server roots.
 * No draft or unverified file is exposed by this function alone.
 */
export async function readAcademicAsset(root: string, sha256: string, sizeBytes: number, mimeType: string): Promise<Buffer> {
  const url = academicResourcePath(sha256, mimeType);
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > 25_000_000 || !isAbsolute(root)) throw new Error("Invalid academic resource metadata or storage root");
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Private storage must be a real directory");
  const directory = await realpath(root);
  for (const publicRoot of [resolve("public"), resolve(".output/public")]) {
    let checked = publicRoot;
    try { checked = await realpath(publicRoot); } catch { /* may not exist yet */ }
    if (directory === checked || directory.startsWith(checked + sep)) throw new Error("Academic storage cannot be under a public directory");
  }
  const handle = await open(join(directory,sha256), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size !== sizeBytes) throw new Error("Academic resource size mismatch");
    const bytes = Buffer.alloc(sizeBytes + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const {bytesRead} = await handle.read(bytes,offset,bytes.length-offset,offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const result = bytes.subarray(0,offset);
    if (offset !== sizeBytes || createHash("sha256").update(result).digest("hex") !== sha256 ||
        !matchesResourceFormat(result,url.split(".").at(-1)!.toUpperCase())) throw new Error("Academic resource bytes do not match reviewed metadata");
    return result;
  } finally { await handle.close(); }
}
