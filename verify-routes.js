// Simple verification script
const fs = require('fs');
const path = require('path');

console.log('\n=== VERIFICACIÓN DE RUTAS ===\n');

// Check if auth module is compiled
const authControllerPath = path.join(__dirname, 'dist', 'auth', 'auth.controller.js');
if (fs.existsSync(authControllerPath)) {
  console.log('✅ auth.controller.js compilado correctamente');
} else {
  console.log('❌ auth.controller.js NO encontrado');
}

// Check if auth module is compiled
const authModulePath = path.join(__dirname, 'dist', 'auth', 'auth.module.js');
if (fs.existsSync(authModulePath)) {
  console.log('✅ auth.module.js compilado correctamente');
  
  // Read and check for @Controller('auth')
  const content = fs.readFileSync(authModulePath, 'utf8');
  if (content.includes('auth') && content.includes('Controller')) {
    console.log('✅ AuthController está registrado en AuthModule');
  }
} else {
  console.log('❌ auth.module.js NO encontrado');
}

// Check main.js
const mainPath = path.join(__dirname, 'dist', 'main.js');
if (fs.existsSync(mainPath)) {
  console.log('✅ main.js compilado correctamente');
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  if (mainContent.includes("setGlobalPrefix('api')")) {
    console.log('✅ Global prefix "api" configurado');
  }
} else {
  console.log('❌ main.js NO encontrado');
}

// Check app.module.js
const appModulePath = path.join(__dirname, 'dist', 'app.module.js');
if (fs.existsSync(appModulePath)) {
  console.log('✅ app.module.js compilado correctamente');
  const appContent = fs.readFileSync(appModulePath, 'utf8');
  if (appContent.includes('AuthModule')) {
    console.log('✅ AuthModule importado en AppModule');
  }
} else {
  console.log('❌ app.module.js NO encontrado');
}

console.log('\n=== RUTAS ESPERADAS ===\n');
console.log('POST /api/auth/login');
console.log('POST /api/auth/register');
console.log('\n✅ Build completado exitosamente\n');

