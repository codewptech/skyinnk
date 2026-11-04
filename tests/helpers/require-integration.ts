import { accessSync, constants } from "node:fs";
import { spawnSync } from "node:child_process";
import { isolatedDatabaseUrl } from "./production.ts";

// The full suite must fail rather than silently skip unavailable integrations.
isolatedDatabaseUrl();
accessSync(
  process.env.CHROME_BIN || "/opt/google/chrome/chrome",
  constants.X_OK,
);
for (const [command, args] of [
  ["openssl", ["version"]],
  [
    process.env.DOCKER_BIN || "docker",
    ["info", "--format", "{{.ServerVersion}}"],
  ],
] as const) {
  const result = spawnSync(command, [...args], {
    encoding: "utf8",
    timeout: 15_000,
  });
  if (result.status !== 0)
    throw new Error(
      `Full integration requires working ${command}: ${result.error?.message ?? result.stderr}`,
    );
}
