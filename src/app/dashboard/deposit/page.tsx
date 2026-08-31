"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { CreditCard } from 'lucide-react';

export default function DepositPage() {
  const MIN_AMOUNT = 2000;
  const [vnd, setVND] = useState(2000); // Mặc định 2k VNĐ
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vnd < MIN_AMOUNT) {
      toast.error(`Vui lòng nhập tối thiểu ${MIN_AMOUNT.toLocaleString('vi-VN')} VNĐ`);
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/deposit/create", {
        method: "POST",
        body: JSON.stringify({ amount: vnd }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      
      if (res.ok && data.checkoutUrl) {
        // Redirect to PayOS / KOS
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(data.error || "Gặp lỗi khi tạo mã thanh toán");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '40px 32px', position: 'relative' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="vs-badge" style={{ margin: '0 auto 16px', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={24} /></div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Thêm Bóng
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Thêm Bóng qua mã QR tự động.<br/><strong>1,000 VNĐ = 1,000 Bóng</strong> (Tối thiểu 2,000 VNĐ).</p>
        </div>
          
        <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nhập số tiền cần thêm (VNĐ)
            </label>
            <input
              type="number"
              value={vnd}
              onChange={(e) => setVND(parseInt(e.target.value) || 0)}
              style={{
                width: '100%', padding: '16px', borderRadius: '12px',
                border: '1.5px solid var(--border-accent)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontSize: '20px', fontWeight: 800, outline: 'none',
                transition: 'all 0.2s ease', textAlign: 'center', letterSpacing: '1px'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-accent)'}
              min="2000"
              step="1000"
            />
          </div>
          
          <div style={{
            background: 'var(--player-hover-bg)', border: '1px dashed var(--border-accent)',
            padding: '20px', borderRadius: '12px', textAlign: 'center'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Bạn sẽ nhận được:</span>
            <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--accent)', marginTop: '4px' }}>
              {vnd.toLocaleString()} ⚽
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading || vnd < MIN_AMOUNT}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px', marginTop: '8px',
              background: 'linear-gradient(135deg, var(--field-accent-dark), var(--field-accent-light))',
              color: 'white', fontSize: '16px', fontWeight: 800, border: 'none', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 4px 16px rgba(198,40,40,0.2)',
              transition: 'all 0.2s ease',
              opacity: (isLoading || vnd < MIN_AMOUNT) ? 0.7 : 1
            }}
            onMouseEnter={e => { if (!isLoading && vnd >= MIN_AMOUNT) e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { if (!isLoading && vnd >= MIN_AMOUNT) e.currentTarget.style.transform = 'translateY(0)' }}
            onMouseDown={e => { if (!isLoading && vnd >= MIN_AMOUNT) e.currentTarget.style.transform = 'translateY(1px)' }}
          >
            {isLoading ? "Đang xử lý..." : "Tạo Mã QR Thêm Bóng"}
          </button>
          
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Link href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s ease' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Quay lại trang chính
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
