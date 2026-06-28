import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Core Service to Extract Metadata Using yt-dlp
 * Optimized for Fast JSON Dumping (Zero-Buffer Pass-Through)
 */
export const extractMetadata = (videoUrl) => {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--flat-playlist'
    ];

    // Determine platform and resolve cookie file path (ESM compatible)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    let cookieFile = '';
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      cookieFile = path.join(__dirname, '..', '..', 'cookies', 'youtube.txt');
    } else if (videoUrl.includes('facebook.com')) {
      cookieFile = path.join(__dirname, '..', '..', 'cookies', 'facebook.txt');
    } else if (videoUrl.includes('instagram.com')) {
      cookieFile = path.join(__dirname, '..', '..', 'cookies', 'instagram.txt');
    } else if (videoUrl.includes('tiktok.com')) {
      cookieFile = path.join(__dirname, '..', '..', 'cookies', 'tiktok.txt');
    }

    if (cookieFile && fs.existsSync(cookieFile)) {
      args.push('--cookies', cookieFile);
      console.log(`[ytdlService] Injecting cookie file: ${cookieFile}`);
    } else if (cookieFile) {
      console.log(`[ytdlService] Cookie file not found: ${cookieFile}`);
    }

    args.push(videoUrl);

    const child = spawn('yt-dlp', args);

    let stdoutData = '';
    let stderrData = '';
    let settled = false;

    const rejectOnce = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    };

    const resolveOnce = (data) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(data);
    };

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', (code) => {
      const cleanStdout = stdoutData.trim();
      const cleanStderr = stderrData.trim();

      if (code !== 0) {
        return rejectOnce(new Error(cleanStderr || cleanStdout || 'yt-dlp failed to extract metadata.'));
      }

      try {
        if (!cleanStdout) {
          return rejectOnce(new Error(cleanStderr || 'No metadata returned. The video might be private, deleted, or unsupported.'));
        }
        
        const parsedJson = JSON.parse(cleanStdout);
        resolveOnce(parsedJson);
      } catch (parseError) {
        rejectOnce(new Error(cleanStderr || 'Failed to parse metadata payload.'));
      }
    });

    child.on('error', (err) => {
      rejectOnce(err);
    });
  });
};