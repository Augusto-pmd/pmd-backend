#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(process.cwd(), 'src', 'migrations');
const distDir = path.join(process.cwd(), 'dist', 'migrations');

// Crear directorio dist/migrations si no existe
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log('📁 Creado directorio dist/migrations');
}

// Buscar archivos de migración TypeScript
if (!fs.existsSync(srcDir)) {
  console.log('⚠️  No se encontró el directorio src/migrations');
  process.exit(0);
}

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.ts'));

if (files.length === 0) {
  console.log('⚠️  No se encontraron migraciones para compilar');
  process.exit(0);
}

console.log(`📦 Compilando ${files.length} migración(es)...`);

// Compilar cada archivo de migración
files.forEach(file => {
  const srcFile = path.join(srcDir, file);
  const distFile = path.join(distDir, file.replace('.ts', '.js'));
  
  try {
    execSync(
      `tsc "${srcFile}" --outDir "${distDir}" --module commonjs --target es2017 --moduleResolution node --esModuleInterop --skipLibCheck --declaration false --sourceMap false --rootDir "${srcDir}"`,
      { stdio: 'inherit' }
    );
    console.log(`✅ Compilada: ${file}`);
  } catch (error) {
    console.error(`❌ Error compilando ${file}:`, error.message);
    process.exit(1);
  }
});

console.log('✅ Migraciones compiladas exitosamente');
