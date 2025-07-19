import { Image as RNImage } from 'react-native';

class ImagePreloader {
  private cache = new Set<string>();
  private preloadQueue: string[] = [];
  private isPreloading = false;
  private failedImages = new Set<string>();

  /**
   * Preload images with priority queue
   * @param urls Array of image URLs to preload
   * @param priority 'high' for immediate visible images, 'low' for background preloading
   */
  async preloadImages(urls: string[], priority: 'high' | 'low' = 'low') {
    // Filter out already cached images and failed images
    const newUrls = urls.filter(url => 
      url && 
      !this.cache.has(url) && 
      !this.failedImages.has(url) &&
      this.isValidImageUrl(url)
    );
    
    if (newUrls.length === 0) return;
    
    if (priority === 'high') {
      // Add high priority images to the front of the queue
      this.preloadQueue.unshift(...newUrls);
    } else {
      // Add low priority images to the back of the queue
      this.preloadQueue.push(...newUrls);
    }
    
    if (!this.isPreloading) {
      this.processQueue();
    }
  }

  /**
   * Process the preload queue in batches
   */
  private async processQueue() {
    this.isPreloading = true;
    
    while (this.preloadQueue.length > 0) {
      // Process 5 images at a time to avoid overwhelming the network
      const batch = this.preloadQueue.splice(0, 5);
      
      await Promise.allSettled(
        batch.map(async (url) => {
          try {
            await RNImage.prefetch(url);
            this.cache.add(url);
            console.log(`✅ Preloaded image: ${url.substring(0, 50)}...`);
          } catch (error) {
            this.failedImages.add(url);
            console.warn(`❌ Failed to preload image: ${url.substring(0, 50)}...`, error);
          }
        })
      );
      
      // Small delay between batches to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isPreloading = false;
  }

  /**
   * Check if an image is already cached
   */
  isImageCached(url: string): boolean {
    return this.cache.has(url);
  }

  /**
   * Check if an image failed to load
   */
  isImageFailed(url: string): boolean {
    return this.failedImages.has(url);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cached: this.cache.size,
      failed: this.failedImages.size,
      queued: this.preloadQueue.length,
      isPreloading: this.isPreloading
    };
  }

  /**
   * Clear the cache and failed images set
   */
  clearCache() {
    this.cache.clear();
    this.failedImages.clear();
    this.preloadQueue = [];
  }

  /**
   * Validate if the URL is a proper image URL
   */
  private isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Preload a single image and return a promise
   */
  async preloadSingleImage(url: string): Promise<boolean> {
    if (!this.isValidImageUrl(url)) return false;
    if (this.cache.has(url)) return true;
    if (this.failedImages.has(url)) return false;

    try {
      await RNImage.prefetch(url);
      this.cache.add(url);
      return true;
    } catch (error) {
      this.failedImages.add(url);
      return false;
    }
  }
}

// Export singleton instance
export const imagePreloader = new ImagePreloader(); 