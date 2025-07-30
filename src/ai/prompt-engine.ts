/**
 * Domain-Specific Prompt Engine
 * Phase 5, Checkpoint E1 - Intelligent prompts for seeding and template generation
 */

import { SchemaInfo } from '../core/schema-adapter';
import { Template } from '../features/generation/template-engine';
import { Logger } from '../core/utils/logger';

export interface PromptContext {
  schema?: SchemaInfo;
  table?: string;
  columns?: Array<{ name: string; type: string; nullable?: boolean }>;
  relationships?: Array<{ from: string; to: string; type: string }>;
  existingData?: Record<string, any>[];
  constraints?: Array<{ field: string; rule: string; value?: any }>;
  style?: 'realistic' | 'creative' | 'business' | 'technical' | 'casual';
  language?: string;
  culture?: string;
  domain?: string; // e.g., 'ecommerce', 'blog', 'saas', 'education'
}

export interface GenerationRequest {
  type: 'seed_data' | 'template_content' | 'schema_suggestion' | 'field_names' | 'relationships';
  context: PromptContext;
  count?: number;
  format?: 'json' | 'sql' | 'typescript' | 'text';
  requirements?: string[];
  examples?: any[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  type: GenerationRequest['type'];
  systemPrompt: string;
  userPromptTemplate: string;
  outputFormat: 'json' | 'text';
  examples?: Array<{
    input: any;
    output: any;
  }>;
  validation?: {
    required_fields?: string[];
    data_types?: Record<string, string>;
    constraints?: Array<{ field: string; rule: string }>;
  };
}

export class DomainPromptEngine {
  private promptTemplates: Map<string, PromptTemplate> = new Map();
  private domainKnowledge: Map<string, any> = new Map();

  constructor() {
    this.initializeBuiltInTemplates();
    this.initializeDomainKnowledge();
  }

  /**
   * Generate a contextual prompt for AI generation
   */
  generatePrompt(request: GenerationRequest): { system: string; user: string; schema?: any } {
    const template = this.getTemplateForRequest(request);
    if (!template) {
      throw new Error(`No prompt template found for type: ${request.type}`);
    }

    Logger.debug(`🧠 Generating ${request.type} prompt for ${request.context.table || 'unknown'}`);

    // Build system prompt with domain context
    const systemPrompt = this.buildSystemPrompt(template, request.context);

    // Build user prompt with specific requirements
    const userPrompt = this.buildUserPrompt(template, request);

    // Generate JSON schema for structured output
    const schema = this.generateOutputSchema(template, request);

    return {
      system: systemPrompt,
      user: userPrompt,
      schema
    };
  }

  /**
   * Generate seed data prompts
   */
  generateSeedDataPrompt(context: PromptContext, count: number = 10): { system: string; user: string; schema?: any } {
    const request: GenerationRequest = {
      type: 'seed_data',
      context,
      count,
      format: 'json'
    };

    return this.generatePrompt(request);
  }

  /**
   * Generate template content prompts
   */
  generateTemplatePrompt(context: PromptContext, templateType: string): { system: string; user: string } {
    const request: GenerationRequest = {
      type: 'template_content',
      context: { ...context, domain: templateType },
      format: 'typescript'
    };

    const result = this.generatePrompt(request);
    return { system: result.system, user: result.user };
  }

  /**
   * Generate schema improvement suggestions
   */
  generateSchemaAnalysisPrompt(schema: SchemaInfo): { system: string; user: string } {
    const request: GenerationRequest = {
      type: 'schema_suggestion',
      context: { schema },
      format: 'json'
    };

    const result = this.generatePrompt(request);
    return { system: result.system, user: result.user };
  }

  /**
   * Add custom prompt template
   */
  addPromptTemplate(template: PromptTemplate): void {
    this.promptTemplates.set(template.id, template);
    Logger.debug(`🧠 Added prompt template: ${template.name}`);
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): PromptTemplate[] {
    return Array.from(this.promptTemplates.values());
  }

  /**
   * Add domain knowledge
   */
  addDomainKnowledge(domain: string, knowledge: any): void {
    this.domainKnowledge.set(domain, knowledge);
    Logger.debug(`🧠 Added domain knowledge: ${domain}`);
  }

  /**
   * Private: Initialize built-in prompt templates
   */
  private initializeBuiltInTemplates(): void {
    // Seed Data Generation Template
    this.addPromptTemplate({
      id: 'seed_data_realistic',
      name: 'Realistic Seed Data Generator',
      description: 'Generates realistic seed data based on table schema',
      type: 'seed_data',
      systemPrompt: `You are an expert database seeding specialist. Your task is to generate realistic, diverse, and coherent seed data for database tables.

Key principles:
- Generate data that feels authentic and realistic
- Ensure data relationships are logical and consistent
- Follow common naming patterns and conventions
- Consider cultural and regional variations when appropriate
- Maintain data quality and avoid obvious patterns
- Respect data types and constraints strictly

Always respond with valid JSON only, no additional text or explanations.`,
      userPromptTemplate: `Generate {{count}} realistic records for the "{{table}}" table with the following schema:

{{#if columns}}
Columns:
{{#each columns}}
- {{name}} ({{type}}){{#if nullable}} - nullable{{/if}}
{{/each}}
{{/if}}

{{#if relationships}}
Relationships:
{{#each relationships}}
- {{from}} -> {{to}} ({{type}})
{{/each}}
{{/if}}

{{#if constraints}}
Constraints:
{{#each constraints}}
- {{field}}: {{rule}}{{#if value}} = {{value}}{{/if}}
{{/each}}
{{/if}}

{{#if domain}}
Domain context: {{domain}}
{{/if}}

{{#if style}}
Data style: {{style}}
{{/if}}

Generate data that is:
1. Realistic and diverse
2. Internally consistent
3. Appropriate for the domain
4. Following proper data types
5. Respectful of constraints

Return as JSON array of objects.`,
      outputFormat: 'json',
      validation: {
        required_fields: ['records'],
        data_types: {
          records: 'array'
        }
      }
    });

    // Template Content Generation
    this.addPromptTemplate({
      id: 'template_content_generator',
      name: 'Template Content Generator',
      description: 'Generates template code for seeders and configurations',
      type: 'template_content',
      systemPrompt: `You are an expert TypeScript and database seeding developer. Generate clean, efficient, and well-documented seeding templates.

Guidelines:
- Use modern TypeScript patterns
- Include proper type annotations
- Add helpful comments
- Follow naming conventions
- Ensure code is reusable and maintainable
- Handle edge cases appropriately`,
      userPromptTemplate: `Generate a {{domain}} template for table "{{table}}" with the following specifications:

{{#if columns}}
Table Columns:
{{#each columns}}
- {{name}}: {{type}}
{{/each}}
{{/if}}

{{#if schema}}
Schema Context:
- Framework: {{schema.frameworkType}}
- Version: {{schema.makerkitVersion}}
- Has Users: {{schema.hasUsers}}
- Has Profiles: {{schema.hasProfiles}}
- Custom Tables: {{join schema.customTables ", "}}
{{/if}}

Requirements:
1. Generate TypeScript seeder class
2. Include realistic data generation
3. Handle relationships properly
4. Add proper error handling
5. Include configuration options

Template should be production-ready and well-documented.`,
      outputFormat: 'text'
    });

    // Schema Analysis Template
    this.addPromptTemplate({
      id: 'schema_analysis',
      name: 'Schema Improvement Analyzer',
      description: 'Analyzes database schema and suggests improvements',
      type: 'schema_suggestion',
      systemPrompt: `You are a database architecture expert. Analyze the provided schema and suggest improvements for better seeding, performance, and maintainability.

Focus on:
- Relationship opportunities
- Missing indexes for seeding
- Data type optimizations
- Constraint improvements
- Seeding strategy recommendations`,
      userPromptTemplate: `Analyze this database schema and provide improvement suggestions:

Schema Information:
- Framework: {{schema.frameworkType}}
- Version: {{schema.makerkitVersion}}
- Has Users: {{schema.hasUsers}}
- Has Profiles: {{schema.hasProfiles}}
- Has Teams: {{schema.hasTeams}}
- Primary User Table: {{schema.primaryUserTable}}

Custom Tables: {{join schema.customTables ", "}}

{{#if schema.detectedRelationships}}
Detected Relationships:
{{#each schema.detectedRelationships}}
- {{from}} -> {{to}} ({{type}})
{{/each}}
{{/if}}

Provide suggestions for:
1. Missing relationships that could be detected
2. Seeding order recommendations
3. Performance improvements for seeding
4. Data consistency checks
5. Additional constraints that would help seeding

Return as structured JSON with categories and specific recommendations.`,
      outputFormat: 'json',
      validation: {
        required_fields: ['suggestions'],
        data_types: {
          suggestions: 'array'
        }
      }
    });

    // Field Name Generation
    this.addPromptTemplate({
      id: 'field_names_generator',
      name: 'Smart Field Names Generator',
      description: 'Generates contextually appropriate field names',
      type: 'field_names',
      systemPrompt: `You are a database design expert specializing in naming conventions. Generate meaningful, consistent field names that follow best practices.

Principles:
- Use clear, descriptive names
- Follow snake_case for database fields
- Avoid abbreviations unless they're standard
- Consider the domain context
- Ensure names are searchable and understandable`,
      userPromptTemplate: `Generate appropriate field names for a {{table}} table in the {{domain}} domain.

Context:
{{#if columns}}
Existing columns: {{join (map columns "name") ", "}}
{{/each}}

{{#if relationships}}
Related to:
{{#each relationships}}
- {{to}} table
{{/each}}
{{/if}}

Generate 10-15 additional field names that would be commonly needed for this table type.
Consider both required and optional fields.

Return as JSON array of objects with: name, type, description, required boolean.`,
      outputFormat: 'json'
    });
  }

  /**
   * Private: Initialize domain knowledge
   */
  private initializeDomainKnowledge(): void {
    // E-commerce domain knowledge
    this.addDomainKnowledge('ecommerce', {
      common_tables: ['products', 'orders', 'customers', 'categories', 'inventory'],
      naming_patterns: {
        products: ['name', 'description', 'price', 'sku', 'category_id', 'stock_quantity'],
        orders: ['order_number', 'customer_id', 'total_amount', 'status', 'created_at'],
        customers: ['first_name', 'last_name', 'email', 'phone', 'address']
      },
      realistic_data: {
        products: {
          categories: ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'],
          price_ranges: { min: 5, max: 500 },
          status_options: ['active', 'inactive', 'discontinued']
        }
      }
    });

    // Blog/CMS domain knowledge
    this.addDomainKnowledge('blog', {
      common_tables: ['posts', 'authors', 'categories', 'comments', 'tags'],
      naming_patterns: {
        posts: ['title', 'content', 'excerpt', 'author_id', 'published_at', 'status'],
        authors: ['name', 'bio', 'avatar_url', 'social_links'],
        comments: ['post_id', 'author_name', 'content', 'approved', 'created_at']
      },
      realistic_data: {
        posts: {
          categories: ['Technology', 'Lifestyle', 'Business', 'Travel', 'Food'],
          status_options: ['draft', 'published', 'archived'],
          content_length: { min: 500, max: 2000 }
        }
      }
    });

    // SaaS domain knowledge
    this.addDomainKnowledge('saas', {
      common_tables: ['users', 'subscriptions', 'plans', 'usage_metrics', 'billing'],
      naming_patterns: {
        users: ['email', 'first_name', 'last_name', 'role', 'subscription_id'],
        subscriptions: ['plan_id', 'user_id', 'status', 'started_at', 'expires_at'],
        plans: ['name', 'price', 'features', 'max_users', 'billing_interval']
      },
      realistic_data: {
        plans: {
          tiers: ['free', 'basic', 'pro', 'enterprise'],
          billing_intervals: ['monthly', 'yearly'],
          features: ['API Access', 'Advanced Analytics', 'Priority Support']
        }
      }
    });
  }

  /**
   * Private: Get template for request type
   */
  private getTemplateForRequest(request: GenerationRequest): PromptTemplate | undefined {
    // Find most suitable template for request type
    const templates = Array.from(this.promptTemplates.values())
      .filter(t => t.type === request.type);

    if (templates.length === 0) return undefined;

    // For now, return first matching template
    // Could implement more sophisticated selection logic
    return templates[0];
  }

  /**
   * Private: Build system prompt with context
   */
  private buildSystemPrompt(template: PromptTemplate, context: PromptContext): string {
    let systemPrompt = template.systemPrompt;

    // Add domain-specific context
    if (context.domain && this.domainKnowledge.has(context.domain)) {
      const domainInfo = this.domainKnowledge.get(context.domain);
      systemPrompt += `\n\nDomain Knowledge (${context.domain}):\n${JSON.stringify(domainInfo, null, 2)}`;
    }

    // Add style guidance
    if (context.style) {
      systemPrompt += `\n\nData Style: Generate data in "${context.style}" style.`;
    }

    // Add cultural context
    if (context.culture) {
      systemPrompt += `\n\nCultural Context: Consider ${context.culture} cultural patterns and naming conventions.`;
    }

    return systemPrompt;
  }

  /**
   * Private: Build user prompt from template
   */
  private buildUserPrompt(template: PromptTemplate, request: GenerationRequest): string {
    let userPrompt = template.userPromptTemplate;

    // Simple template variable replacement
    const variables = {
      count: request.count || 10,
      table: request.context.table || 'unknown',
      columns: request.context.columns || [],
      relationships: request.context.relationships || [],
      constraints: request.context.constraints || [],
      domain: request.context.domain || 'general',
      style: request.context.style || 'realistic',
      schema: request.context.schema
    };

    // Replace simple variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      userPrompt = userPrompt.replace(regex, String(value));
    }

    // Handle more complex Handlebars-like syntax (simplified)
    userPrompt = this.processHandlebarsLike(userPrompt, variables);

    // Add additional requirements
    if (request.requirements && request.requirements.length > 0) {
      userPrompt += '\n\nAdditional Requirements:\n';
      request.requirements.forEach((req, i) => {
        userPrompt += `${i + 1}. ${req}\n`;
      });
    }

    return userPrompt;
  }

  /**
   * Private: Generate output schema for structured responses
   */
  private generateOutputSchema(template: PromptTemplate, request: GenerationRequest): any {
    if (template.outputFormat !== 'json') return undefined;

    const baseSchema = {
      type: 'object',
      properties: {},
      required: []
    };

    // Generate schema based on request type
    switch (request.type) {
      case 'seed_data':
        return {
          type: 'object',
          properties: {
            records: {
              type: 'array',
              items: {
                type: 'object',
                properties: this.generateColumnSchema(request.context.columns || [])
              }
            },
            metadata: {
              type: 'object',
              properties: {
                count: { type: 'number' },
                table: { type: 'string' },
                generated_at: { type: 'string' }
              }
            }
          },
          required: ['records']
        };

      case 'schema_suggestion':
        return {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  implementation: { type: 'string' }
                },
                required: ['category', 'title', 'description']
              }
            }
          },
          required: ['suggestions']
        };

      default:
        return baseSchema;
    }
  }

  /**
   * Private: Generate schema for table columns
   */
  private generateColumnSchema(columns: Array<{ name: string; type: string }>): any {
    const properties: any = {};

    for (const column of columns) {
      let jsonType = 'string';
      
      // Map SQL types to JSON types
      if (column.type.includes('int') || column.type.includes('numeric') || column.type.includes('decimal')) {
        jsonType = 'number';
      } else if (column.type.includes('bool')) {
        jsonType = 'boolean';
      } else if (column.type.includes('json') || column.type.includes('array')) {
        jsonType = 'object';
      }

      properties[column.name] = { type: jsonType };
    }

    return properties;
  }

  /**
   * Private: Process simple Handlebars-like template syntax
   */
  private processHandlebarsLike(template: string, variables: any): string {
    let result = template;

    // Handle {{#if variable}} blocks
    result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
      return variables[varName] ? content : '';
    });

    // Handle {{#each array}} blocks
    result = result.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayName, content) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        return content.replace(/{{(\w+)}}/g, (itemMatch: string, propName: string) => {
          return item[propName] || '';
        });
      }).join('');
    });

    // Handle {{join array "separator"}} helper
    result = result.replace(/{{join\s+(\w+)\s+"([^"]+)"}}/g, (match, arrayName, separator) => {
      const array = variables[arrayName];
      return Array.isArray(array) ? array.join(separator) : '';
    });

    return result;
  }
}

// Export singleton instance
export const promptEngine = new DomainPromptEngine();