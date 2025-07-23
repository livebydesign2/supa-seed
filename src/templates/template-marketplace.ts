/**
 * Template Marketplace and Repository System
 * Phase 4, Checkpoint D3 - Template sharing, discovery, and management
 */

import { Template, TemplateEngine } from './template-engine';
import { TemplateValidator, ValidationResult } from './template-validator';
import { Logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as tar from 'tar';
import * as semver from 'semver';

export interface TemplatePackage {
  template: Template;
  metadata: {
    packageId: string;
    checksum: string;
    size: number;
    downloadCount: number;
    stars: number;
    forks: number;
    publishedAt: Date;
    updatedAt: Date;
    publisher: {
      name: string;
      email?: string;
      organization?: string;
    };
    license: string;
    homepage?: string;
    repository?: string;
    bugs?: string;
    keywords: string[];
    verified: boolean;
  };
  dependencies?: Array<{
    templateId: string;
    version: string;
    optional: boolean;
  }>;
  assets?: Array<{
    name: string;
    path: string;
    type: 'example' | 'documentation' | 'schema' | 'test';
    size: number;
  }>;
}

export interface Repository {
  id: string;
  name: string;
  description: string;
  url: string;
  type: 'local' | 'git' | 'npm' | 'http';
  config: {
    auth?: {
      token?: string;
      username?: string;
      password?: string;
    };
    cacheTtl?: number; // seconds
    trustLevel?: 'trusted' | 'community' | 'untrusted';
  };
  metadata: {
    lastSync: Date;
    templateCount: number;
    enabled: boolean;
  };
}

export interface SearchQuery {
  query?: string;
  category?: Template['category'];
  tags?: string[];
  author?: string;
  compatibility?: {
    supaSeedVersion?: string;
    makerKitVersion?: string;
  };
  minRating?: number;
  verified?: boolean;
  sortBy?: 'relevance' | 'downloads' | 'stars' | 'updated' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  packages: TemplatePackage[];
  total: number;
  facets: {
    categories: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    authors: Array<{ name: string; count: number }>;
  };
  queryTime: number;
}

export interface InstallOptions {
  version?: string;
  force?: boolean;
  skipValidation?: boolean;
  installDependencies?: boolean;
  targetDirectory?: string;
}

export interface InstallResult {
  success: boolean;
  template?: Template;
  validationResult?: ValidationResult;
  dependencies?: Array<{
    templateId: string;
    installed: boolean;
    error?: string;
  }>;
  errors: string[];
  warnings: string[];
  metadata: {
    installTime: number;
    downloadSize: number;
    filesCreated: number;
  };
}

export interface PublishOptions {
  registry?: string;
  public?: boolean;
  skipValidation?: boolean;
  dryRun?: boolean;
  tag?: string;
}

export interface PublishResult {
  success: boolean;
  packageId?: string;
  version?: string;
  validationResult?: ValidationResult;
  errors: string[];
  warnings: string[];
  metadata: {
    publishTime: number;
    packageSize: number;
    filesIncluded: number;
  };
}

export class TemplateMarketplace {
  private repositories: Map<string, Repository> = new Map();
  private packageCache: Map<string, TemplatePackage> = new Map();
  private engine: TemplateEngine;
  private validator: TemplateValidator;
  private cacheDirectory: string;
  private configDirectory: string;

  constructor(
    engine: TemplateEngine,
    validator: TemplateValidator,
    options?: {
      cacheDirectory?: string;
      configDirectory?: string;
    }
  ) {
    this.engine = engine;
    this.validator = validator;
    this.cacheDirectory = options?.cacheDirectory || path.join(process.cwd(), '.supa-seed', 'cache');
    this.configDirectory = options?.configDirectory || path.join(process.cwd(), '.supa-seed', 'config');
    
    this.initializeDirectories();
    this.initializeDefaultRepositories();
    this.loadConfiguration();
  }

  /**
   * Search for templates in all repositories
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    Logger.info(`🔍 Searching templates: "${query.query || '*'}"`);

    const allPackages: TemplatePackage[] = [];
    
    // Search all enabled repositories
    for (const repo of this.repositories.values()) {
      if (repo.metadata.enabled) {
        try {
          const repoPackages = await this.searchRepository(repo, query);
          allPackages.push(...repoPackages);
        } catch (error: any) {
          Logger.warn(`Failed to search repository ${repo.name}: ${error.message}`);
        }
      }
    }

    // Filter results
    let filteredPackages = this.filterPackages(allPackages, query);

    // Sort results
    filteredPackages = this.sortPackages(filteredPackages, query);

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paginatedPackages = filteredPackages.slice(offset, offset + limit);

    // Generate facets
    const facets = this.generateFacets(filteredPackages);

    const queryTime = Date.now() - startTime;

    Logger.info(`🔍 Search complete: ${paginatedPackages.length}/${filteredPackages.length} results in ${queryTime}ms`);

    return {
      packages: paginatedPackages,
      total: filteredPackages.length,
      facets,
      queryTime
    };
  }

  /**
   * Install a template from the marketplace
   */
  async install(templateId: string, options?: InstallOptions): Promise<InstallResult> {
    const startTime = Date.now();
    Logger.info(`📦 Installing template: ${templateId}`);

    const errors: string[] = [];
    const warnings: string[] = [];
    const dependencies: Array<{ templateId: string; installed: boolean; error?: string }> = [];
    let downloadSize = 0;
    let filesCreated = 0;

    try {
      // Find the template package
      const templatePackage = await this.findTemplate(templateId, options?.version);
      if (!templatePackage) {
        return {
          success: false,
          errors: [`Template not found: ${templateId}`],
          warnings: [],
          metadata: {
            installTime: Date.now() - startTime,
            downloadSize: 0,
            filesCreated: 0
          }
        };
      }

      // Validate the template unless skipped
      let validationResult: ValidationResult | undefined;
      if (!options?.skipValidation) {
        validationResult = await this.validator.validateTemplate(templatePackage.template);
        if (!validationResult.isValid && !options?.force) {
          return {
            success: false,
            validationResult,
            errors: ['Template validation failed. Use --force to install anyway.'],
            warnings: [],
            metadata: {
              installTime: Date.now() - startTime,
              downloadSize: 0,
              filesCreated: 0
            }
          };
        }
      }

      // Install dependencies if requested
      if (options?.installDependencies && templatePackage.dependencies) {
        for (const dep of templatePackage.dependencies) {
          try {
            const depResult = await this.install(dep.templateId, {
              version: dep.version,
              skipValidation: options.skipValidation,
              installDependencies: true
            });
            
            dependencies.push({
              templateId: dep.templateId,
              installed: depResult.success,
              error: depResult.success ? undefined : depResult.errors.join(', ')
            });
          } catch (error: any) {
            if (!dep.optional) {
              errors.push(`Failed to install dependency ${dep.templateId}: ${error.message}`);
            } else {
              warnings.push(`Optional dependency ${dep.templateId} failed to install`);
            }
          }
        }
      }

      // Load the template into the engine
      const loadedTemplateId = await this.engine.loadTemplate(templatePackage.template, false);
      
      // Update download count
      await this.updateDownloadCount(templatePackage.metadata.packageId);

      downloadSize = templatePackage.metadata.size;
      filesCreated = templatePackage.template.files.length;

      Logger.info(`📦 Template installed successfully: ${loadedTemplateId}`);

      return {
        success: true,
        template: templatePackage.template,
        validationResult,
        dependencies,
        errors,
        warnings,
        metadata: {
          installTime: Date.now() - startTime,
          downloadSize,
          filesCreated
        }
      };

    } catch (error: any) {
      Logger.error(`Template installation failed: ${error.message}`);
      return {
        success: false,
        errors: [`Installation failed: ${error.message}`],
        warnings,
        metadata: {
          installTime: Date.now() - startTime,
          downloadSize,
          filesCreated
        }
      };
    }
  }

  /**
   * Publish a template to a repository
   */
  async publish(
    template: Template,
    repositoryId: string,
    options?: PublishOptions
  ): Promise<PublishResult> {
    const startTime = Date.now();
    Logger.info(`📤 Publishing template: ${template.name}`);

    const errors: string[] = [];
    const warnings: string[] = [];
    let packageSize = 0;
    let filesIncluded = 0;

    try {
      // Validate the template unless skipped
      let validationResult: ValidationResult | undefined;
      if (!options?.skipValidation) {
        validationResult = await this.validator.validateTemplate(template);
        if (!validationResult.isValid) {
          errors.push('Template validation failed');
          return {
            success: false,
            validationResult,
            errors,
            warnings,
            metadata: {
              publishTime: Date.now() - startTime,
              packageSize: 0,
              filesIncluded: 0
            }
          };
        }
      }

      // Find target repository
      const repository = this.repositories.get(repositoryId);
      if (!repository) {
        return {
          success: false,
          errors: [`Repository not found: ${repositoryId}`],
          warnings,
          metadata: {
            publishTime: Date.now() - startTime,
            packageSize: 0,
            filesIncluded: 0
          }
        };
      }

      // Create package
      const templatePackage = await this.createPackage(template, options);
      packageSize = JSON.stringify(templatePackage).length;
      filesIncluded = template.files.length;

      // Dry run check
      if (options?.dryRun) {
        Logger.info('📤 Dry run complete - would publish successfully');
        return {
          success: true,
          packageId: templatePackage.metadata.packageId,
          version: template.version,
          validationResult,
          errors,
          warnings: [...warnings, 'Dry run - template not actually published'],
          metadata: {
            publishTime: Date.now() - startTime,
            packageSize,
            filesIncluded
          }
        };
      }

      // Publish to repository
      await this.publishToRepository(repository, templatePackage, options);

      Logger.info(`📤 Template published successfully: ${templatePackage.metadata.packageId}`);

      return {
        success: true,
        packageId: templatePackage.metadata.packageId,
        version: template.version,
        validationResult,
        errors,
        warnings,
        metadata: {
          publishTime: Date.now() - startTime,
          packageSize,
          filesIncluded
        }
      };

    } catch (error: any) {
      Logger.error(`Template publishing failed: ${error.message}`);
      return {
        success: false,
        errors: [`Publishing failed: ${error.message}`],
        warnings,
        metadata: {
          publishTime: Date.now() - startTime,
          packageSize,
          filesIncluded
        }
      };
    }
  }

  /**
   * Add a repository
   */
  async addRepository(repository: Repository): Promise<boolean> {
    try {
      // Validate repository connection
      await this.testRepositoryConnection(repository);
      
      this.repositories.set(repository.id, repository);
      await this.saveConfiguration();
      
      Logger.info(`📁 Repository added: ${repository.name}`);
      return true;
    } catch (error: any) {
      Logger.error(`Failed to add repository: ${error.message}`);
      return false;
    }
  }

  /**
   * Remove a repository
   */
  async removeRepository(repositoryId: string): Promise<boolean> {
    const removed = this.repositories.delete(repositoryId);
    if (removed) {
      await this.saveConfiguration();
      Logger.info(`📁 Repository removed: ${repositoryId}`);
    }
    return removed;
  }

  /**
   * List all repositories
   */
  listRepositories(): Repository[] {
    return Array.from(this.repositories.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Sync all repositories
   */
  async syncRepositories(): Promise<{ success: number; failed: number; errors: string[] }> {
    Logger.info('🔄 Syncing all repositories...');
    
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const repo of this.repositories.values()) {
      if (repo.metadata.enabled) {
        try {
          await this.syncRepository(repo);
          success++;
        } catch (error: any) {
          failed++;
          errors.push(`${repo.name}: ${error.message}`);
        }
      }
    }

    Logger.info(`🔄 Repository sync complete: ${success} success, ${failed} failed`);
    return { success, failed, errors };
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.packageCache.clear();
    if (fs.existsSync(this.cacheDirectory)) {
      fs.rmSync(this.cacheDirectory, { recursive: true, force: true });
      this.initializeDirectories();
    }
    Logger.info('🗑️  Template cache cleared');
  }

  /**
   * Private: Initialize directories
   */
  private initializeDirectories(): void {
    const dirs = [
      this.cacheDirectory,
      this.configDirectory,
      path.join(this.cacheDirectory, 'packages'),
      path.join(this.cacheDirectory, 'metadata')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Private: Initialize default repositories
   */
  private initializeDefaultRepositories(): void {
    // Official Supa-Seed repository
    this.repositories.set('official', {
      id: 'official',
      name: 'Official Supa-Seed Templates',
      description: 'Curated templates maintained by the Supa-Seed team',
      url: 'https://templates.supa-seed.dev',
      type: 'http',
      config: {
        cacheTtl: 3600,
        trustLevel: 'trusted'
      },
      metadata: {
        lastSync: new Date(0),
        templateCount: 0,
        enabled: true
      }
    });

    // Community repository
    this.repositories.set('community', {
      id: 'community',
      name: 'Community Templates',
      description: 'User-contributed templates',
      url: 'https://community.supa-seed.dev',
      type: 'http',
      config: {
        cacheTtl: 1800,
        trustLevel: 'community'
      },
      metadata: {
        lastSync: new Date(0),
        templateCount: 0,
        enabled: true
      }
    });

    // Local repository
    this.repositories.set('local', {
      id: 'local',
      name: 'Local Templates',
      description: 'Templates stored locally',
      url: path.join(process.cwd(), 'templates'),
      type: 'local',
      config: {
        cacheTtl: 0,
        trustLevel: 'trusted'
      },
      metadata: {
        lastSync: new Date(),
        templateCount: 0,
        enabled: true
      }
    });
  }

  /**
   * Private: Load configuration from disk
   */
  private loadConfiguration(): void {
    const configFile = path.join(this.configDirectory, 'repositories.json');
    if (fs.existsSync(configFile)) {
      try {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        
        for (const [id, repoData] of Object.entries(config.repositories || {})) {
          const repo = repoData as any;
          repo.metadata.lastSync = new Date(repo.metadata.lastSync);
          this.repositories.set(id, repo);
        }
      } catch (error: any) {
        Logger.warn(`Failed to load repository configuration: ${error.message}`);
      }
    }
  }

  /**
   * Private: Save configuration to disk
   */
  private async saveConfiguration(): Promise<void> {
    const configFile = path.join(this.configDirectory, 'repositories.json');
    const config = {
      repositories: Object.fromEntries(this.repositories),
      lastUpdated: new Date().toISOString()
    };

    try {
      await fs.promises.writeFile(configFile, JSON.stringify(config, null, 2));
    } catch (error: any) {
      Logger.error(`Failed to save repository configuration: ${error.message}`);
    }
  }

  /**
   * Private: Search a specific repository
   */
  private async searchRepository(
    repository: Repository,
    query: SearchQuery
  ): Promise<TemplatePackage[]> {
    // This is a simplified implementation
    // In practice, each repository type would have its own search logic
    
    switch (repository.type) {
      case 'local':
        return this.searchLocalRepository(repository, query);
      case 'http':
        return this.searchHttpRepository(repository, query);
      default:
        return [];
    }
  }

  /**
   * Private: Search local repository
   */
  private async searchLocalRepository(
    repository: Repository,
    query: SearchQuery
  ): Promise<TemplatePackage[]> {
    const packages: TemplatePackage[] = [];
    
    if (!fs.existsSync(repository.url)) {
      return packages;
    }

    try {
      const files = await fs.promises.readdir(repository.url);
      const templateFiles = files.filter(f => 
        f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml')
      );

      for (const file of templateFiles) {
        try {
          const filePath = path.join(repository.url, file);
          const content = await fs.promises.readFile(filePath, 'utf8');
          const template: Template = file.endsWith('.json') 
            ? JSON.parse(content)
            : require('js-yaml').load(content);

          const templatePackage: TemplatePackage = {
            template,
            metadata: {
              packageId: template.id,
              checksum: this.calculateChecksum(content),
              size: content.length,
              downloadCount: 0,
              stars: 0,
              forks: 0,
              publishedAt: new Date(),
              updatedAt: new Date(),
              publisher: {
                name: 'local'
              },
              license: 'MIT',
              keywords: template.tags,
              verified: false
            }
          };

          packages.push(templatePackage);
        } catch (error: any) {
          Logger.debug(`Failed to load local template ${file}: ${error.message}`);
        }
      }
    } catch (error: any) {
      Logger.warn(`Failed to search local repository: ${error.message}`);
    }

    return packages;
  }

  /**
   * Private: Search HTTP repository
   */
  private async searchHttpRepository(
    repository: Repository,
    query: SearchQuery
  ): Promise<TemplatePackage[]> {
    // In a real implementation, this would make HTTP requests to the repository API
    // For now, return empty array
    return [];
  }

  /**
   * Private: Filter packages based on query
   */
  private filterPackages(packages: TemplatePackage[], query: SearchQuery): TemplatePackage[] {
    return packages.filter(pkg => {
      // Text search
      if (query.query) {
        const searchText = query.query.toLowerCase();
        const matchesText = 
          pkg.template.name.toLowerCase().includes(searchText) ||
          pkg.template.description?.toLowerCase().includes(searchText) ||
          pkg.template.tags.some(tag => tag.toLowerCase().includes(searchText));
        
        if (!matchesText) return false;
      }

      // Category filter
      if (query.category && pkg.template.category !== query.category) {
        return false;
      }

      // Tags filter
      if (query.tags && query.tags.length > 0) {
        const hasMatchingTag = query.tags.some(tag => 
          pkg.template.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      // Rating filter
      if (query.minRating && (pkg.template.metadata.rating || 0) < query.minRating) {
        return false;
      }

      // Verified filter
      if (query.verified !== undefined && pkg.metadata.verified !== query.verified) {
        return false;
      }

      return true;
    });
  }

  /**
   * Private: Sort packages
   */
  private sortPackages(packages: TemplatePackage[], query: SearchQuery): TemplatePackage[] {
    const sortBy = query.sortBy || 'relevance';
    const sortOrder = query.sortOrder || 'desc';
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    return packages.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'downloads':
          comparison = a.metadata.downloadCount - b.metadata.downloadCount;
          break;
        case 'stars':
          comparison = a.metadata.stars - b.metadata.stars;
          break;
        case 'updated':
          comparison = a.metadata.updatedAt.getTime() - b.metadata.updatedAt.getTime();
          break;
        case 'name':
          comparison = a.template.name.localeCompare(b.template.name);
          break;
        case 'relevance':
        default:
          // Simple relevance scoring
          const aScore = a.metadata.downloadCount + (a.metadata.stars * 10);
          const bScore = b.metadata.downloadCount + (b.metadata.stars * 10);
          comparison = aScore - bScore;
          break;
      }

      return comparison * multiplier;
    });
  }

  /**
   * Private: Generate search facets
   */
  private generateFacets(packages: TemplatePackage[]): SearchResult['facets'] {
    const categories = new Map<string, number>();
    const tags = new Map<string, number>();
    const authors = new Map<string, number>();

    for (const pkg of packages) {
      // Categories
      const category = pkg.template.category;
      categories.set(category, (categories.get(category) || 0) + 1);

      // Tags
      for (const tag of pkg.template.tags) {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      }

      // Authors
      const author = pkg.metadata.publisher.name;
      authors.set(author, (authors.get(author) || 0) + 1);
    }

    return {
      categories: Array.from(categories.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      tags: Array.from(tags.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20), // Top 20 tags
      authors: Array.from(authors.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Top 10 authors
    };
  }

  /**
   * Private: Find a template by ID and version
   */
  private async findTemplate(templateId: string, version?: string): Promise<TemplatePackage | null> {
    // Search in cache first
    const cacheKey = `${templateId}:${version || 'latest'}`;
    if (this.packageCache.has(cacheKey)) {
      return this.packageCache.get(cacheKey)!;
    }

    // Search all repositories
    const searchResult = await this.search({ query: templateId, limit: 100 });
    const candidates = searchResult.packages.filter(pkg => pkg.template.id === templateId);

    if (candidates.length === 0) {
      return null;
    }

    // Find best version match
    let bestMatch = candidates[0];
    if (version && version !== 'latest') {
      const versionMatch = candidates.find(pkg => 
        semver.satisfies(pkg.template.version, version)
      );
      if (versionMatch) {
        bestMatch = versionMatch;
      }
    }

    // Cache the result
    this.packageCache.set(cacheKey, bestMatch);
    return bestMatch;
  }

  /**
   * Private: Create a template package
   */
  private async createPackage(
    template: Template,
    options?: PublishOptions
  ): Promise<TemplatePackage> {
    const content = JSON.stringify(template, null, 2);
    const checksum = this.calculateChecksum(content);
    const packageId = `${template.id}@${template.version}`;

    return {
      template,
      metadata: {
        packageId,
        checksum,
        size: content.length,
        downloadCount: 0,
        stars: 0,
        forks: 0,
        publishedAt: new Date(),
        updatedAt: new Date(),
        publisher: {
          name: template.author || 'unknown'
        },
        license: 'MIT',
        keywords: template.tags,
        verified: false
      }
    };
  }

  /**
   * Private: Calculate content checksum
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Private: Test repository connection
   */
  private async testRepositoryConnection(repository: Repository): Promise<void> {
    switch (repository.type) {
      case 'local':
        if (!fs.existsSync(repository.url)) {
          throw new Error(`Local directory does not exist: ${repository.url}`);
        }
        break;
      case 'http':
        // Would test HTTP connection
        break;
      case 'git':
        // Would test Git access
        break;
    }
  }

  /**
   * Private: Sync a repository
   */
  private async syncRepository(repository: Repository): Promise<void> {
    repository.metadata.lastSync = new Date();
    // In a real implementation, would sync package metadata
  }

  /**
   * Private: Publish to repository
   */
  private async publishToRepository(
    repository: Repository,
    templatePackage: TemplatePackage,
    options?: PublishOptions
  ): Promise<void> {
    // In a real implementation, would publish based on repository type
    Logger.debug(`Publishing to ${repository.type} repository: ${repository.name}`);
  }

  /**
   * Private: Update download count
   */
  private async updateDownloadCount(packageId: string): Promise<void> {
    // In a real implementation, would update download statistics
    Logger.debug(`Updated download count for: ${packageId}`);
  }
}