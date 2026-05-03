import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import pairingRouter from './routes/pairing';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/auth', authRouter);
  app.use('/pairing', pairingRouter);

  return app;
}
