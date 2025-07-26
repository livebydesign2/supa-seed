/**
 * Domain-Specific Pattern Definitions for Epic 2: Smart Platform Detection Engine
 * Comprehensive pattern definitions for detecting content domains (outdoor/SaaS/e-commerce/social)
 * Part of Task 2.2.1: Analyze domain detection patterns and create domain-specific pattern definitions
 */

import { DomainPattern, ContentDomainType } from './detection-types';

/**
 * Outdoor Domain Patterns
 * Based on adventure gear, setups, trips, and outdoor activities
 */
export const OUTDOOR_DOMAIN_PATTERNS: DomainPattern[] = [
  // Core outdoor patterns
  {
    id: 'outdoor_gear_core',
    name: 'Outdoor Gear Core Pattern',
    description: 'Core outdoor gear management with setups and templates',
    indicatesDomain: 'outdoor',
    confidenceWeight: 0.95,
    tablePatterns: ['gear_items', 'setups', 'base_templates', 'setup_gear_items'],
    columnPatterns: ['make', 'model', 'weight', 'dimensions', 'specifications', 'type', 'priority'],
    relationshipPatterns: [
      { fromTable: 'setups', toTable: 'gear_items', type: 'many_to_many' },
      { fromTable: 'setups', toTable: 'base_templates', type: 'many_to_many' }
    ],
    businessLogicPatterns: ['public_setup', 'gear_priority', 'affiliate_link'],
    minimumMatches: 3,
    exclusive: true,
    priority: 10
  },
  {
    id: 'outdoor_adventure_activities',
    name: 'Adventure Activities Pattern',
    description: 'Adventure-focused activities and trip planning',
    indicatesDomain: 'outdoor',
    confidenceWeight: 0.85,
    tablePatterns: ['trips', 'adventures', 'activities', 'expeditions', 'journeys'],
    columnPatterns: ['adventure_type', 'difficulty', 'duration', 'location', 'terrain'],
    relationshipPatterns: [
      { fromTable: 'trips', toTable: 'gear_items', type: 'many_to_many' },
      { fromTable: 'adventures', toTable: 'setups', type: 'one_to_many' }
    ],
    businessLogicPatterns: ['trip_planning', 'adventure_log', 'location_tracking'],
    minimumMatches: 2,
    exclusive: true,
    priority: 9
  },
  {
    id: 'outdoor_equipment_categories',
    name: 'Outdoor Equipment Categories',
    description: 'Outdoor-specific equipment categorization',
    indicatesDomain: 'outdoor',
    confidenceWeight: 0.75,
    tablePatterns: ['categories', 'gear_categories', 'equipment_types'],
    columnPatterns: ['category_type', 'outdoor_category', 'gear_type', 'equipment_class'],
    relationshipPatterns: [
      { fromTable: 'categories', toTable: 'gear_items', type: 'one_to_many' }
    ],
    businessLogicPatterns: ['category_hierarchy', 'gear_classification'],
    minimumMatches: 1,
    exclusive: false,
    priority: 7
  },
  {
    id: 'outdoor_vehicles_shelter',
    name: 'Outdoor Vehicles and Shelter',
    description: 'Outdoor-specific vehicle and shelter equipment',
    indicatesDomain: 'outdoor',
    confidenceWeight: 0.80,
    tablePatterns: ['vehicles', 'shelters', 'backpacks', 'camping_gear'],
    columnPatterns: ['vehicle_type', 'shelter_type', 'capacity', 'season_rating', 'backpack_volume'],
    relationshipPatterns: [],
    businessLogicPatterns: ['vehicle_setup', 'shelter_config', 'load_management'],
    minimumMatches: 1,
    exclusive: true,
    priority: 8
  }
];

/**
 * SaaS Domain Patterns
 * Based on subscriptions, billing, teams, and productivity tools
 */
export const SAAS_DOMAIN_PATTERNS: DomainPattern[] = [
  // Core SaaS business patterns
  {
    id: 'saas_subscription_core',
    name: 'SaaS Subscription Core Pattern',
    description: 'Core subscription and billing management',
    indicatesDomain: 'saas',
    confidenceWeight: 0.95,
    tablePatterns: ['subscriptions', 'billing', 'plans', 'pricing', 'billing_customers'],
    columnPatterns: ['plan_id', 'subscription_status', 'billing_cycle', 'mrr', 'trial_end', 'next_billing'],
    relationshipPatterns: [
      { fromTable: 'subscriptions', toTable: 'plans', type: 'many_to_many' },
      { fromTable: 'subscriptions', toTable: 'billing', type: 'one_to_many' }
    ],
    businessLogicPatterns: ['subscription_lifecycle', 'billing_automation', 'plan_changes'],
    minimumMatches: 3,
    exclusive: true,
    priority: 10
  },
  {
    id: 'saas_team_workspace',
    name: 'SaaS Team Workspace Pattern',
    description: 'Team collaboration and workspace management',
    indicatesDomain: 'saas',
    confidenceWeight: 0.90,
    tablePatterns: ['workspaces', 'teams', 'organizations', 'members', 'memberships'],
    columnPatterns: ['workspace_id', 'team_id', 'member_role', 'permission_level', 'workspace_settings'],
    relationshipPatterns: [
      { fromTable: 'organizations', toTable: 'workspaces', type: 'one_to_many' },
      { fromTable: 'workspaces', toTable: 'members', type: 'many_to_many' }
    ],
    businessLogicPatterns: ['team_permissions', 'workspace_isolation', 'member_management'],
    minimumMatches: 2,
    exclusive: false,
    priority: 9
  },
  {
    id: 'saas_feature_usage',
    name: 'SaaS Feature Usage Pattern',
    description: 'Feature tracking and usage analytics',
    indicatesDomain: 'saas',
    confidenceWeight: 0.80,
    tablePatterns: ['features', 'usage', 'analytics', 'metrics', 'quotas', 'limits'],
    columnPatterns: ['usage_count', 'feature_enabled', 'quota_limit', 'usage_period', 'feature_flag'],
    relationshipPatterns: [
      { fromTable: 'usage', toTable: 'features', type: 'many_to_many' },
      { fromTable: 'plans', toTable: 'features', type: 'many_to_many' }
    ],
    businessLogicPatterns: ['usage_tracking', 'quota_enforcement', 'feature_gating'],
    minimumMatches: 2,
    exclusive: false,
    priority: 8
  },
  {
    id: 'saas_productivity_tools',
    name: 'SaaS Productivity Tools',
    description: 'Productivity and collaboration tools',
    indicatesDomain: 'saas',
    confidenceWeight: 0.75,
    tablePatterns: ['projects', 'tasks', 'workflows', 'automation', 'integrations'],
    columnPatterns: ['project_status', 'task_priority', 'workflow_state', 'automation_trigger'],
    relationshipPatterns: [
      { fromTable: 'projects', toTable: 'tasks', type: 'one_to_many' },
      { fromTable: 'workflows', toTable: 'automation', type: 'one_to_many' }
    ],
    businessLogicPatterns: ['project_management', 'task_automation', 'workflow_execution'],
    minimumMatches: 1,
    exclusive: false,
    priority: 7
  }
];

/**
 * E-commerce Domain Patterns
 * Based on products, orders, inventory, and marketplace features
 */
export const ECOMMERCE_DOMAIN_PATTERNS: DomainPattern[] = [
  // Core e-commerce patterns
  {
    id: 'ecommerce_product_core',
    name: 'E-commerce Product Core Pattern',
    description: 'Core product catalog and inventory management',
    indicatesDomain: 'ecommerce',
    confidenceWeight: 0.95,
    tablePatterns: ['products', 'inventory', 'categories', 'variants', 'product_variants'],
    columnPatterns: ['sku', 'price', 'inventory_count', 'stock_level', 'variant_id', 'category_id'],
    relationshipPatterns: [
      { fromTable: 'products', toTable: 'categories', type: 'many_to_many' },
      { fromTable: 'products', toTable: 'variants', type: 'one_to_many' }
    ],
    businessLogicPatterns: ['inventory_management', 'price_calculation', 'variant_selection'],
    minimumMatches: 3,
    exclusive: true,
    priority: 10
  },
  {
    id: 'ecommerce_transaction_core',
    name: 'E-commerce Transaction Core Pattern',
    description: 'Order processing and payment handling',
    indicatesDomain: 'ecommerce',
    confidenceWeight: 0.90,
    tablePatterns: ['orders', 'cart', 'payments', 'transactions', 'checkouts'],
    columnPatterns: ['order_status', 'payment_method', 'total_amount', 'cart_total', 'transaction_id'],
    relationshipPatterns: [
      { fromTable: 'orders', toTable: 'products', type: 'many_to_many' },
      { fromTable: 'orders', toTable: 'payments', type: 'one_to_many' }
    ],
    businessLogicPatterns: ['order_processing', 'payment_handling', 'cart_management'],
    minimumMatches: 2,
    exclusive: true,
    priority: 9
  },
  {
    id: 'ecommerce_marketplace',
    name: 'E-commerce Marketplace Pattern',
    description: 'Multi-vendor marketplace features',
    indicatesDomain: 'ecommerce',
    confidenceWeight: 0.85,
    tablePatterns: ['vendors', 'sellers', 'stores', 'merchants', 'marketplace'],
    columnPatterns: ['vendor_id', 'seller_id', 'commission_rate', 'payout_status', 'store_settings'],
    relationshipPatterns: [
      { fromTable: 'vendors', toTable: 'products', type: 'one_to_many' },
      { fromTable: 'stores', toTable: 'orders', type: 'one_to_many' }
    ],
    businessLogicPatterns: ['vendor_management', 'commission_calculation', 'marketplace_rules'],
    minimumMatches: 1,
    exclusive: true,
    priority: 8
  },
  {
    id: 'ecommerce_shipping_fulfillment',
    name: 'E-commerce Shipping and Fulfillment',
    description: 'Shipping and order fulfillment',
    indicatesDomain: 'ecommerce',
    confidenceWeight: 0.80,
    tablePatterns: ['shipping', 'fulfillment', 'warehouses', 'carriers', 'deliveries'],
    columnPatterns: ['shipping_address', 'tracking_number', 'carrier_name', 'delivery_date', 'fulfillment_status'],
    relationshipPatterns: [
      { fromTable: 'orders', toTable: 'shipping', type: 'one_to_one' },
      { fromTable: 'warehouses', toTable: 'inventory', type: 'one_to_many' }
    ],
    businessLogicPatterns: ['shipping_calculation', 'fulfillment_workflow', 'tracking_updates'],
    minimumMatches: 1,
    exclusive: false,
    priority: 7
  }
];

/**
 * Social Domain Patterns
 * Based on social networking, engagement, and user-generated content
 */
export const SOCIAL_DOMAIN_PATTERNS: DomainPattern[] = [
  // Core social networking patterns
  {
    id: 'social_engagement_core',
    name: 'Social Engagement Core Pattern',
    description: 'Core social engagement features',
    indicatesDomain: 'social',
    confidenceWeight: 0.95,
    tablePatterns: ['posts', 'likes', 'comments', 'shares', 'reactions'],
    columnPatterns: ['like_count', 'comment_count', 'share_count', 'reaction_type', 'engagement_score'],
    relationshipPatterns: [
      { fromTable: 'posts', toTable: 'likes', type: 'one_to_many' },
      { fromTable: 'posts', toTable: 'comments', type: 'one_to_many' }
    ],
    businessLogicPatterns: ['engagement_tracking', 'reaction_handling', 'content_scoring'],
    minimumMatches: 3,
    exclusive: true,
    priority: 10
  },
  {
    id: 'social_network_graph',
    name: 'Social Network Graph Pattern',
    description: 'Social connections and relationships',
    indicatesDomain: 'social',
    confidenceWeight: 0.90,
    tablePatterns: ['follows', 'followers', 'friends', 'connections', 'friendships'],
    columnPatterns: ['follower_id', 'following_id', 'friend_status', 'connection_type', 'relationship_status'],
    relationshipPatterns: [
      { fromTable: 'follows', toTable: 'users', type: 'many_to_many' },
      { fromTable: 'friendships', toTable: 'users', type: 'many_to_many' }
    ],
    businessLogicPatterns: ['follow_system', 'friend_requests', 'connection_management'],
    minimumMatches: 1,
    exclusive: true,
    priority: 9
  },
  {
    id: 'social_content_creation',
    name: 'Social Content Creation Pattern',
    description: 'User-generated content and media sharing',
    indicatesDomain: 'social',
    confidenceWeight: 0.85,
    tablePatterns: ['media', 'photos', 'videos', 'stories', 'timeline', 'feeds'],
    columnPatterns: ['media_url', 'media_type', 'caption', 'hashtags', 'mentions', 'visibility'],
    relationshipPatterns: [
      { fromTable: 'posts', toTable: 'media', type: 'one_to_many' },
      { fromTable: 'stories', toTable: 'media', type: 'one_to_one' }
    ],
    businessLogicPatterns: ['media_processing', 'content_moderation', 'visibility_control'],
    minimumMatches: 2,
    exclusive: false,
    priority: 8
  },
  {
    id: 'social_activity_feed',
    name: 'Social Activity Feed Pattern',
    description: 'Activity feeds and notifications',
    indicatesDomain: 'social',
    confidenceWeight: 0.80,
    tablePatterns: ['feeds', 'notifications', 'activities', 'timeline', 'news_feed'],
    columnPatterns: ['activity_type', 'notification_type', 'read_status', 'feed_rank', 'activity_timestamp'],
    relationshipPatterns: [
      { fromTable: 'activities', toTable: 'users', type: 'many_to_many' },
      { fromTable: 'notifications', toTable: 'activities', type: 'many_to_many' }
    ],
    businessLogicPatterns: ['feed_generation', 'notification_delivery', 'activity_ranking'],
    minimumMatches: 1,
    exclusive: false,
    priority: 7
  }
];

/**
 * Generic Domain Patterns
 * Fallback patterns for platforms that don't match specific domains
 */
export const GENERIC_DOMAIN_PATTERNS: DomainPattern[] = [
  {
    id: 'generic_user_content',
    name: 'Generic User Content Pattern',
    description: 'Basic user-generated content patterns',
    indicatesDomain: 'generic',
    confidenceWeight: 0.50,
    tablePatterns: ['users', 'content', 'posts', 'items', 'entries'],
    columnPatterns: ['title', 'description', 'content', 'body', 'text', 'data'],
    relationshipPatterns: [
      { fromTable: 'content', toTable: 'users', type: 'many_to_many' }
    ],
    businessLogicPatterns: ['content_management', 'user_permissions'],
    minimumMatches: 1,
    exclusive: false,
    priority: 3
  },
  {
    id: 'generic_categorization',
    name: 'Generic Categorization Pattern',
    description: 'Basic categorization and tagging',
    indicatesDomain: 'generic',
    confidenceWeight: 0.40,
    tablePatterns: ['categories', 'tags', 'classifications', 'types'],
    columnPatterns: ['category', 'tag', 'type', 'classification', 'group'],
    relationshipPatterns: [
      { fromTable: 'content', toTable: 'categories', type: 'many_to_many' }
    ],
    businessLogicPatterns: ['categorization', 'tagging_system'],
    minimumMatches: 1,
    exclusive: false,
    priority: 2
  },
  {
    id: 'generic_settings_config',
    name: 'Generic Settings and Configuration',
    description: 'Basic settings and configuration management',
    indicatesDomain: 'generic',
    confidenceWeight: 0.30,
    tablePatterns: ['settings', 'config', 'preferences', 'options'],
    columnPatterns: ['setting_key', 'setting_value', 'config_name', 'preference', 'option'],
    relationshipPatterns: [],
    businessLogicPatterns: ['settings_management', 'configuration'],
    minimumMatches: 1,
    exclusive: false,
    priority: 1
  }
];

/**
 * All domain patterns combined
 */
export const ALL_DOMAIN_PATTERNS: DomainPattern[] = [
  ...OUTDOOR_DOMAIN_PATTERNS,
  ...SAAS_DOMAIN_PATTERNS,
  ...ECOMMERCE_DOMAIN_PATTERNS,
  ...SOCIAL_DOMAIN_PATTERNS,
  ...GENERIC_DOMAIN_PATTERNS
];

/**
 * Get patterns for a specific domain
 */
export function getPatternsForDomain(domain: ContentDomainType): DomainPattern[] {
  switch (domain) {
    case 'outdoor':
      return OUTDOOR_DOMAIN_PATTERNS;
    case 'saas':
      return SAAS_DOMAIN_PATTERNS;
    case 'ecommerce':
      return ECOMMERCE_DOMAIN_PATTERNS;
    case 'social':
      return SOCIAL_DOMAIN_PATTERNS;
    case 'generic':
      return GENERIC_DOMAIN_PATTERNS;
    default:
      return GENERIC_DOMAIN_PATTERNS;
  }
}

/**
 * Get high-priority patterns for quick detection
 */
export function getHighPriorityPatterns(): DomainPattern[] {
  return ALL_DOMAIN_PATTERNS
    .filter(pattern => pattern.priority >= 8)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get exclusive patterns that strongly indicate specific domains
 */
export function getExclusivePatterns(): DomainPattern[] {
  return ALL_DOMAIN_PATTERNS.filter(pattern => pattern.exclusive);
}

/**
 * Domain confidence weights for scoring
 */
export const DOMAIN_CONFIDENCE_WEIGHTS = {
  tablePatterns: 0.4,        // Direct table name matches
  columnPatterns: 0.25,      // Domain-specific columns
  relationshipPatterns: 0.2, // Domain-specific relationships
  businessLogic: 0.15        // Domain-specific constraints/functions
};

/**
 * Confidence thresholds for domain classification
 */
export const DOMAIN_CONFIDENCE_THRESHOLDS = {
  definitive: 0.90,   // >90% confidence for definitive classification
  strong: 0.70,       // >70% confidence for strong classification
  moderate: 0.50,     // >50% minimum for consideration
  weak: 0.30          // <30% insufficient for classification
};