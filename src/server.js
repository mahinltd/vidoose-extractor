import app from './app.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || 'development';

// Initialize server instance
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`[Vidoose Core Engine] Micro-service initiated successfully.`);
  console.log(`[Status] Running in [${ENV.toUpperCase()}] mode.`);
  console.log(`[Address] http://localhost:${PORT}`);
  console.log(`==================================================`);
});