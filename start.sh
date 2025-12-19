#!/bin/sh

# Script de inicio que ejecuta migraciones y seed antes de iniciar la aplicación
# Este script espera a que PostgreSQL esté listo y luego ejecuta:
# 1. Migraciones (si RUN_MIGRATIONS=true)
# 2. Seed (si RUN_SEED=true)
# 3. Inicia la aplicación

set -e

echo "⏳ Esperando a que PostgreSQL esté disponible..."

# Esperar a que PostgreSQL esté listo (máximo 60 intentos, 2 segundos entre cada uno)
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
  # Intentar conectar usando node y el data-source compilado
  if node -e "
    try {
      const dataSource = require('./dist/data-source.js').default;
      dataSource.initialize()
        .then(() => {
          dataSource.destroy();
          process.exit(0);
        })
        .catch(() => {
          process.exit(1);
        });
    } catch (e) {
      process.exit(1);
    }
  " 2>/dev/null; then
    echo "✅ PostgreSQL está listo"
    break
  fi
  
  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo "❌ Error: PostgreSQL no está disponible después de $max_attempts intentos"
    exit 1
  fi
  
  echo "   Intento $attempt/$max_attempts - Esperando..."
  sleep 2
done

# Ejecutar migraciones solo si RUN_MIGRATIONS está configurado
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "🔄 Ejecutando migraciones de base de datos..."
  npm run migration:run
  
  if [ $? -eq 0 ]; then
    echo "✅ Migraciones ejecutadas correctamente"
  else
    echo "❌ Error al ejecutar migraciones"
    exit 1
  fi
else
  echo "⏭️  Migraciones omitidas (RUN_MIGRATIONS no está configurado)"
fi

# Ejecutar seed solo si RUN_SEED está configurado
if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Ejecutando seed de base de datos..."
  npm run seed
  
  if [ $? -eq 0 ]; then
    echo "✅ Seed ejecutado correctamente"
  else
    echo "❌ Error al ejecutar seed"
    exit 1
  fi
else
  echo "⏭️  Seed omitido (RUN_SEED no está configurado)"
fi

echo "🚀 Iniciando aplicación..."
exec node dist/main.js

