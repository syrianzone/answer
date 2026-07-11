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

# Fail fast (before rebuilding containers) if the production .env or the merged
# docker compose config is not deploy-ready. Run from anywhere; it resolves the
# repo root from its own location.
set -eu

cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

fail() { printf 'check-production-env: ERROR: %s\n' "$*" >&2; exit 1; }

[ -f .env ] || fail ".env is missing in $(pwd) — copy .env.example to .env and fill it in"

# Required variables must be present and non-empty.
for key in DB_TYPE DB_PASSWORD SITE_URL LANGUAGE; do
  val="$(grep -E "^${key}=" .env | tail -n1 | cut -d= -f2- || true)"
  [ -n "${val:-}" ] || fail "$key is empty or missing in .env"
done

# Reject left-over scaffold placeholders.
if grep -qE '^(DB_PASSWORD|ADMIN_PASSWORD)=change-me' .env; then
  fail "placeholder password still present in .env (change-me...)"
fi

# The base compose + docker-compose.override.yml + .env must produce a valid,
# fully-resolvable configuration.
docker compose config >/dev/null 2>&1 || fail "'docker compose config' is invalid — check compose files and .env"

echo "check-production-env: OK"
