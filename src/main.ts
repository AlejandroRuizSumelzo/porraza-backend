import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import compression from 'compression';

async function bootstrap() {
  // IMPORTANTE: rawBody: true es NECESARIO para webhooks de Stripe
  // Permite acceder al body crudo (Buffer) para validar la firma del webhook
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Enable cookie parser for handling HTTP-only cookies
  app.use(cookieParser());

  // Enable gzip compression for responses
  // Reduces response size by ~70% (especially useful for large JSON responses)
  // Example: 200KB JSON → ~60KB with gzip
  app.use(
    compression({
      filter: (req, res) => {
        // Don't compress responses with this request header
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Fallback to standard compression filter
        return compression.filter(req, res);
      },
      // Compression level: 6 is a good balance between speed and compression ratio
      // 0 = no compression, 9 = maximum compression (slower)
      level: 6,
    }),
  );

  const allowedOrigins =
    process.env.ALLOWED_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  // Enable CORS using configured origins (defaults support local dev)
  app.enableCors({
    origin:
      allowedOrigins.length > 0
        ? allowedOrigins
        : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Porraza API')
    .setDescription('API documentation for Porraza Backend')
    .setVersion('1.0')
    .addTag('porraza')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token (copy from /auth/login response)',
        in: 'header',
      },
      'JWT-auth', // Security scheme name
    )
    .addCookieAuth(
      'accessToken',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
        description:
          'JWT token stored in HTTP-only cookie (automatically sent by browser)',
      },
      'cookie-auth', // Alternative security scheme name
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3001);
  // eslint-disable-next-line no-console
  console.log(
    `Application is running on: http://localhost:${process.env.PORT ?? 3001}`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `Swagger documentation available at: http://localhost:${process.env.PORT ?? 3001}/api`,
  );
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
