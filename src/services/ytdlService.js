import { spawn } from 'child_process';

/**
 * Core Service to Extract Metadata Using yt-dlp
 * Optimized for Fast JSON Dumping (Zero-Buffer Pass-Through)
 */
export const extractMetadata = (videoUrl) => {
  return new Promise((resolve, reject) => {
    // yt-dlp optimization flags for maximum speed
    const args = [
      '--dump-json',
      '--no-playlist',           // Ensure only single video is processed
      '--no-warnings',           // Skip warnings to improve execution speed
      '--ignore-errors',         // Bypass non-fatal extraction errors
      '--page-title',            // Disable unnecessary page title loading
      videoUrl
    ];

    // Secure execution using child_process.spawn to prevent Command Injection
    const child = spawn('yt-dlp', args);

    let stdoutData = '';
    let stderrData = '';

    // Stream stdout data chunks
    child.stdout.on('data', (data) => {
      stdoutData += data;
    });

    // Stream stderr data chunks
    child.stderr.on('data', (data) => {
      stderrData += data;
    });

    // Handle process completion
    child.on('close', (code) => {
      if (code !== 0 && !stdoutData) {
        return reject(new Error(stderrData.trim() || 'yt-dlp failed to extract metadata.'));
      }

      try {
        if (!stdoutData.trim()) {
          return reject(new Error('No metadata returned. The video might be private, deleted, or unsupported.'));
        }
        
        const parsedJson = JSON.parse(stdoutData);
        resolve(parsedJson);
      } catch (parseError) {
        reject(new Error('Failed to parse metadata payload.'));
      }
    });

    // Handle system or network errors during spawn
    child.on('error', (err) => {
      reject(err);
    });
  });
};