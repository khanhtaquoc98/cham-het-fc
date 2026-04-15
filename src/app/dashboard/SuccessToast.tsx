"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SuccessToast({ confirmed }: { confirmed: boolean }) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to clean URL after a delay
    const timer = setTimeout(() => {
      setVisible(false);
      router.replace("/dashboard");
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  if (!visible) return null;

  return (
    <div style={{
      padding: '16px 20px',
      borderRadius: '12px',
      background: confirmed
        ? 'linear-gradient(135deg, rgba(46,125,50,0.15), rgba(76,175,80,0.1))'
        : 'linear-gradient(135deg, rgba(255,152,0,0.15), rgba(255,193,7,0.1))',
      border: `1px solid ${confirmed ? 'rgba(46,125,50,0.3)' : 'rgba(255,152,0,0.3)'}`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{ fontSize: '24px' }}>
        {confirmed ? '✅' : '⏳'}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '14px', color: confirmed ? '#2e7d32' : '#e65100' }}>
          {confirmed ? 'Thêm Bóng thành công!' : 'Đang xử lý giao dịch...'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {confirmed
            ? 'Số dư đã được cập nhật.'
            : 'Vui lòng đợi vài giây rồi nhấn Làm mới.'}
        </div>
      </div>
    </div>
  );
}
