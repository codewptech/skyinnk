import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const approvedPublicPath =
  /^\/resources\/public\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(pdf|txt|png|jpg|jpeg|webp)$/;

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
    throw new TypeError(
      "Public URL must be a safe /resources/public/ path with an approved file extension",
    );
  }
  const extension = extname(localFile).slice(1).toLowerCase();
  if (extension !== match[1]) {
    throw new TypeError(
      "Local file extension must match the intended public resource URL",
    );
  }

  const filePath = resolve(localFile);
  const before = await lstat(filePath, { bigint: true });
  if (!before.isFile() || before.size <= 0n) {
    throw new TypeError(
      "Input must be a nonempty regular file, not a symlink or directory",
    );
  }

  if (before.size > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Input file is too large to report an exact size");
  }
  // Keep one descriptor open; a substituted FIFO must not block a POSIX open.
  const handle = await open(
    filePath,
    constants.O_RDONLY |
      (constants.O_NOFOLLOW ?? 0) |
      (constants.O_NONBLOCK ?? 0),
  );
  const sameFile = (item) =>
    item.isFile() &&
    item.dev === before.dev &&
    item.ino === before.ino &&
    item.size === before.size &&
    item.mtimeNs === before.mtimeNs &&
    item.ctimeNs === before.ctimeNs;
  try {
    const opened = await handle.stat({ bigint: true });
    if (!sameFile(opened)) {
      throw new Error(
        "Input file changed while being opened; inspect the final approved bytes again",
      );
    }

    let sizeBytes = 0;
    const digest = createHash("sha256");
    for await (const chunk of handle.createReadStream({
      autoClose: false,
      start: 0,
      end: Number(before.size) - 1,
    })) {
      sizeBytes += chunk.length;
      if (!Number.isSafeInteger(sizeBytes)) {
        throw new Error("Input file is too large to report an exact size");
      }
      digest.update(chunk);
    }

    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(filePath, { bigint: true });
    if (
      ![after, pathAfter].every(sameFile) ||
      BigInt(sizeBytes) !== before.size
    ) {
      throw new Error(
        "Input file changed during inspection; inspect the final approved bytes again",
      );
    }

    return {
      url: publicUrl,
      type: match[1].toUpperCase(),
      sizeBytes,
      sha256: digest.digest("hex"),
    };
  } finally {
    await handle.close();
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const [localFile, publicUrl, ...extra] = process.argv.slice(2);
  if (!localFile || !publicUrl || extra.length) {
    console.error(
      'Usage: node scripts/inspect-public-resource.mjs "local-file" "/resources/public/name.ext"',
    );
    process.exitCode = 2;
  } else {
    try {
      console.log(
        JSON.stringify(
          await inspectPublicResource(localFile, publicUrl),
          null,
          2,
        ),
      );
    } catch (error) {
      console.error(
        "Resource inspection failed: " +
          (error instanceof Error ? error.message : String(error)),
      );
      process.exitCode = 1;
    }
  }
}
