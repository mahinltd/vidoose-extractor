import { extractMetadata } from '../services/ytdlService.js';

/**
 * Controller to handle CDN URL extraction with Free vs Premium logic
 * Organization: Mahin Ltd
 * Project: Vidoose
 */
export const handleExtraction = async (req, res) => {
  try {
    const { sanitizedUrl, isPremium, formatType } = req;

    // 1. Fetch raw optimized metadata from yt-dlp service
    const rawData = await extractMetadata(sanitizedUrl);

    // 2. Extract essential metadata fields only (Zero-buffer pass-through)
    const metadata = {
      title: rawData.title || 'Unknown Title',
      duration: rawData.duration || 0,
      thumbnail: rawData.thumbnail || rawData.thumbnails?.[0]?.url || null,
      uploader: rawData.uploader || 'Unknown Uploader',
      platform: rawData.extractor_key || 'Unknown',
    };

    const formats = rawData.formats || [];
    let selectedUrl = null;
    let selectedResolution = null;

    // 3. Apply Free vs Premium filtering logic
    if (formatType === 'audio') {
      // Premium HQ Audio or Default Audio request
      const audioFormats = formats
        .filter(f => f.vcodec === 'none' && f.acodec !== 'none' && f.url)
        .sort((a, b) => (b.abr || 0) - (a.abr || 0)); // Sort by highest audio bitrate

      if (audioFormats.length > 0) {
        selectedUrl = audioFormats[0].url;
        selectedResolution = `audio_${audioFormats[0].abr || 'HQ'}kbps`;
      }
    } else {
      // Video format filtering
      if (isPremium) {
        // Premium: Filter and sort to find the absolute maximum resolution (1080p, 2K, 4K, etc.)
        const premiumFormats = formats
          .filter(f => f.url && f.height)
          .sort((a, b) => b.height - a.height);

        if (premiumFormats.length > 0) {
          selectedUrl = premiumFormats[0].url;
          selectedResolution = `${premiumFormats[0].height}p`;
        }
      } else {
        // Free: Filter to restrict quality up to 720p resolution maximum
        const freeFormats = formats
          .filter(f => f.url && f.height && f.height <= 720)
          .sort((a, b) => b.height - a.height); // Get the best quality available up to 720p

        if (freeFormats.length > 0) {
          selectedUrl = freeFormats[0].url;
          selectedResolution = `${freeFormats[0].height}p`;
        }
      }
    }

    // 4. Fallback: If strict resolution matching fails, use the direct engine default URL
    if (!selectedUrl && rawData.url) {
      selectedUrl = rawData.url;
      selectedResolution = rawData.height ? `${rawData.height}p` : 'default';
    }

    // 5. If no streaming link is extractable, return a clean error
    if (!selectedUrl) {
      return res.status(404).json({
        success: false,
        error: 'No direct streaming URL could be extracted for the requested profile.',
      });
    }

    // 6. Return response containing only text URLs and metadata
    return res.status(200).json({
      success: true,
      tier: isPremium ? 'Premium' : 'Free',
      formatType,
      resolution: selectedResolution,
      metadata,
      streamingUrl: selectedUrl,
    });

  } catch (error) {
    // Gracefully handle unsupported URLs, private videos, or timeouts
    return res.status(500).json({
      success: false,
      error: error.message || 'An unexpected error occurred during extraction.',
    });
  }
};