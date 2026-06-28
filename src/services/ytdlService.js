import { spawn } from 'child_process';
import fs from 'fs';

/**
 * Core Service to Extract Metadata Using yt-dlp
 * Optimized for Fast JSON Dumping (Zero-Buffer Pass-Through)
 */

function resolvePlatformCookieFile(videoUrl) {
  try {
    const parsedUrl = new URL(videoUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return '/var/www/vidoose-extractor/cookies/youtube.txt';
    }

    if (hostname.includes('instagram.com')) {
      return '/var/www/vidoose-extractor/cookies/instagram.txt';
    }

    if (hostname.includes('facebook.com')) {
      return '/var/www/vidoose-extractor/cookies/facebook.txt';
    }

    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return '/var/www/vidoose-extractor/cookies/twitter.txt';
    }

    return null;
  } catch (error) {
    return null;
  }
}

export const extractMetadata = async (videoUrl) => {
  const args = [
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    '--flat-playlist',
    '--force-ipv6' // Force routing over our verified primary AWS IPv6 network
  ];

  const cookieFile = resolvePlatformCookieFile(videoUrl);
  if (cookieFile && fs.existsSync(cookieFile)) {
    args.push('--cookies', cookieFile);
    console.log(`[ytdlService] Injecting platform cookie file: ${cookieFile}`);
  }

  args.push(videoUrl);

  const executeYtdlp = (execArgs) => {
    return new Promise((resolve, reject) => {
      const child = spawn('yt-dlp', execArgs);

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

  return executeYtdlp(args).catch((error) => {
    const message = error.message || '';
    const shouldFallback = message.includes('Name or service not known') || message.includes('TransportError');

    if (shouldFallback) {
      console.log('[ytdlService] IPv6 bind failed, retrying without IPv6 flags.');
      return executeYtdlp(args.filter((arg) => arg !== '--force-ipv6'));
    }

    throw error;
  });
};