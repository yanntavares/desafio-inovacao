# DEPS - instala todas as dependências (também usado pelo docker-compose para o `next dev`)
FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci

# BUILDER - gera o build standalone em .next/standalone
FROM deps AS builder

ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN npm run build

# RUNTIME - só o servidor standalone, sem npm ci
FROM node:24-alpine AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

# alpine não tem curl; fetch é nativo no Node 24
HEALTHCHECK --interval=30s --timeout=15s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
