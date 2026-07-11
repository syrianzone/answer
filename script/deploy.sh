#!/usr/bin/env bash
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

# Deploy the Answer fork on the production VPS:
#   pull latest -> validate env -> rebuild+restart -> healthcheck -> roll back on failure.
#
# Invoked by .github/workflows/deploy.yml over SSH, but also safe to run by hand:
#   cd /opt/syrianzone/answers && ./script/deploy.sh
#
# All settings are overridable via environment variables (defaults target
# the answers.syrian.zone production box).
set -eu

REMOTE_APP_DIR="${REMOTE_APP_DIR:-/opt/syrianzone/answers}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-https://answers.syrian.zone/}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-30}"
SLEEP_SECONDS="${SLEEP_SECONDS:-5}"
AUTO_ROLLBACK="${AUTO_ROLLBACK:-1}"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

cd "$REMOTE_APP_DIR"

log "========================================="
log "Answer deploy starting in $REMOTE_APP_DIR"
log "========================================="

PREV_COMMIT="$(git rev-parse HEAD)"
log "Previous commit: $PREV_COMMIT"

log "Fetching origin/$DEPLOY_BRANCH ..."
git fetch --prune origin "$DEPLOY_BRANCH"
git reset --hard "origin/$DEPLOY_BRANCH"
NEW_COMMIT="$(git rev-parse HEAD)"
log "Now at commit: $NEW_COMMIT"

log "Validating production environment ..."
./script/check-production-env.sh

log "Building and restarting containers (this rebuilds from source; may take several minutes) ..."
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_BUILDKIT=1
if ! docker compose up -d --build; then
  log "::error:: build/start failed"
  if [ "$AUTO_ROLLBACK" = "1" ] && [ "$PREV_COMMIT" != "$NEW_COMMIT" ]; then
    log "Rolling back working tree to $PREV_COMMIT ..."
    git reset --hard "$PREV_COMMIT"
    docker compose up -d --build || log "::error:: rollback build also failed"
  fi
  exit 1
fi

log "Pruning dangling images ..."
docker image prune -f >/dev/null 2>&1 || true

docker compose ps

# Probe the app from the VPS itself (loopback through Caddy/Cloudflare), exactly
# like the joory deploy: datacenter IPs hitting the public URL from a GitHub
# runner are often blocked/challenged, so we verify on the server instead.
log "Health-checking $HEALTHCHECK_URL ..."
attempt=0
until curl -fsS --max-time 5 "$HEALTHCHECK_URL" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    log "::error:: healthcheck failed after $MAX_ATTEMPTS attempts"
    if [ "$AUTO_ROLLBACK" = "1" ] && [ "$PREV_COMMIT" != "$NEW_COMMIT" ]; then
      log "Rolling back to $PREV_COMMIT ..."
      git reset --hard "$PREV_COMMIT"
      docker compose up -d --build
      log "Rollback complete (running $PREV_COMMIT)."
    else
      log "Rollback skipped (AUTO_ROLLBACK=$AUTO_ROLLBACK)."
    fi
    exit 1
  fi
  log "Waiting for app to become healthy... ($attempt/$MAX_ATTEMPTS)"
  sleep "$SLEEP_SECONDS"
done

log "Healthcheck passed."
log "Deploy complete — running $NEW_COMMIT."
