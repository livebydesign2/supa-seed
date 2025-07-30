/**
 * Ollama Local Model Client
 * Phase 5, Checkpoint E1 - Local AI integration for asset generation
 */

import { Logger } from '../core/utils/logger';
import * as http from 'http';
import * as https from 'https';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout: number;
  maxRetries: number;
  fallbackModels?: string[];
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: 'json';
  options?: {
    num_keep?: number;
    seed?: number;
    num_predict?: number;
    top_k?: number;
    top_p?: number;
    tfs_z?: number;
    typical_p?: number;
    repeat_last_n?: number;
    temperature?: number;
    repeat_penalty?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    mirostat?: number;
    mirostat_tau?: number;
    mirostat_eta?: number;
    penalize_newline?: boolean;
    stop?: string[];
  };
}

export interface GenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface ModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ConnectionStatus {
  connected: boolean;
  version?: string;
  availableModels: string[];
  recommendedModel?: string;
  error?: string;
}

export class OllamaClient {
  private config: OllamaConfig;
  private isHealthy: boolean = false;
  private lastHealthCheck: Date = new Date(0);
  private healthCheckInterval: number = 30000; // 30 seconds

  constructor(config?: Partial<OllamaConfig>) {
    this.config = {
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:latest',
      timeout: 30000,
      maxRetries: 3,
      fallbackModels: ['llama3.1:8b', 'llama2:latest', 'mistral:latest'],
      ...config
    };

    Logger.info(`🤖 Initializing Ollama client: ${this.config.baseUrl}`);
  }

  /**
   * Check if Ollama is available and healthy
   */
  async checkHealth(): Promise<ConnectionStatus> {
    const now = new Date();
    
    // Skip frequent health checks
    if (this.isHealthy && (now.getTime() - this.lastHealthCheck.getTime()) < this.healthCheckInterval) {
      return {
        connected: true,
        availableModels: [],
        recommendedModel: this.config.model
      };
    }

    try {
      // Check if Ollama is running
      const version = await this.getVersion();
      
      // Get available models
      const models = await this.listModels();
      const availableModels = models.map(m => m.name);
      
      // Find best available model
      const recommendedModel = this.findBestModel(availableModels);
      
      this.isHealthy = true;
      this.lastHealthCheck = now;
      
      Logger.info(`🤖 Ollama connected: ${availableModels.length} models available`);
      
      return {
        connected: true,
        version,
        availableModels,
        recommendedModel
      };
    } catch (error: any) {
      this.isHealthy = false;
      Logger.warn(`🤖 Ollama connection failed: ${error.message}`);
      
      return {
        connected: false,
        availableModels: [],
        error: error.message
      };
    }
  }

  /**
   * Generate text using Ollama
   */
  async generate(request: Omit<GenerateRequest, 'model'> & { model?: string }): Promise<GenerateResponse> {
    const model = request.model || this.config.model;
    
    // Health check before generation
    const health = await this.checkHealth();
    if (!health.connected) {
      throw new Error(`Ollama not available: ${health.error}`);
    }

    // Ensure model is available
    if (!health.availableModels.includes(model)) {
      const fallback = this.findBestModel(health.availableModels);
      if (!fallback) {
        throw new Error(`No suitable models available. Requested: ${model}`);
      }
      Logger.warn(`🤖 Model ${model} not available, using fallback: ${fallback}`);
      request.model = fallback;
    }

    const fullRequest: GenerateRequest = {
      model,
      ...request
    };

    Logger.debug(`🤖 Generating with ${model}: ${request.prompt.substring(0, 100)}...`);
    
    let attempt = 0;
    while (attempt < this.config.maxRetries) {
      try {
        const response = await this.makeRequest('/api/generate', fullRequest);
        
        Logger.debug(`🤖 Generated ${response.response.length} characters in ${response.total_duration}ns`);
        return response;
      } catch (error: any) {
        attempt++;
        if (attempt >= this.config.maxRetries) {
          throw new Error(`Generation failed after ${attempt} attempts: ${error.message}`);
        }
        
        Logger.warn(`🤖 Generation attempt ${attempt} failed, retrying: ${error.message}`);
        await this.delay(1000 * attempt); // Exponential backoff
      }
    }

    throw new Error('Generation failed: Maximum retries exceeded');
  }

  /**
   * Generate structured JSON response
   */
  async generateJSON<T = any>(prompt: string, system?: string, schema?: any): Promise<T> {
    try {
      const response = await this.generate({
        prompt,
        system,
        format: 'json',
        options: {
          temperature: 0.1, // Lower temperature for more consistent JSON
        }
      });

      const parsed = JSON.parse(response.response);
      
      // Basic schema validation if provided
      if (schema && !this.validateSchema(parsed, schema)) {
        throw new Error('Generated JSON does not match expected schema');
      }

      return parsed;
    } catch (error: any) {
      if (error.message.includes('JSON')) {
        Logger.error(`🤖 JSON parsing failed: ${error.message}`);
        throw new Error(`Invalid JSON response from model: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get available models
   */
  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.makeRequest('/api/tags', null, 'GET');
      return response.models || [];
    } catch (error: any) {
      Logger.error(`🤖 Failed to list models: ${error.message}`);
      return [];
    }
  }

  /**
   * Pull a model if not available
   */
  async pullModel(name: string, onProgress?: (progress: any) => void): Promise<boolean> {
    try {
      Logger.info(`🤖 Pulling model: ${name}`);
      
      // This would implement streaming for progress updates
      // For now, simplified version
      await this.makeRequest('/api/pull', { name });
      
      Logger.info(`🤖 Model pulled successfully: ${name}`);
      return true;
    } catch (error: any) {
      Logger.error(`🤖 Failed to pull model ${name}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get Ollama version
   */
  private async getVersion(): Promise<string> {
    try {
      const response = await this.makeRequest('/api/version', null, 'GET');
      return response.version || 'unknown';
    } catch (error: any) {
      throw new Error(`Failed to get Ollama version: ${error.message}`);
    }
  }

  /**
   * Find the best available model from our preferences
   */
  private findBestModel(availableModels: string[]): string | undefined {
    // Check configured model first
    if (availableModels.includes(this.config.model)) {
      return this.config.model;
    }

    // Check fallback models
    if (this.config.fallbackModels) {
      for (const fallback of this.config.fallbackModels) {
        if (availableModels.includes(fallback)) {
          return fallback;
        }
      }
    }

    // Return first available model
    return availableModels[0];
  }

  /**
   * Make HTTP request to Ollama API
   */
  private async makeRequest(endpoint: string, data?: any, method: string = 'POST'): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.config.baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const postData = data ? JSON.stringify(data) : undefined;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
        },
        timeout: this.config.timeout
      };

      const req = httpModule.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode! >= 200 && res.statusCode! < 300) {
              const response = body ? JSON.parse(body) : {};
              resolve(response);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${body}`));
            }
          } catch (error: any) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      });

      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  /**
   * Basic schema validation
   */
  private validateSchema(data: any, schema: any): boolean {
    // Very basic validation - in production would use proper JSON schema validator
    if (typeof schema === 'object' && schema !== null) {
      for (const key in schema) {
        if (!(key in data)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.isHealthy;
  }

  /**
   * Get current configuration
   */
  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...updates };
    this.isHealthy = false; // Force health check on next request
    Logger.info('🤖 Ollama configuration updated');
  }
}

// Export singleton instance
export const ollamaClient = new OllamaClient();