import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable cookie parser for handling HTTP-only cookies
  app.use(cookieParser());

  // Enable CORS for frontend development
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Frontend URLs
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
