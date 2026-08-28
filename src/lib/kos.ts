import crypto from 'crypto';

export interface KosCreatePaymentParams {
  orderId: string;
  amount: number;
  content: string;
  callbackUrl?: string;
  cancelUrl?: string;
}

export interface KosCreatePaymentResponse {
  success: boolean;
  status: string;
  order_id: string;
  payment_id: string;
  amount: number;
  content: string;
  checkout_url: string;
  qr_code_url: string;
  error?: string;
}

export const getKosGatewayUrl = () =>
  process.env.GATEWAY_URL || 'https://kos-payment.vercel.app';

export const getKosCallbackSecret = () =>
  process.env.GATEWAY_CALLBACK_SECRET ||
  process.env.CALLBACK_SECRET ||
  'super-secret-callback-token';

/**
 * Gọi API POST /api/v1/payment/create trên KOS Webhook Gateway
 */
export async function createKosPayment(
  params: KosCreatePaymentParams
): Promise<KosCreatePaymentResponse> {
  const gatewayUrl = getKosGatewayUrl();
  const res = await fetch(`${gatewayUrl}/api/v1/payment/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(5000),
    body: JSON.stringify({
      order_id: params.orderId,
      amount: params.amount,
      content: params.content,
      callback_url: params.callbackUrl,
      cancel_url: params.cancelUrl,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.detail ||
        errData.error ||
        `KOS payment creation failed (${res.status})`
    );
  }

  return await res.json();
}

/**
 * Gọi API POST /api/v1/payment/cancel trên KOS Webhook Gateway
 */
export async function cancelKosPayment(
  orderId: string,
  reason: string = 'Hủy giao dịch'
): Promise<boolean> {
  try {
    const gatewayUrl = getKosGatewayUrl();
    const res = await fetch(`${gatewayUrl}/api/v1/payment/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        reason,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('KOS payment cancel error:', err);
    return false;
  }
}

/**
 * Gọi API GET /api/check-payment/{order_id} trên KOS Webhook Gateway
 */
export async function checkKosPayment(
  orderId: string
): Promise<{ reference_id?: string; status?: string } | null> {
  try {
    const gatewayUrl = getKosGatewayUrl();
    const res = await fetch(`${gatewayUrl}/api/check-payment/${orderId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('KOS check payment error:', err);
    return null;
  }
}

/**
 * Kiểm tra chữ ký SHA-256 của Webhook nhận từ KOS Gateway
 * Công thức từ INTEGRATION.md:
 * signature = sha256( order_id + payment_id + amount + trans_no + callback_secret )
 */
export function verifyKosSignature(
  payload: {
    order_id?: string;
    reference_id?: string;
    payment_id?: string;
    amount?: number | string;
    trans_no?: string;
    signature?: string;
  },
  headerSignature?: string | null
): boolean {
  const signature = headerSignature || payload.signature;
  if (!signature) return false;

  const orderId = payload.order_id || payload.reference_id || '';
  const paymentId = payload.payment_id || '';
  const amount = payload.amount !== undefined ? payload.amount : '';
  const transNo = payload.trans_no || '';
  const secret = getKosCallbackSecret();

  // Xử lý định dạng amount (số nguyên hoặc float ví dụ 500000 hay 500000.0)
  const amountNum = typeof amount === 'number' ? amount : parseFloat(String(amount));

  const candidates: string[] = [
    `${orderId}${paymentId}${amount}${transNo}${secret}`,
  ];

  if (!isNaN(amountNum)) {
    candidates.push(`${orderId}${paymentId}${amountNum.toFixed(1)}${transNo}${secret}`);
    candidates.push(`${orderId}${paymentId}${amountNum}${transNo}${secret}`);
  }

  for (const rawString of candidates) {
    const expected = crypto.createHash('sha256').update(rawString).digest('hex');
    if (expected.toLowerCase() === signature.toLowerCase()) {
      return true;
    }
  }

  return false;
}
