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
 * Mock Payment Gateway for development and testing
 * Simulates payment responses without making real charges
 */
@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  private readonly logger = new Logger(MockPaymentGateway.name);
  private readonly paymentMethods: Map<string, PaymentMethod[]> = new Map();
  private readonly charges: Map<string, ChargeRequest> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.logger.log('MockPaymentGateway initialized - using simulated payments');
  }

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.logger.log(`[MOCK] Processing charge for user ${request.userId}: ${request.amount} ${request.currency}`);

    // Simulate processing delay
    await this.delay(500);

    // Simulate 95% success rate
    const isSuccess = Math.random() > 0.05;
    
    if (!isSuccess) {
      return {
        success: false,
        status: 'failed',
        errorCode: 'CARD_DECLINED',
        errorMessage: 'Your card was declined (mock failure)',
      };
    }

    const transactionId = `mock_txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const chargeId = `mock_ch_${transactionId}`;

    this.charges.set(chargeId, request);

    return {
      success: true,
      transactionId,
      chargeId,
      status: 'succeeded',
      receiptUrl: `https://mock-receipts.lotolink.com/${transactionId}`,
    };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    this.logger.log(`[MOCK] Processing refund for charge ${request.chargeId}`);

    await this.delay(300);

    const originalCharge = this.charges.get(request.chargeId);
    if (!originalCharge) {
      return {
        success: false,
        status: 'failed',
        errorCode: 'CHARGE_NOT_FOUND',
        errorMessage: 'Original charge not found',
      };
    }

    const refundId = `mock_re_${Date.now()}`;

    return {
      success: true,
      refundId,
      status: 'succeeded',
    };
  }

  async createPaymentMethod(request: CreatePaymentMethodRequest): Promise<PaymentMethod> {
    this.logger.log(`[MOCK] Creating payment method for user ${request.userId}`);

    await this.delay(200);

    const paymentMethod: PaymentMethod = {
      id: `mock_pm_${Date.now()}`,
      type: request.type,
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2030,
      isDefault: request.setAsDefault || false,
    };

    const userMethods = this.paymentMethods.get(request.userId) || [];
    
    // If setting as default, unset others
    if (paymentMethod.isDefault) {
      userMethods.forEach(m => m.isDefault = false);
    }
    
    userMethods.push(paymentMethod);
    this.paymentMethods.set(request.userId, userMethods);

    return paymentMethod;
  }

  async listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    this.logger.log(`[MOCK] Listing payment methods for user ${userId}`);
    return this.paymentMethods.get(userId) || [];
  }

  async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<boolean> {
    this.logger.log(`[MOCK] Deleting payment method ${paymentMethodId} for user ${userId}`);

    const userMethods = this.paymentMethods.get(userId) || [];
    const filtered = userMethods.filter(m => m.id !== paymentMethodId);
    
    if (filtered.length === userMethods.length) {
      return false; // Not found
    }

    this.paymentMethods.set(userId, filtered);
    return true;
  }

  async isHealthy(): Promise<boolean> {
    return true; // Mock is always healthy
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
