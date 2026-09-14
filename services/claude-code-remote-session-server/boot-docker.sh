#!/bin/sh
# Conditionally boot an inner Docker daemon (true docker-in-docker) so the workload in this container can
# provision its own containers — the self-engineering setup, where the engineer-under-test runs its real
# dockerode provisioner against a daemon that is private to this container. No-op unless ENABLE_DOCKER=1.
# Requires a privileged container and expects /var/lib/docker to be a named volume (exclusive to this
# container) so the inner image store and build cache survive re-provisions.
#
# A failure here exits non-zero, which kills the container (start.sh runs under `set -e`) — so the
# provisioner's health-wait fails fast with inspectable logs instead of yielding a docker-less sandbox.
#
# Seeding: /opt/loopstack/seed-images (a read-only bind of the workspace base's `base/images` dir, when
# mounted) holds `<slug>.tar` image exports with sibling `<slug>.tar.id` files carrying the image Id.
# A tar is loaded only when its image Id is absent from the inner store — so a warm volume skips the
# (slow) load, a refreshed host image (new Id) loads again, and a pruned inner store self-heals.
set -e

if [ "$ENABLE_DOCKER" != "1" ]; then
  exit 0
fi

echo "[boot-docker] starting dockerd"
# A `docker restart` keeps the container fs, so a previous daemon's pid files survive and dockerd refuses
# to start ("process with PID n is still running"). The old daemon is certainly gone — remove them.
rm -f /var/run/docker.pid /run/containerd/containerd.pid
dockerd --data-root /var/lib/docker >/var/log/dockerd.log 2>&1 &

TRIES=0
until docker info >/dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge 60 ]; then
    echo "[boot-docker] dockerd did not become ready in time — tail of /var/log/dockerd.log:" >&2
    tail -n 50 /var/log/dockerd.log >&2 || true
    exit 1
  fi
  sleep 0.5
done

SEED_DIR=/opt/loopstack/seed-images
if [ -d "$SEED_DIR" ]; then
  for tar in "$SEED_DIR"/*.tar; do
    [ -e "$tar" ] || continue
    if [ -f "$tar.id" ]; then
      id=$(cat "$tar.id")
      if docker image inspect "$id" >/dev/null 2>&1; then
        echo "[boot-docker] seed $(basename "$tar") already loaded, skipping"
        continue
      fi
      echo "[boot-docker] loading seed $(basename "$tar")"
      docker load <"$tar"
    else
      # No Id file — load unconditionally (idempotent, just slower).
      echo "[boot-docker] loading seed $(basename "$tar") (no .id file, not skippable)"
      docker load <"$tar"
    fi
  done
fi

echo "[boot-docker] docker ready"
