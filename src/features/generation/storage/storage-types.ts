/**
 * Storage Integration Types
 * Types and interfaces for Supabase Storage integration and file management
 */

export interface StorageConfig {
  bucketName: string;
  domain: string; // e.g., 'outdoor-adventure', 'saas-tools', 'general'
  categories: string[]; // e.g., ['camping', 'hiking', 'climbing']
  imagesPerSetup: number;
  enableRealImages: boolean;
  imageService: 'unsplash' | 'pixabay' | 'mock';
  maxFileSize: number; // in bytes
  allowedFileTypes: string[]; // e.g., ['image/jpeg', 'image/png', 'image/webp']
  generateThumbnails: boolean;
  respectRLS: boolean;
  storageRootPath: string; // Root path in bucket
}

export interface ImageGenerationOptions {
  domain: string;
  categories: string[];
  count: number;
  dimensions: ImageDimensions;
  quality: 'low' | 'medium' | 'high';
  searchTerms: string[];
  fallbackToMock: boolean;
  rateLimitDelay: number; // ms between API calls
  maxRetries: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio?: 'square' | 'landscape' | 'portrait' | 'auto';
}

export interface GeneratedImage {
  filename: string;
  blob: Blob;
  url?: string; // Original source URL if available
  type: string; // MIME type
  size: number; // File size in bytes
  dimensions: ImageDimensions;
  description: string;
  altText: string;
  metadata: ImageMetadata;
}

export interface ImageMetadata {
  source: 'unsplash' | 'pixabay' | 'mock';
  sourceId?: string;
  authorName?: string;
  authorUrl?: string;
  originalUrl?: string;
  license?: string;
  tags: string[];
  colors: string[]; // Dominant colors
  generatedAt: string;
  category: string;
}

export interface MediaAttachment {
  id: string;
  setup_id?: string;
  account_id?: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  alt_text: string;
  description?: string;
  storage_bucket: string;
  thumbnail_path?: string;
  is_public: boolean;
  upload_status: 'pending' | 'uploading' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  metadata: MediaMetadata;
}

export interface MediaMetadata {
  originalName: string;
  dimensions?: ImageDimensions;
  duration?: number; // For videos
  format: string;
  quality: string;
  source: string;
  uploadedBy: string;
  processingSteps: string[];
  checksums: {
    md5?: string;
    sha256?: string;
  };
  exifData?: Record<string, any>;
}

export interface StorageUploadResult {
  success: boolean;
  mediaAttachment?: MediaAttachment;
  filePath?: string;
  publicUrl?: string;
  error?: string;
  warnings: string[];
  uploadTime: number;
  metadata: {
    originalSize: number;
    compressedSize?: number;
    compressionRatio?: number;
    uploadSpeed: number; // bytes per second
    bucketUsage: number; // total bucket usage after upload
  };
}

export interface StorageBatchUploadResult {
  success: boolean;
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  mediaAttachments: MediaAttachment[];
  errors: string[];
  warnings: string[];
  executionTime: number;
  totalSize: number;
  bucketInfo: {
    bucketName: string;
    usageAfterUpload: number;
    filesCount: number;
    remainingQuota?: number;
  };
}

export interface StoragePermissionCheck {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  rlsPolicies: RLSPolicy[];
  permissionLevel: 'none' | 'read' | 'write' | 'admin';
  restrictions: string[];
  recommendations: string[];
}

export interface RLSPolicy {
  name: string;
  table: string;
  policy_type: 'select' | 'insert' | 'update' | 'delete';
  definition: string;
  enabled: boolean;
  affects_storage: boolean;
}

export interface StorageQuotaInfo {
  bucketName: string;
  currentUsage: number; // bytes
  totalQuota: number; // bytes
  filesCount: number;
  usagePercentage: number;
  isNearLimit: boolean;
  projectedFullDate?: string;
  recommendations: string[];
}

export interface UnsplashConfig {
  accessKey: string;
  apiUrl: string;
  rateLimit: number; // requests per hour
  cacheDuration: number; // ms
  fallbackToMock: boolean;
}

export interface PixabayConfig {
  apiKey: string;
  apiUrl: string;
  rateLimit: number;
  cacheDuration: number;
  fallbackToMock: boolean;
}

export interface MockImageConfig {
  baseUrl: string;
  categories: Record<string, string[]>; // category -> color schemes
  dimensions: ImageDimensions[];
  formats: string[];
  generateRealistic: boolean;
}

export interface ImageServiceProvider {
  name: string;
  searchImages(query: string, options: ImageSearchOptions): Promise<ImageSearchResult>;
  downloadImage(imageUrl: string): Promise<GeneratedImage>;
  validateApiKey(): Promise<boolean>;
  getRateLimit(): Promise<RateLimitInfo>;
}

export interface ImageSearchOptions {
  query: string;
  category?: string;
  count: number;
  dimensions?: ImageDimensions;
  orientation?: 'landscape' | 'portrait' | 'square';
  color?: string;
  minWidth?: number;
  minHeight?: number;
  safeSearch: boolean;
}

export interface ImageSearchResult {
  success: boolean;
  images: SearchResultImage[];
  totalCount: number;
  rateLimitRemaining: number;
  nextPageToken?: string;
  errors: string[];
}

export interface SearchResultImage {
  id: string;
  url: string;
  downloadUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  description: string;
  tags: string[];
  author: {
    name: string;
    url?: string;
  };
  license: string;
  source: 'unsplash' | 'pixabay' | 'mock';
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  limit: number;
  isLimited: boolean;
}

export interface StorageIntegrationResult {
  success: boolean;
  setupId: string;
  mediaAttachments: MediaAttachment[];
  totalFilesProcessed: number;
  totalFilesUploaded: number;
  totalSize: number;
  executionTime: number;
  errors: string[];
  warnings: string[];
  bucketInfo: {
    bucketName: string;
    finalUsage: number;
    filesAdded: number;
  };
  recommendations: string[];
}

// Domain-specific configurations
export const DOMAIN_CONFIGURATIONS: Record<string, Partial<StorageConfig>> = {
  'outdoor-adventure': {
    domain: 'outdoor-adventure',
    categories: ['camping', 'hiking', 'climbing', 'backpacking', 'outdoor-gear'],
    imagesPerSetup: 3,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
    storageRootPath: 'outdoor'
  },
  'saas-tools': {
    domain: 'saas-tools',
    categories: ['dashboard', 'analytics', 'interface', 'charts', 'software'],
    imagesPerSetup: 2,
    maxFileSize: 3 * 1024 * 1024, // 3MB
    allowedFileTypes: ['image/png', 'image/svg+xml', 'image/webp'],
    storageRootPath: 'saas'
  },
  'ecommerce': {
    domain: 'ecommerce',
    categories: ['products', 'shopping', 'retail', 'commerce', 'marketplace'],
    imagesPerSetup: 4,
    maxFileSize: 8 * 1024 * 1024, // 8MB
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
    storageRootPath: 'ecommerce'
  },
  'general': {
    domain: 'general',
    categories: ['business', 'technology', 'office', 'people', 'abstract'],
    imagesPerSetup: 2,
    maxFileSize: 4 * 1024 * 1024, // 4MB
    allowedFileTypes: ['image/jpeg', 'image/png'],
    storageRootPath: 'general'
  }
};

// Default storage configuration
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  bucketName: 'media',
  domain: 'general',
  categories: DOMAIN_CONFIGURATIONS.general.categories!,
  imagesPerSetup: 2,
  enableRealImages: false,
  imageService: 'mock',
  maxFileSize: 4 * 1024 * 1024, // 4MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
  generateThumbnails: true,
  respectRLS: true,
  storageRootPath: 'supa-seed'
};

// Image search terms by category
export const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  'camping': ['tent', 'campfire', 'sleeping bag', 'camping gear', 'outdoor camping'],
  'hiking': ['trail', 'mountain', 'backpack', 'hiking boots', 'nature walk'],
  'climbing': ['rock climbing', 'climbing gear', 'carabiner', 'climbing wall', 'mountaineering'],
  'backpacking': ['backpack', 'trail', 'wilderness', 'trekking', 'adventure travel'],
  'outdoor-gear': ['outdoor equipment', 'camping gear', 'hiking gear', 'adventure gear'],
  'dashboard': ['dashboard', 'analytics', 'data visualization', 'admin panel', 'interface'],
  'analytics': ['charts', 'graphs', 'statistics', 'data analysis', 'metrics'],
  'interface': ['user interface', 'UI design', 'web interface', 'app design', 'digital design'],
  'charts': ['bar chart', 'line graph', 'pie chart', 'data visualization', 'infographic'],
  'software': ['software development', 'coding', 'programming', 'tech', 'computer'],
  'products': ['product photography', 'product display', 'retail items', 'merchandise'],
  'shopping': ['shopping cart', 'retail', 'store', 'marketplace', 'ecommerce'],
  'business': ['business meeting', 'office', 'professional', 'corporate', 'workplace'],
  'technology': ['technology', 'digital', 'innovation', 'tech device', 'computer'],
  'office': ['office space', 'desk', 'workspace', 'business environment', 'professional'],
  'people': ['people', 'team', 'group', 'professional', 'business people'],
  'abstract': ['abstract', 'pattern', 'geometric', 'minimal', 'design']
};

// File type mappings
export const FILE_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/gif': '.gif'
};

// Storage bucket naming conventions
export const BUCKET_NAMING = {
  media: 'media',
  avatars: 'avatars',
  attachments: 'attachments',
  thumbnails: 'thumbnails',
  temp: 'temp-uploads'
};

// RLS policy templates
export const STORAGE_RLS_TEMPLATES = {
  public_read: 'bucket_id = \'public\' OR auth.role() = \'authenticated\'',
  owner_only: 'auth.uid()::text = (storage.foldername(name))[1]',
  tenant_scoped: 'account_id = auth.jwt() ->> \'account_id\'',
  authenticated_users: 'auth.role() = \'authenticated\''
};