#!/bin/sh
# Čistá skúšobná databáza, správca a základné číselníky.
# Skúšky sa tak dajú púšťať opakovane a nezávisia na tom, čo po sebe nechali.
#
#   ./test/obnov.sh
#   node test/01-ciselniky-import.mjs
#   node test/02-pravidla.mjs
#
# Beží proti miestnemu PostgreSQL, nie proti serveru. Heslo nižšie je
# skúšobné a patrí databáze, ktorá sa pri každom spustení zahodí.
set -e
cd "$(dirname "$0")/.."

: "${PGURL:=postgres://obedar:test@127.0.0.1:5432/obedar_test}"
: "${HESLO:=skusobne-heslo}"
: "${PORT:=3111}"

[ -f /tmp/obedar-test.pid ] && kill "$(cat /tmp/obedar-test.pid)" 2>/dev/null || true
sleep 1

su postgres -c "psql -qc 'DROP DATABASE IF EXISTS obedar_test;' \
                     -c 'CREATE DATABASE obedar_test OWNER obedar;'" >/dev/null

export DATABASE_URL="$PGURL"
printf '%s\n%s\n' "$HESLO" "$HESLO" | node src/nastroj.js spravca 4021 Solár Erik >/dev/null
node src/nastroj.js zaklad >/dev/null

PORT="$PORT" VERZIA=test setsid nohup node src/index.js >/tmp/obedar-test.log 2>&1 </dev/null &
echo $! > /tmp/obedar-test.pid
sleep 2
curl -fsS "http://localhost:$PORT/zdravie" && echo
