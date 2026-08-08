#!/usr/bin/env bash
# Nasadenie Obedára. Spúšťa sa na serveri:  cd ~/obedar && ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "→ záloha pred zmenou"
./zaloha.sh || { echo "✘ záloha zlyhala — nenasadzujem"; exit 1; }

echo "→ sťahujem novú verziu"
git -C .. pull --ff-only

echo "→ prestavujem a spúšťam"
docker compose up -d --build

echo "→ čakám, kým sa appka ozve"
for i in $(seq 1 30); do
  if curl -fsS http://localhost:3000/zdravie >/dev/null 2>&1; then
    echo "✔ nasadené, verzia $(git -C .. rev-parse --short HEAD)"
    exit 0
  fi
  sleep 2
done

echo "✘ appka sa neozvala do minúty — vraciam predchádzajúcu verziu"
git -C .. reset --hard HEAD@{1}
docker compose up -d --build
exit 1
