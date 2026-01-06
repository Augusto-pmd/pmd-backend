#!/usr/bin/env node

/**
 * Script para verificar si pg_dump está disponible en el sistema
 * Uso: node scripts/check-pg-dump.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

console.log('🔍 Verificando disponibilidad de pg_dump...\n');
console.log(`Plataforma: ${process.platform}\n`);

// Check environment variable
const envPgDumpPath = process.env.PG_DUMP_PATH;
if (envPgDumpPath) {
  console.log(`📌 PG_DUMP_PATH está configurado: ${envPgDumpPath}`);
  if (fs.existsSync(envPgDumpPath)) {
    console.log(`   ✅ El archivo existe`);
    // Try to verify it works
    execAsync(`"${envPgDumpPath}" --version`)
      .then(({ stdout }) => {
        console.log(`   ✅ pg_dump funciona: ${stdout.trim()}`);
        console.log('\n✅ pg_dump está disponible y funcionando correctamente!');
        process.exit(0);
      })
      .catch(() => {
        console.log(`   ❌ El archivo existe pero no funciona correctamente`);
      });
  } else {
    console.log(`   ❌ El archivo no existe`);
  }
  console.log('');
}

// Check PATH
console.log('🔍 Verificando PATH del sistema...');
const checkCommand = isWindows ? 'where pg_dump' : 'which pg_dump';

execAsync(checkCommand)
  .then(({ stdout }) => {
    const pgDumpPath = stdout.trim();
    console.log(`   ✅ pg_dump encontrado en PATH: ${pgDumpPath}`);
    
    // Verify it works
    return execAsync('pg_dump --version');
  })
  .then(({ stdout }) => {
    console.log(`   ✅ pg_dump funciona: ${stdout.trim()}`);
    console.log('\n✅ pg_dump está disponible y funcionando correctamente!');
    process.exit(0);
  })
  .catch(() => {
    console.log('   ❌ pg_dump no está en PATH');
    console.log('');
    
    // Check common installation paths
    console.log('🔍 Buscando en rutas comunes de instalación...\n');
    
    const pathsToCheck = [];
    
    if (isWindows) {
      const versions = [17, 16, 15, 14, 13, 12];
      for (const version of versions) {
        pathsToCheck.push(`C:\\Program Files\\PostgreSQL\\${version}\\bin\\pg_dump.exe`);
        pathsToCheck.push(`C:\\Program Files (x86)\\PostgreSQL\\${version}\\bin\\pg_dump.exe`);
      }
    } else if (isMac) {
      pathsToCheck.push(
        '/usr/local/bin/pg_dump',
        '/opt/homebrew/bin/pg_dump',
        '/usr/local/opt/postgresql/bin/pg_dump',
        '/opt/homebrew/opt/postgresql/bin/pg_dump',
        '/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump',
      );
    } else if (isLinux) {
      pathsToCheck.push(
        '/usr/bin/pg_dump',
        '/usr/local/bin/pg_dump',
        '/opt/postgresql/bin/pg_dump',
      );
    }
    
    let found = false;
    for (const pgPath of pathsToCheck) {
      if (fs.existsSync(pgPath)) {
        console.log(`   ✅ Encontrado: ${pgPath}`);
        found = true;
        
        // Try to verify it works
        execAsync(`"${pgPath}" --version`)
          .then(({ stdout }) => {
            console.log(`   ✅ Funciona correctamente: ${stdout.trim()}`);
            console.log(`\n💡 Solución: Agrega esta ruta al PATH o configura:`);
            console.log(`   PG_DUMP_PATH=${pgPath}`);
            console.log('\n✅ pg_dump está disponible pero no está en PATH!');
            process.exit(0);
          })
          .catch(() => {
            console.log(`   ❌ El archivo existe pero no funciona`);
          });
        break;
      }
    }
    
    if (!found) {
      console.log('   ❌ No se encontró pg_dump en ninguna ruta común\n');
      console.log('💡 Soluciones:');
      if (isWindows) {
        console.log('   1. Instala PostgreSQL desde: https://www.postgresql.org/download/windows/');
        console.log('   2. Durante la instalación, marca "Add PostgreSQL bin directory to PATH"');
        console.log('   3. O configura: PG_DUMP_PATH=C:\\Program Files\\PostgreSQL\\[versión]\\bin\\pg_dump.exe');
      } else if (isMac) {
        console.log('   1. Instala via Homebrew: brew install postgresql');
        console.log('   2. O descarga desde: https://www.postgresql.org/download/macosx/');
        console.log('   3. O configura: PG_DUMP_PATH=/usr/local/bin/pg_dump');
      } else if (isLinux) {
        console.log('   1. Instala cliente PostgreSQL:');
        console.log('      sudo apt-get install postgresql-client  # Debian/Ubuntu');
        console.log('      sudo yum install postgresql             # RHEL/CentOS');
        console.log('   2. O configura: PG_DUMP_PATH=/usr/bin/pg_dump');
      }
      console.log('\n❌ pg_dump no está disponible');
      process.exit(1);
    }
  });

