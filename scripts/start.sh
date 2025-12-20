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
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_NAME="${DB_DATABASE:-pmd_management}"

# Mostrar configuración de BD (sin mostrar password)
log_info "Configuración de Base de Datos:"
log_info "  DB_HOST: ${DB_HOST}"
log_info "  DB_PORT: ${DB_PORT}"
log_info "  DB_USERNAME: ${DB_USERNAME}"
log_info "  DB_DATABASE: ${DB_DATABASE:-pmd_management}"
log_info "  NODE_ENV: ${NODE_ENV:-production}"

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

# Función para verificar migraciones disponibles
check_migrations() {
    log_info "Verificando migraciones disponibles..."
    
    # Verificar si existen migraciones compiladas
    if [ -d "dist/migrations" ] && [ "$(ls -A dist/migrations/*.js 2>/dev/null | wc -l)" -gt 0 ]; then
        MIGRATION_COUNT=$(ls -1 dist/migrations/*.js 2>/dev/null | wc -l)
        log_info "  Encontradas $MIGRATION_COUNT migración(es) compilada(s) en dist/migrations/"
        ls -1 dist/migrations/*.js 2>/dev/null | head -5 | while read file; do
            log_info "    - $(basename "$file")"
        done
        if [ $MIGRATION_COUNT -gt 5 ]; then
            log_info "    ... y $((MIGRATION_COUNT - 5)) más"
        fi
    else
        log_warning "  No se encontraron migraciones compiladas en dist/migrations/"
    fi
    
    # Verificar si existen migraciones fuente
    if [ -d "src/migrations" ] && [ "$(ls -A src/migrations/*.ts 2>/dev/null | wc -l)" -gt 0 ]; then
        SRC_MIGRATION_COUNT=$(ls -1 src/migrations/*.ts 2>/dev/null | wc -l)
        log_info "  Encontradas $SRC_MIGRATION_COUNT migración(es) fuente en src/migrations/"
    else
        log_warning "  No se encontraron migraciones fuente en src/migrations/"
    fi
}

# Función para ejecutar migraciones
run_migrations() {
    if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
        log_info "Ejecutando migraciones..."
        
        # Verificar migraciones disponibles
        check_migrations
        
        # Siempre usar src/data-source.ts porque ts-node puede manejarlo
        # y en producción el Dockerfile copia el src completo
        DATA_SOURCE_PATH="src/data-source.ts"
        log_info "Usando data-source: ${DATA_SOURCE_PATH}"
        
        # Ejecutar migraciones y capturar el código de salida real
        log_info "Ejecutando migraciones con TypeORM..."
        log_info "NOTA: Si PostgreSQL está en otra red Docker, verifica DB_HOST o DATABASE_URL"
        set +e
        npm run migration:run 2>&1 | tee /tmp/migration-output.log
        MIGRATION_EXIT_CODE=$?
        set -e
        
        # Verificar el output para ver si realmente ejecutó migraciones
        if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
            # Verificar si dice "No migrations are pending"
            if grep -q "No migrations are pending" /tmp/migration-output.log 2>/dev/null; then
                log_warning "TypeORM reporta: 'No migrations are pending'"
                log_info "Esto puede significar:"
                log_info "  1. Las migraciones ya están registradas en la BD (pero las tablas pueden no existir)"
                log_info "  2. Las migraciones no se están encontrando correctamente"
                log_info "  3. Estás conectado a una BD diferente"
                log_info ""
                log_info "Verificando tablas en la base de datos..."
                
                # Verificar si existen tablas básicas
                set +e
                node -e "
                    const { Client } = require('pg');
                    const client = new Client(
                        process.env.DATABASE_URL || {
                            host: process.env.DB_HOST || 'postgres',
                            port: parseInt(process.env.DB_PORT || '5432'),
                            user: process.env.DB_USERNAME || 'postgres',
                            password: process.env.DB_PASSWORD,
                            database: process.env.DB_DATABASE || 'pmd_management',
                        }
                    );
                    client.connect().then(() => {
                        return client.query(\"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name\");
                    }).then(result => {
                        const tables = result.rows.map(r => r.table_name);
                        console.log('📊 Tablas existentes en la BD (' + tables.length + '):');
                        if (tables.length === 0) {
                            console.log('   ⚠️  No hay tablas - las migraciones NO se ejecutaron');
                        } else {
                            tables.slice(0, 10).forEach(t => console.log('   -', t));
                            if (tables.length > 10) console.log('   ... y', (tables.length - 10), 'más');
                        }
                        return client.query('SELECT COUNT(*) as count FROM migrations');
                    }).then(result => {
                        const count = parseInt(result.rows[0].count);
                        console.log('📋 Migraciones registradas en tabla migrations:', count);
                        if (count > 0) {
                            return client.query('SELECT name, timestamp FROM migrations ORDER BY timestamp DESC LIMIT 5');
                        }
                        return { rows: [] };
                    }).then(result => {
                        if (result.rows.length > 0) {
                            console.log('📝 Últimas migraciones registradas:');
                            result.rows.forEach(m => console.log('   -', m.name));
                        }
                        client.end();
                    }).catch(e => {
                        console.error('❌ Error:', e.message);
                        process.exit(1);
                    });
                " 2>&1
                set -e
            fi
            
            log_success "Comando de migraciones completado"
            return 0
        else
            log_error "Error en migraciones (código de salida: $MIGRATION_EXIT_CODE)"
            log_error "Verifica los logs anteriores para más detalles"
            exit 1
        fi
    else
        log_warning "Migraciones omitidas (RUN_MIGRATIONS=false)"
        return 0
    fi
}

# Función para ejecutar seed
run_seed() {
    if [ "${RUN_SEED:-false}" = "true" ]; then
        log_info "Ejecutando seed..."
        
        set +e
        npm run seed 2>&1
        SEED_EXIT_CODE=$?
        set -e
        
        if [ $SEED_EXIT_CODE -eq 0 ]; then
            log_success "Seed completado"
        else
            log_error "Error en seed (código de salida: $SEED_EXIT_CODE)"
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
    
    # Ejecutar migraciones (debe completarse antes de continuar)
    run_migrations
    
    # Verificar que las migraciones terminaron antes de ejecutar seed
    if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
        log_info "Esperando confirmación de que las migraciones terminaron..."
        # Pequeña pausa para asegurar que todo se haya completado
        sleep 1
    fi
    
    # Ejecutar seed (solo después de que las migraciones terminen)
    run_seed
    
    # Iniciar aplicación
    log_success "Iniciando servidor NestJS..."
    exec node dist/main.js
}

main "$@"