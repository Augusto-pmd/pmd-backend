import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes so frontend can call /api/*
  app.setGlobalPrefix('api');

  // CORS - Configure for frontend integration (AL INICIO, antes de cualquier middleware)
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://pmd-frontend-two.vercel.app', // NUEVO FRONTEND
      'https://pmd-frontend-nine.vercel.app', // opcional si aún se usa
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

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

  // Render requires port 8080 or 10000 - use 8080 as default
  const port = process.env.PORT || 8080;
  
  // Log de inicio visible para Render
  console.log("🔥 PMD Backend is starting on port", port);
  
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  console.log(`Health check: http://localhost:${port}/api/health`);
}

bootstrap();

