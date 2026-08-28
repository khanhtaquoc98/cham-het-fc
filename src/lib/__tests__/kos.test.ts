import {
  createKosPayment,
  cancelKosPayment,
  checkKosPayment,
  verifyKosSignature,
} from '../kos';
import crypto from 'crypto';

describe('KOS Payment Gateway Integration Helper', () => {
  const secret = 'test-secret-123';

  beforeEach(() => {
    process.env.GATEWAY_CALLBACK_SECRET = secret;
    process.env.GATEWAY_URL = 'https://kos-test.vercel.app';
    jest.clearAllMocks();
  });

  describe('verifyKosSignature', () => {
    it('should verify valid signature with integer amount', () => {
      const orderId = 'ORDER_1001';
      const paymentId = 'PAY_555';
      const amount = 200000;
      const transNo = 'FT123456';
      const rawString = `${orderId}${paymentId}${amount}${transNo}${secret}`;
      const signature = crypto.createHash('sha256').update(rawString).digest('hex');

      const isValid = verifyKosSignature({
        order_id: orderId,
        payment_id: paymentId,
        amount,
        trans_no: transNo,
        signature,
      });

      expect(isValid).toBe(true);
    });

    it('should verify valid signature with float amount format (from Python backend)', () => {
      const orderId = 'ORDER_1002';
      const paymentId = 'PAY_777';
      const amount = 500000;
      const transNo = 'FT888999';
      // Python backend sends float format 500000.0
      const rawString = `${orderId}${paymentId}500000.0${transNo}${secret}`;
      const signature = crypto.createHash('sha256').update(rawString).digest('hex');

      const isValid = verifyKosSignature(
        {
          order_id: orderId,
          payment_id: paymentId,
          amount,
          trans_no: transNo,
        },
        signature
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const isValid = verifyKosSignature({
        order_id: 'ORDER_1003',
        payment_id: 'PAY_1',
        amount: 100000,
        trans_no: 'FT00',
        signature: 'invalid_sha256_hash',
      });

      expect(isValid).toBe(false);
    });
  });

  describe('createKosPayment', () => {
    it('should send POST request to /api/v1/payment/create', async () => {
      const mockResponse = {
        success: true,
        status: 'pending',
        order_id: 'ORDER_100',
        payment_id: 'PAY_100',
        amount: 150000,
        content: 'CHAMHETFC 100',
        checkout_url: 'https://kos-test.vercel.app/checkout?orderId=ORDER_100',
        qr_code_url: 'https://img.vietqr.io/image/MB-123.png',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      const res = await createKosPayment({
        orderId: 'ORDER_100',
        amount: 150000,
        content: 'CHAMHETFC 100',
        callbackUrl: 'https://app.com/result',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://kos-test.vercel.app/api/v1/payment/create',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: 'ORDER_100',
            amount: 150000,
            content: 'CHAMHETFC 100',
            callback_url: 'https://app.com/result',
          }),
        })
      );

      expect(res.checkout_url).toBe('https://kos-test.vercel.app/checkout?orderId=ORDER_100');
    });
  });

  describe('cancelKosPayment', () => {
    it('should send POST request to /api/v1/payment/cancel', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      } as any);

      const success = await cancelKosPayment('ORDER_100', 'Test cancellation');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://kos-test.vercel.app/api/v1/payment/cancel',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            order_id: 'ORDER_100',
            reason: 'Test cancellation',
          }),
        })
      );

      expect(success).toBe(true);
    });
  });

  describe('checkKosPayment', () => {
    it('should send GET request to /api/check-payment/{order_id}', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          reference_id: 'ORDER_100',
          status: 'completed',
        }),
      } as any);

      const status = await checkKosPayment('ORDER_100');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://kos-test.vercel.app/api/check-payment/ORDER_100'
      );

      expect(status?.status).toBe('completed');
    });
  });
});
