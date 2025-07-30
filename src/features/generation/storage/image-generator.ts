/**
 * Image Generator
 * Handles image generation from external APIs (Unsplash, Pixabay) and mock images
 */

import { Logger } from '../../../core/utils/logger';
import {
  ImageGenerationOptions,
  GeneratedImage,
  ImageServiceProvider,
  ImageSearchOptions,
  ImageSearchResult,
  SearchResultImage,
  RateLimitInfo,
  UnsplashConfig,
  PixabayConfig,
  MockImageConfig,
  ImageMetadata,
  CATEGORY_SEARCH_TERMS,
  FILE_TYPE_EXTENSIONS
} from './storage-types';

export class ImageGenerator {
  private providers: Map<string, ImageServiceProvider> = new Map();
  private cache: Map<string, GeneratedImage[]> = new Map();
  private rateLimitCache: Map<string, RateLimitInfo> = new Map();

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize image service providers
   */
  private initializeProviders(): void {
    // Register Unsplash provider
    const unsplashConfig: UnsplashConfig = {
      accessKey: process.env.UNSPLASH_ACCESS_KEY || '',
      apiUrl: 'https://api.unsplash.com',
      rateLimit: 50, // requests per hour for demo
      cacheDuration: 3600000, // 1 hour
      fallbackToMock: true
    };

    if (unsplashConfig.accessKey) {
      this.providers.set('unsplash', new UnsplashProvider(unsplashConfig));
    }

    // Register Pixabay provider
    const pixabayConfig: PixabayConfig = {
      apiKey: process.env.PIXABAY_API_KEY || '',
      apiUrl: 'https://pixabay.com/api',
      rateLimit: 100, // requests per hour
      cacheDuration: 3600000, // 1 hour
      fallbackToMock: true
    };

    if (pixabayConfig.apiKey) {
      this.providers.set('pixabay', new PixabayProvider(pixabayConfig));
    }

    // Always register mock provider as fallback
    const mockConfig: MockImageConfig = {
      baseUrl: 'https://picsum.photos',
      categories: {
        'outdoor-adventure': ['#2F4F4F', '#228B22', '#8FBC8F'],
        'saas-tools': ['#4682B4', '#708090', '#B0C4DE'],
        'ecommerce': ['#FF6347', '#FFA500', '#FFD700'],
        'general': ['#696969', '#A9A9A9', '#D3D3D3']
      },
      dimensions: [
        { width: 800, height: 600 },
        { width: 1024, height: 768 },
        { width: 1200, height: 800 }
      ],
      formats: ['jpg', 'png'],
      generateRealistic: true
    };

    this.providers.set('mock', new MockImageProvider(mockConfig));
  }

  /**
   * Generate images based on options
   */
  async generateImages(options: ImageGenerationOptions): Promise<GeneratedImage[]> {
    Logger.info(`🖼️  Generating ${options.count} images for domain: ${options.domain}`);

    try {
      const cacheKey = this.getCacheKey(options);
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        Logger.debug('Using cached images');
        return this.cache.get(cacheKey)!.slice(0, options.count);
      }

      const provider = this.selectProvider(options);
      const images: GeneratedImage[] = [];

      // Generate search terms from categories
      const searchTerms = this.generateSearchTerms(options.categories, options.domain);
      
      for (let i = 0; i < options.count && i < searchTerms.length; i++) {
        const searchTerm = searchTerms[i % searchTerms.length];
        
        try {
          // Check rate limit
          await this.checkRateLimit(provider.name);
          
          // Search for images
          const searchResult = await provider.searchImages(searchTerm, {
            query: searchTerm,
            category: options.categories[i % options.categories.length],
            count: 1,
            dimensions: options.dimensions,
            safeSearch: true
          });

          if (searchResult.success && searchResult.images.length > 0) {
            const imageResult = searchResult.images[0];
            
            // Download the image
            const image = await provider.downloadImage(imageResult.downloadUrl);
            
            // Enhance with additional metadata
            image.metadata = {
              ...image.metadata,
              category: options.categories[i % options.categories.length],
              source: provider.name as any,
              tags: imageResult.tags,
              generatedAt: new Date().toISOString()
            };

            images.push(image);
            Logger.debug(`✅ Generated image: ${image.filename}`);

            // Respect rate limits
            if (options.rateLimitDelay > 0) {
              await new Promise(resolve => setTimeout(resolve, options.rateLimitDelay));
            }

          } else {
            Logger.warn(`Failed to find image for term: ${searchTerm}`);
            
            // Fallback to mock if enabled
            if (options.fallbackToMock && provider.name !== 'mock') {
              const mockProvider = this.providers.get('mock');
              if (mockProvider) {
                const mockImage = await this.generateMockImage(searchTerm, options);
                if (mockImage) {
                  images.push(mockImage);
                }
              }
            }
          }

        } catch (imageError: any) {
          Logger.warn(`Failed to generate image ${i + 1}:`, imageError.message);
          
          // Try fallback to mock
          if (options.fallbackToMock && provider.name !== 'mock') {
            try {
              const mockImage = await this.generateMockImage(searchTerms[i], options);
              if (mockImage) {
                images.push(mockImage);
              }
            } catch (mockError: any) {
              Logger.warn(`Mock image generation also failed:`, mockError.message);
            }
          }
          
          continue;
        }
      }

      // Cache results
      this.cache.set(cacheKey, images);
      
      Logger.success(`🖼️  Generated ${images.length}/${options.count} images successfully`);
      return images;

    } catch (error: any) {
      Logger.error('Image generation failed:', error);
      
      // Fallback to all mock images
      if (options.fallbackToMock) {
        return await this.generateAllMockImages(options);
      }
      
      throw error;
    }
  }

  /**
   * Generate mock image as fallback
   */
  private async generateMockImage(searchTerm: string, options: ImageGenerationOptions): Promise<GeneratedImage | null> {
    const mockProvider = this.providers.get('mock');
    if (!mockProvider) return null;

    try {
      const searchResult = await mockProvider.searchImages(searchTerm, {
        query: searchTerm,
        count: 1,
        dimensions: options.dimensions,
        safeSearch: true
      });

      if (searchResult.success && searchResult.images.length > 0) {
        return await mockProvider.downloadImage(searchResult.images[0].downloadUrl);
      }

    } catch (error: any) {
      Logger.warn('Mock image generation failed:', error.message);
    }

    return null;
  }

  /**
   * Generate all mock images as final fallback
   */
  private async generateAllMockImages(options: ImageGenerationOptions): Promise<GeneratedImage[]> {
    Logger.info('🔄 Falling back to mock images for all requests');
    
    const mockProvider = this.providers.get('mock');
    if (!mockProvider) return [];

    const images: GeneratedImage[] = [];
    const searchTerms = this.generateSearchTerms(options.categories, options.domain);

    for (let i = 0; i < options.count; i++) {
      const searchTerm = searchTerms[i % searchTerms.length];
      
      try {
        const mockImage = await this.generateMockImage(searchTerm, options);
        if (mockImage) {
          images.push(mockImage);
        }
      } catch (error: any) {
        Logger.warn(`Failed to generate mock image ${i + 1}:`, error.message);
      }
    }

    return images;
  }

  /**
   * Generate search terms from categories and domain
   */
  private generateSearchTerms(categories: string[], domain: string): string[] {
    const terms: string[] = [];

    // Add category-specific terms
    for (const category of categories) {
      if (CATEGORY_SEARCH_TERMS[category]) {
        terms.push(...CATEGORY_SEARCH_TERMS[category]);
      } else {
        terms.push(category);
      }
    }

    // Add domain-specific terms
    if (CATEGORY_SEARCH_TERMS[domain]) {
      terms.push(...CATEGORY_SEARCH_TERMS[domain]);
    }

    // Remove duplicates and shuffle
    const uniqueTerms = [...new Set(terms)];
    return this.shuffleArray(uniqueTerms);
  }

  /**
   * Select the best available provider
   */
  private selectProvider(options: ImageGenerationOptions): ImageServiceProvider {
    // Try to use requested service first (if specified, though not in current interface)
    // For now, we'll use a priority-based selection

    // Try providers in order of preference
    const preferenceOrder = ['unsplash', 'pixabay', 'mock'];
    
    for (const providerName of preferenceOrder) {
      if (this.providers.has(providerName)) {
        return this.providers.get(providerName)!;
      }
    }

    // Fallback to mock (should always be available)
    return this.providers.get('mock')!;
  }

  /**
   * Check rate limit for provider
   */
  private async checkRateLimit(providerName: string): Promise<void> {
    const cached = this.rateLimitCache.get(providerName);
    
    if (cached && cached.isLimited) {
      const waitTime = cached.resetTime.getTime() - Date.now();
      if (waitTime > 0) {
        Logger.warn(`Rate limited for ${providerName}, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 60000)));
      }
    }
  }

  /**
   * Generate cache key for options
   */
  private getCacheKey(options: ImageGenerationOptions): string {
    return `${options.domain}-${options.categories.join(',')}-${options.count}-${options.dimensions.width}x${options.dimensions.height}`;
  }

  /**
   * Shuffle array utility
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.rateLimitCache.clear();
    Logger.debug('Image generator cache cleared');
  }

  /**
   * Get provider status
   */
  async getProviderStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const [name, provider] of this.providers) {
      try {
        const isValid = await provider.validateApiKey();
        const rateLimit = await provider.getRateLimit();
        
        status[name] = {
          available: isValid,
          rateLimit: rateLimit,
          lastError: null
        };
      } catch (error: any) {
        status[name] = {
          available: false,
          rateLimit: null,
          lastError: error.message
        };
      }
    }

    return status;
  }
}

/**
 * Mock Image Provider - Always available fallback
 */
class MockImageProvider implements ImageServiceProvider {
  name = 'mock';

  constructor(private config: MockImageConfig) {}

  async searchImages(query: string, options: ImageSearchOptions): Promise<ImageSearchResult> {
    // Generate mock search results
    const images: SearchResultImage[] = [];
    
    for (let i = 0; i < options.count; i++) {
      const dimensions = this.config.dimensions[i % this.config.dimensions.length];
      const seed = this.generateSeed(query, i);
      
      images.push({
        id: `mock-${seed}-${i}`,
        url: `${this.config.baseUrl}/${dimensions.width}/${dimensions.height}?random=${seed}`,
        downloadUrl: `${this.config.baseUrl}/${dimensions.width}/${dimensions.height}?random=${seed}`,
        thumbnailUrl: `${this.config.baseUrl}/200/150?random=${seed}`,
        width: dimensions.width,
        height: dimensions.height,
        description: `Mock ${query} image ${i + 1}`,
        tags: [query, 'mock', 'generated'],
        author: {
          name: 'Mock Image Provider',
          url: undefined
        },
        license: 'Public Domain',
        source: 'mock'
      });
    }

    return {
      success: true,
      images,
      totalCount: images.length,
      rateLimitRemaining: 999,
      errors: []
    };
  }

  async downloadImage(imageUrl: string): Promise<GeneratedImage> {
    try {
      // For mock, we'll generate a simple colored rectangle
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const urlParts = imageUrl.split('/');
      const dimensions = {
        width: parseInt(urlParts[urlParts.length - 2]) || 800,
        height: parseInt(urlParts[urlParts.length - 1]?.split('?')[0]) || 600
      };

      const filename = `mock-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;

      return {
        filename,
        blob,
        url: imageUrl,
        type: 'image/jpeg',
        size: blob.size,
        dimensions,
        description: 'Mock generated image',
        altText: 'Mock image for testing purposes',
        metadata: {
          source: 'mock',
          tags: ['mock', 'generated', 'placeholder'],
          colors: ['#cccccc'],
          generatedAt: new Date().toISOString(),
          category: 'mock'
        }
      };

    } catch (error: any) {
      Logger.error('Mock image download failed:', error);
      throw error;
    }
  }

  async validateApiKey(): Promise<boolean> {
    return true; // Mock provider is always available
  }

  async getRateLimit(): Promise<RateLimitInfo> {
    return {
      remaining: 999,
      resetTime: new Date(Date.now() + 3600000), // 1 hour from now
      limit: 1000,
      isLimited: false
    };
  }

  private generateSeed(query: string, index: number): string {
    // Generate a consistent seed for the same query and index
    let hash = 0;
    const str = query + index.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }
}

/**
 * Unsplash Provider - Real images from Unsplash API
 */
class UnsplashProvider implements ImageServiceProvider {
  name = 'unsplash';

  constructor(private config: UnsplashConfig) {}

  async searchImages(query: string, options: ImageSearchOptions): Promise<ImageSearchResult> {
    try {
      const params = new URLSearchParams({
        query,
        per_page: options.count.toString(),
        orientation: options.orientation || 'landscape',
        content_filter: options.safeSearch ? 'high' : 'low'
      });

      const response = await fetch(`${this.config.apiUrl}/search/photos?${params}`, {
        headers: {
          'Authorization': `Client-ID ${this.config.accessKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data = await response.json();
      const images: SearchResultImage[] = data.results.map((item: any) => ({
        id: item.id,
        url: item.urls.regular,
        downloadUrl: item.urls.raw,
        thumbnailUrl: item.urls.thumb,
        width: item.width,
        height: item.height,
        description: item.description || item.alt_description || 'Unsplash image',
        tags: item.tags?.map((tag: any) => tag.title) || [],
        author: {
          name: item.user.name,
          url: item.user.links.html
        },
        license: 'Unsplash License',
        source: 'unsplash'
      }));

      return {
        success: true,
        images,
        totalCount: data.total,
        rateLimitRemaining: parseInt(response.headers.get('X-Ratelimit-Remaining') || '50'),
        errors: []
      };

    } catch (error: any) {
      Logger.error('Unsplash search failed:', error);
      return {
        success: false,
        images: [],
        totalCount: 0,
        rateLimitRemaining: 0,
        errors: [error.message]
      };
    }
  }

  async downloadImage(imageUrl: string): Promise<GeneratedImage> {
    try {
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const filename = `unsplash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;

      return {
        filename,
        blob,
        url: imageUrl,
        type: blob.type,
        size: blob.size,
        dimensions: { width: 0, height: 0 }, // Would need to read from blob
        description: 'Unsplash image',
        altText: 'High-quality stock photo from Unsplash',
        metadata: {
          source: 'unsplash',
          originalUrl: imageUrl,
          tags: [],
          colors: [],
          generatedAt: new Date().toISOString(),
          category: 'photography'
        }
      };

    } catch (error: any) {
      Logger.error('Unsplash image download failed:', error);
      throw error;
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/me`, {
        headers: {
          'Authorization': `Client-ID ${this.config.accessKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getRateLimit(): Promise<RateLimitInfo> {
    // This would typically be cached from the last API call
    return {
      remaining: this.config.rateLimit,
      resetTime: new Date(Date.now() + 3600000),
      limit: this.config.rateLimit,
      isLimited: false
    };
  }
}

/**
 * Pixabay Provider - Alternative image source
 */
class PixabayProvider implements ImageServiceProvider {
  name = 'pixabay';

  constructor(private config: PixabayConfig) {}

  async searchImages(query: string, options: ImageSearchOptions): Promise<ImageSearchResult> {
    try {
      const params = new URLSearchParams({
        key: this.config.apiKey,
        q: query,
        per_page: options.count.toString(),
        image_type: 'photo',
        safesearch: options.safeSearch ? 'true' : 'false',
        category: options.category || ''
      });

      const response = await fetch(`${this.config.apiUrl}/?${params}`);

      if (!response.ok) {
        throw new Error(`Pixabay API error: ${response.status}`);
      }

      const data = await response.json();
      const images: SearchResultImage[] = data.hits.map((item: any) => ({
        id: item.id.toString(),
        url: item.webformatURL,
        downloadUrl: item.largeImageURL,
        thumbnailUrl: item.previewURL,
        width: item.imageWidth,
        height: item.imageHeight,
        description: item.tags,
        tags: item.tags.split(', '),
        author: {
          name: item.user,
          url: `https://pixabay.com/users/${item.user}-${item.user_id}/`
        },
        license: 'Pixabay License',
        source: 'pixabay'
      }));

      return {
        success: true,
        images,
        totalCount: data.total,
        rateLimitRemaining: this.config.rateLimit, // Pixabay doesn't provide this in headers
        errors: []
      };

    } catch (error: any) {
      Logger.error('Pixabay search failed:', error);
      return {
        success: false,
        images: [],
        totalCount: 0,
        rateLimitRemaining: 0,
        errors: [error.message]
      };
    }
  }

  async downloadImage(imageUrl: string): Promise<GeneratedImage> {
    try {
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const filename = `pixabay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;

      return {
        filename,
        blob,
        url: imageUrl,
        type: blob.type,
        size: blob.size,
        dimensions: { width: 0, height: 0 }, // Would need to read from blob
        description: 'Pixabay image',
        altText: 'Stock photo from Pixabay',
        metadata: {
          source: 'pixabay',
          originalUrl: imageUrl,
          tags: [],
          colors: [],
          generatedAt: new Date().toISOString(),
          category: 'photography'
        }
      };

    } catch (error: any) {
      Logger.error('Pixabay image download failed:', error);
      throw error;
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        key: this.config.apiKey,
        q: 'test',
        per_page: '1'
      });

      const response = await fetch(`${this.config.apiUrl}/?${params}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getRateLimit(): Promise<RateLimitInfo> {
    return {
      remaining: this.config.rateLimit,
      resetTime: new Date(Date.now() + 3600000),
      limit: this.config.rateLimit,
      isLimited: false
    };
  }
}