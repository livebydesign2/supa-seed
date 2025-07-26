/**
 * E-commerce Product and Inventory Generators for Marketplace Platforms
 * Advanced product catalog generation with realistic inventory management
 * Part of Task 3.4.2: Implement product catalog and inventory generators (FR-3.4)
 */

import { Logger } from '../../utils/logger';
import type { 
  EcommerceProduct, 
  EcommerceProductCategory, 
  ProductVariant,
  Address 
} from './ecommerce-extension';

/**
 * Product inventory tracking definition
 */
export interface ProductInventory {
  productId: string;
  sku: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  maxStock: number;
  lastRestocked: number;
  stockMovements: StockMovement[];
  locationStock: LocationStock[];
}

/**
 * Stock movement tracking
 */
export interface StockMovement {
  id: string;
  productId: string;
  type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'transfer';
  quantity: number;
  reason: string;
  timestamp: number;
  userId?: string;
  orderId?: string;
  notes?: string;
}

/**
 * Multi-location inventory tracking
 */
export interface LocationStock {
  locationId: string;
  locationName: string;
  quantity: number;
  reserved: number;
  available: number;
}

/**
 * Supplier information for inventory management
 */
export interface ProductSupplier {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  address: Address;
  leadTimeDays: number;
  minimumOrderQuantity: number;
  products: string[]; // Product IDs they supply
  rating: number;
  isActive: boolean;
}

/**
 * Advanced Product Catalog Generator
 * Creates realistic product data with proper categorization, variants, and pricing
 */
export class EcommerceProductGenerator {
  private productTemplates: Record<string, any[]> = {};
  private variantOptions: Record<string, Record<string, string[]>> = {};
  private pricingRules: Record<string, any> = {};

  constructor() {
    this.initializeProductTemplates();
    this.initializeVariantOptions();
    this.initializePricingRules();
  }

  /**
   * Generate a complete product catalog with realistic data
   */
  generateProductCatalog(
    categories: EcommerceProductCategory[],
    productsPerCategory: number = 5,
    brands: string[] = []
  ): EcommerceProduct[] {
    const products: EcommerceProduct[] = [];
    let productIndex = 1;

    categories.forEach(category => {
      for (let i = 0; i < productsPerCategory; i++) {
        const brand = brands.length > 0 ? 
          brands[Math.floor(Math.random() * brands.length)] : 
          this.generateRandomBrand(category.id);
        
        const product = this.generateProduct(category, brand, productIndex);
        products.push(product);
        productIndex++;
      }
    });

    Logger.info(`🛍️ Generated ${products.length} products across ${categories.length} categories`);
    return products;
  }

  /**
   * Generate a single product with complete data
   */
  generateProduct(
    category: EcommerceProductCategory,
    brand: string,
    index: number
  ): EcommerceProduct {
    const templates = this.productTemplates[category.id] || this.productTemplates['general'];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const basePrice = this.calculatePrice(category.id, brand);
    const cost = this.calculateCost(basePrice, category.id);
    const hasVariants = this.shouldHaveVariants(category.id);

    return {
      id: `product_${index}`,
      sku: this.generateSKU(brand, category.id, index),
      name: this.generateProductName(template, brand, category),
      description: this.generateProductDescription(template, category),
      category: category.id,
      brand,
      price: basePrice,
      compareAtPrice: this.generateCompareAtPrice(basePrice),
      cost,
      inventory: this.generateInventorySettings(category.id),
      variants: hasVariants ? this.generateProductVariants(category.id, basePrice, index) : [],
      images: this.generateProductImagePaths(category.id, index),
      tags: this.generateProductTags(category, brand, template),
      status: this.generateProductStatus(),
      seoTitle: this.generateSEOTitle(template.name, brand),
      seoDescription: this.generateSEODescription(template.description, category.name),
      weight: this.generateWeight(category.id),
      dimensions: this.generateDimensions(category.id)
    };
  }

  /**
   * Generate realistic product variants based on category
   */
  generateProductVariants(
    categoryId: string, 
    basePrice: number, 
    productIndex: number
  ): ProductVariant[] {
    const options = this.variantOptions[categoryId] || this.variantOptions['general'];
    const variants: ProductVariant[] = [];
    
    // Generate combinations of variant options
    const optionKeys = Object.keys(options);
    const maxVariants = Math.min(8, Math.max(2, Math.floor(Math.random() * 6) + 1)); // 2-8 variants
    
    for (let i = 0; i < maxVariants; i++) {
      const variantOptions: Record<string, string> = {};
      let variantTitle = '';
      
      optionKeys.forEach(optionKey => {
        const values = options[optionKey];
        const value = values[i % values.length];
        variantOptions[optionKey] = value;
        variantTitle += variantTitle ? ` / ${value}` : value;
      });

      variants.push({
        id: `variant_${productIndex}_${i + 1}`,
        productId: `product_${productIndex}`,
        title: variantTitle,
        price: this.calculateVariantPrice(basePrice, variantOptions),
        compareAtPrice: Math.random() > 0.8 ? basePrice * 1.15 : undefined,
        sku: this.generateVariantSKU(productIndex, i + 1),
        inventory: Math.floor(Math.random() * 100) + 10,
        options: variantOptions,
        image: `/products/category_${categoryId}/variant_${i + 1}.jpg`,
        weight: this.generateVariantWeight(categoryId)
      });
    }

    return variants;
  }

  /**
   * Generate comprehensive inventory data for a product
   */
  generateProductInventory(product: EcommerceProduct): ProductInventory {
    const currentStock = product.inventory.quantity;
    const reservedStock = Math.floor(currentStock * 0.1); // 10% reserved
    const availableStock = currentStock - reservedStock;

    return {
      productId: product.id,
      sku: product.sku,
      currentStock,
      reservedStock,
      availableStock,
      reorderPoint: product.inventory.lowStockThreshold,
      maxStock: currentStock * 2,
      lastRestocked: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000), // Within 30 days
      stockMovements: this.generateStockMovements(product.id, currentStock),
      locationStock: this.generateLocationStock(currentStock)
    };
  }

  /**
   * Generate realistic stock movement history
   */
  private generateStockMovements(productId: string, currentStock: number): StockMovement[] {
    const movements: StockMovement[] = [];
    const movementCount = Math.floor(Math.random() * 10) + 5; // 5-15 movements
    
    for (let i = 0; i < movementCount; i++) {
      const type = this.getRandomStockMovementType();
      const quantity = this.getStockMovementQuantity(type, currentStock);
      
      movements.push({
        id: `movement_${i + 1}`,
        productId,
        type,
        quantity,
        reason: this.getStockMovementReason(type),
        timestamp: Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000), // Within 90 days
        userId: Math.random() > 0.5 ? `user_${Math.floor(Math.random() * 5) + 1}` : undefined,
        orderId: type === 'sale' ? `order_${Math.floor(Math.random() * 100) + 1}` : undefined,
        notes: Math.random() > 0.7 ? this.generateMovementNotes(type) : undefined
      });
    }

    // Sort by timestamp (newest first)
    return movements.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate multi-location inventory distribution
   */
  private generateLocationStock(totalStock: number): LocationStock[] {
    const locations = [
      { id: 'warehouse_main', name: 'Main Warehouse' },
      { id: 'warehouse_east', name: 'East Coast Warehouse' },
      { id: 'warehouse_west', name: 'West Coast Warehouse' },
      { id: 'store_flagship', name: 'Flagship Store' },
      { id: 'store_outlet', name: 'Outlet Store' }
    ];

    const locationStock: LocationStock[] = [];
    let remainingStock = totalStock;

    locations.forEach((location, index) => {
      if (index === locations.length - 1) {
        // Last location gets all remaining stock
        const quantity = remainingStock;
        const reserved = Math.floor(quantity * 0.1);
        
        locationStock.push({
          locationId: location.id,
          locationName: location.name,
          quantity,
          reserved,
          available: quantity - reserved
        });
      } else {
        // Distribute stock across locations
        const maxAllocation = Math.floor(remainingStock * 0.6); // Max 60% per location
        const quantity = Math.floor(Math.random() * maxAllocation) + 1;
        const reserved = Math.floor(quantity * 0.1);
        
        locationStock.push({
          locationId: location.id,
          locationName: location.name,
          quantity,
          reserved,
          available: quantity - reserved
        });
        
        remainingStock -= quantity;
      }
    });

    // Only return locations that have stock
    return locationStock.filter(loc => loc.quantity > 0);
  }

  /**
   * Generate supplier information for products
   */
  generateProductSuppliers(productCount: number): ProductSupplier[] {
    const suppliers: ProductSupplier[] = [];
    const supplierNames = [
      'Global Manufacturing Co.',
      'Premium Supply Solutions',
      'Elite Product Distributors',
      'Worldwide Wholesale Ltd.',
      'Quality Source Industries',
      'Direct Import Partners',
      'Bulk Supply Specialists',
      'International Trade Group'
    ];

    const supplierCount = Math.min(productCount / 3, supplierNames.length); // ~3 products per supplier

    for (let i = 0; i < supplierCount; i++) {
      suppliers.push({
        id: `supplier_${i + 1}`,
        name: supplierNames[i],
        contactEmail: `contact@${supplierNames[i].toLowerCase().replace(/[^a-z]/g, '')}.com`,
        contactPhone: this.generatePhoneNumber(),
        address: this.generateSupplierAddress(),
        leadTimeDays: Math.floor(Math.random() * 21) + 7, // 7-28 days
        minimumOrderQuantity: Math.floor(Math.random() * 50) + 10, // 10-60 units
        products: this.assignProductsToSupplier(productCount, i, supplierCount),
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0 rating
        isActive: Math.random() > 0.1 // 90% active
      });
    }

    return suppliers;
  }

  // Private helper methods

  private initializeProductTemplates(): void {
    this.productTemplates = {
      electronics: [
        { name: 'Wireless Headphones', description: 'High-quality wireless audio experience' },
        { name: 'Smart Watch', description: 'Advanced fitness and connectivity features' },
        { name: 'Bluetooth Speaker', description: 'Portable audio with premium sound quality' },
        { name: 'Laptop Computer', description: 'High-performance computing for work and play' },
        { name: 'Smartphone', description: 'Latest technology in mobile communication' }
      ],
      clothing: [
        { name: 'Cotton T-Shirt', description: 'Comfortable everyday wear' },
        { name: 'Denim Jeans', description: 'Classic style with modern fit' },
        { name: 'Running Shoes', description: 'Performance footwear for active lifestyles' },
        { name: 'Winter Jacket', description: 'Warm and stylish cold weather protection' },
        { name: 'Summer Dress', description: 'Light and breezy for warm weather' }
      ],
      home_garden: [
        { name: 'Coffee Maker', description: 'Brew perfect coffee every time' },
        { name: 'Garden Tool Set', description: 'Complete tools for garden maintenance' },
        { name: 'LED Desk Lamp', description: 'Adjustable lighting for work and study' },
        { name: 'Storage Container', description: 'Organize your space efficiently' },
        { name: 'Plant Pot', description: 'Beautiful containers for your green friends' }
      ],
      sports_outdoors: [
        { name: 'Yoga Mat', description: 'Non-slip surface for comfortable practice' },
        { name: 'Camping Tent', description: 'Weather-resistant shelter for outdoor adventures' },
        { name: 'Bicycle Helmet', description: 'Safety and comfort for cycling' },
        { name: 'Water Bottle', description: 'Insulated hydration for active lifestyles' },
        { name: 'Hiking Backpack', description: 'Durable storage for outdoor expeditions' }
      ],
      books_media: [
        { name: 'Programming Guide', description: 'Complete handbook for developers' },
        { name: 'Cookbook Collection', description: 'Recipes from around the world' },
        { name: 'Art Photography Book', description: 'Stunning visual collection' },
        { name: 'Music Album', description: 'Latest tracks from popular artists' },
        { name: 'Educational Course', description: 'Learn new skills at your own pace' }
      ],
      general: [
        { name: 'Premium Product', description: 'High-quality item for discerning customers' },
        { name: 'Essential Item', description: 'Must-have product for everyday use' },
        { name: 'Specialty Product', description: 'Unique offering for specific needs' }
      ]
    };
  }

  private initializeVariantOptions(): void {
    this.variantOptions = {
      electronics: {
        color: ['Black', 'White', 'Silver', 'Space Gray', 'Rose Gold'],
        storage: ['32GB', '64GB', '128GB', '256GB', '512GB'],
        size: ['Small', 'Medium', 'Large']
      },
      clothing: {
        size: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        color: ['Black', 'White', 'Navy', 'Gray', 'Red', 'Blue'],
        fit: ['Regular', 'Slim', 'Relaxed']
      },
      home_garden: {
        color: ['White', 'Black', 'Natural', 'Gray', 'Brown'],
        size: ['Small', 'Medium', 'Large', 'Extra Large'],
        material: ['Wood', 'Metal', 'Plastic', 'Ceramic']
      },
      sports_outdoors: {
        size: ['S', 'M', 'L', 'XL'],
        color: ['Black', 'Red', 'Blue', 'Green', 'Orange'],
        type: ['Standard', 'Pro', 'Elite']
      },
      books_media: {
        format: ['Paperback', 'Hardcover', 'Digital', 'Audio'],
        language: ['English', 'Spanish', 'French', 'German'],
        edition: ['Standard', 'Deluxe', 'Collector']
      },
      general: {
        type: ['Standard', 'Premium', 'Deluxe'],
        color: ['Black', 'White', 'Gray'],
        size: ['Small', 'Medium', 'Large']
      }
    };
  }

  private initializePricingRules(): void {
    this.pricingRules = {
      electronics: { min: 50, max: 2000, markup: 0.4 },
      clothing: { min: 15, max: 300, markup: 0.6 },
      home_garden: { min: 25, max: 800, markup: 0.5 },
      sports_outdoors: { min: 30, max: 500, markup: 0.45 },
      books_media: { min: 10, max: 80, markup: 0.3 },
      general: { min: 20, max: 200, markup: 0.5 }
    };
  }

  private generateRandomBrand(categoryId: string): string {
    const brands: Record<string, string[]> = {
      electronics: ['TechPro', 'EliteTech', 'SmartGear', 'DigitalMax', 'InnovatePlus'],
      clothing: ['StyleCo', 'FashionFirst', 'TrendWear', 'ComfortFit', 'ModernStyle'],
      home_garden: ['HomeEssentials', 'GardenPro', 'LifeStyle', 'QualityHome', 'NatureLiving'],
      sports_outdoors: ['ActiveGear', 'SportsPro', 'OutdoorMax', 'FitLife', 'AdventurePlus'],
      books_media: ['KnowledgeHub', 'MediaPro', 'LearnMore', 'ContentPlus', 'WisdomWorks']
    };

    const categoryBrands = brands[categoryId] || brands['electronics'];
    return categoryBrands[Math.floor(Math.random() * categoryBrands.length)];
  }

  private calculatePrice(categoryId: string, brand: string): number {
    const rules = this.pricingRules[categoryId] || this.pricingRules['general'];
    const basePrice = Math.random() * (rules.max - rules.min) + rules.min;
    
    // Brand premium (some brands cost more)
    const brandMultiplier = brand.includes('Pro') || brand.includes('Elite') ? 1.2 : 1.0;
    
    return Math.round(basePrice * brandMultiplier * 100) / 100;
  }

  private calculateCost(price: number, categoryId: string): number {
    const rules = this.pricingRules[categoryId] || this.pricingRules['general'];
    const costRatio = 1 - rules.markup; // If markup is 0.4, cost ratio is 0.6
    return Math.round(price * costRatio * 100) / 100;
  }

  private shouldHaveVariants(categoryId: string): boolean {
    const variantProbability: Record<string, number> = {
      electronics: 0.8,
      clothing: 0.95,
      home_garden: 0.6,
      sports_outdoors: 0.7,
      books_media: 0.5
    };

    return Math.random() < (variantProbability[categoryId] || 0.6);
  }

  private generateSKU(brand: string, categoryId: string, index: number): string {
    const brandCode = brand.slice(0, 3).toUpperCase();
    const categoryCode = categoryId.slice(0, 3).toUpperCase();
    const productNumber = String(index).padStart(4, '0');
    return `${brandCode}-${categoryCode}-${productNumber}`;
  }

  private generateProductName(template: any, brand: string, category: EcommerceProductCategory): string {
    return `${brand} ${template.name}`;
  }

  private generateProductDescription(template: any, category: EcommerceProductCategory): string {
    return `${template.description}. ${category.description}. Perfect for customers looking for quality and reliability.`;
  }

  private generateCompareAtPrice(basePrice: number): number | undefined {
    // 30% chance of having a compare-at price (indicating a sale)
    if (Math.random() > 0.7) {
      return Math.round(basePrice * (1.1 + Math.random() * 0.3) * 100) / 100; // 10-40% higher
    }
    return undefined;
  }

  private generateInventorySettings(categoryId: string) {
    const baseQuantity = Math.floor(Math.random() * 100) + 20; // 20-120 units
    
    return {
      quantity: baseQuantity,
      trackInventory: true,
      allowBackorders: Math.random() > 0.8, // 20% allow backorders
      lowStockThreshold: Math.floor(baseQuantity * 0.1) + 5 // 10% of stock + 5
    };
  }

  private generateProductImagePaths(categoryId: string, index: number): string[] {
    const imageCount = Math.floor(Math.random() * 5) + 1; // 1-5 images
    const images: string[] = [];
    
    for (let i = 0; i < imageCount; i++) {
      images.push(`/products/${categoryId}/product_${index}_${i + 1}.jpg`);
    }
    
    return images;
  }

  private generateProductTags(category: EcommerceProductCategory, brand: string, template: any): string[] {
    const tags = [...category.tags, brand.toLowerCase()];
    
    // Add template-specific tags
    if (template.name.toLowerCase().includes('premium') || template.name.toLowerCase().includes('pro')) {
      tags.push('premium');
    }
    if (template.name.toLowerCase().includes('smart') || template.name.toLowerCase().includes('digital')) {
      tags.push('smart', 'digital');
    }
    
    return tags;
  }

  private generateProductStatus(): EcommerceProduct['status'] {
    const statuses: EcommerceProduct['status'][] = ['active', 'draft', 'archived'];
    const weights = [0.85, 0.1, 0.05]; // 85% active, 10% draft, 5% archived
    
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return statuses[i];
      }
    }
    
    return 'active';
  }

  private generateSEOTitle(productName: string, brand: string): string {
    return `${productName} | ${brand} | Premium Quality Products`;
  }

  private generateSEODescription(description: string, categoryName: string): string {
    return `${description} Shop our ${categoryName.toLowerCase()} collection with fast shipping and excellent customer service.`;
  }

  private generateWeight(categoryId: string): number {
    const weightRanges: Record<string, [number, number]> = {
      electronics: [0.2, 5.0],
      clothing: [0.1, 2.0],
      home_garden: [0.5, 15.0],
      sports_outdoors: [0.3, 10.0],
      books_media: [0.1, 2.0]
    };

    const [min, max] = weightRanges[categoryId] || [0.5, 3.0];
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }

  private generateDimensions(categoryId: string) {
    const dimensionRanges: Record<string, { length: [number, number], width: [number, number], height: [number, number] }> = {
      electronics: { length: [5, 50], width: [5, 40], height: [2, 20] },
      clothing: { length: [20, 80], width: [15, 60], height: [1, 10] },
      home_garden: { length: [10, 200], width: [10, 150], height: [5, 100] },
      sports_outdoors: { length: [20, 200], width: [10, 100], height: [5, 50] },
      books_media: { length: [10, 30], width: [8, 25], height: [1, 8] }
    };

    const ranges = dimensionRanges[categoryId] || dimensionRanges['electronics'];
    
    return {
      length: Math.floor(Math.random() * (ranges.length[1] - ranges.length[0]) + ranges.length[0]),
      width: Math.floor(Math.random() * (ranges.width[1] - ranges.width[0]) + ranges.width[0]),
      height: Math.floor(Math.random() * (ranges.height[1] - ranges.height[0]) + ranges.height[0])
    };
  }

  private calculateVariantPrice(basePrice: number, options: Record<string, string>): number {
    let priceModifier = 1.0;
    
    // Adjust price based on variant options
    Object.entries(options).forEach(([key, value]) => {
      if (key === 'size' && ['XL', 'XXL', 'Large', 'Extra Large'].includes(value)) {
        priceModifier += 0.1; // 10% more for larger sizes
      }
      if (key === 'storage' && ['256GB', '512GB'].includes(value)) {
        priceModifier += 0.2; // 20% more for higher storage
      }
      if (key === 'type' && ['Pro', 'Elite', 'Premium'].includes(value)) {
        priceModifier += 0.15; // 15% more for premium variants
      }
    });
    
    return Math.round(basePrice * priceModifier * 100) / 100;
  }

  private generateVariantSKU(productIndex: number, variantIndex: number): string {
    return `VAR-${String(productIndex).padStart(4, '0')}-${String(variantIndex).padStart(2, '0')}`;
  }

  private generateVariantWeight(categoryId: string): number {
    const baseWeight = this.generateWeight(categoryId);
    // Variants might have slightly different weights
    const modifier = 0.8 + (Math.random() * 0.4); // 80-120% of base weight
    return Math.round(baseWeight * modifier * 100) / 100;
  }

  private getRandomStockMovementType(): StockMovement['type'] {
    const types: StockMovement['type'][] = ['purchase', 'sale', 'return', 'adjustment', 'transfer'];
    const weights = [0.2, 0.5, 0.1, 0.1, 0.1]; // Sales are most common
    
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < types.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return types[i];
      }
    }
    
    return 'sale';
  }

  private getStockMovementQuantity(type: StockMovement['type'], currentStock: number): number {
    const maxQuantity = Math.max(1, Math.floor(currentStock * 0.2)); // Max 20% of current stock
    
    switch (type) {
      case 'purchase':
        return Math.floor(Math.random() * maxQuantity * 2) + 10; // Larger purchases
      case 'sale':
        return Math.floor(Math.random() * Math.min(maxQuantity, 10)) + 1; // 1-10 units
      case 'return':
        return Math.floor(Math.random() * 5) + 1; // 1-5 units
      case 'adjustment':
        return Math.floor(Math.random() * 10) - 5; // -5 to +5 adjustment
      case 'transfer':
        return Math.floor(Math.random() * maxQuantity) + 1;
      default:
        return 1;
    }
  }

  private getStockMovementReason(type: StockMovement['type']): string {
    const reasons: Record<StockMovement['type'], string[]> = {
      purchase: ['Supplier delivery', 'Restock order', 'Bulk purchase', 'Vendor shipment'],
      sale: ['Customer order', 'In-store purchase', 'Online sale', 'Wholesale order'],
      return: ['Customer return', 'Defective item', 'Wrong size', 'Changed mind'],
      adjustment: ['Inventory count', 'Damaged goods', 'Quality control', 'System correction'],
      transfer: ['Location transfer', 'Warehouse move', 'Store restock', 'Distribution']
    };

    const typeReasons = reasons[type] || ['General movement'];
    return typeReasons[Math.floor(Math.random() * typeReasons.length)];
  }

  private generateMovementNotes(type: StockMovement['type']): string {
    const notes: Record<StockMovement['type'], string[]> = {
      purchase: ['Received in good condition', 'Partial delivery', 'Express shipping'],
      sale: ['Standard shipping', 'Express delivery', 'Store pickup'],
      return: ['Processed refund', 'Store credit issued', 'Exchange processed'],
      adjustment: ['Physical count completed', 'Damaged items removed', 'System sync'],
      transfer: ['Moved to main warehouse', 'Allocated to store', 'Distribution complete']
    };

    const typeNotes = notes[type] || ['Standard processing'];
    return typeNotes[Math.floor(Math.random() * typeNotes.length)];
  }

  private generatePhoneNumber(): string {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const exchange = Math.floor(Math.random() * 900) + 100;
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `+1-${areaCode}-${exchange}-${number}`;
  }

  private generateSupplierAddress(): Address {
    const addresses = [
      {
        firstName: 'Supplier',
        lastName: 'Contact',
        company: 'Manufacturing Corp',
        address1: '1000 Industrial Blvd',
        city: 'Manufacturing City',
        province: 'CA',
        country: 'United States',
        zip: '90001',
        phone: '+1-555-0100'
      },
      {
        firstName: 'Global',
        lastName: 'Supplier',
        company: 'International Trading',
        address1: '500 Trade Center Dr',
        city: 'Commerce Hub',
        province: 'TX',
        country: 'United States',
        zip: '75001',
        phone: '+1-555-0200'
      }
    ];

    return addresses[Math.floor(Math.random() * addresses.length)];
  }

  private assignProductsToSupplier(totalProducts: number, supplierIndex: number, totalSuppliers: number): string[] {
    const productsPerSupplier = Math.ceil(totalProducts / totalSuppliers);
    const startIndex = supplierIndex * productsPerSupplier + 1;
    const endIndex = Math.min(startIndex + productsPerSupplier - 1, totalProducts);
    
    const productIds: string[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      productIds.push(`product_${i}`);
    }
    
    return productIds;
  }
}

/**
 * Advanced Inventory Management System
 * Handles stock tracking, movements, and multi-location inventory
 */
export class EcommerceInventoryManager {
  private stockMovements: StockMovement[] = [];
  private inventoryCache: Map<string, ProductInventory> = new Map();

  /**
   * Generate complete inventory system for products
   */
  generateInventorySystem(products: EcommerceProduct[]): {
    inventories: ProductInventory[];
    suppliers: ProductSupplier[];
    stockMovements: StockMovement[];
  } {
    const generator = new EcommerceProductGenerator();
    const inventories: ProductInventory[] = [];
    
    products.forEach(product => {
      const inventory = generator.generateProductInventory(product);
      inventories.push(inventory);
      this.inventoryCache.set(product.id, inventory);
      this.stockMovements.push(...inventory.stockMovements);
    });

    const suppliers = generator.generateProductSuppliers(products.length);

    Logger.info(`📦 Generated inventory system: ${inventories.length} products, ${suppliers.length} suppliers`);

    return {
      inventories,
      suppliers,
      stockMovements: this.stockMovements
    };
  }

  /**
   * Get inventory for a specific product
   */
  getProductInventory(productId: string): ProductInventory | undefined {
    return this.inventoryCache.get(productId);
  }

  /**
   * Update inventory levels (simulate stock changes)
   */
  updateInventory(productId: string, quantity: number, type: StockMovement['type'], reason: string): boolean {
    const inventory = this.inventoryCache.get(productId);
    if (!inventory) return false;

    const movement: StockMovement = {
      id: `movement_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      productId,
      type,
      quantity,
      reason,
      timestamp: Date.now()
    };

    // Update stock levels
    if (type === 'sale' || type === 'transfer') {
      inventory.currentStock -= Math.abs(quantity);
      inventory.availableStock = inventory.currentStock - inventory.reservedStock;
    } else if (type === 'purchase' || type === 'return') {
      inventory.currentStock += Math.abs(quantity);
      inventory.availableStock = inventory.currentStock - inventory.reservedStock;
    }

    // Ensure stock doesn't go negative
    inventory.currentStock = Math.max(0, inventory.currentStock);
    inventory.availableStock = Math.max(0, inventory.availableStock);

    // Add movement to history
    inventory.stockMovements.unshift(movement);
    this.stockMovements.unshift(movement);

    return true;
  }

  /**
   * Get low stock products
   */
  getLowStockProducts(): ProductInventory[] {
    return Array.from(this.inventoryCache.values())
      .filter(inventory => inventory.currentStock <= inventory.reorderPoint);
  }

  /**
   * Get inventory summary statistics
   */
  getInventorySummary(): {
    totalProducts: number;
    totalStock: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  } {
    const inventories = Array.from(this.inventoryCache.values());
    
    return {
      totalProducts: inventories.length,
      totalStock: inventories.reduce((sum, inv) => sum + inv.currentStock, 0),
      totalValue: 0, // Would need product costs to calculate
      lowStockCount: inventories.filter(inv => inv.currentStock <= inv.reorderPoint).length,
      outOfStockCount: inventories.filter(inv => inv.currentStock === 0).length
    };
  }
}