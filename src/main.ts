import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
