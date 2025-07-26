/**
 * E-commerce User Archetypes for Marketplace Platforms
 * Generates realistic user personas for merchants, customers, and marketplace administrators
 * Part of Task 3.4.4: Create E-commerce user archetypes (merchants, customers, admins) (FR-3.4)
 */

import { Logger } from '../../utils/logger';
import type { UserArchetype } from '../extension-types';

/**
 * Extended E-commerce user archetype with marketplace-specific attributes
 */
export interface EcommerceUserArchetype extends UserArchetype {
  /** E-commerce specific preferences and behaviors */
  ecommercePreferences: {
    /** Primary activities on the platform */
    primaryActivities: string[];
    /** Shopping or selling experience level */
    experienceLevel: 'novice' | 'intermediate' | 'expert' | 'professional';
    /** Preferred interaction style */
    interactionStyle: 'browser' | 'researcher' | 'quick_buyer' | 'bulk_purchaser' | 'seller';
    /** Communication preference */
    communicationPreference: 'email' | 'phone' | 'chat' | 'self_service';
    /** Preferred product categories */
    preferredCategories: string[];
    /** Platform usage frequency */
    usageFrequency: 'daily' | 'weekly' | 'monthly' | 'seasonal';
  };

  /** Shopping or selling patterns specific to e-commerce */
  commercePattern: {
    /** Activity frequency on the platform */
    activityFrequency: 'low' | 'medium' | 'high' | 'very_high';
    /** Primary content types they create/interact with */
    contentTypes: ('products' | 'orders' | 'reviews' | 'wishlists' | 'questions' | 'listings')[];
    /** Purchase or sales behavior */
    transactionBehavior: {
      /** Average order value preference */
      averageOrderValue: 'low' | 'medium' | 'high' | 'luxury';
      /** Purchase frequency */
      purchaseFrequency: 'impulse' | 'planned' | 'research_heavy' | 'bulk';
      /** Price sensitivity */
      priceSensitivity: 'very_high' | 'high' | 'medium' | 'low';
    };
    /** Platform engagement patterns */
    engagementMetrics: {
      /** Session duration preference */
      sessionDuration: number; // minutes
      /** Pages visited per session */
      pagesPerSession: number;
      /** Likelihood to leave reviews */
      reviewLikelihood: number; // 0-1
      /** Social sharing tendency */
      shareProducts: boolean;
    };
  };

  /** Business-specific attributes for merchants */
  businessProfile?: {
    /** Business type */
    businessType: 'individual' | 'small_business' | 'enterprise' | 'marketplace_seller';
    /** Years in business */
    yearsInBusiness: number;
    /** Primary sales channels */
    salesChannels: string[];
    /** Target customer segments */
    targetSegments: string[];
    /** Business goals */
    businessGoals: string[];
  };
}

/**
 * E-commerce User Archetype Generator
 * Creates detailed personas for different types of e-commerce platform users
 */
export class EcommerceUserArchetypeGenerator {
  /**
   * Generate comprehensive set of e-commerce user archetypes
   * Covers merchants, customers, and marketplace administrators
   */
  generateEcommerceArchetypes(): EcommerceUserArchetype[] {
    const archetypes: EcommerceUserArchetype[] = [
      // Merchant Archetypes
      this.generateMerchantArchetype(),
      this.generateSmallBusinessArchetype(),
      this.generateEnterpriseSellerArchetype(),
      
      // Customer Archetypes
      this.generateCasualShopperArchetype(),
      this.generateFrequentBuyerArchetype(),
      this.generateBargainHunterArchetype(),
      this.generateLuxuryShopperArchetype(),
      
      // Platform Admin Archetypes
      this.generateMarketplaceAdminArchetype(),
      this.generateCustomerServiceArchetype(),
      
      // Specialized Archetypes
      this.generateInfluencerBuyerArchetype(),
      this.generateB2BBuyerArchetype()
    ];

    Logger.info(`👥 Generated ${archetypes.length} e-commerce user archetypes`);
    return archetypes;
  }

  /**
   * Generate merchant/store owner archetype
   */
  private generateMerchantArchetype(): EcommerceUserArchetype {
    return {
      id: 'ecommerce_merchant',
      email: 'merchant@storefront.test',
      role: 'merchant',
      name: 'Maria Store-Owner',
      description: 'Independent merchant managing online store and product catalog',
      purpose: 'Individual entrepreneur selling products through marketplace platform',
      contentPattern: {
        setupsPerUser: 1, // Store setup
        itemsPerSetup: 25, // Products in catalog
        publicRatio: 1.0, // All products are public
        preferredCategories: ['electronics', 'clothing', 'home_garden', 'accessories']
      },
      platformContext: {
        architectures: ['individual', 'team'],
        domains: ['ecommerce'],
        weight: 0.9
      },
      profile: {
        namePattern: 'Independent Merchant',
        bioPattern: 'Passionate entrepreneur focused on quality products and customer satisfaction',
        imagePreferences: {
          style: 'professional',
          categories: ['business', 'retail', 'entrepreneur']
        }
      },
      ecommercePreferences: {
        primaryActivities: ['product_management', 'order_fulfillment', 'customer_service', 'inventory_tracking'],
        experienceLevel: 'intermediate',
        interactionStyle: 'seller',
        communicationPreference: 'email',
        preferredCategories: ['electronics', 'clothing', 'accessories'],
        usageFrequency: 'daily'
      },
      commercePattern: {
        activityFrequency: 'high',
        contentTypes: ['products', 'orders', 'listings'],
        transactionBehavior: {
          averageOrderValue: 'medium',
          purchaseFrequency: 'planned',
          priceSensitivity: 'medium'
        },
        engagementMetrics: {
          sessionDuration: 45, // 45 minutes average
          pagesPerSession: 15,
          reviewLikelihood: 0.3, // Moderate review activity
          shareProducts: true
        }
      },
      businessProfile: {
        businessType: 'individual',
        yearsInBusiness: 3,
        salesChannels: ['online_marketplace', 'social_media'],
        targetSegments: ['millennials', 'working_professionals'],
        businessGoals: ['increase_sales', 'expand_product_line', 'improve_ratings']
      }
    };
  }

  /**
   * Generate small business archetype
   */
  private generateSmallBusinessArchetype(): EcommerceUserArchetype {
    return {
      id: 'ecommerce_small_business',
      email: 'team@smallbiz.test',
      role: 'business_owner',
      name: 'Robert Small-Business',
      description: 'Small business owner managing team-operated online store',
      purpose: 'Small business owner coordinating team sales and operations',
      contentPattern: {
        setupsPerUser: 1,
        itemsPerSetup: 75, // Larger catalog
        publicRatio: 1.0,
        preferredCategories: ['sports_outdoors', 'home_garden', 'tools', 'automotive']
      },
      platformContext: {
        architectures: ['team', 'hybrid'],
        domains: ['ecommerce'],
        weight: 0.8
      },
      profile: {
        namePattern: 'Small Business Owner',
        bioPattern: 'Experienced business owner focused on team coordination and growth strategies',
        imagePreferences: {
          style: 'professional',
          categories: ['business', 'teamwork', 'leadership']
        }
      },
      ecommercePreferences: {
        primaryActivities: ['team_management', 'strategy_planning', 'vendor_relations', 'performance_analysis'],
        experienceLevel: 'expert',
        interactionStyle: 'seller',
        communicationPreference: 'phone',
        preferredCategories: ['sports_outdoors', 'tools', 'automotive'],
        usageFrequency: 'daily'
      },
      commercePattern: {
        activityFrequency: 'very_high',
        contentTypes: ['products', 'orders', 'listings'],
        transactionBehavior: {
          averageOrderValue: 'high',
          purchaseFrequency: 'bulk',
          priceSensitivity: 'low'
        },
        engagementMetrics: {
          sessionDuration: 90, // Extended sessions
          pagesPerSession: 25,
          reviewLikelihood: 0.4,
          shareProducts: true
        }
      },
      businessProfile: {
        businessType: 'small_business',
        yearsInBusiness: 8,
        salesChannels: ['online_marketplace', 'own_website', 'wholesale'],
        targetSegments: ['outdoor_enthusiasts', 'diy_community', 'contractors'],
        businessGoals: ['scale_operations', 'optimize_inventory', 'expand_territories']
      }
    };
  }

  /**
   * Generate enterprise seller archetype
   */
  private generateEnterpriseSellerArchetype(): EcommerceUserArchetype {
    return {
      id: 'ecommerce_enterprise_seller',
      email: 'operations@enterprise.test',
      role: 'operations_manager',
      name: 'Jennifer Enterprise-Ops',
      description: 'Enterprise operations manager overseeing large-scale marketplace presence',
      purpose: 'Enterprise operations manager coordinating large-scale marketplace strategy',
      contentPattern: {
        setupsPerUser: 1,
        itemsPerSetup: 500, // Massive catalog
        publicRatio: 1.0,
        preferredCategories: ['electronics', 'books_media', 'office_supplies', 'health_beauty']
      },
      platformContext: {
        architectures: ['team', 'hybrid'],
        domains: ['ecommerce'],
        weight: 0.7
      },
      profile: {
        namePattern: 'Enterprise Operations Manager',
        bioPattern: 'Strategic operations leader focused on scalable marketplace solutions and data-driven decisions',
        imagePreferences: {
          style: 'professional',
          categories: ['corporate', 'technology', 'analytics']
        }
      },
      ecommercePreferences: {
        primaryActivities: ['analytics_review', 'strategic_planning', 'vendor_management', 'team_coordination'],
        experienceLevel: 'professional',
        interactionStyle: 'bulk_purchaser',
        communicationPreference: 'self_service',
        preferredCategories: ['electronics', 'office_supplies', 'health_beauty'],
        usageFrequency: 'daily'
      },
      commercePattern: {
        activityFrequency: 'very_high',
        contentTypes: ['products', 'orders', 'listings'],
        transactionBehavior: {
          averageOrderValue: 'luxury',
          purchaseFrequency: 'bulk',
          priceSensitivity: 'low'
        },
        engagementMetrics: {
          sessionDuration: 120, // Long strategic sessions
          pagesPerSession: 40,
          reviewLikelihood: 0.1, // Focus on operations, not reviews
          shareProducts: false
        }
      },
      businessProfile: {
        businessType: 'enterprise',
        yearsInBusiness: 15,
        salesChannels: ['online_marketplace', 'b2b_platform', 'own_website', 'wholesale'],
        targetSegments: ['consumers', 'businesses', 'government'],
        businessGoals: ['market_expansion', 'operational_efficiency', 'data_optimization']
      }
    };
  }

  /**
   * Generate casual shopper archetype
   */
  private generateCasualShopperArchetype(): EcommerceUserArchetype {
    return {
      id: 'ecommerce_casual_shopper',
      email: 'casual@shopper.test',
      role: 'customer',
      name: 'Alex Casual-Shopper',
      description: 'Occasional shopper who browses and purchases based on needs',
      purpose: 'Casual customer who shops occasionally for personal needs and interests',
      contentPattern: {
        setupsPerUser: 0, // Customers don't create products
        itemsPerSetup: 0,
        publicRatio: 0.2, // Occasional reviews
        preferredCategories: ['clothing', 'electronics', 'books_media']
      },
      platformContext: {
        architectures: ['individual'],
        domains: ['ecommerce'],
        weight: 0.8
      },
      profile: {
        namePattern: 'Casual Shopper',
        bioPattern: 'Laid-back shopper who enjoys discovering interesting products without pressure',
        imagePreferences: {
          style: 'casual',
          categories: ['lifestyle', 'leisure', 'everyday']
        }
      },
      ecommercePreferences: {
        primaryActivities: ['browsing', 'wishlist_management', 'reading_reviews', 'comparing_prices'],
        experienceLevel: 'intermediate',
        interactionStyle: 'browser',
        communicationPreference: 'self_service',
        preferredCategories: ['clothing', 'electronics', 'home_decor'],
        usageFrequency: 'weekly'
      },
      commercePattern: {
        activityFrequency: 'medium',
        contentTypes: ['orders', 'reviews', 'wishlists'],
        transactionBehavior: {
          averageOrderValue: 'medium',
          purchaseFrequency: 'planned',
          priceSensitivity: 'medium'
        },
        engagementMetrics: {
          sessionDuration: 25, // Moderate browsing sessions
          pagesPerSession: 12,
          reviewLikelihood: 0.4,
          shareProducts: true
        }
      }
    };
  }

  /**
   * Generate frequent buyer archetype
   */
  private generateFrequentBuyerArchetype(): EcommerceUserArchetype {
    return {
      id: 'ecommerce_frequent_buyer',
      email: 'frequent@buyer.test',
      role: 'customer',
      name: 'Sarah Frequent-Buyer',
      description: 'Active customer who makes regular purchases and engages with the platform',
      purpose: 'Loyal customer who frequently purchases and actively engages with marketplace community',
      contentPattern: {
        setupsPerUser: 0,
        itemsPerSetup: 0,
        publicRatio: 0.6, // Active reviewer
        preferredCategories: ['clothing', 'beauty', 'electronics', 'home_garden']
      },
      platformContext: {
        architectures: ['individual'],
        domains: ['ecommerce'],
        weight: 0.9
      },
      profile: {
        namePattern: 'Frequent Buyer',
        bioPattern: 'Enthusiastic shopper who loves trying new products and sharing experiences',
        imagePreferences: {
          style: 'casual',
          categories: ['shopping', 'lifestyle', 'social']
        }
      },
      ecommercePreferences: {
        primaryActivities: ['shopping', 'review_writing', 'community_engagement', 'deal_hunting'],
        experienceLevel: 'expert',
        interactionStyle: 'quick_buyer',
        communicationPreference: 'chat',
        preferredCategories: ['clothing', 'beauty', 'electronics'],
        usageFrequency: 'daily'
      },
      commercePattern: {
        activityFrequency: 'high',
        contentTypes: ['orders', 'reviews', 'wishlists', 'questions'],
        transactionBehavior: {
          averageOrderValue: 'medium',
          purchaseFrequency: 'impulse',
          priceSensitivity: 'medium'
        },
        engagementMetrics: {
          sessionDuration: 35,
          pagesPerSession: 20,
          reviewLikelihood: 0.8, // Very likely to review
          shareProducts: true
        }
      }
    };
  }

  /**
   * Generate bargain hunter archetype
   */
  private generateBargainHunterArchetype(): EcommerceUserArchetype {
    return {
      id: 'ecommerce_bargain_hunter',
      email: 'deals@saver.test',
      role: 'customer',
      name: 'Mike Bargain-Hunter',
      description: 'Price-conscious shopper focused on finding the best deals and discounts',
      purpose: 'Budget-conscious customer who researches extensively and hunts for the best deals',
      contentPattern: {
        setupsPerUser: 0,
        itemsPerSetup: 0,
        publicRatio: 0.5, // Reviews focused on value
        preferredCategories: ['electronics', 'clothing', 'home_garden', 'tools']
      },
      platformContext: {
        architectures: ['individual'],
        domains: ['ecommerce'],
        weight: 0.7
      },
      profile: {
        namePattern: 'Bargain Hunter',
        bioPattern: 'Savvy shopper who researches thoroughly and always finds the best deals',
        imagePreferences: {
          style: 'casual',
          categories: ['savings', 'research', 'practical']
        }
      },
      ecommercePreferences: {
        primaryActivities: ['price_comparison', 'coupon_hunting', 'sale_monitoring', 'bulk_purchasing'],
        experienceLevel: 'expert',
        interactionStyle: 'researcher',
        communicationPreference: 'self_service',
        preferredCategories: ['electronics', 'tools', 'household_items'],
        usageFrequency: 'weekly'
      },
      commercePattern: {
        activityFrequency: 'high',
        contentTypes: ['orders', 'reviews', 'wishlists'],
        transactionBehavior: {
          averageOrderValue: 'low',
          purchaseFrequency: 'research_heavy',
          priceSensitivity: 'very_high'
        },
        engagementMetrics: {
          sessionDuration: 50, // Long research sessions
          pagesPerSession: 30,
          reviewLikelihood: 0.6, // Reviews focus on value
          shareProducts: true
        }
      }
    };
  }

  /**
   * Generate luxury shopper archetype
   */
  private generateLuxuryShopperArchetype(): EcommerceUserArchetype {
    return {
      id: 'ecommerce_luxury_shopper',
      email: 'luxury@premium.test',
      role: 'customer',
      name: 'Victoria Luxury-Shopper',
      description: 'High-end customer focused on premium products and exclusive experiences',
      purpose: 'Affluent customer who prioritizes quality and exclusivity over price',
      contentPattern: {
        setupsPerUser: 0,
        itemsPerSetup: 0,
        publicRatio: 0.3, // Selective about reviews
        preferredCategories: ['luxury_goods', 'jewelry', 'designer_clothing', 'premium_electronics']
      },
      platformContext: {
        architectures: ['individual'],
        domains: ['ecommerce'],
        weight: 0.6
      },
      profile: {
        namePattern: 'Luxury Shopper',
        bioPattern: 'Discerning customer who appreciates premium quality and exceptional service',
        imagePreferences: {
          style: 'professional',
          categories: ['luxury', 'elegance', 'premium']
        }
      },
      ecommercePreferences: {
        primaryActivities: ['luxury_browsing', 'exclusive_access', 'premium_service', 'quality_assessment'],
        experienceLevel: 'expert',
        interactionStyle: 'researcher',
        communicationPreference: 'phone',
        preferredCategories: ['luxury_goods', 'jewelry', 'designer_clothing'],
        usageFrequency: 'monthly'
      },
      commercePattern: {
        activityFrequency: 'medium',
        contentTypes: ['orders', 'reviews'],
        transactionBehavior: {
          averageOrderValue: 'luxury',
          purchaseFrequency: 'planned',
          priceSensitivity: 'low'
        },
        engagementMetrics: {
          sessionDuration: 40,
          pagesPerSession: 8, // Focused browsing
          reviewLikelihood: 0.3,
          shareProducts: false // Values privacy
        }
      }
    };
  }

  /**
   * Generate marketplace administrator archetype
   */
  private generateMarketplaceAdminArchetype(): EcommerceUserArchetype {
    return {
      id: 'ecommerce_marketplace_admin',
      email: 'admin@marketplace.test',
      role: 'admin',
      name: 'David Marketplace-Admin',
      description: 'Platform administrator managing marketplace operations and merchant success',
      purpose: 'Marketplace administrator overseeing platform health and merchant relationships',
      contentPattern: {
        setupsPerUser: 1,
        itemsPerSetup: 100, // Oversees many products
        publicRatio: 0.8, // Platform-wide visibility
        preferredCategories: ['platform_management', 'merchant_relations', 'analytics', 'policy_enforcement']
      },
      platformContext: {
        architectures: ['team', 'hybrid'],
        domains: ['ecommerce'],
        weight: 0.8
      },
      profile: {
        namePattern: 'Marketplace Administrator',
        bioPattern: 'Strategic platform leader focused on marketplace growth and merchant success',
        imagePreferences: {
          style: 'professional',
          categories: ['business', 'technology', 'leadership']
        }
      },
      ecommercePreferences: {
        primaryActivities: ['platform_monitoring', 'merchant_support', 'policy_enforcement', 'analytics_review'],
        experienceLevel: 'professional',
        interactionStyle: 'seller', // Works with merchants
        communicationPreference: 'email',
        preferredCategories: ['all_categories'], // Platform-wide view
        usageFrequency: 'daily'
      },
      commercePattern: {
        activityFrequency: 'very_high',
        contentTypes: ['products', 'orders', 'listings'], // Administrative oversight
        transactionBehavior: {
          averageOrderValue: 'high', // Platform transactions
          purchaseFrequency: 'bulk',
          priceSensitivity: 'low'
        },
        engagementMetrics: {
          sessionDuration: 180, // Long administrative sessions
          pagesPerSession: 50,
          reviewLikelihood: 0.1, // Focused on administration
          shareProducts: false
        }
      },
      businessProfile: {
        businessType: 'enterprise',
        yearsInBusiness: 10,
        salesChannels: ['marketplace_platform'],
        targetSegments: ['merchants', 'customers', 'stakeholders'],
        businessGoals: ['platform_growth', 'merchant_satisfaction', 'user_experience']
      }
    };
  }

  /**
   * Generate customer service archetype
   */
  private generateCustomerServiceArchetype(): EcommerceUserArchetype {
    return {
      id: 'ecommerce_customer_service',
      email: 'support@marketplace.test',
      role: 'customer_service',
      name: 'Emma Customer-Support',
      description: 'Customer service representative helping customers and resolving issues',
      purpose: 'Customer service specialist focused on customer satisfaction and issue resolution',
      contentPattern: {
        setupsPerUser: 0,
        itemsPerSetup: 0,
        publicRatio: 0.1, // Internal focus
        preferredCategories: ['customer_support', 'issue_resolution', 'order_management']
      },
      platformContext: {
        architectures: ['team'],
        domains: ['ecommerce'],
        weight: 0.7
      },
      profile: {
        namePattern: 'Customer Support Specialist',
        bioPattern: 'Dedicated support professional focused on helping customers and solving problems',
        imagePreferences: {
          style: 'professional',
          categories: ['service', 'communication', 'support']
        }
      },
      ecommercePreferences: {
        primaryActivities: ['customer_assistance', 'issue_resolution', 'order_support', 'communication'],
        experienceLevel: 'expert',
        interactionStyle: 'seller', // Assists customers
        communicationPreference: 'chat',
        preferredCategories: ['customer_service', 'support_tools'],
        usageFrequency: 'daily'
      },
      commercePattern: {
        activityFrequency: 'very_high',
        contentTypes: ['orders', 'questions'], // Customer support focus
        transactionBehavior: {
          averageOrderValue: 'medium', // Handles various orders
          purchaseFrequency: 'planned',
          priceSensitivity: 'medium'
        },
        engagementMetrics: {
          sessionDuration: 60, // Full work sessions
          pagesPerSession: 25,
          reviewLikelihood: 0.1,
          shareProducts: false
        }
      }
    };
  }

  /**
   * Generate influencer buyer archetype
   */
  private generateInfluencerBuyerArchetype(): EcommerceUserArchetype {
    return {
      id: 'ecommerce_influencer_buyer',
      email: 'influencer@social.test',
      role: 'customer',
      name: 'Taylor Influencer-Buyer',
      description: 'Social media influencer who purchases products for content creation and reviews',
      purpose: 'Content creator who purchases products for social media content and authentic reviews',
      contentPattern: {
        setupsPerUser: 0,
        itemsPerSetup: 0,
        publicRatio: 0.9, // Very public presence
        preferredCategories: ['beauty', 'fashion', 'lifestyle', 'technology']
      },
      platformContext: {
        architectures: ['individual'],
        domains: ['ecommerce'],
        weight: 0.6
      },
      profile: {
        namePattern: 'Content Creator',
        bioPattern: 'Creative influencer who shares authentic product experiences with engaged audience',
        imagePreferences: {
          style: 'creative',
          categories: ['social', 'lifestyle', 'trendy']
        }
      },
      ecommercePreferences: {
        primaryActivities: ['content_creation', 'product_testing', 'trend_discovery', 'audience_engagement'],
        experienceLevel: 'expert',
        interactionStyle: 'quick_buyer',
        communicationPreference: 'self_service',
        preferredCategories: ['beauty', 'fashion', 'lifestyle'],
        usageFrequency: 'daily'
      },
      commercePattern: {
        activityFrequency: 'high',
        contentTypes: ['orders', 'reviews'],
        transactionBehavior: {
          averageOrderValue: 'medium',
          purchaseFrequency: 'impulse',
          priceSensitivity: 'medium'
        },
        engagementMetrics: {
          sessionDuration: 30,
          pagesPerSession: 15,
          reviewLikelihood: 0.9, // Very likely to review
          shareProducts: true
        }
      }
    };
  }

  /**
   * Generate B2B buyer archetype
   */
  private generateB2BBuyerArchetype(): EcommerceUserArchetype {
    return {
      id: 'ecommerce_b2b_buyer',
      email: 'procurement@company.test',
      role: 'customer',
      name: 'Richard B2B-Buyer',
      description: 'Business procurement specialist purchasing products for company use',
      purpose: 'Corporate buyer managing business purchases and vendor relationships',
      contentPattern: {
        setupsPerUser: 0,
        itemsPerSetup: 0,
        publicRatio: 0.1, // Business-focused, minimal public activity
        preferredCategories: ['office_supplies', 'electronics', 'industrial', 'software']
      },
      platformContext: {
        architectures: ['team'],
        domains: ['ecommerce'],
        weight: 0.7
      },
      profile: {
        namePattern: 'Corporate Buyer',
        bioPattern: 'Professional procurement specialist focused on business value and vendor relationships',
        imagePreferences: {
          style: 'professional',
          categories: ['business', 'corporate', 'procurement']
        }
      },
      ecommercePreferences: {
        primaryActivities: ['bulk_purchasing', 'vendor_evaluation', 'contract_negotiation', 'budget_management'],
        experienceLevel: 'professional',
        interactionStyle: 'bulk_purchaser',
        communicationPreference: 'email',
        preferredCategories: ['office_supplies', 'electronics', 'industrial'],
        usageFrequency: 'weekly'
      },
      commercePattern: {
        activityFrequency: 'medium',
        contentTypes: ['orders'],
        transactionBehavior: {
          averageOrderValue: 'high',
          purchaseFrequency: 'bulk',
          priceSensitivity: 'high'
        },
        engagementMetrics: {
          sessionDuration: 75, // Research-focused sessions
          pagesPerSession: 35,
          reviewLikelihood: 0.2, // Business-focused reviews
          shareProducts: false
        }
      },
      businessProfile: {
        businessType: 'enterprise',
        yearsInBusiness: 12,
        salesChannels: ['b2b_marketplace', 'direct_vendor'],
        targetSegments: ['internal_operations'],
        businessGoals: ['cost_optimization', 'vendor_consolidation', 'quality_assurance']
      }
    };
  }

  /**
   * Generate user preferences based on archetype and behavior patterns
   */
  generateUserPreferences(
    archetype: EcommerceUserArchetype
  ): {
    shoppingPreferences: string[];
    avoidedCategories: string[];
    communicationPreferences: string[];
    platformFeatures: string[];
    paymentMethods: string[];
  } {
    const preferences = {
      shoppingPreferences: [] as string[],
      avoidedCategories: [] as string[],
      communicationPreferences: [] as string[],
      platformFeatures: [] as string[],
      paymentMethods: [] as string[]
    };

    // Generate preferences based on archetype role and experience
    switch (archetype.role) {
      case 'merchant':
      case 'business_owner':
        preferences.shoppingPreferences = ['bulk_discounts', 'wholesale_pricing', 'inventory_management', 'analytics_tools'];
        preferences.avoidedCategories = ['competitor_products'];
        preferences.platformFeatures = ['seller_dashboard', 'inventory_tracking', 'order_management', 'customer_analytics'];
        preferences.paymentMethods = ['bank_transfer', 'stripe', 'paypal_business'];
        break;

      case 'customer':
        if (archetype.ecommercePreferences.experienceLevel === 'novice') {
          preferences.shoppingPreferences = ['easy_navigation', 'clear_descriptions', 'customer_reviews', 'return_policy'];
          preferences.platformFeatures = ['wish_lists', 'product_recommendations', 'easy_checkout'];
        } else {
          preferences.shoppingPreferences = ['advanced_search', 'price_comparison', 'bulk_options', 'loyalty_rewards'];
          preferences.platformFeatures = ['advanced_filters', 'price_alerts', 'order_history', 'quick_reorder'];
        }

        // Set payment methods based on transaction behavior
        if (archetype.commercePattern.transactionBehavior.averageOrderValue === 'luxury') {
          preferences.paymentMethods = ['premium_cards', 'financing_options', 'concierge_service'];
        } else {
          preferences.paymentMethods = ['credit_card', 'paypal', 'digital_wallets'];
        }
        break;

      case 'admin':
      case 'customer_service':
        preferences.shoppingPreferences = ['platform_stability', 'comprehensive_tools', 'reporting_features'];
        preferences.platformFeatures = ['admin_dashboard', 'user_management', 'analytics', 'support_tools'];
        preferences.paymentMethods = ['platform_integrated'];
        break;
    }

    // Add communication preferences
    switch (archetype.ecommercePreferences.communicationPreference) {
      case 'email':
        preferences.communicationPreferences = ['email_notifications', 'newsletters', 'order_updates'];
        break;
      case 'chat':
        preferences.communicationPreferences = ['live_chat', 'instant_messaging', 'quick_responses'];
        break;
      case 'phone':
        preferences.communicationPreferences = ['phone_support', 'callback_service', 'personal_assistance'];
        break;
      case 'self_service':
        preferences.communicationPreferences = ['help_center', 'faq', 'automated_responses'];
        break;
    }

    // Add category-specific avoidances based on price sensitivity
    if (archetype.commercePattern.transactionBehavior.priceSensitivity === 'very_high') {
      preferences.avoidedCategories.push('luxury_goods', 'premium_brands');
    }

    return preferences;
  }

  /**
   * Generate realistic shopping behaviors for testing
   */
  generateShoppingBehaviors(archetype: EcommerceUserArchetype): {
    sessionPatterns: any;
    purchasePatterns: any;
    reviewPatterns: any;
    engagementPatterns: any;
  } {
    return {
      sessionPatterns: {
        averageDuration: archetype.commercePattern.engagementMetrics.sessionDuration,
        pagesPerSession: archetype.commercePattern.engagementMetrics.pagesPerSession,
        frequency: archetype.ecommercePreferences.usageFrequency,
        preferredTimes: this.generatePreferredShoppingTimes(archetype)
      },
      purchasePatterns: {
        averageOrderValue: archetype.commercePattern.transactionBehavior.averageOrderValue,
        purchaseFrequency: archetype.commercePattern.transactionBehavior.purchaseFrequency,
        seasonality: this.generateSeasonalPatterns(archetype),
        categoryPreferences: archetype.ecommercePreferences.preferredCategories
      },
      reviewPatterns: {
        reviewLikelihood: archetype.commercePattern.engagementMetrics.reviewLikelihood,
        reviewLength: this.getReviewLength(archetype),
        includePhotos: this.getPhotoInclusion(archetype),
        helpfulnessRatio: this.getHelpfulnessRatio(archetype)
      },
      engagementPatterns: {
        sharesProducts: archetype.commercePattern.engagementMetrics.shareProducts,
        asksQuestions: this.getQuestionFrequency(archetype),
        followsBrands: this.getBrandFollowing(archetype),
        participatesInCommunity: this.getCommunityParticipation(archetype)
      }
    };
  }

  // Helper methods for behavior generation

  private generatePreferredShoppingTimes(archetype: EcommerceUserArchetype): string[] {
    if (archetype.role === 'customer') {
      return ['evenings', 'weekends'];
    } else if (archetype.role === 'merchant') {
      return ['business_hours', 'early_morning'];
    } else {
      return ['business_hours'];
    }
  }

  private generateSeasonalPatterns(archetype: EcommerceUserArchetype): Record<string, number> {
    // Returns multiplier for each season
    if (archetype.ecommercePreferences.preferredCategories.includes('clothing')) {
      return { spring: 1.2, summer: 0.8, fall: 1.5, winter: 1.3 };
    } else if (archetype.ecommercePreferences.preferredCategories.includes('electronics')) {
      return { spring: 1.0, summer: 0.9, fall: 1.1, winter: 1.4 }; // Holiday spike
    } else {
      return { spring: 1.0, summer: 1.0, fall: 1.0, winter: 1.1 };
    }
  }

  private getReviewLength(archetype: EcommerceUserArchetype): 'short' | 'medium' | 'long' {
    if (archetype.ecommercePreferences.experienceLevel === 'expert') {
      return 'long';
    } else if (archetype.ecommercePreferences.experienceLevel === 'intermediate') {
      return 'medium';
    } else {
      return 'short';
    }
  }

  private getPhotoInclusion(archetype: EcommerceUserArchetype): boolean {
    return archetype.commercePattern.engagementMetrics.shareProducts && 
           archetype.ecommercePreferences.experienceLevel !== 'novice';
  }

  private getHelpfulnessRatio(archetype: EcommerceUserArchetype): number {
    // Ratio of helpful vs not helpful votes on their reviews
    if (archetype.ecommercePreferences.experienceLevel === 'expert') {
      return 0.8; // 80% helpful
    } else if (archetype.ecommercePreferences.experienceLevel === 'intermediate') {
      return 0.6;
    } else {
      return 0.4;
    }
  }

  private getQuestionFrequency(archetype: EcommerceUserArchetype): 'low' | 'medium' | 'high' {
    if (archetype.ecommercePreferences.interactionStyle === 'researcher') {
      return 'high';
    } else if (archetype.ecommercePreferences.experienceLevel === 'novice') {
      return 'high';
    } else {
      return 'medium';
    }
  }

  private getBrandFollowing(archetype: EcommerceUserArchetype): boolean {
    return archetype.commercePattern.engagementMetrics.shareProducts &&
           archetype.ecommercePreferences.usageFrequency === 'daily';
  }

  private getCommunityParticipation(archetype: EcommerceUserArchetype): 'low' | 'medium' | 'high' {
    if (archetype.commercePattern.engagementMetrics.reviewLikelihood > 0.7) {
      return 'high';
    } else if (archetype.commercePattern.engagementMetrics.reviewLikelihood > 0.4) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}