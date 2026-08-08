#!/usr/bin/env bash
# Nasadenie Obedára. Spúšťa sa na serveri:  cd ~/obedar/deploy && ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "→ záloha pred zmenou"
./zaloha.sh || { echo "✘ záloha zlyhala — nenasadzujem"; exit 1; }

echo "→ sťahujem novú verziu"
git -C .. pull --ff-only

# Verzia sa dostane do appky, aby /zdravie povedalo, čo na serveri naozaj beží.
VERZIA=$(git -C .. rev-parse --short HEAD)
export VERZIA

echo "→ prestavujem a spúšťam ($VERZIA)"
docker compose up -d --build

echo "→ čakám, kým sa appka ozve"
for i in $(seq 1 30); do
  if curl -fsS http://localhost:3000/zdravie >/dev/null 2>&1; then
    echo "✔ nasadené, verzia $VERZIA"

    # Bez správcu sa do appky nedá dostať. Radšej to povedať hneď,
    # než aby to človek zisťoval na prihlasovacej stránke.
    if ! docker compose exec -T db psql -tAU obedar -d obedar \
         -c 'select count(*) from osoba where je_admin' 2>/dev/null | grep -qv '^0$'; then
      echo
      echo "  Appka zatiaľ nemá správcu. Založí sa takto:"
      echo "    docker compose exec app node src/nastroj.js spravca <osobné číslo> <priezvisko> <meno>"
      echo "    docker compose exec app node src/nastroj.js zaklad     # firmy a jedálne"
    fi
    exit 0
  fi
  sleep 2
done

echo "✘ appka sa neozvala do minúty — vraciam predchádzajúcu verziu"
git -C .. reset --hard HEAD@{1}
docker compose up -d --build
exit 1
