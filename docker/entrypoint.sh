#!/bin/sh
# Apply pending Prisma migrations before starting the server.
set -e

echo "Running prisma migrate deploy..."
node node_modules/prisma/build/index.js migrate deploy

exec "$@"
