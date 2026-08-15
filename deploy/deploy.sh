#!/usr/bin/env bash
# Nasadenie Obedára. Spúšťa sa na serveri:  cd <repo>/deploy && ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "→ záloha pred zmenou"
./zaloha.sh || { echo "✘ záloha zlyhala — nenasadzujem"; exit 1; }

echo "→ sťahujem novú verziu"
git -C .. pull --ff-only

# Verzia sa dostane do appky, aby /zdravie povedalo, čo na serveri naozaj beží.
VERZIA=$(git -C .. rev-parse --short HEAD)
export VERZIA

# Caddyfile sa overí ešte pred tým, než sa čohokoľvek dotkneme. Chybný súbor
# Caddy odmietne celý — nespadne z neho jeden blok, spadne stránka. A keďže
# beží vo vlastnom kontajneri, appka o tom nevie a hlási sa ako zdravá.
# (15. 8. 2026 to tak aj dopadlo: appka bežala, stránka bola hodiny dole.)
echo "→ kontrolujem Caddyfile"
if ! docker compose run --rm --no-deps --entrypoint caddy caddy \
     validate --config /etc/caddy/Caddyfile --adapter caddyfile >/tmp/caddy-kontrola 2>&1; then
  echo "✘ Caddyfile je chybný — nenasadzujem, stránka beží ďalej na starej verzii:"
  grep -iE '^error|Error:' /tmp/caddy-kontrola | head -3
  exit 1
fi

echo "→ prestavujem a spúšťam ($VERZIA)"
docker compose up -d --build

echo "→ čakám, kým sa appka ozve"
ZIJE=nie
for i in $(seq 1 30); do
  if curl -fsS http://localhost:3000/zdravie >/dev/null 2>&1; then ZIJE=ano; break; fi
  sleep 2
done

if [ "$ZIJE" = nie ]; then
  echo "✘ appka sa neozvala do minúty — vraciam predchádzajúcu verziu"
  git -C .. reset --hard HEAD@{1}
  docker compose up -d --build
  exit 1
fi

# Appka na porte 3000 je len polovica pravdy — medzi ňou a svetom stojí Caddy.
# Preto sa tá istá odpoveď vypýta ešte raz celou cestou: cez HTTPS, s menom
# domény a s certifikátom. `--resolve` obchádza DNS a mieri rovno na slučku,
# takže kontrola nezávisí od toho, či sa server vie navštíviť cez svoju
# verejnú adresu.
DOMENA=$(sed -n 's|^ADRESA=https\?://||p' .env | tr -d '/[:space:]')
echo "→ skúšam stránku celou cestou (https://$DOMENA)"
CADDY=nie
for i in $(seq 1 15); do
  if curl -fsS --resolve "$DOMENA:443:127.0.0.1" "https://$DOMENA/zdravie" >/dev/null 2>&1; then
    CADDY=ano; break
  fi
  sleep 2
done

if [ "$CADDY" = nie ]; then
  # Kód sa tu zámerne nevracia späť: appka žije a databáza je už zmigrovaná,
  # takže návrat na starú verziu by z jedného pokazeného kúska spravil dva.
  echo
  echo "✘ appka žije, ale stránka zvonku neodpovedá — problém je v Caddy."
  echo "  Pozri:  docker compose ps caddy"
  echo "          docker compose logs --tail=40 caddy"
  exit 1
fi

echo "✔ nasadené a stránka odpovedá, verzia $VERZIA"

# Bez správcu sa do appky nedá dostať. Radšej to povedať hneď,
# než aby to človek zisťoval na prihlasovacej stránke.
if ! docker compose exec -T db psql -tAU obedar -d obedar \
     -c 'select count(*) from osoba where je_admin' 2>/dev/null | grep -qv '^0$'; then
  echo
  echo "  Appka zatiaľ nemá správcu. Založí sa takto:"
  echo "    docker compose exec app node src/nastroj.js spravca <osobné číslo> <priezvisko> <meno>"
  echo "    docker compose exec app node src/nastroj.js zaklad     # firmy a jedálne"
fi
