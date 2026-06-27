/**
 * URL Validation and Sanitization Middleware
 * Organization: Mahin Ltd
 * Project: Vidoose
 */

export const validateExtractionRequest = (req, res, next) => {
  const { url, isPremium, formatType } = req.body;

  // 1. Check if URL is provided
  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'A valid URL string is required.',
    });
  }

  // 2. Validate URL structure and protocol (RFC 3986)
  try {
    const parsedUrl = new URL(url.trim());
    
    // Only allow http and https protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({
        success: false,
        error: 'Only HTTP and HTTPS protocols are supported.',
      });
    }

    // Assign sanitized URL and flags to request object
    req.sanitizedUrl = parsedUrl.href;
    req.isPremium = Boolean(isPremium);
    req.formatType = formatType || 'video'; // Supports 'video' or 'audio'

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'The provided URL is invalid. Please enter a valid link.',
    });
  }
};