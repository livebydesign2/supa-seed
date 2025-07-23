/**
 * AI Integration Module
 * Phase 5, Checkpoint E1 - Complete AI integration exports
 */

// Core AI Components
export { OllamaClient, ollamaClient } from './ollama-client';
export { DomainPromptEngine, promptEngine } from './prompt-engine';
export { AIResponseCache, aiCache } from './response-cache';
export { AIAssetGenerator, aiAssetGenerator } from './asset-generator';

// Types and Interfaces
export type {
  OllamaConfig,
  GenerateRequest,
  GenerateResponse,
  ModelInfo,
  ConnectionStatus
} from './ollama-client';

export type {
  PromptContext,
  GenerationRequest,
  PromptTemplate
} from './prompt-engine';

export type {
  CacheEntry,
  CacheOptions,
  CacheStats,
  SearchOptions
} from './response-cache';

export type {
  GenerationOptions,
  AssetGenerationResult,
  TemplateRecommendation,
  SchemaAnalysis
} from './asset-generator';