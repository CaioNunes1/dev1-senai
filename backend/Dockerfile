# API do Passe para o Docker Compose da raiz (diferencial: interface, API e banco num comando).
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
# Aplica as migrations versionadas (o banco novo começa vazio) e inicia a API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
