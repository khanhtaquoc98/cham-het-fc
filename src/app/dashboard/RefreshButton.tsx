"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/deposit/reconcile", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.reconciledCount > 0) {
          toast.success(`Đã cập nhật & đối soát ${data.reconciledCount} giao dịch!`);
        }
      }
    } catch {
      // Ignore network errors
    } finally {
      router.refresh();
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      title="Làm mới & đối soát giao dịch"
      style={{
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isRefreshing ? 'wait' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: isRefreshing ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (!isRefreshing) e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
      onMouseLeave={e => { if (!isRefreshing) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
      onMouseDown={e => { if (!isRefreshing) e.currentTarget.style.transform = 'scale(0.92)' }}
      onMouseUp={e => { if (!isRefreshing) e.currentTarget.style.transform = 'scale(1)' }}
    >
      <RefreshCw size={14} style={{ 
        transition: 'transform 1s ease',
        animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
      }} />
    </button>
  );
}
