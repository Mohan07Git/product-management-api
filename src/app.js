import express from 'express';
import productsRouter from './routes/products.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createMcpRouter } from './mcp.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.use('/products', productsRouter);
  app.use('/mcp', createMcpRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}