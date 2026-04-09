'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface OrderResult {
  id: string;
  orderCode: number;
  amount: number;
  status: string;
  playerNames: string[];
  paidAt: string | null;
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<OrderResult | null>(null);
  const [loading, setLoading] = useState(true);

  const orderCode = searchParams.get('orderCode');
  const orderId = searchParams.get('orderId');
  const cancelled = searchParams.get('status') === 'cancelled';

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/payment/result?orderId=${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setResult(data);
        }
      } catch (err) {
        console.error('Failed to fetch result:', err);
      } finally {
        setLoading(false);
      }
    };

    // Đợi 1s để webhook PayOS kịp xử lý
    const timer = setTimeout(fetchResult, 1500);
    return () => clearTimeout(timer);
  }, [orderId]);

  const formatVND = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

  if (loading) {
    return (
      <div style={rootStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16, animation: 'spin 1s linear infinite' }}>⏳</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', margin: 0, marginBottom: 8 }}>
                Đang xác nhận thanh toán...
              </h2>
              <p style={{ fontSize: 13, color: '#8a8aaa', margin: 0 }}>
                Vui lòng đợi trong giây lát
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cancelled by user
  if (cancelled) {
    return (
      <div style={rootStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#c62828', margin: 0, marginBottom: 8 }}>
                Thanh toán bị huỷ
              </h2>
              <p style={{ fontSize: 14, color: '#8a8aaa', margin: 0, marginBottom: 24 }}>
                Bạn đã huỷ thanh toán. Có thể thử lại bất cứ lúc nào.
              </p>
              {orderCode && (
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 20 }}>
                  Mã đơn: #{orderCode}
                </div>
              )}
              <Link href="/payment" style={btnStyle}>
                ← Quay lại trang thanh toán
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success or checking result
  const isPaid = result?.status === 'paid';

  return (
    <div style={rootStyle}>
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>
              {isPaid ? '✅' : '⏳'}
            </div>
            <h2 style={{
              fontSize: 20, fontWeight: 800, margin: 0, marginBottom: 8,
              color: isPaid ? '#2e7d32' : '#e65100',
            }}>
              {isPaid ? 'Thanh toán thành công!' : 'Đang xử lý thanh toán...'}
            </h2>
            <p style={{ fontSize: 14, color: '#8a8aaa', margin: 0, marginBottom: 20 }}>
              {isPaid
                ? 'Cảm ơn bạn đã thanh toán. Thông tin đã được cập nhật.'
                : 'Giao dịch đang được xử lý. Trạng thái sẽ tự động cập nhật.'}
            </p>

            {result && (
              <div style={{
                background: '#fafafa', borderRadius: 14, padding: '16px 20px',
                textAlign: 'left', marginBottom: 24,
                border: '1px solid rgba(0,0,0,0.06)',
              }}>
                <div style={infoRow}>
                  <span>Mã đơn hàng</span>
                  <span style={{ fontWeight: 700, color: '#1a1a2e' }}>#{result.orderCode}</span>
                </div>
                <div style={infoRow}>
                  <span>Số tiền</span>
                  <span style={{ fontWeight: 700, color: '#c62828' }}>{formatVND(result.amount)}</span>
                </div>
                <div style={infoRow}>
                  <span>Trạng thái</span>
                  <span style={{
                    fontWeight: 700,
                    color: isPaid ? '#2e7d32' : '#e65100',
                  }}>
                    {isPaid ? '✅ Đã thanh toán' : '⏳ Đang xử lý'}
                  </span>
                </div>
                {result.playerNames.length > 0 && (
                  <div style={{ ...infoRow, borderBottom: 'none' }}>
                    <span>Thanh toán cho</span>
                    <span style={{ fontWeight: 600, color: '#1a1a2e', textAlign: 'right' }}>
                      {result.playerNames.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/payment" style={btnStyle}>
                ← Trang thanh toán
              </Link>
              <Link href="/" style={{ ...btnStyle, background: '#f5f5f5', color: '#4a4a6a' }}>
                🏠 Trang chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div style={rootStyle}>
        <div style={containerStyle}>
          <div style={{ textAlign: 'center', padding: 40, color: '#8a8aaa' }}>⏳ Đang tải...</div>
        </div>
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}

/* ========== STYLES ========== */

const rootStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#faf5f5',
  fontFamily: "'Outfit', sans-serif",
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const containerStyle: React.CSSProperties = {
  maxWidth: 480,
  width: '100%',
  padding: '20px',
};

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 20,
  border: '1px solid rgba(198,40,40,0.1)',
  boxShadow: '0 4px 24px rgba(198,40,40,0.08)',
  overflow: 'hidden',
};

const infoRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 0', fontSize: 13, color: '#6a6a8a',
  borderBottom: '1px solid rgba(0,0,0,0.04)',
};

const btnStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 24px',
  borderRadius: 12,
  background: 'linear-gradient(135deg, #e53935, #ef5350)',
  color: 'white',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "'Outfit', sans-serif",
  textDecoration: 'none',
  transition: 'all 0.2s',
};
