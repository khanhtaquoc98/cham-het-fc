'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface FloatingStickerProps {
  ballSrc?: string;
  sticker2Src?: string;
  ballSize?: number;
  sticker2Size?: number;
}

export default function FloatingSticker({
  ballSrc = '/ball.png',
  sticker2Src = '/sticker2.png',
  ballSize = 70,
  sticker2Size = 110,
}: FloatingStickerProps) {
  const sticker1Ref = useRef<HTMLDivElement>(null);
  const sticker2Ref = useRef<HTMLDivElement>(null);

  const [isSt2Hovered, setIsSt2Hovered] = useState(false);
  const [kickEffect, setKickEffect] = useState(false);

  // Physics states stored in refs for 60fps performance without React re-renders
  const ballPos = useRef({ x: 100, y: 150 });
  const ballVel = useRef({ vx: 2.2, vy: 1.8 });
  const ballRot = useRef(0);
  const ballIsDragging = useRef(false);
  const ballDragStart = useRef({ x: 0, y: 0 });
  const ballLastMouse = useRef({ x: 0, y: 0, time: 0 });
  const ballMouseVel = useRef({ vx: 0, vy: 0 });

  const st2Pos = useRef({ x: 300, y: 300 });
  const st2Vel = useRef({ vx: -2.0, vy: -1.6 });
  const st2Rot = useRef(0);
  const st2IsDragging = useRef(false);
  const st2DragStart = useRef({ x: 0, y: 0 });
  const st2LastMouse = useRef({ x: 0, y: 0, time: 0 });
  const st2MouseVel = useRef({ vx: 0, vy: 0 });
  const st2IsHoveredRef = useRef(false);

  const requestRef = useRef<number | null>(null);

  const triggerKickVisual = () => {
    setKickEffect(true);
    setTimeout(() => setKickEffect(false), 220);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Initial positions away from each other
      ballPos.current = { x: Math.floor(w * 0.25), y: Math.floor(h * 0.35) };
      st2Pos.current = { x: Math.floor(w * 0.65), y: Math.floor(h * 0.55) };

      const angle1 = Math.random() * Math.PI * 2;
      ballVel.current = { vx: Math.cos(angle1) * 2.2, vy: Math.sin(angle1) * 2.2 };

      const angle2 = Math.random() * Math.PI * 2;
      st2Vel.current = { vx: Math.cos(angle2) * 2.0, vy: Math.sin(angle2) * 2.0 };
    }

    const updatePhysics = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const friction = 0.975;
      const normalSpeedBall = 2.2;
      const normalSpeedSt2 = 2.0;

      // 1. UPDATE BALL PHYSICS (STICKER 1 - SOCCER BALL)
      if (!ballIsDragging.current) {
        const ballSpeed = Math.hypot(ballVel.current.vx, ballVel.current.vy);
        if (ballSpeed > normalSpeedBall) {
          const newSpeed = Math.max(normalSpeedBall, ballSpeed * friction);
          const r = newSpeed / ballSpeed;
          ballVel.current.vx *= r;
          ballVel.current.vy *= r;
        } else if (ballSpeed < normalSpeedBall * 0.4 && ballSpeed > 0.01) {
          const r = (normalSpeedBall * 0.4) / ballSpeed;
          ballVel.current.vx *= r;
          ballVel.current.vy *= r;
        }

        ballPos.current.x += ballVel.current.vx;
        ballPos.current.y += ballVel.current.vy;

        // Bounce walls for Ball
        if (ballPos.current.x <= 0) {
          ballPos.current.x = 0;
          ballVel.current.vx = Math.abs(ballVel.current.vx);
        } else if (ballPos.current.x + ballSize >= w) {
          ballPos.current.x = w - ballSize;
          ballVel.current.vx = -Math.abs(ballVel.current.vx);
        }

        if (ballPos.current.y <= 0) {
          ballPos.current.y = 0;
          ballVel.current.vy = Math.abs(ballVel.current.vy);
        } else if (ballPos.current.y + ballSize >= h) {
          ballPos.current.y = h - ballSize;
          ballVel.current.vy = -Math.abs(ballVel.current.vy);
        }

        // Ball rolling spin rotation
        ballRot.current += (ballVel.current.vx * 0.5 + ballVel.current.vy * 0.3);
      }

      // 2. UPDATE STICKER 2 PHYSICS
      const st2SpeedMult = st2IsHoveredRef.current ? 0.25 : 1.0;

      if (!st2IsDragging.current) {
        const st2Speed = Math.hypot(st2Vel.current.vx, st2Vel.current.vy);
        if (st2Speed > normalSpeedSt2) {
          const newSpeed = Math.max(normalSpeedSt2, st2Speed * friction);
          const r = newSpeed / st2Speed;
          st2Vel.current.vx *= r;
          st2Vel.current.vy *= r;
        } else if (st2Speed < normalSpeedSt2 * 0.4 && st2Speed > 0.01) {
          const r = (normalSpeedSt2 * 0.4) / st2Speed;
          st2Vel.current.vx *= r;
          st2Vel.current.vy *= r;
        }

        st2Pos.current.x += st2Vel.current.vx * st2SpeedMult;
        st2Pos.current.y += st2Vel.current.vy * st2SpeedMult;

        // Bounce walls for Sticker 2
        if (st2Pos.current.x <= 0) {
          st2Pos.current.x = 0;
          st2Vel.current.vx = Math.abs(st2Vel.current.vx);
        } else if (st2Pos.current.x + sticker2Size >= w) {
          st2Pos.current.x = w - sticker2Size;
          st2Vel.current.vx = -Math.abs(st2Vel.current.vx);
        }

        if (st2Pos.current.y <= 0) {
          st2Pos.current.y = 0;
          st2Vel.current.vy = Math.abs(st2Vel.current.vy);
        } else if (st2Pos.current.y + sticker2Size >= h) {
          st2Pos.current.y = h - sticker2Size;
          st2Vel.current.vy = -Math.abs(st2Vel.current.vy);
        }

        st2Rot.current += st2Vel.current.vx * 0.2 * st2SpeedMult;
      }

      // 3. COLLISION / KICK PHYSICS (When Sticker 2 comes close to Ball)
      const c1x = ballPos.current.x + ballSize / 2;
      const c1y = ballPos.current.y + ballSize / 2;

      const c2x = st2Pos.current.x + sticker2Size / 2;
      const c2y = st2Pos.current.y + sticker2Size / 2;

      const dx = c1x - c2x;
      const dy = c1y - c2y;
      const dist = Math.hypot(dx, dy);

      const collisionRadius = (ballSize + sticker2Size) / 2 - 5; // Distance threshold for kick collision

      if (dist < collisionRadius) {
        let nx = dx / (dist || 1);
        let ny = dy / (dist || 1);
        if (dist === 0) {
          nx = 1;
          ny = 0;
        }

        // Calculate kick velocity
        const st2V = st2IsDragging.current
          ? Math.hypot(st2MouseVel.current.vx, st2MouseVel.current.vy)
          : Math.hypot(st2Vel.current.vx, st2Vel.current.vy);

        const kickPower = Math.max(18, st2V * 1.6 + 12);

        let kickVx = nx * kickPower;
        let kickVy = ny * kickPower;

        if (st2IsDragging.current) {
          kickVx += st2MouseVel.current.vx * 0.7;
          kickVy += st2MouseVel.current.vy * 0.7;
        }

        // Launch the ball away!
        ballVel.current = { vx: kickVx, vy: kickVy };

        // Position displacement outside overlap zone
        const overlap = collisionRadius - dist + 6;
        ballPos.current.x += nx * overlap;
        ballPos.current.y += ny * overlap;

        // Fast spin on kick
        ballRot.current += (Math.random() - 0.5) * 80;

        triggerKickVisual();
      }

      // 4. APPLY HARDWARE ACCELERATED DOM TRANSFORMS
      if (sticker1Ref.current) {
        sticker1Ref.current.style.transform = `translate3d(${ballPos.current.x}px, ${ballPos.current.y}px, 0) rotate(${ballRot.current}deg)`;
      }
      if (sticker2Ref.current) {
        sticker2Ref.current.style.transform = `translate3d(${st2Pos.current.x}px, ${st2Pos.current.y}px, 0) rotate(${st2Rot.current}deg)`;
      }

      requestRef.current = requestAnimationFrame(updatePhysics);
    };

    requestRef.current = requestAnimationFrame(updatePhysics);

    const handleResize = () => {
      ballPos.current.x = Math.min(ballPos.current.x, window.innerWidth - ballSize);
      ballPos.current.y = Math.min(ballPos.current.y, window.innerHeight - ballSize);

      st2Pos.current.x = Math.min(st2Pos.current.x, window.innerWidth - sticker2Size);
      st2Pos.current.y = Math.min(st2Pos.current.y, window.innerHeight - sticker2Size);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [ballSize, sticker2Size]);

  // Pointer event handlers for Ball (Sticker 1)
  const handleBallPointerDown = (e: React.PointerEvent) => {
    ballIsDragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ballDragStart.current = {
      x: e.clientX - ballPos.current.x,
      y: e.clientY - ballPos.current.y,
    };
    ballLastMouse.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    ballMouseVel.current = { vx: 0, vy: 0 };
  };

  const handleBallPointerMove = (e: React.PointerEvent) => {
    if (!ballIsDragging.current) return;
    const newX = e.clientX - ballDragStart.current.x;
    const newY = e.clientY - ballDragStart.current.y;

    const now = Date.now();
    const dt = Math.max(1, now - ballLastMouse.current.time);
    const dx = e.clientX - ballLastMouse.current.x;
    const dy = e.clientY - ballLastMouse.current.y;

    ballMouseVel.current = {
      vx: (dx / dt) * 16,
      vy: (dy / dt) * 16,
    };
    ballLastMouse.current = { x: e.clientX, y: e.clientY, time: now };

    ballPos.current.x = Math.max(0, Math.min(window.innerWidth - ballSize, newX));
    ballPos.current.y = Math.max(0, Math.min(window.innerHeight - ballSize, newY));

    if (sticker1Ref.current) {
      sticker1Ref.current.style.transform = `translate3d(${ballPos.current.x}px, ${ballPos.current.y}px, 0) rotate(${ballRot.current}deg)`;
    }
  };

  const handleBallPointerUp = () => {
    if (!ballIsDragging.current) return;
    ballIsDragging.current = false;

    const maxThrowSpeed = 18;
    let vx = ballMouseVel.current.vx;
    let vy = ballMouseVel.current.vy;
    const speed = Math.hypot(vx, vy);

    if (speed < 0.5) {
      const angle = Math.random() * Math.PI * 2;
      vx = Math.cos(angle) * 2.2;
      vy = Math.sin(angle) * 2.2;
    } else if (speed > maxThrowSpeed) {
      vx = (vx / speed) * maxThrowSpeed;
      vy = (vy / speed) * maxThrowSpeed;
    }
    ballVel.current = { vx, vy };
  };

  // Pointer event handlers for Sticker 2
  const handleSt2PointerDown = (e: React.PointerEvent) => {
    st2IsDragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    st2DragStart.current = {
      x: e.clientX - st2Pos.current.x,
      y: e.clientY - st2Pos.current.y,
    };
    st2LastMouse.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    st2MouseVel.current = { vx: 0, vy: 0 };
  };

  const handleSt2PointerMove = (e: React.PointerEvent) => {
    if (!st2IsDragging.current) return;
    const newX = e.clientX - st2DragStart.current.x;
    const newY = e.clientY - st2DragStart.current.y;

    const now = Date.now();
    const dt = Math.max(1, now - st2LastMouse.current.time);
    const dx = e.clientX - st2LastMouse.current.x;
    const dy = e.clientY - st2LastMouse.current.y;

    st2MouseVel.current = {
      vx: (dx / dt) * 16,
      vy: (dy / dt) * 16,
    };
    st2LastMouse.current = { x: e.clientX, y: e.clientY, time: now };

    st2Pos.current.x = Math.max(0, Math.min(window.innerWidth - sticker2Size, newX));
    st2Pos.current.y = Math.max(0, Math.min(window.innerHeight - sticker2Size, newY));

    if (sticker2Ref.current) {
      sticker2Ref.current.style.transform = `translate3d(${st2Pos.current.x}px, ${st2Pos.current.y}px, 0) rotate(${st2Rot.current}deg)`;
    }
  };

  const handleSt2PointerUp = () => {
    if (!st2IsDragging.current) return;
    st2IsDragging.current = false;

    const maxThrowSpeed = 16;
    let vx = st2MouseVel.current.vx;
    let vy = st2MouseVel.current.vy;
    const speed = Math.hypot(vx, vy);

    if (speed < 0.5) {
      const angle = Math.random() * Math.PI * 2;
      vx = Math.cos(angle) * 2.0;
      vy = Math.sin(angle) * 2.0;
    } else if (speed > maxThrowSpeed) {
      vx = (vx / speed) * maxThrowSpeed;
      vy = (vy / speed) * maxThrowSpeed;
    }
    st2Vel.current = { vx, vy };
  };

  return (
    <>
      {/* STICKER 1: SOCCER BALL */}
      <div
        ref={sticker1Ref}
        onPointerDown={handleBallPointerDown}
        onPointerMove={handleBallPointerMove}
        onPointerUp={handleBallPointerUp}
        className="fixed top-0 left-0 z-50 select-none touch-none group cursor-grab active:cursor-grabbing"
        style={{
          width: `${ballSize}px`,
          height: `${ballSize}px`,
          willChange: 'transform',
        }}
      >
        <div
          className={`relative w-full h-full transition-transform duration-200 ease-out ${
            kickEffect ? 'scale-125 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]' : ''
          }`}
        >
          {/* Soccer Ball Glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 blur-md group-hover:blur-lg transition-all duration-300" />

          <Image
            src={ballSrc}
            alt="World Cup Ball"
            width={ballSize}
            height={ballSize}
            priority
            unoptimized
            className="w-full h-full object-contain filter drop-shadow-lg pointer-events-none"
          />
        </div>
      </div>

      {/* STICKER 2 */}
      <div
        ref={sticker2Ref}
        onPointerDown={handleSt2PointerDown}
        onPointerMove={handleSt2PointerMove}
        onPointerUp={handleSt2PointerUp}
        onMouseEnter={() => {
          st2IsHoveredRef.current = true;
          setIsSt2Hovered(true);
        }}
        onMouseLeave={() => {
          st2IsHoveredRef.current = false;
          setIsSt2Hovered(false);
        }}
        className="fixed top-0 left-0 z-50 select-none touch-none group cursor-grab active:cursor-grabbing"
        style={{
          width: `${sticker2Size}px`,
          height: `${sticker2Size}px`,
          willChange: 'transform',
        }}
      >
        <div
          className={`relative w-full h-full transition-transform duration-300 ease-out ${
            isSt2Hovered ? 'scale-110 drop-shadow-[0_10px_25px_rgba(239,68,68,0.45)]' : ''
          }`}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-md group-hover:blur-lg transition-all duration-300" />

          <Image
            src={sticker2Src}
            alt="Floating Sticker 2"
            width={sticker2Size}
            height={sticker2Size}
            priority
            unoptimized
            className="w-full h-full object-contain filter drop-shadow-md pointer-events-none"
          />
        </div>
      </div>
    </>
  );
}
