import { spawn } from 'child_process';
import fs from 'fs';

/**
 * Core Service to Extract Metadata Using yt-dlp
 * Optimized for Fast JSON Dumping (Zero-Buffer Pass-Through)
 */

// Helper to generate a random IPv6 address within Tanvir Bhai's AWS Subnet
function generateRandomIPv6() {
  const prefix = '2406:da1c:4ab:5b8c';
  const randomBlock = () => Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
  return `${prefix}:${randomBlock()}:${randomBlock()}:${randomBlock()}:${randomBlock()}`;
}

export const extractMetadata = async (videoUrl) => {
  const randomIp = generateRandomIPv6();

  const args = [
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    '--flat-playlist',
    '--force-ipv6',
    '--source-address', randomIp
  ];

  const cookieFile = process.env.YTDLP_COOKIE_FILE || process.env.YTDLP_COOKIES_FILE || '';
  if (cookieFile && fs.existsSync(cookieFile)) {
    args.push('--cookies', cookieFile);
    console.log(`[ytdlService] Injecting cookies from: ${cookieFile}`);
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
      return executeYtdlp(args.filter((arg) => arg !== '--force-ipv6' && arg !== randomIp));
    }

    throw error;
  });
};