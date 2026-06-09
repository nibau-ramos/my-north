import http from 'http';
import { config } from './config';
import { createApp } from './app';
import { attachWS } from './ws';

const app = createApp();
const server = http.createServer(app);
attachWS(server);

server.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);
});
