import { spawn } from 'child_process';

/**
 * Core Service to Extract Metadata Using yt-dlp
 * Optimized for Fast JSON Dumping (Zero-Buffer Pass-Through)
 */
export const extractMetadata = (videoUrl) => {
  const buildArgs = (useIpv6 = true) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--flat-playlist'
    ];

    if (useIpv6) {
      args.push('--force-ipv6', '--source-address', '::/0');
    }

    args.push(videoUrl);
    return args;
  };

  const executeYtdlp = (args) => {
    return new Promise((resolve, reject) => {
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

  return executeYtdlp(buildArgs(true)).catch((error) => {
    const message = error.message || '';
    const shouldFallback = message.includes('Name or service not known') || message.includes('TransportError');

    if (shouldFallback) {
      console.log('[ytdlService] IPv6 bind failed, retrying without IPv6 flags.');
      return executeYtdlp(buildArgs(false));
    }

    throw error;
  });
};
