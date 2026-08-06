'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SavedTactic, TacticStep, UserRole } from './types';
import { TacticalPitch } from './TacticalPitch';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, X, Sparkles, Volume2, VolumeX } from 'lucide-react';

interface TacticPlayerModalProps {
  tactic: SavedTactic;
  role: UserRole;
  onClose: () => void;
}

export const TacticPlayerModal: React.FC<TacticPlayerModalProps> = ({
  tactic,
  role,
  onClose,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1); // 0.5x, 1x, 1.5x, 2x
  const [isAnimating, setIsAnimating] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = tactic.steps.length;
  const currentStep: TacticStep = tactic.steps[currentStepIdx] || tactic.steps[0];

  // Advance to next step smoothly
  const handleNextStep = useCallback(() => {
    setCurrentStepIdx((prev) => {
      if (prev < totalSteps - 1) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 800 / speed);
        return prev + 1;
      } else {
        // Loop back to start after finishing
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 800 / speed);
        return 0;
      }
    });
  }, [totalSteps, speed]);

  const handlePrevStep = () => {
    setCurrentStepIdx((prev) => {
      const target = prev > 0 ? prev - 1 : totalSteps - 1;
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 800 / speed);
      return target;
    });
  };

  const handleJumpToStep = (idx: number) => {
    setIsAnimating(true);
    setCurrentStepIdx(idx);
    setTimeout(() => setIsAnimating(false), 800 / speed);
  };

  // Playback loop handler
  useEffect(() => {
    if (!isPlaying || totalSteps <= 1) return;

    const stepInterval = (2000) / speed;

    timerRef.current = setInterval(() => {
      handleNextStep();
    }, stepInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, totalSteps, speed, handleNextStep]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '95vw',
        maxWidth: '1000px',
        height: '88vh',
        maxHeight: '740px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}>
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          flex: '0 0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: '#ef4444',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '12px',
              letterSpacing: '0.5px',
            }}>
              SÂN {tactic.pitchType}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
                {tactic.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tactical Pitch Container */}
        <div style={{
          flex: 1,
          minHeight: 0,
          padding: '10px 14px',
          background: '#09150d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {currentStep && (
            <TacticalPitch
              role="player"
              players={currentStep.players || []}
              ball={currentStep.ball || { x: 50, y: 50 }}
              arrows={currentStep.arrows || []}
              teamAColor={tactic.teamAColor || '#ef4444'}
              teamBColor={tactic.teamBColor || '#ffffff'}
              gkColor={tactic.gkColor || '#f59e0b'}
              arrowColor="#ef4444"
              isDrawingMode={false}
              isAnimating={isAnimating}
              onUpdatePlayerPos={() => {}}
              onUpdateBallPos={() => {}}
              onAddArrow={() => {}}
            />
          )}

          {/* Floating Live Animation Badge */}
          <div style={{
            position: 'absolute',
            top: '14px',
            right: '18px',
            background: isPlaying ? 'rgba(239, 68, 68, 0.9)' : 'rgba(71, 85, 105, 0.9)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 60,
          }}>
            <Sparkles size={13} className={isPlaying ? 'animate-spin' : ''} />
            {isPlaying ? `ĐANG XEM CHIẾN THUẬT (${speed}x)` : 'TẠM DỪNG'}
          </div>
        </div>

        {/* Playback Control Bar */}
        <div style={{
          padding: '10px 20px 12px 20px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flex: '0 0 auto',
        }}>
          {/* Step Timeline Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}>
            {tactic.steps.map((step, idx) => (
              <button
                key={step.id || idx}
                onClick={() => handleJumpToStep(idx)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: currentStepIdx === idx ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  background: currentStepIdx === idx ? '#ef4444' : '#f8fafc',
                  color: currentStepIdx === idx ? '#ffffff' : '#334155',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxShadow: currentStepIdx === idx ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none',
                }}
              >
                Step {idx + 1}
              </button>
            ))}
          </div>

          {/* Action Buttons: Prev, Play/Pause, Next, Replay, Speed */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            {/* Speed Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>TỐC ĐỘ:</span>
              {[0.5, 1, 1.5, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: speed === s ? '1px solid #0f172a' : '1px solid #cbd5e1',
                    background: speed === s ? '#0f172a' : '#ffffff',
                    color: speed === s ? '#ffffff' : '#334155',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Playback Transport Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  setCurrentStepIdx(0);
                  setIsPlaying(true);
                }}
                title="Bắt đầu lại từ Step 1"
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>

              <button
                onClick={handlePrevStep}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SkipBack size={16} />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isPlaying ? '#0f172a' : '#ef4444',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  minWidth: '110px',
                  justifyContent: 'center',
                }}
              >
                {isPlaying ? (
                  <>
                    <Pause size={16} /> Tạm dừng
                  </>
                ) : (
                  <>
                    <Play size={16} /> Phát tiếp
                  </>
                )}
              </button>

              <button
                onClick={handleNextStep}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SkipForward size={16} />
              </button>
            </div>

            {/* Step Counter */}
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              Step <span style={{ color: '#ef4444' }}>{currentStepIdx + 1}</span> / {totalSteps}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
