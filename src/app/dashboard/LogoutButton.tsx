"use client";

import toast from "react-hot-toast";

export default function LogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    toast.success("Đã đăng xuất");
    window.location.href = "/";
  };

  return (
    <button
      onClick={handleLogout}
      className="transition-transform"
      style={{
        background: 'rgba(198,40,40,0.1)',
        color: '#d32f2f',
        border: '1px solid rgba(198,40,40,0.2)',
        padding: '10px 20px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(198,40,40,0.05)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#d32f2f';
        e.currentTarget.style.color = 'white';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(198,40,40,0.2)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(198,40,40,0.1)';
        e.currentTarget.style.color = '#d32f2f';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(198,40,40,0.05)';
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <span style={{ fontSize: '18px' }}>🚪</span> Đăng Xuất
    </button>
  );
}
