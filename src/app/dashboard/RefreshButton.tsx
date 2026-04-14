"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      title="Làm mới lịch sử"
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
      <span style={{ 
        display: 'inline-block', 
        fontSize: '14px',
        transition: 'transform 1s ease',
        transform: isRefreshing ? 'rotate(360deg)' : 'rotate(0deg)'
      }}>
        🔄
      </span>
    </button>
  );
}
