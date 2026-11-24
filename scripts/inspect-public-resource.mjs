import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const approvedPublicPath = /^\/resources\/public\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(pdf|txt|png|jpg|jpeg|webp)$/;

/**
 * Prepare candidate byte metadata. Does not approve, copy, or publish content.
 * Resource format signatures and rights remain subject to separate checks.
 */
export async function inspectPublicResource(localFile, publicUrl) {
  if (typeof localFile !== "string" || !localFile.trim()) {
    throw new TypeError("Provide a local file path");
  }
  if (typeof publicUrl !== "string") {
    throw new TypeError("Provide the intended public resource URL");
  }
  const match = approvedPublicPath.exec(publicUrl);
  if (!match) {
    throw new TypeError("Public URL must be a safe /resources/public/ path with an approved file extension");
  }
  const extension = extname(localFile).slice(1).toLowerCase();
  if (extension !== match[1]) {
    throw new TypeError("Local file extension must match the intended public resource URL");
  }

  const filePath = resolve(localFile);
  const before = await lstat(filePath);
  if (!before.isFile() || before.size <= 0) {
    throw new TypeError("Input must be a nonempty regular file, not a symlink or directory");
  }

  let sizeBytes = 0;
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) {
    sizeBytes += chunk.length;
    digest.update(chunk);
  }
  const after = await lstat(filePath);
  if (
    !after.isFile() ||
    after.ino !== before.ino ||
    after.size !== before.size ||
    after.mtimeMs !== before.mtimeMs ||
    sizeBytes !== before.size
  ) {
    throw new Error("Input file changed during inspection; inspect the approved final bytes again");
  }

  return {
    url: publicUrl,
    type: match[1].toUpperCase(),
    sizeBytes,
    sha256: digest.digest("hex"),
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const [localFile, publicUrl, ...extra] = process.argv.slice(2);
  if (!localFile || !publicUrl || extra.length) {
    console.error('Usage: node scripts/inspect-public-resource.mjs "local-file" "/resources/public/name.ext"');
    process.exitCode = 2;
  } else {
    try {
      console.log(JSON.stringify(await inspectPublicResource(localFile, publicUrl), null, 2));
    } catch (error) {
      console.error("Resource inspection failed: " + (error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  }
}
