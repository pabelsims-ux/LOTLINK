import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentGateway,
  ChargeRequest,
  ChargeResult,
  RefundRequest,
  RefundResult,
  PaymentMethod,
  CreatePaymentMethodRequest,
} from './payment-gateway.port';

/**
 * Stripe Payment Gateway Adapter
 * 
 * IMPORTANT: This is a skeleton implementation.
 * Before using in production:
 * 1. Install Stripe SDK: npm install stripe
 * 2. Set STRIPE_SECRET_KEY in environment
 * 3. Configure webhook endpoints for async events
 * 4. Implement proper error handling and retries
 * 
 * Reference: https://stripe.com/docs/api
 */
@Injectable()
export class StripePaymentGateway implements PaymentGateway {
  private readonly logger = new Logger(StripePaymentGateway.name);
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  // private stripe: Stripe; // Uncomment when Stripe SDK is installed

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
    
    if (!this.secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured. Payment gateway will not work.');
    }

    // Initialize Stripe SDK when ready:
    // this.stripe = new Stripe(this.secretKey, { apiVersion: '2023-10-16' });
  }

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.logger.log(`Processing charge for user ${request.userId}: ${request.amount} ${request.currency}`);

    if (!this.secretKey) {
      return {
        success: false,
        status: 'failed',
        errorCode: 'NOT_CONFIGURED',
        errorMessage: 'Stripe is not configured. Set STRIPE_SECRET_KEY.',
      };
    }

    try {
      // TODO: Implement actual Stripe charge
      // const paymentIntent = await this.stripe.paymentIntents.create({
      //   amount: Math.round(request.amount * 100), // Stripe uses cents
      //   currency: request.currency.toLowerCase(),
      //   payment_method: request.paymentMethodId,
      //   confirm: true,
      //   metadata: {
      //     userId: request.userId,
      //     ...request.metadata,
      //   },
      // });
      
      // For now, return skeleton response
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      this.logger.log(`Charge successful: ${transactionId}`);
      
      return {
        success: true,
        transactionId,
        chargeId: `ch_${transactionId}`,
        status: 'succeeded',
      };
    } catch (error) {
      this.logger.error(`Charge failed: ${error}`);
      return {
        success: false,
        status: 'failed',
        errorCode: 'CHARGE_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    this.logger.log(`Processing refund for charge ${request.chargeId}`);

    if (!this.secretKey) {
      return {
        success: false,
        status: 'failed',
        errorCode: 'NOT_CONFIGURED',
        errorMessage: 'Stripe is not configured.',
      };
    }

    try {
      // TODO: Implement actual Stripe refund
      // const refund = await this.stripe.refunds.create({
      //   charge: request.chargeId,
      //   amount: request.amount ? Math.round(request.amount * 100) : undefined,
      //   reason: request.reason as Stripe.RefundCreateParams.Reason,
      // });

      const refundId = `re_${Date.now()}`;
      
      return {
        success: true,
        refundId,
        status: 'succeeded',
      };
    } catch (error) {
      this.logger.error(`Refund failed: ${error}`);
      return {
        success: false,
        status: 'failed',
        errorCode: 'REFUND_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createPaymentMethod(request: CreatePaymentMethodRequest): Promise<PaymentMethod> {
    this.logger.log(`Creating payment method for user ${request.userId}`);

    if (!this.secretKey) {
      throw new Error('Stripe is not configured.');
    }

    // TODO: Implement with Stripe
    // const customer = await this.getOrCreateCustomer(request.userId);
    // const paymentMethod = await this.stripe.paymentMethods.attach(request.token, {
    //   customer: customer.id,
    // });

    return {
      id: `pm_${Date.now()}`,
      type: request.type,
      last4: '4242',
      brand: 'visa',
      isDefault: request.setAsDefault || false,
    };
  }

  async listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    this.logger.log(`Listing payment methods for user ${userId}`);

    if (!this.secretKey) {
      return [];
    }

    // TODO: Implement with Stripe
    // const customer = await this.getCustomerByUserId(userId);
    // const methods = await this.stripe.paymentMethods.list({
    //   customer: customer.id,
    //   type: 'card',
    // });

    return [];
  }

  async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<boolean> {
    this.logger.log(`Deleting payment method ${paymentMethodId} for user ${userId}`);

    if (!this.secretKey) {
      return false;
    }

    try {
      // TODO: Implement with Stripe
      // await this.stripe.paymentMethods.detach(paymentMethodId);
      return true;
    } catch (error) {
      this.logger.error(`Delete payment method failed: ${error}`);
      return false;
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.secretKey) {
      return false;
    }

    try {
      // TODO: Implement health check
      // await this.stripe.balance.retrieve();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(_payload: string, _signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured');
      return false;
    }

    try {
      // TODO: Implement with Stripe
      // this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch {
      return false;
    }
  }
}
