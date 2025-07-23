export interface DomainConfig {
  name: string;
  description: string;
  
  // User generation
  usernameSuffixes: string[];
  bioTemplates: string[];
  activities?: string[];
  locations?: string[];
  
  // Categories for organizing data
  categories: Array<{
    name: string;
    description: string;
  }>;
  
  // Setup/Project types
  setupTypes: Record<string, string[]>;
  setupDescriptors: Record<string, string[]>;
  
  // Title and description generation
  titleDescriptors?: Record<string, string[]>;
  experiences?: string[];
  contexts?: string[];
  
  // Content generation
  contentPatterns?: {
    titles?: string[];
    descriptions?: string[];
  };
}

// Generic default configuration
export const GENERIC_DOMAIN: DomainConfig = {
  name: 'generic',
  description: 'Generic configuration for any type of project',
  
  usernameSuffixes: [
    'user', 'member', 'pro', 'plus', 'fan', 
    'creator', 'maker', 'builder', 'dev', 'admin'
  ],
  
  bioTemplates: [
    'Passionate {activity} enthusiast. Always learning and growing.',
    'Professional {activity} specialist. Love to share knowledge.',
    '{activity} expert from {location}. Building amazing things.',
    'Dedicated to {activity}. Based in {location}.',
  ],
  
  activities: [
    'technology', 'development', 'design', 'creation', 'innovation',
    'collaboration', 'learning', 'building', 'sharing', 'growing'
  ],
  
  locations: [
    'the city', 'downtown', 'the suburbs', 'remote', 'worldwide',
    'the office', 'home', 'the studio', 'the lab', 'the workshop'
  ],
  
  categories: [
    { name: 'Primary', description: 'Main category items' },
    { name: 'Secondary', description: 'Supporting items' },
    { name: 'Tools', description: 'Tools and utilities' },
    { name: 'Resources', description: 'Resources and materials' },
    { name: 'Documentation', description: 'Guides and documentation' },
  ],
  
  setupTypes: {
    'Project': [
      'Basic Setup',
      'Professional Setup', 
      'Enterprise Setup',
      'Custom Configuration',
      'Standard Package'
    ],
    'Collection': [
      'Starter Collection',
      'Essential Bundle',
      'Complete Set',
      'Premium Package',
      'Ultimate Collection'
    ]
  },
  
  setupDescriptors: {
    'Project': [
      'Essential', 'Professional', 'Complete', 'Custom', 'Standard',
      'Premium', 'Basic', 'Advanced', 'Enterprise', 'Starter'
    ],
    'Collection': [
      'Curated', 'Selected', 'Featured', 'Popular', 'Recommended',
      'Verified', 'Tested', 'Approved', 'Certified', 'Official'
    ]
  },
  
  titleDescriptors: {
    'Vehicle': [
      'Custom', 'Professional', 'Complete', 'Premium', 'Essential',
      'Advanced', 'Standard', 'Optimized', 'Versatile', 'Reliable'
    ],
    'Project': [
      'Essential', 'Professional', 'Complete', 'Custom', 'Standard',
      'Premium', 'Basic', 'Advanced', 'Enterprise', 'Starter'
    ],
    'General': [
      'Custom', 'Professional', 'Complete', 'Essential', 'Advanced',
      'Standard', 'Optimized', 'Versatile', 'Reliable', 'Premium'
    ]
  },
  
  experiences: [
    'after extensive testing',
    'refined through regular use',
    'proven through experience',
    'optimized for reliability',
    'developed through practice',
    'tested in various conditions'
  ],
  
  contexts: [
    'different environments', 'various situations', 'multiple contexts',
    'diverse conditions', 'real-world scenarios', 'practical applications'
  ]
};

// E-commerce domain example
export const ECOMMERCE_DOMAIN: DomainConfig = {
  name: 'ecommerce',
  description: 'E-commerce and online retail configuration',
  
  usernameSuffixes: [
    'shopper', 'buyer', 'seller', 'merchant', 'customer',
    'retailer', 'vendor', 'store', 'shop', 'boutique'
  ],
  
  bioTemplates: [
    'Passionate about {activity}. Love finding great deals!',
    'Professional {activity} expert. Helping others shop smart.',
    '{activity} enthusiast from {location}. Always hunting for the best products.',
    'Dedicated seller specializing in {activity}. Based in {location}.',
  ],
  
  activities: [
    'fashion', 'electronics', 'home decor', 'beauty', 'fitness',
    'books', 'toys', 'sports', 'crafts', 'gardening'
  ],
  
  locations: [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
    'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'
  ],
  
  categories: [
    { name: 'Electronics', description: 'Computers, phones, and gadgets' },
    { name: 'Fashion', description: 'Clothing, shoes, and accessories' },
    { name: 'Home & Garden', description: 'Furniture, decor, and outdoor' },
    { name: 'Beauty & Health', description: 'Cosmetics, skincare, and wellness' },
    { name: 'Sports & Outdoors', description: 'Fitness equipment and outdoor gear' },
  ],
  
  setupTypes: {
    'Store': [
      'Starter Shop',
      'Growing Business',
      'Established Store',
      'Enterprise Retailer',
      'Marketplace Vendor'
    ],
    'Product Line': [
      'Single Product',
      'Small Collection',
      'Full Catalog',
      'Multi-Brand Store',
      'Department Store'
    ]
  },
  
  setupDescriptors: {
    'Store': [
      'Trusted', 'Verified', 'Premium', 'Budget', 'Luxury',
      'Boutique', 'Wholesale', 'Retail', 'Online', 'Local'
    ],
    'Product Line': [
      'Bestselling', 'New', 'Featured', 'Sale', 'Limited',
      'Exclusive', 'Popular', 'Trending', 'Classic', 'Seasonal'
    ]
  }
};

// SaaS domain example
export const SAAS_DOMAIN: DomainConfig = {
  name: 'saas',
  description: 'Software as a Service configuration',
  
  usernameSuffixes: [
    'admin', 'user', 'dev', 'manager', 'team',
    'org', 'company', 'startup', 'enterprise', 'agency'
  ],
  
  bioTemplates: [
    'Building the future of {activity}. Join us on our journey!',
    'Helping teams excel at {activity}. Based in {location}.',
    '{activity} automation expert. Making work easier for everyone.',
    'SaaS enthusiast focused on {activity}. Proud to be from {location}.',
  ],
  
  activities: [
    'project management', 'team collaboration', 'data analytics', 'automation', 'communication',
    'sales', 'marketing', 'customer support', 'development', 'design'
  ],
  
  locations: [
    'San Francisco', 'Austin', 'Seattle', 'Boston', 'Denver',
    'Remote', 'NYC', 'London', 'Berlin', 'Toronto'
  ],
  
  categories: [
    { name: 'Productivity', description: 'Tools to boost productivity' },
    { name: 'Communication', description: 'Team communication and collaboration' },
    { name: 'Analytics', description: 'Data analysis and reporting' },
    { name: 'Automation', description: 'Workflow automation tools' },
    { name: 'Security', description: 'Security and compliance features' },
  ],
  
  setupTypes: {
    'Plan': [
      'Free Trial',
      'Starter Plan',
      'Professional Plan',
      'Team Plan',
      'Enterprise Plan'
    ],
    'Workspace': [
      'Personal Workspace',
      'Small Team',
      'Department',
      'Company Wide',
      'Multi-Tenant'
    ]
  },
  
  setupDescriptors: {
    'Plan': [
      'Popular', 'Recommended', 'Best Value', 'Most Features', 'Cost Effective',
      'Scalable', 'Flexible', 'Custom', 'Standard', 'Premium'
    ],
    'Workspace': [
      'Organized', 'Efficient', 'Collaborative', 'Secure', 'Integrated',
      'Automated', 'Customized', 'Optimized', 'Centralized', 'Streamlined'
    ]
  }
};