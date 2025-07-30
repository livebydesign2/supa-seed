import { ImageGenerationOptions, GeneratedImage } from '../core/types/types';

/**
 * Generate a placeholder image buffer for seeding
 * In a real implementation, this could connect to AI image generation or stock photo APIs
 */
export async function generatePlaceholderImage(options: ImageGenerationOptions): Promise<GeneratedImage> {
  const { width, height, category } = options;
  
  // For now, we'll create a simple colored rectangle as a placeholder
  // In production, you could integrate with:
  // - Unsplash API for stock photos
  // - DALL-E or Midjourney for AI-generated images
  // - Local photo collections
  
  const canvas = createMockCanvas(width, height, category);
  const buffer = await canvasToBuffer(canvas);
  
  return {
    buffer,
    filename: `${category}_${width}x${height}_${Date.now()}.png`,
    mimetype: 'image/png',
    size: buffer.length,
  };
}

/**
 * Download an image from Unsplash
 * Requires UNSPLASH_ACCESS_KEY environment variable
 */
export async function downloadUnsplashImage(query: string, options: ImageGenerationOptions): Promise<GeneratedImage | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  
  if (!accessKey) {
    console.warn('⚠️  UNSPLASH_ACCESS_KEY not found, using placeholder');
    return generatePlaceholderImage(options);
  }

  try {
    const searchUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${accessKey}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json() as any;
    
    if (!data?.urls?.regular) {
      throw new Error('No image URL found in Unsplash response');
    }
    
    // Download the image
    const imageResponse = await fetch(data.urls.regular as string);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return {
      buffer,
      filename: `unsplash_${query.replace(/\s+/g, '_')}_${Date.now()}.jpg`,
      mimetype: 'image/jpeg',
      size: buffer.length,
    };
    
  } catch (error) {
    console.warn(`⚠️  Failed to download Unsplash image for "${query}":`, error);
    return generatePlaceholderImage(options);
  }
}

/**
 * Optimize an image buffer (resize, compress, format conversion)
 */
export async function optimizeImage(buffer: Buffer, options: Partial<ImageGenerationOptions>): Promise<Buffer> {
  // In a real implementation, you would use a library like Sharp for image processing
  // For seeding purposes, we'll return the buffer as-is
  
  // Example with Sharp (uncomment if you add Sharp as a dependency):
  /*
  const sharp = require('sharp');
  
  return await sharp(buffer)
    .resize(options.width, options.height, { 
      fit: 'cover',
      position: 'center' 
    })
    .jpeg({ quality: 85 })
    .toBuffer();
  */
  
  return buffer;
}

/**
 * Create a mock canvas for placeholder generation
 */
function createMockCanvas(width: number, height: number, category: string): HTMLCanvasElement {
  // This is a simplified mock implementation
  // In a real Node.js environment, you might use node-canvas
  
  const colors: Record<string, string> = {
    outdoor: '#4A7C59',
    gear: '#8B4513',
    vehicle: '#2F4F4F',
    profile: '#6B6B6B',
  };
  
  const color = colors[category] || '#6B6B6B';
  
  // Mock canvas object for type compatibility
  return {
    width,
    height,
    getContext: () => ({
      fillStyle: color,
      fillRect: () => {},
      fillText: () => {},
      font: '16px Arial',
      textAlign: 'center',
      textBaseline: 'middle',
    }),
  } as any;
}

/**
 * Convert mock canvas to buffer
 */
async function canvasToBuffer(canvas: HTMLCanvasElement): Promise<Buffer> {
  // Create a simple PNG-like buffer for seeding
  // In production, use proper canvas-to-buffer conversion
  
  const width = canvas.width;
  const height = canvas.height;
  const pixelCount = width * height;
  
  // Create a minimal PNG-like structure
  const headerSize = 100; // Approximate PNG header size
  const dataSize = pixelCount * 4; // RGBA
  const bufferSize = headerSize + dataSize;
  
  const buffer = Buffer.alloc(bufferSize);
  
  // Fill with mock PNG header
  buffer.write('PNG', 1);
  
  // Fill rest with mock pixel data
  for (let i = headerSize; i < bufferSize; i += 4) {
    buffer[i] = 100;     // R
    buffer[i + 1] = 150; // G
    buffer[i + 2] = 200; // B
    buffer[i + 3] = 255; // A
  }
  
  return buffer;
}

/**
 * Generate appropriate search terms for different gear categories
 */
export function getImageSearchTerms(category: string): string[] {
  const searchTerms: Record<string, string[]> = {
    'Vehicle': ['overland vehicle', 'camping truck', 'adventure car', 'off-road vehicle'],
    'Backpack': ['hiking backpack', 'camping gear', 'outdoor equipment', 'wilderness gear'],
    'Shelter': ['camping tent', 'outdoor shelter', 'wilderness camping'],
    'Cooking': ['camping stove', 'outdoor cooking', 'backpacking food'],
    'Safety': ['outdoor safety gear', 'hiking equipment', 'emergency gear'],
    'Navigation': ['hiking compass', 'outdoor navigation', 'wilderness tools'],
    'Clothing': ['hiking clothes', 'outdoor apparel', 'adventure clothing'],
    'Electronics': ['outdoor electronics', 'camping gear', 'hiking technology'],
    'Tools': ['camping tools', 'outdoor equipment', 'wilderness gear'],
    'Hydration': ['water bottle', 'hiking hydration', 'outdoor water'],
  };
  
  return searchTerms[category] || ['outdoor gear', 'camping equipment'];
}

/**
 * Generate realistic filename for setup images
 */
export function generateSetupImageFilename(setupTitle: string, index: number): string {
  const cleanTitle = setupTitle
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30);
    
  const timestamp = Date.now();
  return `setup_${cleanTitle}_${index}_${timestamp}.jpg`;
} 