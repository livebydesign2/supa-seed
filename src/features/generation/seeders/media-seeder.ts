import { SeedModule, CachedSetup, GeneratedImage, ImageGenerationOptions } from '../core/types/types';
import { generatePlaceholderImage, downloadUnsplashImage, optimizeImage } from '../../core/utils/image-utils';

export class MediaSeeder extends SeedModule {
  private readonly bucketName = 'setup-images';

  async seed(): Promise<void> {
    const setups = this.context.cache.get('setups') as CachedSetup[];
    if (!setups?.length) {
      console.log('⚠️  No setups found in cache, skipping media seeding');
      return;
    }

    for (const setup of setups) {
      await this.seedSetupImages(setup);
    }
  }

  private async seedSetupImages(setup: CachedSetup): Promise<void> {
    const { config } = this.context;
    const imageCount = config.imagesPerSetup;

    for (let i = 0; i < imageCount; i++) {
      try {
        const image = await this.generateSetupImage(setup, i);
        const mediaAttachment = await this.uploadAndSaveImage(setup, image, i);
        
        if (mediaAttachment) {
          this.context.stats.imagesUploaded++;
        }
      } catch (error) {
        console.error(`Failed to create image ${i + 1} for setup ${setup.id}:`, error);
      }
    }
  }

  private async generateSetupImage(setup: CachedSetup, index: number): Promise<GeneratedImage> {
    const { faker, config } = this.context;

    if (config.enableRealImages) {
      return await this.generateRealisticImage(setup, index);
    } else {
      return await this.generatePlaceholderImage(setup, index);
    }
  }

  private async generateRealisticImage(setup: CachedSetup, index: number): Promise<GeneratedImage> {
    const { faker } = this.context;
    
    // Define search terms based on setup category and type
    const searchTerms = this.getImageSearchTerms(setup);
    const searchTerm = faker.helpers.arrayElement(searchTerms);
    
    // Try to download from Unsplash (requires API key)
    if (process.env.UNSPLASH_ACCESS_KEY) {
      try {
        const unsplashImage = await downloadUnsplashImage(searchTerm, {
          width: 1200,
          height: 800,
          category: this.mapCategoryToImageCategory(setup.category),
        });
        
        if (unsplashImage) {
          return unsplashImage;
        }
      } catch (error) {
        console.log(`Failed to download Unsplash image: ${error}`);
        // Fall back to placeholder
      }
    }
    
    // Generate AI placeholder with category-specific styling
    return await this.generatePlaceholderImage(setup, index);
  }

  private async generatePlaceholderImage(setup: CachedSetup, index: number): Promise<GeneratedImage> {
    const { faker } = this.context;
    
    const options: ImageGenerationOptions = {
      width: 1200,
      height: 800,
      category: this.mapCategoryToImageCategory(setup.category),
      style: 'realistic',
    };

    // Generate contextual placeholder
    return await generatePlaceholderImage(options);
  }

  private async uploadAndSaveImage(
    setup: CachedSetup, 
    image: GeneratedImage, 
    index: number
  ): Promise<any> {
    const { client } = this.context;
    
    // Generate storage path
    const storagePath = `${setup.id}/${image.filename}`;
    
    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await client.storage
        .from(this.bucketName)
        .upload(storagePath, image.buffer, {
          contentType: image.mimetype,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = client.storage
        .from(this.bucketName)
        .getPublicUrl(storagePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      // Save media attachment record
      const { data: mediaRecord, error: dbError } = await client
        .from('media_attachments')
        .insert({
          setup_id: setup.id,
          file_name: image.filename,
          file_size: image.size,
          file_type: image.mimetype,
          storage_path: storagePath,
          public_url: urlData.publicUrl,
          alt_text: this.generateAltText(setup, index),
          created_by: setup.userId,
          updated_by: setup.userId,
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file on database error
        await client.storage
          .from(this.bucketName)
          .remove([storagePath]);
        
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      return mediaRecord;
    } catch (error) {
      console.error(`Failed to upload and save image:`, error);
      return null;
    }
  }

  private getImageSearchTerms(setup: CachedSetup): string[] {
    const { category } = setup;
    
    const termsByCategory = {
      'overlanding': [
        'overlanding truck camping',
        '4x4 camping setup',
        'truck bed camping',
        'off-road camping gear',
        'overland vehicle setup',
        'camping truck interior',
      ],
      'van-life': [
        'van life interior',
        'camper van setup',
        'van conversion',
        'mobile home interior',
        'van camping setup',
        'nomad van life',
      ],
      'car-camping': [
        'car camping setup',
        'tent camping car',
        'camping gear organization',
        'camp site setup',
        'outdoor camping equipment',
      ],
      'backpacking': [
        'backpacking gear',
        'ultralight backpacking',
        'hiking backpack setup',
        'trail camping gear',
        'wilderness backpacking',
      ],
      'ultralight': [
        'ultralight hiking gear',
        'lightweight backpacking',
        'minimalist camping',
        'ultralight tent setup',
        'gram weenie gear',
      ],
    };
    
    return termsByCategory[category as keyof typeof termsByCategory] || [
      'outdoor camping gear',
      'camping equipment',
      'outdoor adventure',
    ];
  }

  private mapCategoryToImageCategory(category: string): 'outdoor' | 'gear' | 'vehicle' | 'profile' {
    if (category.includes('van') || category.includes('overlanding')) {
      return 'vehicle';
    }
    if (category.includes('gear') || category.includes('ultralight')) {
      return 'gear';
    }
    return 'outdoor';
  }

  private generateAltText(setup: CachedSetup, index: number): string {
    const { faker } = this.context;
    
    const templates = [
      `${setup.title} setup - Image ${index + 1}`,
      `${setup.category} gear setup showing ${faker.helpers.arrayElement(['camping equipment', 'outdoor gear', 'adventure setup'])}`,
      `Detailed view of ${setup.title} ${faker.helpers.arrayElement(['configuration', 'setup', 'layout'])}`,
    ];
    
    return faker.helpers.arrayElement(templates);
  }
} 