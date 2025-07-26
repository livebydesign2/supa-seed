/**
 * E-commerce Order and Transaction Generators for Marketplace Platforms
 * Advanced order management with realistic transaction patterns and customer behaviors
 * Part of Task 3.4.3: Create order and transaction history generators (FR-3.4)
 */

import { Logger } from '../../utils/logger';
import type { 
  EcommerceOrder, 
  OrderItem, 
  Address, 
  ShoppingCart, 
  CartItem,
  EcommerceProduct 
} from './ecommerce-extension';

/**
 * Payment transaction definition
 */
export interface PaymentTransaction {
  id: string;
  orderId: string;
  customerId: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  transactionId: string;
  processorResponse: string;
  fees: {
    processingFee: number;
    transactionFee: number;
    totalFees: number;
  };
  billingAddress: Address;
  paymentDetails: PaymentDetails;
  createdAt: number;
  processedAt?: number;
  failureReason?: string;
  refundAmount?: number;
  refundedAt?: number;
}

/**
 * Payment method details
 */
export interface PaymentDetails {
  type: 'credit_card' | 'debit_card' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank_transfer';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  holderName?: string;
  paypalEmail?: string;
  bankName?: string;
  accountLast4?: string;
}

/**
 * Order fulfillment tracking
 */
export interface OrderFulfillment {
  id: string;
  orderId: string;
  status: 'unfulfilled' | 'partial' | 'fulfilled';
  trackingNumber?: string;
  carrier: string;
  shippingMethod: string;
  estimatedDelivery?: number;
  actualDelivery?: number;
  shippingCost: number;
  items: FulfillmentItem[];
  shipmentAddress: Address;
  notes?: string;
  createdAt: number;
  shippedAt?: number;
  deliveredAt?: number;
}

/**
 * Individual fulfillment item
 */
export interface FulfillmentItem {
  orderItemId: string;
  productId: string;
  quantity: number;
  status: 'pending' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  trackingDetails?: string;
}

/**
 * Customer refund request
 */
export interface RefundRequest {
  id: string;
  orderId: string;
  customerId: string;
  items: RefundItem[];
  reason: string;
  customerComments?: string;
  requestedAmount: number;
  approvedAmount?: number;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'denied';
  adminNotes?: string;
  createdAt: number;
  processedAt?: number;
  refundMethod: string;
}

/**
 * Refund item details
 */
export interface RefundItem {
  orderItemId: string;
  productId: string;
  quantity: number;
  reason: string;
  condition: 'new' | 'opened' | 'damaged' | 'defective';
  refundAmount: number;
}

/**
 * Customer review and rating
 */
export interface ProductReview {
  id: string;
  productId: string;
  customerId: string;
  orderId?: string;
  rating: number; // 1-5 stars
  title: string;
  review: string;
  pros?: string[];
  cons?: string[];
  verified: boolean;
  helpful: number;
  notHelpful: number;
  images?: string[];
  status: 'pending' | 'approved' | 'rejected';
  moderatorNotes?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Discount and coupon system
 */
export interface DiscountCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minimumOrder?: number;
  maximumDiscount?: number;
  usageLimit: number;
  usedCount: number;
  validFrom: number;
  validUntil: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  isActive: boolean;
  description: string;
}

/**
 * Advanced Order Generator
 * Creates realistic order patterns with proper transaction flows
 */
export class EcommerceOrderGenerator {
  private orderTemplates: any[] = [];
  private customerBehaviors: any[] = [];
  private shippingMethods: any[] = [];
  private paymentMethods: any[] = [];

  constructor() {
    this.initializeOrderData();
  }

  /**
   * Generate comprehensive order history with transactions
   */
  generateOrderHistory(
    products: EcommerceProduct[],
    customerCount: number = 10,
    orderCount: number = 50
  ): {
    orders: EcommerceOrder[];
    transactions: PaymentTransaction[];
    fulfillments: OrderFulfillment[];
    reviews: ProductReview[];
    refunds: RefundRequest[];
  } {
    const orders: EcommerceOrder[] = [];
    const transactions: PaymentTransaction[] = [];
    const fulfillments: OrderFulfillment[] = [];
    const reviews: ProductReview[] = [];
    const refunds: RefundRequest[] = [];

    // Generate orders
    for (let i = 0; i < orderCount; i++) {
      const order = this.generateOrder(products, customerCount, i + 1);
      orders.push(order);

      // Generate payment transaction for order
      const transaction = this.generatePaymentTransaction(order);
      transactions.push(transaction);

      // Generate fulfillment (if order is paid and not cancelled)
      if (['paid', 'partially_paid'].includes(order.financialStatus) && order.status !== 'cancelled') {
        const fulfillment = this.generateOrderFulfillment(order);
        fulfillments.push(fulfillment);
      }

      // Generate reviews (30% chance for delivered orders)
      if (order.status === 'delivered' && Math.random() < 0.3) {
        const review = this.generateProductReview(order, products);
        reviews.push(review);
      }

      // Generate refund requests (5% chance)
      if (['delivered', 'shipped'].includes(order.status) && Math.random() < 0.05) {
        const refund = this.generateRefundRequest(order);
        refunds.push(refund);
      }
    }

    Logger.info(`📋 Generated order history: ${orders.length} orders, ${transactions.length} transactions, ${fulfillments.length} fulfillments`);

    return {
      orders,
      transactions,
      fulfillments,
      reviews,
      refunds
    };
  }

  /**
   * Generate a single order with realistic data
   */
  generateOrder(products: EcommerceProduct[], customerCount: number, index: number): EcommerceOrder {
    const customerId = `customer_${Math.floor(Math.random() * customerCount) + 1}`;
    const currency = this.getRandomCurrency();
    const paymentMethod = this.getRandomPaymentMethod();
    
    // Generate order items (1-5 items per order)
    const itemCount = Math.floor(Math.random() * 5) + 1;
    const items = this.generateOrderItems(products, itemCount);
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = this.calculateTax(subtotal);
    const shipping = this.calculateShipping(subtotal, items);
    const discount = this.applyDiscount(subtotal);
    const total = subtotal + tax + shipping - discount;

    // Generate order status based on realistic patterns
    const status = this.generateOrderStatus();
    const financialStatus = this.generateFinancialStatus(status);
    const fulfillmentStatus = this.generateFulfillmentStatus(status);

    return {
      id: `order_${index}`,
      orderNumber: this.generateOrderNumber(index),
      customerId,
      email: `${customerId}@example.com`,
      status,
      financialStatus,
      fulfillmentStatus,
      currency,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100,
      items,
      shippingAddress: this.generateRandomAddress(),
      billingAddress: this.generateRandomAddress(),
      paymentMethod,
      createdAt: this.generateRealisticOrderDate(),
      updatedAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
      notes: this.generateOrderNotes()
    };
  }

  /**
   * Generate payment transaction for an order
   */
  generatePaymentTransaction(order: EcommerceOrder): PaymentTransaction {
    const processingFee = order.total * 0.029; // 2.9% processing fee
    const transactionFee = 0.30; // $0.30 transaction fee
    const totalFees = processingFee + transactionFee;

    const status = this.generateTransactionStatus(order.financialStatus);
    
    return {
      id: `txn_${Math.random().toString(36).substring(2, 15)}`,
      orderId: order.id,
      customerId: order.customerId,
      paymentMethod: order.paymentMethod,
      amount: order.total,
      currency: order.currency,
      status,
      transactionId: this.generateTransactionId(),
      processorResponse: this.generateProcessorResponse(status),
      fees: {
        processingFee: Math.round(processingFee * 100) / 100,
        transactionFee,
        totalFees: Math.round(totalFees * 100) / 100
      },
      billingAddress: order.billingAddress,
      paymentDetails: this.generatePaymentDetails(order.paymentMethod),
      createdAt: order.createdAt,
      processedAt: status !== 'pending' ? order.createdAt + Math.floor(Math.random() * 3600000) : undefined, // Within 1 hour
      failureReason: status === 'failed' ? this.generateFailureReason() : undefined,
      refundAmount: status === 'refunded' ? order.total : undefined,
      refundedAt: status === 'refunded' ? Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined
    };
  }

  /**
   * Generate order fulfillment information
   */
  generateOrderFulfillment(order: EcommerceOrder): OrderFulfillment {
    const carrier = this.getRandomCarrier();
    const shippingMethod = this.getRandomShippingMethod();
    const trackingNumber = this.generateTrackingNumber(carrier);
    
    const estimatedDelivery = order.createdAt + this.getDeliveryTime(shippingMethod);
    const actualDelivery = order.status === 'delivered' ? 
      estimatedDelivery + Math.floor(Math.random() * 2 * 24 * 60 * 60 * 1000) - 24 * 60 * 60 * 1000 : // ±1 day
      undefined;

    const items: FulfillmentItem[] = order.items.map(item => ({
      orderItemId: item.id,
      productId: item.productId,
      quantity: item.quantity,
      status: this.getFulfillmentItemStatus(order.fulfillmentStatus),
      trackingDetails: Math.random() > 0.5 ? 'Package processed at facility' : undefined
    }));

    return {
      id: `fulfill_${Math.random().toString(36).substring(2, 12)}`,
      orderId: order.id,
      status: order.fulfillmentStatus,
      trackingNumber,
      carrier,
      shippingMethod,
      estimatedDelivery,
      actualDelivery,
      shippingCost: order.shipping,
      items,
      shipmentAddress: order.shippingAddress,
      notes: this.generateFulfillmentNotes(shippingMethod),
      createdAt: order.createdAt + Math.floor(Math.random() * 24 * 60 * 60 * 1000), // Within 24 hours
      shippedAt: ['shipped', 'delivered'].includes(order.status) ? 
        order.createdAt + Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000) : undefined, // Within 3 days
      deliveredAt: actualDelivery
    };
  }

  /**
   * Generate product review from order
   */
  generateProductReview(order: EcommerceOrder, products: EcommerceProduct[]): ProductReview {
    const orderItem = order.items[Math.floor(Math.random() * order.items.length)];
    const product = products.find(p => p.id === orderItem.productId);
    const rating = this.generateRealisticRating();

    return {
      id: `review_${Math.random().toString(36).substring(2, 12)}`,
      productId: orderItem.productId,
      customerId: order.customerId,
      orderId: order.id,
      rating,
      title: this.generateReviewTitle(rating, product?.name || 'Product'),
      review: this.generateReviewText(rating, product?.name || 'Product'),
      pros: rating >= 4 ? this.generateReviewPros() : undefined,
      cons: rating <= 3 ? this.generateReviewCons() : undefined,
      verified: true, // Verified purchase
      helpful: Math.floor(Math.random() * 20),
      notHelpful: Math.floor(Math.random() * 5),
      images: Math.random() > 0.8 ? [`/reviews/${orderItem.productId}_1.jpg`] : undefined,
      status: Math.random() > 0.1 ? 'approved' : 'pending', // 90% approved
      moderatorNotes: undefined,
      createdAt: order.createdAt + Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000), // Within 14 days
      updatedAt: Date.now()
    };
  }

  /**
   * Generate refund request
   */
  generateRefundRequest(order: EcommerceOrder): RefundRequest {
    const refundItems = this.selectRefundItems(order.items);
    const requestedAmount = refundItems.reduce((sum, item) => sum + item.refundAmount, 0);
    const status = this.generateRefundStatus();

    return {
      id: `refund_${Math.random().toString(36).substring(2, 12)}`,
      orderId: order.id,
      customerId: order.customerId,
      items: refundItems,
      reason: this.generateRefundReason(),
      customerComments: this.generateCustomerComments(),
      requestedAmount: Math.round(requestedAmount * 100) / 100,
      approvedAmount: status === 'approved' ? requestedAmount * 0.9 : undefined, // 90% approved amount
      status,
      adminNotes: status !== 'pending' ? this.generateAdminNotes(status) : undefined,
      createdAt: order.createdAt + Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000), // Within 30 days
      processedAt: status !== 'pending' ? Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined,
      refundMethod: order.paymentMethod
    };
  }

  /**
   * Generate shopping cart abandonment scenarios
   */
  generateAbandonedCarts(products: EcommerceProduct[], count: number = 20): ShoppingCart[] {
    const carts: ShoppingCart[] = [];

    for (let i = 0; i < count; i++) {
      const items = this.generateCartItems(products, Math.floor(Math.random() * 5) + 1);
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const currency = this.getRandomCurrency();

      carts.push({
        id: `cart_${i + 1}`,
        customerId: Math.random() > 0.3 ? `customer_${Math.floor(Math.random() * 10) + 1}` : undefined,
        sessionId: `session_${Math.random().toString(36).substring(2, 15)}`,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        estimatedTax: Math.round(subtotal * 0.08 * 100) / 100,
        estimatedShipping: subtotal > 50 ? 0 : 9.99,
        estimatedTotal: Math.round((subtotal + (subtotal * 0.08) + (subtotal > 50 ? 0 : 9.99)) * 100) / 100,
        currency,
        createdAt: Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000), // Within 14 days
        updatedAt: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000), // Within 24 hours
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // Expires in 7 days
      });
    }

    return carts;
  }

  /**
   * Generate discount codes and promotions
   */
  generateDiscountCodes(): DiscountCode[] {
    const codes: DiscountCode[] = [
      {
        id: 'disc_1',
        code: 'WELCOME10',
        type: 'percentage',
        value: 10,
        minimumOrder: 50,
        maximumDiscount: 25,
        usageLimit: 1000,
        usedCount: Math.floor(Math.random() * 500),
        validFrom: Date.now() - 30 * 24 * 60 * 60 * 1000,
        validUntil: Date.now() + 30 * 24 * 60 * 60 * 1000,
        isActive: true,
        description: 'Welcome discount for new customers'
      },
      {
        id: 'disc_2',
        code: 'FREESHIP',
        type: 'free_shipping',
        value: 0,
        minimumOrder: 25,
        usageLimit: -1, // Unlimited
        usedCount: Math.floor(Math.random() * 1000),
        validFrom: Date.now() - 60 * 24 * 60 * 60 * 1000,
        validUntil: Date.now() + 90 * 24 * 60 * 60 * 1000,
        isActive: true,
        description: 'Free shipping on orders over $25'
      },
      {
        id: 'disc_3',
        code: 'SAVE20',
        type: 'fixed_amount',
        value: 20,
        minimumOrder: 100,
        usageLimit: 500,
        usedCount: Math.floor(Math.random() * 200),
        validFrom: Date.now() - 7 * 24 * 60 * 60 * 1000,
        validUntil: Date.now() + 14 * 24 * 60 * 60 * 1000,
        applicableCategories: ['electronics', 'home_garden'],
        isActive: true,
        description: '$20 off electronics and home & garden items'
      }
    ];

    return codes;
  }

  // Private helper methods

  private initializeOrderData(): void {
    this.shippingMethods = [
      { name: 'Standard Shipping', cost: 9.99, days: 7 },
      { name: 'Express Shipping', cost: 19.99, days: 3 },
      { name: 'Overnight Shipping', cost: 39.99, days: 1 },
      { name: 'Free Shipping', cost: 0, days: 10 }
    ];

    this.paymentMethods = [
      'credit_card', 'debit_card', 'paypal', 'apple_pay', 
      'google_pay', 'stripe', 'square', 'bank_transfer'
    ];

    this.customerBehaviors = [
      { type: 'frequent_buyer', probability: 0.2 },
      { type: 'occasional_buyer', probability: 0.6 },
      { type: 'one_time_buyer', probability: 0.2 }
    ];
  }

  private generateOrderItems(products: EcommerceProduct[], count: number): OrderItem[] {
    const items: OrderItem[] = [];
    
    for (let i = 0; i < count; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const variant = product.variants.length > 0 ? 
        product.variants[Math.floor(Math.random() * product.variants.length)] : undefined;

      items.push({
        id: `item_${i + 1}`,
        productId: product.id,
        variantId: variant?.id,
        quantity,
        price: variant?.price || product.price,
        title: product.name,
        sku: variant?.sku || product.sku,
        image: product.images[0] || `/products/placeholder.jpg`
      });
    }
    
    return items;
  }

  private generateCartItems(products: EcommerceProduct[], count: number): CartItem[] {
    const items: CartItem[] = [];
    
    for (let i = 0; i < count; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const variant = product.variants.length > 0 ? 
        product.variants[Math.floor(Math.random() * product.variants.length)] : undefined;

      items.push({
        id: `cart_item_${i + 1}`,
        productId: product.id,
        variantId: variant?.id,
        quantity,
        price: variant?.price || product.price,
        title: product.name,
        image: product.images[0] || `/products/placeholder.jpg`,
        addedAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000) // Within 7 days
      });
    }
    
    return items;
  }

  private generateOrderNumber(index: number): string {
    const timestamp = Date.now().toString().slice(-6);
    const orderNum = String(index).padStart(4, '0');
    return `ORD-${timestamp}-${orderNum}`;
  }

  private generateOrderStatus(): EcommerceOrder['status'] {
    const statuses: Array<{ status: EcommerceOrder['status'], weight: number }> = [
      { status: 'pending', weight: 0.1 },
      { status: 'processing', weight: 0.15 },
      { status: 'shipped', weight: 0.25 },
      { status: 'delivered', weight: 0.4 },
      { status: 'cancelled', weight: 0.05 },
      { status: 'refunded', weight: 0.05 }
    ];

    return this.weightedRandom(statuses);
  }

  private generateFinancialStatus(orderStatus: EcommerceOrder['status']): EcommerceOrder['financialStatus'] {
    if (orderStatus === 'cancelled') return 'pending';
    if (orderStatus === 'refunded') return 'refunded';
    
    const statuses: Array<{ status: EcommerceOrder['financialStatus'], weight: number }> = [
      { status: 'pending', weight: 0.1 },
      { status: 'paid', weight: 0.8 },
      { status: 'partially_paid', weight: 0.05 },
      { status: 'partially_refunded', weight: 0.05 }
    ];

    return this.weightedRandom(statuses);
  }

  private generateFulfillmentStatus(orderStatus: EcommerceOrder['status']): EcommerceOrder['fulfillmentStatus'] {
    if (orderStatus === 'pending' || orderStatus === 'cancelled') return 'unfulfilled';
    if (orderStatus === 'delivered') return 'fulfilled';
    if (orderStatus === 'shipped') return Math.random() > 0.3 ? 'fulfilled' : 'partial';
    
    return Math.random() > 0.5 ? 'partial' : 'unfulfilled';
  }

  private calculateTax(subtotal: number): number {
    return subtotal * 0.08; // 8% tax rate
  }

  private calculateShipping(subtotal: number, items: OrderItem[]): number {
    if (subtotal > 75) return 0; // Free shipping over $75
    
    const totalWeight = items.length * 0.5; // Estimate 0.5kg per item
    const baseShipping = 5.99;
    const weightShipping = Math.max(0, (totalWeight - 1) * 2); // $2 per kg over 1kg
    
    return Math.round((baseShipping + weightShipping) * 100) / 100;
  }

  private applyDiscount(subtotal: number): number {
    // 20% chance of discount
    if (Math.random() > 0.8) {
      const discountPercentage = 0.05 + (Math.random() * 0.15); // 5-20% discount
      return subtotal * discountPercentage;
    }
    return 0;
  }

  private generateRealisticOrderDate(): number {
    // Generate orders over the past 90 days with realistic patterns
    const daysAgo = Math.floor(Math.random() * 90);
    const baseDate = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
    
    // Add some time within the day (business hours preference)
    const hour = 9 + Math.floor(Math.random() * 12); // 9 AM to 9 PM
    const minute = Math.floor(Math.random() * 60);
    
    return baseDate + (hour * 60 * 60 * 1000) + (minute * 60 * 1000);
  }

  private generateOrderNotes(): string | undefined {
    const notes = [
      'Customer requested expedited shipping',
      'Gift wrapping requested',
      'Special delivery instructions: Leave at door',
      'Customer called to confirm address',
      'Promotional order from email campaign'
    ];
    
    // 30% chance of having notes
    return Math.random() > 0.7 ? notes[Math.floor(Math.random() * notes.length)] : undefined;
  }

  private getRandomCurrency(): string {
    const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    return currencies[Math.floor(Math.random() * currencies.length)];
  }

  private getRandomPaymentMethod(): string {
    return this.paymentMethods[Math.floor(Math.random() * this.paymentMethods.length)];
  }

  private generateRandomAddress(): Address {
    const addresses = [
      {
        firstName: 'John',
        lastName: 'Smith',
        address1: '123 Main Street',
        city: 'New York',
        province: 'NY',
        country: 'United States',
        zip: '10001',
        phone: '+1-555-0123'
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        address1: '456 Oak Avenue',
        city: 'Los Angeles',
        province: 'CA',
        country: 'United States',
        zip: '90210',
        phone: '+1-555-0456'
      },
      {
        firstName: 'Michael',
        lastName: 'Brown',
        address1: '789 Pine Road',
        city: 'Chicago',
        province: 'IL',
        country: 'United States',
        zip: '60601',
        phone: '+1-555-0789'
      }
    ];

    return addresses[Math.floor(Math.random() * addresses.length)];
  }

  private generateTransactionStatus(financialStatus: EcommerceOrder['financialStatus']): PaymentTransaction['status'] {
    switch (financialStatus) {
      case 'pending': return 'pending';
      case 'paid': return 'completed';
      case 'partially_paid': return 'processing';
      case 'refunded': return 'refunded';
      case 'partially_refunded': return 'completed';
      default: return 'pending';
    }
  }

  private generateTransactionId(): string {
    return 'txn_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private generateProcessorResponse(status: PaymentTransaction['status']): string {
    const responses: Record<PaymentTransaction['status'], string[]> = {
      pending: ['Payment submitted for processing', 'Awaiting bank authorization'],
      processing: ['Payment being processed', 'Authorization in progress'],
      completed: ['Payment successful', 'Transaction approved', 'Funds captured'],
      failed: ['Insufficient funds', 'Card declined', 'Invalid card number'],
      cancelled: ['Payment cancelled by user', 'Transaction cancelled'],
      refunded: ['Refund processed', 'Funds returned to customer']
    };

    const statusResponses = responses[status] || responses['completed'];
    return statusResponses[Math.floor(Math.random() * statusResponses.length)];
  }

  private generateFailureReason(): string {
    const reasons = [
      'Insufficient funds',
      'Invalid card number',
      'Card expired',
      'CVV mismatch',
      'Billing address mismatch',
      'Card declined by issuer',
      'Transaction limit exceeded'
    ];

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  private generatePaymentDetails(paymentMethod: string): PaymentDetails {
    const baseDetails: PaymentDetails = { type: paymentMethod as PaymentDetails['type'] };

    switch (paymentMethod) {
      case 'credit_card':
      case 'debit_card':
        return {
          ...baseDetails,
          last4: String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
          brand: ['Visa', 'Mastercard', 'American Express'][Math.floor(Math.random() * 3)],
          expiryMonth: Math.floor(Math.random() * 12) + 1,
          expiryYear: new Date().getFullYear() + Math.floor(Math.random() * 5),
          holderName: 'John Smith'
        };
      
      case 'paypal':
        return {
          ...baseDetails,
          paypalEmail: 'customer@example.com'
        };
      
      case 'bank_transfer':
        return {
          ...baseDetails,
          bankName: 'Chase Bank',
          accountLast4: String(Math.floor(Math.random() * 10000)).padStart(4, '0')
        };
      
      default:
        return baseDetails;
    }
  }

  private getRandomCarrier(): string {
    const carriers = ['UPS', 'FedEx', 'USPS', 'DHL', 'Amazon Logistics'];
    return carriers[Math.floor(Math.random() * carriers.length)];
  }

  private getRandomShippingMethod(): string {
    return this.shippingMethods[Math.floor(Math.random() * this.shippingMethods.length)].name;
  }

  private generateTrackingNumber(carrier: string): string {
    const prefixes: Record<string, string> = {
      'UPS': '1Z',
      'FedEx': '12',
      'USPS': '94',
      'DHL': '00',
      'Amazon Logistics': 'TBA'
    };

    const prefix = prefixes[carrier] || '00';
    const randomNum = Math.random().toString(36).substring(2, 12).toUpperCase();
    return `${prefix}${randomNum}`;
  }

  private getDeliveryTime(shippingMethod: string): number {
    const method = this.shippingMethods.find(m => m.name === shippingMethod);
    const days = method?.days || 7;
    return days * 24 * 60 * 60 * 1000;
  }

  private getFulfillmentItemStatus(fulfillmentStatus: EcommerceOrder['fulfillmentStatus']): FulfillmentItem['status'] {
    switch (fulfillmentStatus) {
      case 'unfulfilled': return 'pending';
      case 'partial': return Math.random() > 0.5 ? 'shipped' : 'packed';
      case 'fulfilled': return 'delivered';
      default: return 'pending';
    }
  }

  private generateFulfillmentNotes(shippingMethod: string): string | undefined {
    const notes = [
      'Package prepared for shipment',
      'Expedited processing requested',
      'Fragile items - handle with care',
      'Gift message included',
      'Signature required upon delivery'
    ];

    return Math.random() > 0.6 ? notes[Math.floor(Math.random() * notes.length)] : undefined;
  }

  private generateRealisticRating(): number {
    // Generate ratings with realistic distribution (more 4-5 star ratings)
    const weights = [0.05, 0.05, 0.15, 0.35, 0.4]; // 1-5 stars
    const random = Math.random();
    let cumulativeWeight = 0;

    for (let i = 0; i < weights.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return i + 1;
      }
    }

    return 5;
  }

  private generateReviewTitle(rating: number, productName: string): string {
    const titles: Record<number, string[]> = {
      1: ['Terrible product', 'Waste of money', 'Very disappointed'],
      2: ['Not great', 'Expected better', 'Below average'],
      3: ['It\'s okay', 'Average product', 'Does the job'],
      4: ['Good quality', 'Happy with purchase', 'Solid product'],
      5: ['Excellent!', 'Love it!', 'Perfect product', 'Highly recommend']
    };

    const ratingTitles = titles[rating] || titles[3];
    return ratingTitles[Math.floor(Math.random() * ratingTitles.length)];
  }

  private generateReviewText(rating: number, productName: string): string {
    const reviews: Record<number, string[]> = {
      1: [
        'This product did not meet my expectations at all. Quality is poor and it broke after just a few uses.',
        'Very disappointed with this purchase. The product feels cheap and doesn\'t work as advertised.'
      ],
      2: [
        'The product is functional but the quality could be better. Not sure if I would buy again.',
        'It works but there are definitely better options available for the same price.'
      ],
      3: [
        'This product does what it\'s supposed to do. Nothing exceptional but it gets the job done.',
        'Average product. It works fine but doesn\'t exceed expectations in any way.'
      ],
      4: [
        'Really happy with this purchase! Good quality and exactly what I was looking for.',
        'Great product that works well. Would definitely recommend to others.'
      ],
      5: [
        'Outstanding product! Exceeded all my expectations. The quality is excellent and it works perfectly.',
        'This is exactly what I needed! Perfect quality, fast shipping, and great value for money.'
      ]
    };

    const ratingReviews = reviews[rating] || reviews[3];
    return ratingReviews[Math.floor(Math.random() * ratingReviews.length)];
  }

  private generateReviewPros(): string[] {
    const pros = [
      'Great quality',
      'Fast shipping',
      'Good value for money',
      'Easy to use',
      'Durable construction',
      'Attractive design',
      'Works as described'
    ];

    const count = Math.floor(Math.random() * 3) + 1; // 1-3 pros
    const selectedPros: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const pro = pros[Math.floor(Math.random() * pros.length)];
      if (!selectedPros.includes(pro)) {
        selectedPros.push(pro);
      }
    }

    return selectedPros;
  }

  private generateReviewCons(): string[] {
    const cons = [
      'Could be better quality',
      'Shipping took longer than expected',
      'Instructions unclear',
      'Smaller than expected',
      'Packaging could be improved',
      'Price is a bit high',
      'Limited color options'
    ];

    const count = Math.floor(Math.random() * 2) + 1; // 1-2 cons
    const selectedCons: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const con = cons[Math.floor(Math.random() * cons.length)];
      if (!selectedCons.includes(con)) {
        selectedCons.push(con);
      }
    }

    return selectedCons;
  }

  private selectRefundItems(orderItems: OrderItem[]): RefundItem[] {
    // Typically 1-2 items are refunded
    const refundCount = Math.min(orderItems.length, Math.floor(Math.random() * 2) + 1);
    const selectedItems = orderItems.slice(0, refundCount);

    return selectedItems.map(item => ({
      orderItemId: item.id,
      productId: item.productId,
      quantity: Math.min(item.quantity, Math.floor(Math.random() * item.quantity) + 1),
      reason: this.generateRefundItemReason(),
      condition: this.generateItemCondition(),
      refundAmount: item.price * item.quantity
    }));
  }

  private generateRefundReason(): string {
    const reasons = [
      'Product not as described',
      'Received wrong item',
      'Item arrived damaged',
      'Changed mind',
      'Quality issues',
      'Size doesn\'t fit',
      'Found better price elsewhere'
    ];

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  private generateRefundItemReason(): string {
    const reasons = [
      'Defective upon arrival',
      'Wrong color/size',
      'Poor quality',
      'Not working properly',
      'Damaged in shipping',
      'Different than pictured'
    ];

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  private generateItemCondition(): RefundItem['condition'] {
    const conditions: RefundItem['condition'][] = ['new', 'opened', 'damaged', 'defective'];
    const weights = [0.3, 0.4, 0.2, 0.1]; // Most returns are opened items
    
    return this.weightedRandom(conditions.map((condition, index) => ({ status: condition, weight: weights[index] })));
  }

  private generateRefundStatus(): RefundRequest['status'] {
    const statuses: Array<{ status: RefundRequest['status'], weight: number }> = [
      { status: 'pending', weight: 0.2 },
      { status: 'approved', weight: 0.6 },
      { status: 'processing', weight: 0.1 },
      { status: 'completed', weight: 0.05 },
      { status: 'denied', weight: 0.05 }
    ];

    return this.weightedRandom(statuses);
  }

  private generateCustomerComments(): string | undefined {
    const comments = [
      'The item doesn\'t match the description on the website.',
      'I received the wrong size and need to exchange it.',
      'The product arrived damaged and is unusable.',
      'The quality is much lower than expected.',
      'Found a better deal elsewhere after ordering.'
    ];

    return Math.random() > 0.5 ? comments[Math.floor(Math.random() * comments.length)] : undefined;
  }

  private generateAdminNotes(status: RefundRequest['status']): string {
    const notes: Record<RefundRequest['status'], string[]> = {
      approved: ['Refund approved - customer eligible', 'Valid return reason', 'Within return window'],
      denied: ['Outside return window', 'Item not eligible for return', 'Insufficient evidence'],
      processing: ['Refund being processed', 'Awaiting payment processor'],
      completed: ['Refund completed successfully', 'Customer notified'],
      pending: ['Under review', 'Awaiting customer response']
    };

    const statusNotes = notes[status] || notes['pending'];
    return statusNotes[Math.floor(Math.random() * statusNotes.length)];
  }

  private weightedRandom<T>(items: Array<{ status: T, weight: number }>): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const random = Math.random() * totalWeight;
    let cumulativeWeight = 0;

    for (const item of items) {
      cumulativeWeight += item.weight;
      if (random <= cumulativeWeight) {
        return item.status;
      }
    }

    return items[0].status;
  }
}