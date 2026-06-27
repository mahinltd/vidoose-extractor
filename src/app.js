import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './routes/api.js';

const app = express();

// 1. HTTP Security Headers Protection
app.use(helmet());

// 2. Cross-Origin Resource Sharing Enablement
app.use(cors());

// 3. Body Parser for JSON Payload Handling
app.use(express.json());

// 4. Mount API Routes
app.use('/api/v1', apiRouter);

// 5. Fallback Route for Undefined Paths (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'The requested API endpoint does not exist.'
  });
});

// 6. Centralized Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Global Error Logging]:', err.stack || err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error. Please contact backend team.'
  });
});

export default app;