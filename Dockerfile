# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar solo lo necesario primero (mejor cache)
COPY package.json package-lock.json* ./

# Instalar dependencias (incluyendo dev para build)
RUN npm ci

# Copiar código fuente
COPY . .

# Build de TypeScript
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

# Copiar package.json y lock
COPY package.json package-lock.json* ./

# Instalar dependencias (necesitamos ts-node para ejecutar migraciones)
RUN npm ci --only=production && \
    npm install --save-dev ts-node typescript @types/node && \
    npm cache clean --force

# Copiar aplicación compilada desde el builder (incluye migraciones compiladas)
COPY --from=builder /app/dist ./dist

# Copiar también el código fuente para migraciones (necesario para typeorm-ts-node-commonjs)
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/nest-cli.json ./nest-cli.json

# Crear directorio uploads (si tu app lo usa en runtime)
RUN mkdir -p /app/dist/uploads

# Copiar scripts de inicio
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Crear directorio scripts y copiar script de verificación de PostgreSQL
RUN mkdir -p ./scripts
COPY scripts/check-postgres.js ./scripts/check-postgres.js
RUN chmod +x ./scripts/check-postgres.js

# Crear usuario no root
RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001
RUN chown -R appuser:nodejs /app
USER appuser

EXPOSE 5000

# Usar script de inicio que ejecuta migraciones si RUN_MIGRATIONS=true
CMD ["./start.sh"]
