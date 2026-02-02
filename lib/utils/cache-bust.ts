/**
 * Cache Busting Utility
 * 
 * Adds timestamp parameter to URLs to force fresh image loads.
 * CRITICAL: Browser caching has been causing major issues across the game.
 * Use this for ALL image URLs to ensure fresh content.
 */

/**
 * Add cache-busting parameter to a URL
 * @param url - The URL to cache bust
 * @returns URL with cache-busting parameter
 */
export function cacheBust(url: string | null | undefined): string {
  if (!url) return '';
  // Don't cache bust data URLs
  if (url.startsWith('data:')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_cb=${Date.now()}`;
}

/**
 * Remove cache-busting and other query params from URL
 * Useful for storage/comparison purposes
 * @param url - The URL to clean
 * @returns Clean URL without query params
 */
export function cleanUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  return url.split('?')[0];
}

/**
 * Load an image with cache busting
 * @param url - The image URL to load
 * @param crossOrigin - Whether to set crossOrigin attribute
 * @returns Promise that resolves with the loaded image
 */
export function loadImageFresh(url: string, crossOrigin = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${url}`));
    img.src = cacheBust(url);
  });
}
