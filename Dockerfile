# --- 1. build frontendu (Vite → statické súbory) ---
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- 2. produkčné závislosti backendu ---
FROM node:22-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# --- 3. výsledný runtime obraz ---
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/backend

# závislosti + zdroják backendu
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend/ ./

# hotový frontend tam, kde ho server očakáva (../frontend/dist)
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# dáta (JSON úložisko) držíme vo volume
RUN mkdir -p /app/backend/data
VOLUME ["/app/backend/data"]

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=4s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "src/server.js"]
