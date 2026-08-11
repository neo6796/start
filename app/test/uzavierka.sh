#!/bin/sh
# Celá cesta uzávierky: matica → uzavretie → SMTP → správa v kuchyni → potvrdenie.
#
# Beží na čistej databáze a s vlastným SMTP serverom, lebo je to jediná časť
# appky, ktorá niečo posiela cudziemu človeku. Skúšať ju „až v ostrej
# prevádzke" by znamenalo skúšať ju na kuchyni.
set -e
cd "$(dirname "$0")/.."

command -v openssl >/dev/null 2>&1 || {
  echo "— uzávierka — preskočené, openssl nie je k dispozícii"; exit 0; }

D=$(mktemp -d)
trap 'rm -rf "$D"' EXIT

openssl req -x509 -newkey rsa:2048 -nodes -keyout "$D/ca.key" -out "$D/ca.crt" \
        -days 1 -subj "/CN=Skusobna CA" 2>/dev/null
openssl req -newkey rsa:2048 -nodes -keyout "$D/server.key" -out "$D/server.csr" \
        -subj "/CN=localhost" 2>/dev/null
printf 'subjectAltName=DNS:localhost,IP:127.0.0.1' > "$D/san.txt"
openssl x509 -req -in "$D/server.csr" -CA "$D/ca.crt" -CAkey "$D/ca.key" \
        -CAcreateserial -out "$D/server.crt" -days 1 -extfile "$D/san.txt" 2>/dev/null

# Appka musí o pošte vedieť už pri štarte — preto sa nastavuje pred obnov.sh,
# ktorý ju spúšťa. Port je pevný, nie náhodný: appka ho pozná dopredu.
export SMTP_HOST=localhost SMTP_PORT=2526 SMTP_MENO=obedy SMTP_HESLO=tajne \
       SMTP_OD=obedy@ahafarma.sk SMTP_EHLO=obedy.ahafarma.sk \
       NODE_EXTRA_CA_CERTS="$D/ca.crt" ADRESA=http://localhost:3111

# 01–03 pripravia ľudí, tímy a jedálne; uzávierka potrebuje mať čo uzavrieť.
./test/obnov.sh >/dev/null
node test/01-ciselniky-import.mjs >/dev/null
node test/02-pravidla.mjs >/dev/null
node test/03-uprava.mjs >/dev/null
CERTY="$D" SMTP_PORT=2526 node test/11-uzavierka.mjs
