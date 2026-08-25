import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const prefix = config.get<string>('apiPrefix')!;
  const port = config.get<number>('port')!;

  app.setGlobalPrefix(prefix);
  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('corsOrigin')!.split(',').map((o) => o.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('TI Warehouse API')
    .setDescription('Gestão de ativos e estoque de TI — entradas, entregas, devoluções e histórico')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup(`${prefix}/docs`, app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(port, '0.0.0.0');

  new Logger('Bootstrap').log(`API em http://localhost:${port}/${prefix} — docs em /${prefix}/docs`);
}

void bootstrap();
