import { Request, Response } from 'express';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';

let serverHandler: (req: Request, res: Response) => void | undefined;
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap() {
  const server = express();
  const adapter = new ExpressAdapter(server);
  const app = await NestFactory.create(AppModule, adapter, { logger: false });
  app.setGlobalPrefix('');
  await app.init();
  serverHandler = server;
}

export default async function handler(req: Request, res: Response) {
  try {
    if (!serverHandler) {
      if (!bootstrapPromise) {
        bootstrapPromise = bootstrap();
      }
      await bootstrapPromise;
    }

    return serverHandler!(req, res);
  } catch (err) {
    console.error('Serverless bootstrap error', err);
    res.status(500).send('Server initialization error');
  }
}
