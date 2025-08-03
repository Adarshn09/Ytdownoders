import { createServer } from 'http';
import express from 'express';
import { registerRoutes } from '../server/routes.js';
import seoRoutes from '../server/seo-routes.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add SEO routes
app.use(seoRoutes);

// Register API routes
await registerRoutes(app);

// Error handling middleware
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ message });
});

export default app;
