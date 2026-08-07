'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface FloatingStickerProps {
  imageSrc?: string;
  size?: number;
  initialSpeed?: number;
  friction?: number; // Deceleration factor when speed exceeds initialSpeed
}

export default function FloatingSticker({
  imageSrc = '/sticker.webp',
  size = 110,
  initialSpeed = 2.5,
  friction = 0.98,
}: FloatingStickerProps) {
  const stickerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Physics state stored in refs for 60fps smoothness without re-renders
  const pos = useRef({ x: 50, y: 100 });
  const vel = useRef({ vx: initialSpeed, vy: initialSpeed * 0.85 });
  const rotation = useRef(0);
  const isDragging = useRef(false);
  const isHoveredRef = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0, time: 0 });
  const mouseVel = useRef({ vx: 0, vy: 0 });
  const requestRef = useRef<number | null>(null);

  // Smooth speed multiplier (decelerates smoothly on hover instead of instant freeze)
  const speedMult = useRef(1.0);

  // Visual bounce effect feedback
  const [bounceEffect, setBounceEffect] = useState(false);

  const triggerBounceVisual = () => {
    setBounceEffect(true);
    setTimeout(() => setBounceEffect(false), 150);
  };

  useEffect(() => {
    // Set initial position inside screen bounds
    if (typeof window !== 'undefined') {
      const maxX = Math.max(10, window.innerWidth - size - 20);
      const maxY = Math.max(10, window.innerHeight - size - 20);
      pos.current = {
        x: Math.floor(Math.random() * (maxX - 50)) + 25,
        y: Math.floor(Math.random() * (maxY - 50)) + 25,
      };
      // Random direction
      const angle = Math.random() * Math.PI * 2;
      vel.current = {
        vx: Math.cos(angle) * initialSpeed,
        vy: Math.sin(angle) * initialSpeed,
      };
    }

    const updatePhysics = () => {
      if (!stickerRef.current) return;

      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Smoothly adjust speed multiplier on hover (slow down to 25% instead of abrupt stop)
      const targetMult = isHoveredRef.current ? 0.25 : 1.0;
      speedMult.current += (targetMult - speedMult.current) * 0.1;

      if (!isDragging.current) {
        // Friction damping: Gradually slow down high velocity (from mouse throw) back to initialSpeed
        const currentSpeed = Math.sqrt(vel.current.vx * vel.current.vx + vel.current.vy * vel.current.vy);
        if (currentSpeed > initialSpeed) {
          const newSpeed = Math.max(initialSpeed, currentSpeed * friction);
          const ratio = newSpeed / currentSpeed;
          vel.current.vx *= ratio;
          vel.current.vy *= ratio;
        } else if (currentSpeed < initialSpeed * 0.4 && currentSpeed > 0.01) {
          // Ensure it doesn't stall completely
          const ratio = (initialSpeed * 0.4) / currentSpeed;
          vel.current.vx *= ratio;
          vel.current.vy *= ratio;
        }

        // Apply position update with smooth speed multiplier
        pos.current.x += vel.current.vx * speedMult.current;
        pos.current.y += vel.current.vy * speedMult.current;

        let bounced = false;

        // Bounce left / right
        if (pos.current.x <= 0) {
          pos.current.x = 0;
          vel.current.vx = Math.abs(vel.current.vx);
          bounced = true;
        } else if (pos.current.x + size >= windowWidth) {
          pos.current.x = windowWidth - size;
          vel.current.vx = -Math.abs(vel.current.vx);
          bounced = true;
        }

        // Bounce top / bottom
        if (pos.current.y <= 0) {
          pos.current.y = 0;
          vel.current.vy = Math.abs(vel.current.vy);
          bounced = true;
        } else if (pos.current.y + size >= windowHeight) {
          pos.current.y = windowHeight - size;
          vel.current.vy = -Math.abs(vel.current.vy);
          bounced = true;
        }

        if (bounced) {
          triggerBounceVisual();
          rotation.current += (Math.random() - 0.5) * 20;
        }

        // Natural tilt/rotation based on velocity & speed multiplier
        rotation.current += vel.current.vx * 0.2 * speedMult.current;
      }

      // Update DOM transform using translate3d for 60fps hardware acceleration
      if (stickerRef.current) {
        stickerRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) rotate(${rotation.current}deg)`;
      }

      requestRef.current = requestAnimationFrame(updatePhysics);
    };

    requestRef.current = requestAnimationFrame(updatePhysics);

    const handleResize = () => {
      pos.current.x = Math.min(pos.current.x, window.innerWidth - size);
      pos.current.y = Math.min(pos.current.y, window.innerHeight - size);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [size, initialSpeed, friction]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = {
      x: e.clientX - pos.current.x,
      y: e.clientY - pos.current.y,
    };
    lastMousePos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    mouseVel.current = { vx: 0, vy: 0 };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;

    const now = Date.now();
    const dt = Math.max(1, now - lastMousePos.current.time);
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    mouseVel.current = {
      vx: (dx / dt) * 16,
      vy: (dy / dt) * 16,
    };

    lastMousePos.current = { x: e.clientX, y: e.clientY, time: now };

    pos.current.x = Math.max(0, Math.min(window.innerWidth - size, newX));
    pos.current.y = Math.max(0, Math.min(window.innerHeight - size, newY));

    if (stickerRef.current) {
      stickerRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) rotate(${rotation.current}deg)`;
    }
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const maxThrowSpeed = 16;
    let vx = mouseVel.current.vx;
    let vy = mouseVel.current.vy;

    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed < 0.5) {
      const angle = Math.random() * Math.PI * 2;
      vx = Math.cos(angle) * initialSpeed;
      vy = Math.sin(angle) * initialSpeed;
    } else if (speed > maxThrowSpeed) {
      vx = (vx / speed) * maxThrowSpeed;
      vy = (vy / speed) * maxThrowSpeed;
    }

    vel.current = { vx, vy };
  };

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    setIsHovered(false);
  };

  return (
    <div
      ref={stickerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed top-0 left-0 z-50 select-none touch-none group cursor-grab active:cursor-grabbing"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        willChange: 'transform',
      }}
    >
      <div
        className={`relative w-full h-full transition-transform duration-300 ease-out ${
          isHovered ? 'scale-110 drop-shadow-[0_10px_25px_rgba(239,68,68,0.45)]' : ''
        } ${bounceEffect ? 'scale-95' : ''}`}
      >
        {/* Subtle Glow backdrop */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-md group-hover:blur-lg transition-all duration-300" />

        {/* Sticker Image */}
        <Image
          src={imageSrc}
          alt="Bouncing Sticker"
          width={size}
          height={size}
          priority
          unoptimized
          className="w-full h-full object-contain filter drop-shadow-md pointer-events-none"
        />
      </div>
    </div>
  );
}
