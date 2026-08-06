'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PitchType, UserRole, TacticalBoardState, TacticalPlayer, TacticalBall, TacticalArrow, SavedTactic, TacticStep } from './types';
import { generateDefaultPlayers, FORMATION_PRESETS } from './formations';
import { TacticalPitch } from './TacticalPitch';
import { ControlPanel } from './ControlPanel';
import { TacticPlayerModal } from './TacticPlayerModal';
import {
  ArrowLeft,
  Plus,
  Save,
  Check,
  Play,
  RotateCcw,
  Trash2,
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp,
  Palette,
  Undo2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TacticCreatorProps {
  role: UserRole;
  onBackToList: () => void;
  onTacticSaved: () => void;
  initialTactic?: SavedTactic | null;
}

export const TacticCreator: React.FC<TacticCreatorProps> = ({
  role,
  onBackToList,
  onTacticSaved,
  initialTactic,
}) => {
  // Step B1 vs B2 State
  const [phase, setPhase] = useState<'B1' | 'B2'>(initialTactic ? 'B2' : 'B1');

  // Form B1 State & Tactic ID
  const [tacticId, setTacticId] = useState<string>(initialTactic?.id || '');
  const [tacticName, setTacticName] = useState(initialTactic?.name || '');
  const [pitchType, setPitchType] = useState<PitchType>(initialTactic?.pitchType || 5);
  const [formationA, setFormationA] = useState(initialTactic?.formationA || '1-2-1');
  const [formationB, setFormationB] = useState(initialTactic?.formationB || '1-2-1');
  const [teamAColor, setTeamAColor] = useState(initialTactic?.teamAColor || '#ef4444');
  const [teamBColor, setTeamBColor] = useState(initialTactic?.teamBColor || '#ffffff');
  const [gkColor, setGkColor] = useState(initialTactic?.gkColor || '#f59e0b');

  // Multi-step B2 State
  const [steps, setSteps] = useState<TacticStep[]>(initialTactic?.steps || []);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  // Ref for scrollable step tabs container
  const stepListRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll active step tab into view
  useEffect(() => {
    if (stepListRef.current && stepListRef.current.children[currentStepIdx]) {
      const activeElement = stepListRef.current.children[currentStepIdx] as HTMLElement;
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [currentStepIdx, steps.length]);

  // Active step drawing & board state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [arrowColor, setArrowColor] = useState('#ef4444');
  const [isSaving, setIsSaving] = useState(false);

  // Animation preview modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // B1: Submit Form to proceed to B2
  const handleProceedToB2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tacticName.trim()) {
      toast.error('Vui lòng nhập tên chiến thuật!');
      return;
    }

    // Initialize Step 1
    const initialPlayers = generateDefaultPlayers(pitchType, formationA, formationB);
    const initialStep: TacticStep = {
      id: `step_${Date.now()}_1`,
      stepNumber: 1,
      title: 'Vị trí ban đầu',
      players: initialPlayers,
      ball: { x: 50, y: 50 },
      arrows: [],
    };

    setSteps([initialStep]);
    setCurrentStepIdx(0);
    setPhase('B2');
    toast.success('Đã tạo Step 1! Hãy điều chỉnh vị trí cầu thủ và ấn "Lưu Step 1" để sang Step 2.');
  };

  // Get current active step
  const currentStep = steps[currentStepIdx] || steps[0];

  // Helper to update active step properties
  const updateCurrentStep = useCallback((updater: (prevStep: TacticStep) => TacticStep) => {
    setSteps((prevSteps) => {
      const copy = [...prevSteps];
      if (copy[currentStepIdx]) {
        copy[currentStepIdx] = updater(copy[currentStepIdx]);
      }
      return copy;
    });
  }, [currentStepIdx]);

  // Player & Ball Position Updaters for active step
  const handleUpdatePlayerPos = (id: string, x: number, y: number) => {
    updateCurrentStep((step) => ({
      ...step,
      players: step.players.map((p) => (p.id === id ? { ...p, x, y } : p)),
    }));
  };

  const handleUpdateBallPos = (x: number, y: number) => {
    updateCurrentStep((step) => ({
      ...step,
      ball: { x, y },
    }));
  };

  const handleAddArrow = (arrow: TacticalArrow) => {
    updateCurrentStep((step) => ({
      ...step,
      arrows: [...step.arrows, arrow],
    }));
  };

  const handleUndoLastArrow = useCallback(() => {
    updateCurrentStep((step) => ({
      ...step,
      arrows: step.arrows.slice(0, -1),
    }));
  }, [updateCurrentStep]);

  // Keyboard shortcuts for HLV (Ctrl+Z / Cmd+Z for Undo, Backspace / Delete for deleting last arrow)
  useEffect(() => {
    if (role !== 'hlv') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndoLastArrow();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleUndoLastArrow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [role, handleUndoLastArrow]);

  const handleClearAllArrows = () => {
    updateCurrentStep((step) => ({
      ...step,
      arrows: [],
    }));
  };

  const handleDeleteSingleArrow = (id: string) => {
    updateCurrentStep((step) => ({
      ...step,
      arrows: step.arrows.filter((a) => a.id !== id),
    }));
  };

  const handleUpdatePlayerDetails = (id: string, number: number | string, name: string) => {
    updateCurrentStep((step) => ({
      ...step,
      players: step.players.map((p) => (p.id === id ? { ...p, number, name } : p)),
    }));
  };

  // B2: Save current step and automatically create & switch to next step!
  const handleSaveStepAndAdvance = () => {
    if (!currentStep) return;

    const nextStepNum = currentStepIdx + 2;

    // Check if next step already exists
    if (currentStepIdx < steps.length - 1) {
      toast.success(`Đã lưu Step ${currentStepIdx + 1}! Chuyển sang Step ${currentStepIdx + 2}.`);
      setCurrentStepIdx(currentStepIdx + 1);
    } else {
      // Create new next step copying current step player & ball positions
      const newStep: TacticStep = {
        id: `step_${Date.now()}_${nextStepNum}`,
        stepNumber: nextStepNum,
        title: `Bước ${nextStepNum}`,
        players: currentStep.players.map((p) => ({ ...p })),
        ball: { ...currentStep.ball },
        arrows: [],
      };

      setSteps((prev) => [...prev, newStep]);
      setCurrentStepIdx(steps.length);
      toast.success(`Đã lưu Step ${currentStepIdx + 1}! Đã tạo tự động Step ${nextStepNum}.`);
    }
  };

  // Add an empty step manually
  const handleAddNewStep = () => {
    const lastStep = steps[steps.length - 1] || currentStep;
    const newStepNum = steps.length + 1;
    const newStep: TacticStep = {
      id: `step_${Date.now()}_${newStepNum}`,
      stepNumber: newStepNum,
      title: `Bước ${newStepNum}`,
      players: lastStep ? lastStep.players.map((p) => ({ ...p })) : generateDefaultPlayers(pitchType, formationA, formationB),
      ball: lastStep ? { ...lastStep.ball } : { x: 50, y: 50 },
      arrows: [],
    };

    setSteps((prev) => [...prev, newStep]);
    setCurrentStepIdx(steps.length);
  };

  // Remove a step
  const handleDeleteStep = (idx: number) => {
    if (steps.length <= 1) {
      toast.error('Chiến thuật cần ít nhất 1 step!');
      return;
    }

    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(updated);
    if (currentStepIdx >= updated.length) {
      setCurrentStepIdx(updated.length - 1);
    }
    toast.success('Đã xóa step.');
  };

  // Final Submit to save complete tactic to API
  const handleFinalSaveTactic = async () => {
    if (!tacticName.trim()) {
      toast.error('Vui lòng nhập tên chiến thuật!');
      return;
    }
    if (steps.length === 0) {
      toast.error('Vui lòng tạo ít nhất 1 step!');
      return;
    }

    setIsSaving(true);
    try {
      const tacticToSave: SavedTactic = {
        id: tacticId || `tactic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: tacticName.trim(),
        pitchType,
        formationA,
        formationB,
        teamAColor,
        teamBColor,
        gkColor,
        steps,
        createdAt: initialTactic?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/tactical-board/tactics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tactic: tacticToSave }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(initialTactic ? `Đã cập nhật chiến thuật "${tacticName}"!` : `Đã lưu thành công chiến thuật "${tacticName}"!`);
        onTacticSaved();
      } else {
        toast.error(data.error || 'Lỗi khi lưu chiến thuật');
      }
    } catch (err) {
      console.error('Error saving tactic:', err);
      toast.error('Không thể kết nối đến máy chủ.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render Phase B1 (Form Input Name & Config)
  if (phase === 'B1') {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        background: '#f8fafc',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '30px 36px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0',
        }}>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
              BƯỚC 1: NHẬP TÊN & CẤU HÌNH
            </h2>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              Thiết lập thông tin ban đầu cho chiến thuật mới
            </span>
          </div>

          <form onSubmit={handleProceedToB2} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Tactic Name Input */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
                ✏️ TÊN CHIẾN THUẬT *
              </label>
              <input
                type="text"
                value={tacticName}
                onChange={(e) => setTacticName(e.target.value)}
                placeholder="Ví dụ: Phản công 3v2 qua cánh trái..."
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '2px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#f8fafc',
                  color: '#0f172a',
                }}
              />
            </div>

            {/* Pitch Type Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                ⚽ KÍCH THƯỚC SÂN
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {([5, 7, 11] as PitchType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setPitchType(type);
                      const defaultForm = FORMATION_PRESETS[type][0];
                      setFormationA(defaultForm);
                      setFormationB(defaultForm);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      border: pitchType === type ? '2px solid #ef4444' : '1px solid #cbd5e1',
                      background: pitchType === type ? '#ef4444' : '#ffffff',
                      color: pitchType === type ? '#ffffff' : '#1e293b',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: pitchType === type ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    Sân {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Formations Selection */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#ef4444', marginBottom: '6px' }}>
                  ● Đội Red (Team A)
                </label>
                <select
                  value={formationA}
                  onChange={(e) => setFormationA(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                    background: '#ffffff',
                  }}
                >
                  {FORMATION_PRESETS[pitchType].map((f) => (
                    <option key={f} value={f}>
                      Sơ đồ {f}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  ○ Đội White (Team B)
                </label>
                <select
                  value={formationB}
                  onChange={(e) => setFormationB(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                    background: '#ffffff',
                  }}
                >
                  {FORMATION_PRESETS[pitchType].map((f) => (
                    <option key={f} value={f}>
                      Sơ đồ {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={onBackToList}
                style={{
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                <ArrowLeft size={16} /> Quay lại
              </button>

              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.35)',
                  transition: 'all 0.2s',
                }}
              >
                Tiếp tục sang B2: Thiết lập các bước (Steps) <ChevronRight size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Phase B2: Multi-step Tactical Pitch Editor
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#f8fafc',
      overflow: 'hidden',
      padding: '8px 12px 10px 12px',
      boxSizing: 'border-box',
    }}>
      {/* Top Navigation & Timeline Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '10px 16px',
        marginBottom: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Left: Back, Title & Step Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: '1 1 auto' }}>
          <button
            onClick={() => setPhase('B1')}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#475569',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ArrowLeft size={14} /> B1: Tên
          </button>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444' }}>
              BƯỚC 2: CẤU HÌNH THEO STEP (SÂN {pitchType})
            </span>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
              {tacticName}
            </h3>
          </div>

          {/* Vertical Divider */}
          <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />

          {/* Step Tabs Area: Scrollable List + Fixed Add Step Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: 0,
            flex: '1 1 auto',
          }}>
            {/* Scrollable list of Steps */}
            <div
              ref={stepListRef}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                padding: '2px 0',
                minWidth: 0,
                flex: '1 1 auto',
              }}
            >
              {steps.map((s, idx) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                  <button
                    onClick={() => setCurrentStepIdx(idx)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '10px',
                      border: currentStepIdx === idx ? '2px solid #ef4444' : '1px solid #cbd5e1',
                      background: currentStepIdx === idx ? '#ef4444' : '#ffffff',
                      color: currentStepIdx === idx ? '#ffffff' : '#334155',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: currentStepIdx === idx ? '0 2px 8px rgba(239,68,68,0.3)' : 'none',
                    }}
                  >
                    Step {idx + 1}
                  </button>
                  {steps.length > 1 && currentStepIdx === idx && (
                    <button
                      onClick={() => handleDeleteStep(idx)}
                      title="Xóa step này"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Fixed Add Step Button */}
            <button
              onClick={handleAddNewStep}
              style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1px dashed #ef4444',
                background: '#fff1f2',
                color: '#ef4444',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Plus size={14} /> Thêm Step
            </button>
          </div>
        </div>
      </div>

      {/* Pitch Canvas & Tools Container */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '12px',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Left Toolbar for Active Step */}
        <div style={{
          flex: '0 0 280px',
          width: '280px',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '14px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
        }}>
          {/* Step Actions & Replay */}
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '2px' }}>
              📍 QUẢN LÝ STEP
            </label>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#ef4444' }}>
              STEP {currentStepIdx + 1} / {steps.length}
            </div>

            {/* Save Step & Advance Button */}
            <button
              onClick={handleSaveStepAndAdvance}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Save size={15} /> Lưu Step {currentStepIdx + 1} & Sang Step {currentStepIdx + 2}
            </button>

            {/* Play Animation Preview */}
            <button
              onClick={() => setIsPreviewOpen(true)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid #3b82f6',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Play size={15} /> Play Xem Thử
            </button>
          </div>

          {/* Final Save Tactic Card */}
          <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '12px', border: '1px solid #fecaca' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#991b1b', marginBottom: '6px' }}>
              ✅ XONG TẤT CẢ CÁC BƯỚC?
            </label>
            <button
              onClick={handleFinalSaveTactic}
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '13px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(239,68,68,0.4)',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              <Check size={16} /> {isSaving ? 'Đang lưu...' : 'Hoàn Tất Chiến Thuật'}
            </button>
          </div>

          {/* Drawing Tools */}
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>
              ✏️ V VẼ MŨI TÊN DI CHUYỂN
            </label>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setIsDrawingMode(!isDrawingMode)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isDrawingMode ? '#ef4444' : '#3b82f6',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp size={14} /> {isDrawingMode ? 'Đang Vẽ...' : 'Vẽ Mũi Tên'}
              </button>
            </div>

            {/* Color circles */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
              {['#ef4444', '#ffffff', '#111827', '#f59e0b', '#3b82f6'].map((c) => (
                <div
                  key={c}
                  onClick={() => setArrowColor(c)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: c,
                    border: arrowColor === c ? '2px solid #0f172a' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            {/* Undo & Clear */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleUndoLastArrow}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#1e293b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <Undo2 size={13} /> Hoàn tác
              </button>
              <button
                onClick={handleClearAllArrows}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '8px',
                  border: '1px solid #fecdd3',
                  background: '#fff1f2',
                  color: '#be123c',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <Trash2 size={13} /> Xóa mũi tên
              </button>
            </div>
          </div>
        </div>

        {/* Tactical Pitch Canvas */}
        <div style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {currentStep && (
            <TacticalPitch
              role="hlv"
              players={currentStep.players || []}
              ball={currentStep.ball || { x: 50, y: 50 }}
              arrows={currentStep.arrows || []}
              teamAColor={teamAColor}
              teamBColor={teamBColor}
              gkColor={gkColor}
              arrowColor={arrowColor}
              isDrawingMode={isDrawingMode}
              onUpdatePlayerPos={handleUpdatePlayerPos}
              onUpdateBallPos={handleUpdateBallPos}
              onAddArrow={handleAddArrow}
              onDeleteSingleArrow={handleDeleteSingleArrow}
              onUpdatePlayerDetails={handleUpdatePlayerDetails}
            />
          )}
        </div>
      </div>

      {/* Animation Preview Modal */}
      {isPreviewOpen && (
        <TacticPlayerModal
          tactic={{
            id: 'draft',
            name: tacticName || 'Chiến thuật nháp',
            pitchType,
            formationA,
            formationB,
            teamAColor,
            teamBColor,
            gkColor,
            steps,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }}
          role={role}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};
