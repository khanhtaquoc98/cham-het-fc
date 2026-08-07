'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

export default function FootballBroadcastIntro() {
  const [stage, setStage] = useState<'enter' | 'show' | 'exit' | 'done'>('enter');

  useEffect(() => {
    // 0ms: enter
    // 150ms: show logo & broadcast graphics
    const timer1 = setTimeout(() => {
      setStage('show');
    }, 150);

    // 850ms: exit swipe out
    const timer2 = setTimeout(() => {
      setStage('exit');
    }, 850);

    // 1250ms: done, unmount from DOM
    const timer3 = setTimeout(() => {
      setStage('done');
    }, 1250);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  if (stage === 'done') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        pointerEvents: stage === 'exit' ? 'none' : 'auto',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background Dark Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#090a0f',
          opacity: stage === 'exit' ? 0 : 0.85,
          transition: 'opacity 0.35s ease',
        }}
      />

      {/* Slanted Red Broadcast Panel Left */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          bottom: '-20%',
          left: '-30%',
          width: '85%',
          background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 40%, #dc2626 70%, #ef4444 100%)',
          boxShadow: '12px 0 36px rgba(0,0,0,0.6), inset -2px 0 10px rgba(255,255,255,0.3)',
          transform: stage === 'exit'
            ? 'translateX(-130%) skewX(-16deg)'
            : 'translateX(0%) skewX(-16deg)',
          transition: stage === 'exit'
            ? 'transform 0.38s cubic-bezier(0.7, 0, 0.84, 0)'
            : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          borderRight: '3.5px solid rgba(255, 215, 0, 0.85)',
          zIndex: 2,
        }}
      >
        {/* Dynamic Sheen Line */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            transform: 'skewX(-20deg)',
            animation: 'sheenSweep 1.2s infinite linear',
          }}
        />
      </div>

      {/* Slanted Dark Red Broadcast Panel Right */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          bottom: '-20%',
          right: '-30%',
          width: '85%',
          background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)',
          boxShadow: '-12px 0 36px rgba(0,0,0,0.7), inset 2px 0 10px rgba(255,255,255,0.2)',
          transform: stage === 'exit'
            ? 'translateX(130%) skewX(-16deg)'
            : 'translateX(0%) skewX(-16deg)',
          transition: stage === 'exit'
            ? 'transform 0.38s cubic-bezier(0.7, 0, 0.84, 0)'
            : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          borderLeft: '3.5px solid rgba(255, 215, 0, 0.85)',
          zIndex: 1,
        }}
      />

      {/* Center Broadcast Badge & Logo Showcase */}
      <div
        className="intro-logo-wrapper"
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: stage === 'exit'
            ? 'scale(1.2) translateY(-20px)'
            : stage === 'show'
            ? 'scale(1)'
            : 'scale(0.5)',
          opacity: stage === 'exit' ? 0 : stage === 'show' ? 1 : 0,
          transition: 'all 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: 'drop-shadow(0 14px 36px rgba(0, 0, 0, 0.75))',
        }}
      >
        {/* Image Card Container */}
        <div
          className="intro-card-container"
          style={{
            background: '#ffffff',
            border: '4px solid #ffd700',
            transform: 'rotate(-2deg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Image
            src="/2026-08-07 09.49.06.jpg"
            alt="BODESLIGA - Chấm Hết FC"
            width={300}
            height={300}
            priority
            className="intro-logo-image"
            style={{
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Broadcast Title Badge */}
        <div
          className="intro-badge"
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '2.5px solid #ffd700',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="intro-badge-text" style={{ color: '#ffd700', fontWeight: 900, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
            CHẤM HẾT FC
          </span>
        </div>
      </div>

      <style>{`
        .intro-card-container {
          padding: 16px 18px;
          border-radius: 32px;
          box-shadow: 0 28px 70px rgba(0,0,0,0.75), 0 0 50px rgba(239, 68, 68, 0.6);
        }

        .intro-logo-image {
          width: 300px;
          height: 300px;
          border-radius: 22px;
        }

        .intro-badge {
          margin-top: 20px;
          padding: 10px 34px;
          border-radius: 32px;
        }

        .intro-badge-text {
          font-size: 18px;
        }

        @media (max-width: 640px) {
          .intro-card-container {
            padding: 12px 14px;
            border-radius: 22px;
            border-width: 3.5px;
          }

          .intro-logo-image {
            width: 225px;
            height: 225px;
            border-radius: 16px;
          }

          .intro-badge {
            margin-top: 14px;
            padding: 7px 24px;
            border-radius: 26px;
          }

          .intro-badge-text {
            font-size: 14px;
            letter-spacing: 1.8px;
          }
        }

        @keyframes sheenSweep {
          0% { transform: translateX(-100%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
      `}</style>
    </div>
  );
}
