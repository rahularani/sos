import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('UYRA-Backend');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 4000;
  const allowedOrigins = (configService.get<string>('ALLOWED_ORIGINS') || 'http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5174')
    .split(',')
    .map((o) => o.trim());

  // CORS configuration allowing local network IP addresses (HTTP & HTTPS)
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        allowedOrigins.includes('*') ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('https://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('https://127.0.0.1') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('https://192.168.') ||
        origin.startsWith('http://10.') ||
        origin.startsWith('https://10.') ||
        origin.startsWith('http://172.') ||
        origin.startsWith('https://172.')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback allow in local dev environment
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(port, '0.0.0.0');
  logger.log(`=======================================================`);
  logger.log(` UYRA Public Emergency Response Platform API running!`);
  logger.log(` Local:   http://localhost:${port}`);
  logger.log(` Network: http://192.168.0.60:${port}`);
  logger.log(`=======================================================`);
}

bootstrap();
