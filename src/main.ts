import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { Application } from 'express';
import { IncomingMessage, ServerResponse } from 'http';

let cachedServer: Application | null = null;

async function createNestServer(): Promise<Application> {
  const expressApp: Application = express() as Application;

  const adapter = new ExpressAdapter(expressApp);

  const app = await NestFactory.create(AppModule, adapter);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  await app.init();
  return expressApp;
}

export default async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  if (!cachedServer) {
    cachedServer = await createNestServer();
  }

  cachedServer(req, res);
};
