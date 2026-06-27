import express from 'express';
import { handleExtraction } from '../controllers/extractController.js';
import { validateExtractionRequest } from '../utils/validator.js';

const router = express.Router();

/**
 * Route: POST /api/v1/extract
 * Middleware: validateExtractionRequest (Sanitizes and secures incoming inputs)
 * Controller: handleExtraction (Processes yt-dlp core engine)
 */
router.post('/extract', validateExtractionRequest, handleExtraction);

export default router;