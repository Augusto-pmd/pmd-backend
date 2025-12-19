# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar todas las dependencias (incluidas dev para build)
RUN npm ci

# Copiar código fuente
COPY . .

# Build de TypeScript
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production

# Instalar dumb-init para mejor manejo de señales
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copiar package files
COPY package.json package-lock.json* ./

# Instalar solo dependencias de producción + TypeORM CLI
RUN npm ci --only=production && \
    npm install --save-dev typeorm ts-node && \
    npm cache clean --force

# Copiar build desde stage anterior
COPY --from=builder /app/dist ./dist

# Copiar archivos necesarios para migraciones
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/nest-cli.json ./

# Copiar scripts
COPY scripts ./scripts
RUN chmod +x ./scripts/*.sh ./scripts/*.js

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 && \
    chown -R appuser:nodejs /app

USER appuser

EXPOSE 5000

# Usar dumb-init para mejor manejo de señales
ENTRYPOINT ["dumb-init", "--"]

CMD ["./scripts/start.sh"]