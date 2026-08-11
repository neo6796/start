#!/bin/sh
# Skúška odosielania pošty proti vlastnému SMTP serveru.
#
# Certifikáty sa vyrobia pri každom spustení a do repozitára nejdú —
# súkromný kľúč v gite je súkromný kľúč vo svete, aj keď je len na skúšanie.
#
# O našej CA sa klientovi povie premennou prostredia. V samotnej appke tak
# neostane žiadny vypínač overovania certifikátov; taký sa raz zapne v ostrej
# prevádzke a nikto si to nevšimne.
set -e
cd "$(dirname "$0")/.."

command -v openssl >/dev/null 2>&1 || {
  echo "— pošta — preskočené, openssl nie je k dispozícii"; exit 0; }

D=$(mktemp -d)
trap 'rm -rf "$D"' EXIT

openssl req -x509 -newkey rsa:2048 -nodes -keyout "$D/ca.key" -out "$D/ca.crt" \
        -days 1 -subj "/CN=Skusobna CA" 2>/dev/null
openssl req -newkey rsa:2048 -nodes -keyout "$D/server.key" -out "$D/server.csr" \
        -subj "/CN=localhost" 2>/dev/null
printf 'subjectAltName=DNS:localhost,IP:127.0.0.1' > "$D/san.txt"
openssl x509 -req -in "$D/server.csr" -CA "$D/ca.crt" -CAkey "$D/ca.key" \
        -CAcreateserial -out "$D/server.crt" -days 1 -extfile "$D/san.txt" 2>/dev/null

CERTY="$D" NODE_EXTRA_CA_CERTS="$D/ca.crt" node test/08-posta.mjs
