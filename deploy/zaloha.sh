#!/usr/bin/env bash
# Nočná záloha. Jeden datovaný balík: databáza + prílohy + nastavenia + INFO.
set -euo pipefail
cd "$(dirname "$0")"

DEN=$(date +%F)
PRAC=$(mktemp -d)
CIEL=data/zalohy
mkdir -p "$CIEL"

docker compose exec -T db pg_dump -U obedar obedar > "$PRAC/databaza.sql"
cp .env "$PRAC/nastavenia.env" 2>/dev/null || true
cp -r data/prilohy "$PRAC/prilohy" 2>/dev/null || mkdir -p "$PRAC/prilohy"

{
  echo "dátum:   $DEN"
  echo "verzia:  $(git -C .. rev-parse --short HEAD 2>/dev/null || echo '?')"
  echo "objednávok: $(docker compose exec -T db psql -tAU obedar -d obedar \
                      -c 'select count(*) from objednavka' 2>/dev/null || echo '?')"
  echo "osôb:       $(docker compose exec -T db psql -tAU obedar -d obedar \
                      -c 'select count(*) from osoba' 2>/dev/null || echo '?')"
} > "$PRAC/INFO.txt"

tar czf "$CIEL/obedar-$DEN.tar.gz" -C "$PRAC" .
rm -rf "$PRAC"

# 90 dní + prvý deň mesiaca navždy
find "$CIEL" -name 'obedar-*.tar.gz' -mtime +90 ! -name '*-01.tar.gz' -delete

echo "✔ $CIEL/obedar-$DEN.tar.gz  ($(du -h "$CIEL/obedar-$DEN.tar.gz" | cut -f1))"
