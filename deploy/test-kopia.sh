#!/usr/bin/env bash
# Testovacia kópia Obedára (07-nasadenie, bod 3).
#
#   cd ~/obedar/deploy && ./test-kopia.sh
#
# Postaví druhú appku na tom istom serveri: rovnaký kód, vlastná databáza,
# vlastný port. Naplní ju kópiou ostrých dát z poslednej zálohy, aby sa
# skúšalo proti skutočnému tvaru údajov, nie proti vymyslenej vzorke.
#
# Načo to je: novú verziu si preklikáš tu a až potom pustíš ./deploy.sh.
# Ostrých dát sa to nedotkne — sú to dve oddelené databázy.
#
# Testovacia kópia **neposiela poštu.** Nemá nastavený SMTP, takže objednávka
# z nej nikam neodíde a appka to na uzávierke rovno povie. Inak by sa raz
# stalo, že kuchyňa uvarí podľa skúšobnej objednávky.
#
#   ./test-kopia.sh            kópia dát, mená nahradené
#   ./test-kopia.sh --mena     kópia dát aj so skutočnými menami
#   ./test-kopia.sh --prazdna  bez dát, len prázdna databáza
set -euo pipefail
cd "$(dirname "$0")"

MENA=nie
DATA=zaloha
for a in "$@"; do
  case "$a" in
    --mena)    MENA=ano ;;
    --prazdna) DATA=ziadne ;;
    *) echo "neznámy prepínač: $a"; exit 1 ;;
  esac
done

VERZIA=$(git -C .. rev-parse --short HEAD)
export VERZIA
# Pruh na každej obrazovke. Bez neho sa raz stane, že niekto mení ostré dáta
# v presvedčení, že skúša — alebo naopak hľadá chybu na kópii.
export PRUH="Testovacia kópia · $VERZIA · zmeny sa nikam neposielajú"

echo "→ prestavujem testovaciu kópiu ($VERZIA)"
docker compose --profile test up -d --build db-test app-test

echo "→ čakám, kým sa ozve"
for i in $(seq 1 30); do
  curl -fsS http://127.0.0.1:3010/zdravie >/dev/null 2>&1 && break
  [ "$i" = 30 ] && { echo "✘ testovacia appka sa neozvala"; exit 1; }
  sleep 2
done

if [ "$DATA" = zaloha ]; then
  POSLEDNA=$(ls -1t data/zalohy/obedar-*.tar.gz 2>/dev/null | head -1 || true)
  if [ -z "$POSLEDNA" ]; then
    echo "· záloha zatiaľ nie je — kópia ostáva prázdna"
  else
    echo "→ nalievam dáta z $(basename "$POSLEDNA")"
    PRAC=$(mktemp -d); trap 'rm -rf "$PRAC"' EXIT
    tar xzf "$POSLEDNA" -C "$PRAC" databaza.sql

    # Appka musí byť dole, kým sa databáza prepisuje — inak by do nej písala
    # uprostred obnovy a skončilo by to v polovičnom stave.
    docker compose --profile test stop app-test >/dev/null
    docker compose --profile test exec -T db-test \
      psql -qU obedar -d postgres \
      -c 'DROP DATABASE IF EXISTS obedar WITH (FORCE);' \
      -c 'CREATE DATABASE obedar OWNER obedar;' >/dev/null
    docker compose --profile test exec -T db-test psql -qU obedar -d obedar < "$PRAC/databaza.sql" >/dev/null

    if [ "$MENA" = nie ]; then
      # Na testovacej kópii sa pracuje s tvarom údajov, nie s ľuďmi. Osobné
      # číslo ostáva — podľa neho sa človek nájde a prihlási sa aj tu.
      echo "→ nahrádzam mená"
      docker compose --profile test exec -T db-test psql -qU obedar -d obedar -c \
        "UPDATE osoba SET priezvisko = 'Zamestnanec', meno = coalesce(kod_dochadzka, id::text);" >/dev/null
    fi

    # E-mailové adresy jedální sú v číselníku a testovacia appka síce nič
    # neposiela, ale nech tam ostrá adresa kuchyne vôbec nefiguruje.
    docker compose --profile test exec -T db-test psql -qU obedar -d obedar -c \
      "UPDATE poskytovatel SET email = 'test@localhost' WHERE email IS NOT NULL;" >/dev/null

    docker compose --profile test start app-test >/dev/null
    for i in $(seq 1 30); do
      curl -fsS http://127.0.0.1:3010/zdravie >/dev/null 2>&1 && break
      sleep 2
    done
  fi
fi

echo
echo "✔ testovacia kópia beží, verzia $VERZIA"
echo
if [ -n "${TEST_DOMENA:-}" ]; then
  echo "  Otvor:  https://$TEST_DOMENA"
else
  echo "  Zvonku zatiaľ nie je vystavená (v .env nie je TEST_DOMENA)."
  echo "  Otvor si ju tunelom — z tvojho počítača:"
  echo
  echo "    ssh -N -L 8080:127.0.0.1:3010 $(whoami)@$(hostname -f 2>/dev/null || hostname)"
  echo
  echo "  a potom v prehliadači:  http://localhost:8080"
fi
echo
echo "  Prihlásiš sa svojím osobným číslom a heslom z ostrej appky —"
echo "  je to jej kópia vrátane hesiel."
echo
echo "  Zhodiť:  docker compose --profile test down"
