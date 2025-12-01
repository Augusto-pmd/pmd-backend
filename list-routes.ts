import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './src/app.module';

async function listRoutes() {
  const app: INestApplication = await NestFactory.create(AppModule, { logger: false });
  
  // Get all registered routes
  const server = app.getHttpServer();
  const router = server._events.request._router;
  
  const routes: Array<{ method: string; path: string }> = [];
  
  if (router && router.stack) {
    router.stack.forEach((middleware: any) => {
      if (middleware.route) {
        // Direct route
        const methods = Object.keys(middleware.route.methods);
        methods.forEach((method: string) => {
          routes.push({
            method: method.toUpperCase(),
            path: middleware.route.path,
          });
        });
      } else if (middleware.name === 'router' && middleware.regexp) {
        // Router middleware
        const routerPath = middleware.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/\^|\$|\\/g, '');
        
        if (middleware.handle && middleware.handle.stack) {
          middleware.handle.stack.forEach((handler: any) => {
            if (handler.route) {
              const methods = Object.keys(handler.route.methods);
              methods.forEach((method: string) => {
                routes.push({
                  method: method.toUpperCase(),
                  path: routerPath + handler.route.path,
                });
              });
            }
          });
        }
      }
    });
  }
  
  // Filter and format routes
  const authRoutes = routes.filter((r) => r.path.includes('/auth'));
  
  console.log('\n=== RUTAS DE AUTENTICACIÓN ===\n');
  authRoutes.forEach((route) => {
    console.log(`${route.method.padEnd(6)} ${route.path}`);
  });
  
  console.log('\n=== VERIFICACIÓN ===\n');
  const loginRoute = routes.find(
    (r) => r.path.includes('/auth/login') && r.method === 'POST'
  );
  
  if (loginRoute) {
    console.log('✅ POST /api/auth/login está mapeado correctamente');
  } else {
    console.log('❌ POST /api/auth/login NO está mapeado');
  }
  
  const registerRoute = routes.find(
    (r) => r.path.includes('/auth/register') && r.method === 'POST'
  );
  
  if (registerRoute) {
    console.log('✅ POST /api/auth/register está mapeado correctamente');
  } else {
    console.log('❌ POST /api/auth/register NO está mapeado');
  }
  
  await app.close();
  process.exit(0);
}

listRoutes().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

