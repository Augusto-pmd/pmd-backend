import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get Express instance to register global OPTIONS handler
  const expressApp = app.getHttpAdapter().getInstance();

  // CORS origin validation function (reusable for both handlers)
  const isOriginAllowed = (origin: string | undefined): boolean => {
    // Allow requests with no origin (e.g., curl, server-to-server)
    if (!origin) {
      return true;
    }

    // Allow localhost:3000 for local development (http or https)
    if (origin === 'http://localhost:3000' || origin === 'https://localhost:3000') {
      return true;
    }

    // Allow any Vercel deployment (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      return true;
    }

    return false;
  };

  // Register global OPTIONS handler BEFORE routes are matched
  // This ensures preflight requests always get CORS headers
  expressApp.options('*', (req: Request, res: Response) => {
    const origin = req.headers.origin;

    if (isOriginAllowed(origin)) {
      // Set CORS headers manually
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      res.status(204).end();
    } else {
      res.status(403).end();
    }
  });

  // CORS origin validation function for app.enableCors() callback
  const validateOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    }
  };

  // Enable CORS with Express-compatible configuration (secondary protection)
  app.enableCors({
    origin: validateOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Set global prefix for all routes so frontend can call /api/*
  app.setGlobalPrefix('api');

  // Global exception filter - standardize error response format
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('PMD Management System API')
    .setDescription(
      'Complete API documentation for PMD Management System. ' +
      'Includes authentication, users, roles, suppliers, works, contracts, expenses, ' +
      'incomes, cashboxes, cash movements, alerts, accounting records, and audit logs.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Roles', 'Role management endpoints')
    .addTag('Suppliers', 'Supplier management endpoints')
    .addTag('Supplier Documents', 'Supplier document management endpoints')
    .addTag('Works', 'Work/Project management endpoints')
    .addTag('Work Budgets', 'Work budget management endpoints')
    .addTag('Contracts', 'Contract management endpoints')
    .addTag('Rubrics', 'Rubric/Category management endpoints')
    .addTag('Expenses', 'Expense management endpoints')
    .addTag('VAL', 'VAL document management endpoints')
    .addTag('Incomes', 'Income management endpoints')
    .addTag('Cashboxes', 'Cashbox management endpoints')
    .addTag('Cash Movements', 'Cash movement management endpoints')
    .addTag('Schedule', 'Work schedule/Gantt management endpoints')
    .addTag('Alerts', 'Alert management endpoints')
    .addTag('Accounting', 'Accounting records and reports endpoints')
    .addTag('Audit', 'Audit log endpoints')
    .addTag('Health', 'Health check endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Render requires port 8080 or 10000 - use 10000 as default
  const port = process.env.PORT || 10000;
  
  // Log de inicio visible para Render
  console.log("🚀 PMD Backend booting on port:", port);
  
  const server = await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  console.log(`Health check: http://localhost:${port}/api/health`);

  // ROUTE DEBUG - Print all registered routes
  const httpServer = app.getHttpServer();
  const router = (httpServer as any)._events?.request?._router || (httpServer as any)._router;
  const routes: Array<{ method: string; path: string }> = [];
  
  if (router && router.stack) {
    const scan = (stack: any[], prefix = '') => {
      stack.forEach((layer: any) => {
        if (layer.route) {
          Object.keys(layer.route.methods).forEach((method: string) => {
            if (layer.route.methods[method]) {
              routes.push({
                method: method.toUpperCase(),
                path: prefix + layer.route.path,
              });
            }
          });
        } else if (layer.name === 'router' && layer.handle?.stack) {
          const segment = layer.regexp?.source
            ?.replace(/\\\/\?/g, '')
            ?.replace(/\(\?=\\\/\|\$\)/g, '')
            ?.replace(/\\\//g, '/')
            ?.replace(/\^|\$|\\/g, '') || '';
          scan(layer.handle.stack, prefix + segment);
        }
      });
    };
    scan(router.stack);
  }
  
  console.log("🛣️ ROUTES REGISTERED:", JSON.stringify(routes, null, 2));

  return server;
}

bootstrap();

