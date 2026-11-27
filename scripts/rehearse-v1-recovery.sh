#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo 'Usage: bash scripts/rehearse-v1-recovery.sh PRIOR_LOCAL_IMAGE [CANDIDATE_LOCAL_IMAGE]' >&2
  exit 2
fi

root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
export LC_ALL=C
# Only the local Unix socket, already-present images and an isolated network.
unset DOCKER_HOST DOCKER_CONTEXT
docker_local=(docker --host unix:///var/run/docker.sock)
prior_image="$("${docker_local[@]}" image inspect --format '{{.Id}}' -- "$1")"
candidate_image="$("${docker_local[@]}" image inspect --format '{{.Id}}' -- "${2:-$1}")"
pg_image="$("${docker_local[@]}" image inspect --format '{{.Id}}' -- postgres:18-bookworm)"
network="skyinnk-recovery-$$-$RANDOM"
db="$network-db"
previous="$network-previous"
candidate="$network-candidate"
restored="$network-restored"

"${docker_local[@]}" network create --internal "$network" >/dev/null
containers=()
cleanup() {
  for container in "${containers[@]}"; do
    "${docker_local[@]}" stop "$container" >/dev/null 2>&1 || true
  done
  "${docker_local[@]}" network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT
db_id="$("${docker_local[@]}" run --detach --rm --pull never --network "$network" --name "$db" \
  --tmpfs /var/lib/postgresql -e POSTGRES_USER=rehearsal \
  -e POSTGRES_DB=rehearsal -e POSTGRES_PASSWORD=local-fixture-only "$pg_image")"
containers+=("$db_id")
for ((attempt = 0; attempt < 30; attempt++)); do
  if "${docker_local[@]}" exec "$db" pg_isready -h 127.0.0.1 -U rehearsal -d rehearsal >/dev/null; then
    break
  fi
  sleep 1
done
"${docker_local[@]}" exec "$db" pg_isready -h 127.0.0.1 -U rehearsal -d rehearsal >/dev/null
# Apply all ordered migrations, including the academic and timestamp guards.
for migration in "$root"/prisma/migrations/*/migration.sql; do
  [[ -f "$migration" ]]
  "${docker_local[@]}" exec -i "$db" psql -X -v ON_ERROR_STOP=1 -U rehearsal -d rehearsal \
    < "$migration" >/dev/null
done

"${docker_local[@]}" exec "$db" psql -X -v ON_ERROR_STOP=1 -U rehearsal -d rehearsal \
  -c "INSERT INTO \"User\" (\"auth0Id\") VALUES ('fixture|rehearsal')" >/dev/null
"${docker_local[@]}" exec "$db" pg_dump -U rehearsal -d rehearsal -Fc -f /tmp/rehearsal.dump
"${docker_local[@]}" exec "$db" createdb -U rehearsal rehearsal_restored
"${docker_local[@]}" exec "$db" pg_restore --exit-on-error -U rehearsal \
  -d rehearsal_restored /tmp/rehearsal.dump
restored_rows="$("${docker_local[@]}" exec "$db" psql -X -v ON_ERROR_STOP=1 -At -U rehearsal \
  -d rehearsal_restored -c "SELECT count(*) FROM \"User\" WHERE \"auth0Id\" = 'fixture|rehearsal'")"
[[ "$restored_rows" == 1 ]]
printf '%s\n' 'Verified backup restore with a fictional record'

start_app() {
  local name="$1" image="$2" database="$3"
  local id
  id="$("${docker_local[@]}" run --detach --rm --pull never --network "$network" --name "$name" \
    -e "DATABASE_URL=$database" -e "DIRECT_URL=$database" \
    -e NITRO_HOST=127.0.0.1 -e NITRO_PORT=3005 -e NUXT_PUBLIC_ANALYTICS_ENABLED=false \
    -e NUXT_AUTH0_DOMAIN=validation.example.invalid -e NUXT_AUTH0_CLIENT_ID=rehearsal \
    -e NUXT_AUTH0_CLIENT_SECRET=local-fixture-only \
    -e NUXT_AUTH0_SESSION_SECRET=local-fixture-session-not-for-production \
    -e NUXT_AUTH0_APP_BASE_URL=http://127.0.0.1:3005 "$image")"
  containers+=("$id")
}
probe() {
  local name="$1" route="$2" expected="$3"
  "${docker_local[@]}" exec "$name" node -e '
    (async () => {
      const [path, expected] = process.argv.slice(1);
      for (let attempt = 0; attempt < 20; attempt++) {
        try {
          const response = await fetch("http://127.0.0.1:3005" + path, {
            signal: AbortSignal.timeout(2000),
          });
          if (response.status === Number(expected)) return;
        } catch {}
        await new Promise(done => setTimeout(done, 250));
      }
      console.error(path + " did not return HTTP " + expected);
      process.exitCode = 1;
    })();' "$route" "$expected"
  printf '%s %s returned %s\n' "$name" "$route" "$expected"
}

working_db="postgresql://rehearsal:local-fixture-only@$db:5432/rehearsal"
broken_db="postgresql://rehearsal:local-fixture-only@127.0.0.1:1/rehearsal?connect_timeout=1"
start_app "$previous" "$prior_image" "$working_db"
probe "$previous" /api/v1/health 200
probe "$previous" /api/v1/ready 200

staged="$network-staged"
restored_db="postgresql://rehearsal:local-fixture-only@$db:5432/rehearsal_restored"
start_app "$staged" "$candidate_image" "$restored_db"
probe "$staged" /api/v1/health 200
probe "$staged" /api/v1/ready 200
probe "$previous" /api/v1/ready 200
"${docker_local[@]}" stop "$staged" >/dev/null

"${docker_local[@]}" stop "$previous" >/dev/null
start_app "$candidate" "$candidate_image" "$broken_db"
probe "$candidate" /api/v1/health 200
probe "$candidate" /api/v1/ready 503

"${docker_local[@]}" stop "$candidate" >/dev/null
start_app "$restored" "$prior_image" "$working_db"
[[ "$("${docker_local[@]}" inspect --format '{{.Image}}' "$restored")" == "$prior_image" ]]
probe "$restored" /api/v1/health 200
probe "$restored" /api/v1/ready 200
printf 'Restored prior runtime %s against the same disposable database\n' "$prior_image"
