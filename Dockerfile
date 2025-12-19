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

# Instalar solo dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar aplicación compilada desde el builder
COPY --from=builder /app/dist ./dist

# Crear directorio uploads (si tu app lo usa en runtime)
RUN mkdir -p /app/dist/uploads

# Crear usuario no root
RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001
RUN chown -R appuser:nodejs /app
USER appuser

EXPOSE 5000

CMD ["node", "dist/main.js"]
