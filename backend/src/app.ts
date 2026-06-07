import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRouter from './routes/auth';
import pairingRouter from './routes/pairing';
import adminRouter from './routes/admin';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(path.resolve('public')));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/auth', authRouter);
  app.use('/pairing', pairingRouter);
  app.use('/admin', adminRouter);

  return app;
}
