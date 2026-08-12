import Link from 'next/link';
import { Home, Users, Trophy } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '40px 20px',
    }}>
      <div style={{
        fontSize: '72px',
        fontWeight: 900,
        color: 'var(--accent, #c62828)',
        lineHeight: 1,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span>4</span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'spin 4s linear infinite',
        }}>
          <Trophy size={54} />
        </span>
        <span>4</span>
      </div>

      <h1 style={{
        fontSize: '24px',
        fontWeight: 800,
        marginBottom: '12px',
        color: 'var(--text-primary, #1a1a2e)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
      }}>
        BÓNG ĐÃ ĐI HẾT ĐƯỜNG BIÊN DỌC!
      </h1>

      <p style={{
        fontSize: '15px',
        color: 'var(--text-secondary, #4a4a6a)',
        maxWidth: '440px',
        lineHeight: 1.6,
        marginBottom: '32px',
      }}>
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị thay đổi vị trí trên sân thi đấu.
      </p>

      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '12px',
            backgroundColor: 'var(--accent, #c62828)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(198, 40, 40, 0.3)',
            transition: 'transform 0.2s ease, background-color 0.2s ease',
          }}
        >
          <Home size={16} /> Về Trang Chủ
        </Link>
        <Link
          href="/players"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '12px',
            backgroundColor: 'rgba(198, 40, 40, 0.08)',
            color: 'var(--accent, #c62828)',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
            border: '1px solid rgba(198, 40, 40, 0.2)',
            transition: 'transform 0.2s ease',
          }}
        >
          <Users size={16} /> Danh Sách Cầu Thủ
        </Link>
      </div>
    </div>
  );
}
