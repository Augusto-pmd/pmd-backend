#!/bin/sh

# Script de inicio que ejecuta migraciones y seed antes de iniciar la aplicación
# Este script espera a que PostgreSQL esté listo y luego ejecuta:
# 1. Migraciones (si RUN_MIGRATIONS=true)
# 2. Seed (si RUN_SEED=true)
# 3. Inicia la aplicación

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Función para parsear DATABASE_URL y extraer parámetros
parse_database_url() {
    if [ -z "${DATABASE_URL:-}" ]; then
        # Usar variables individuales si DATABASE_URL no está configurado
        DB_HOST="${DB_HOST:-localhost}"
        DB_PORT="${DB_PORT:-5432}"
        DB_USER="${DB_USERNAME:-postgres}"
        DB_NAME="${DB_DATABASE:-pmd_management}"
        DB_PASS="${DB_PASSWORD:-}"
    else
        # Parsear DATABASE_URL: postgresql://user:pass@host:port/db?params
        # Remover el prefijo postgresql://
        DB_URL="${DATABASE_URL#postgresql://}"
        DB_URL="${DB_URL#postgres://}"  # También aceptar postgres://
        
        # Extraer credenciales (user:pass)
        DB_CREDENTIALS="${DB_URL%%@*}"
        DB_REST="${DB_URL#*@}"
        
        # Extraer user y password
        if [ "$DB_CREDENTIALS" != "$DB_URL" ]; then
            DB_USER="${DB_CREDENTIALS%%:*}"
            DB_PASS="${DB_CREDENTIALS#*:}"
        else
            # Sin credenciales en la URL
            DB_USER="postgres"
            DB_PASS=""
            DB_REST="$DB_URL"
        fi
        
        # Extraer host:port y database
        DB_HOST_PORT="${DB_REST%%/*}"
        DB_NAME="${DB_REST#*/}"
        DB_NAME="${DB_NAME%%\?*}"  # Remover query params como ?sslmode=require
        
        # Extraer host y port
        if echo "$DB_HOST_PORT" | grep -q ":"; then
            DB_HOST="${DB_HOST_PORT%%:*}"
            DB_PORT="${DB_HOST_PORT#*:}"
        else
            DB_HOST="$DB_HOST_PORT"
            DB_PORT="5432"
        fi
        
        # Valores por defecto
        DB_USER="${DB_USER:-postgres}"
        DB_PORT="${DB_PORT:-5432}"
    fi
}

# Función para verificar PostgreSQL usando pg_isready (método más confiable)
check_postgres_pgisready() {
    if command -v pg_isready >/dev/null 2>&1; then
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Función para verificar PostgreSQL usando script Node.js (método principal)
check_postgres_node() {
    # Usar script separado para mejor legibilidad y mantenimiento
    if [ -f "scripts/check-postgres.js" ]; then
        node scripts/check-postgres.js 2>/dev/null
    else
        # Fallback: usar script inline si el archivo no existe
        node -e "
            const { Client } = require('pg');
            const config = process.env.DATABASE_URL 
                ? { connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 }
                : {
                    host: process.env.DB_HOST || 'localhost',
                    port: parseInt(process.env.DB_PORT || '5432', 10),
                    user: process.env.DB_USERNAME || 'postgres',
                    password: process.env.DB_PASSWORD || '',
                    database: process.env.DB_DATABASE || 'pmd_management',
                    connectionTimeoutMillis: 3000,
                  };
            const client = new Client(config);
            client.connect()
                .then(() => client.query('SELECT 1'))
                .then(() => client.end())
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
        " 2>/dev/null
    fi
}

# Función para verificar PostgreSQL usando psql
check_postgres_psql() {
    if command -v psql >/dev/null 2>&1; then
        export PGPASSWORD="${DB_PASSWORD:-${DB_PASS:-}}"
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Función principal para esperar PostgreSQL
wait_for_postgres() {
    log_info "Esperando a que PostgreSQL esté disponible..."
    log_info "Host: ${DB_HOST}, Puerto: ${DB_PORT}, Usuario: ${DB_USER}, Base de datos: ${DB_NAME}"
    
    local max_attempts=60
    local attempt=0
    local wait_interval=2
    
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        
        # Intentar múltiples métodos de verificación (orden de preferencia)
        # 1. Node.js (más confiable, siempre disponible)
        if check_postgres_node; then
            log_success "PostgreSQL está listo (verificado con Node.js)"
            return 0
        # 2. pg_isready (si está disponible)
        elif check_postgres_pgisready; then
            log_success "PostgreSQL está listo (verificado con pg_isready)"
            return 0
        # 3. psql (si está disponible)
        elif check_postgres_psql; then
            log_success "PostgreSQL está listo (verificado con psql)"
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            echo "   Intento $attempt/$max_attempts - Esperando ${wait_interval}s..."
            sleep $wait_interval
        fi
    done
    
    log_error "PostgreSQL no está disponible después de $max_attempts intentos"
    log_error "Verifica que PostgreSQL esté corriendo y accesible en:"
    log_error "  Host: ${DB_HOST}"
    log_error "  Puerto: ${DB_PORT}"
    log_error "  Usuario: ${DB_USER}"
    log_error "  Base de datos: ${DB_NAME}"
    exit 1
}

# Función para ejecutar migraciones
run_migrations() {
    if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
        log_info "Ejecutando migraciones de base de datos..."
        if npm run migration:run; then
            log_success "Migraciones ejecutadas correctamente"
        else
            log_error "Error al ejecutar migraciones"
            exit 1
        fi
    else
        log_warning "Migraciones omitidas (RUN_MIGRATIONS=false)"
    fi
}

# Función para ejecutar seed
run_seed() {
    if [ "${RUN_SEED:-false}" = "true" ]; then
        log_info "Ejecutando seed de base de datos..."
        if npm run seed; then
            log_success "Seed ejecutado correctamente"
        else
            log_error "Error al ejecutar seed"
            exit 1
        fi
    else
        log_warning "Seed omitido (RUN_SEED no está configurado o es false)"
    fi
}

# Función principal
main() {
    log_info "Iniciando proceso de arranque de la aplicación..."
    
    # Parsear configuración de base de datos
    parse_database_url
    
    # Esperar a que PostgreSQL esté disponible
    wait_for_postgres
    
    # Ejecutar migraciones si está configurado
    run_migrations
    
    # Ejecutar seed si está configurado
    run_seed
    
    # Iniciar la aplicación
    log_info "Iniciando aplicación..."
    exec node dist/main.js
}

# Ejecutar función principal
main "$@"
