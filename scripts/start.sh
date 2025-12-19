#!/bin/sh
set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo "${GREEN}✅ $1${NC}"; }
log_warning() { echo "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo "${RED}❌ $1${NC}"; }

# Configuración de base de datos
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USERNAME:-postgres}"
DB_NAME="${DB_DATABASE:-pmd_management}"

# Función para verificar PostgreSQL
wait_for_postgres() {
    log_info "Esperando PostgreSQL en ${DB_HOST}:${DB_PORT}..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        
        if node scripts/check-postgres.js 2>/dev/null; then
            log_success "PostgreSQL conectado"
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            echo "   Intento $attempt/$max_attempts..."
            sleep 2
        fi
    done
    
    log_error "PostgreSQL no disponible después de $max_attempts intentos"
    exit 1
}

# Función para ejecutar migraciones
run_migrations() {
    if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
        log_info "Ejecutando migraciones..."
        
        if npm run migration:run 2>&1; then
            log_success "Migraciones completadas"
        else
            log_error "Error en migraciones"
            exit 1
        fi
    else
        log_warning "Migraciones omitidas (RUN_MIGRATIONS=false)"
    fi
}

# Función para ejecutar seed
run_seed() {
    if [ "${RUN_SEED:-false}" = "true" ]; then
        log_info "Ejecutando seed..."
        
        if npm run seed 2>&1; then
            log_success "Seed completado"
        else
            log_error "Error en seed"
            exit 1
        fi
    else
        log_warning "Seed omitido"
    fi
}

# Main
main() {
    log_info "Iniciando aplicación..."
    
    # Esperar PostgreSQL
    wait_for_postgres
    
    # Ejecutar migraciones
    run_migrations
    
    # Ejecutar seed
    run_seed
    
    # Iniciar aplicación
    log_success "Iniciando servidor NestJS..."
    exec node dist/main.js
}

main "$@"