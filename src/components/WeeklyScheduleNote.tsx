'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ClipboardCheck, Users, Trophy, CreditCard, ChevronRight, Pin, MapPin, X } from 'lucide-react';
import Link from 'next/link';

interface ScheduleItem {
  id: string;
  dayRange: string;
  task: string;
  days: number[]; // 0: Sunday, 1: Monday, 2: Tuesday, 3: Wednesday, 4: Thursday, 5: Friday, 6: Saturday
  icon: React.ReactNode;
  link?: string;
  linkText?: string;
}

const SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: 'diem-danh',
    dayRange: 'T2 -> T3',
    task: 'Điểm danh',
    days: [1, 2], // Mon, Tue
    icon: <ClipboardCheck size={16} />,
  },
  {
    id: 'xem-danh-sach',
    dayRange: 'T4',
    task: 'Xem danh sách team',
    days: [3], // Wed
    icon: <Users size={16} />,
  },
  {
    id: 'da-bong',
    dayRange: 'T5',
    task: 'Đá bóng',
    days: [4], // Thu
    icon: <Trophy size={16} />,
  },
  {
    id: 'dong-tien',
    dayRange: 'T6 -> CN',
    task: 'Đóng tiền sân',
    days: [5, 6, 0], // Fri, Sat, Sun
    icon: <CreditCard size={16} />,
  },
];

const MODAL_NOTE_STYLES = `
  /* Modal Overlay */
  .schedule-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 16px;
    animation: scheduleFadeIn 0.25s ease-out;
  }

  @keyframes scheduleFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Modal Card - Paper Note */
  .weekly-schedule-modal-paper {
    position: relative;
    width: 100%;
    max-width: 480px;
    padding: 24px 26px 20px 28px;
    background: #fffdf0;
    background-image: repeating-linear-gradient(#fffdf0, #fffdf0 31px, #e5e0c8 32px);
    border-radius: 8px 20px 8px 20px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 10px 15px -3px rgba(0, 0, 0, 0.2), inset 0 0 40px rgba(220, 200, 140, 0.2);
    border-left: 6px solid #ef4444;
    animation: scheduleScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes scheduleScaleUp {
    from { transform: scale(0.9) translateY(12px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }

  .schedule-close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(120, 53, 15, 0.1);
    border: none;
    color: #78350f;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 20;
  }

  .schedule-close-btn:hover {
    background: #ef4444;
    color: #ffffff;
    transform: rotate(90deg);
  }

  .note-pushpin-modal {
    position: absolute;
    top: -14px;
    left: 28px;
    font-size: 24px;
    filter: drop-shadow(2px 4px 3px rgba(0,0,0,0.3));
    z-index: 10;
  }

  .note-header {
    margin-bottom: 16px;
    border-bottom: 2px dashed #d6cfb3;
    padding-bottom: 10px;
  }

  .note-title {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    color: #78350f;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: 0.5px;
  }

  .note-subtitle {
    font-size: 12px;
    color: #92400e;
    font-style: italic;
    display: block;
    margin-top: 2px;
  }

  .note-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .note-step-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.75);
    border: 1px solid rgba(217, 119, 6, 0.18);
    transition: all 0.2s ease;
  }

  .note-step-item.is-today {
    background: #fef08a;
    border: 1.5px solid #eab308;
    box-shadow: 0 4px 12px rgba(234, 179, 8, 0.25);
  }

  .step-day-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    color: #92400e;
    font-size: 13px;
    min-width: 100px;
  }

  .note-step-item.is-today .step-day-badge {
    color: #854d0e;
    font-weight: 900;
  }

  .step-task-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }

  .step-task-name {
    font-size: 14px;
    font-weight: 600;
    color: #451a03;
  }

  .note-step-item.is-today .step-task-name {
    font-weight: 900;
    color: #000000;
    background: linear-gradient(120deg, rgba(250, 204, 21, 0.5) 0%, rgba(250, 204, 21, 0.9) 100%);
    padding: 2px 8px;
    border-radius: 4px;
  }

  .today-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #ef4444;
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 12px;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
  }

  .step-link-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(217, 119, 6, 0.15);
    color: #b45309;
    text-decoration: none;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .step-link-btn:hover {
    background: #b45309;
    color: #ffffff;
    transform: scale(1.1);
  }

  .note-footer {
    margin-top: 14px;
    padding-top: 8px;
    border-top: 1px dashed rgba(217, 119, 6, 0.2);
    font-size: 11px;
    color: #78350f;
    text-align: center;
  }

  /* Trigger Button */
  .schedule-trigger-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 20px;
    background: linear-gradient(135deg, #fffdf0 0%, #fef3c7 100%);
    border: 1.5px solid #f59e0b;
    color: #78350f;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
    transition: all 0.25s ease;
  }

  .schedule-trigger-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(245, 158, 11, 0.35);
    background: #fef08a;
  }
`;

export default function WeeklyScheduleNote() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDay, setCurrentDay] = useState<number>(-1);

  useEffect(() => {
    setCurrentDay(new Date().getDay());
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MODAL_NOTE_STYLES }} />

      {/* Inline Trigger Button / Banner */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 24px auto' }}>
        <button
          className="schedule-trigger-btn"
          onClick={() => setIsOpen(true)}
          title="Mở lịch hoạt động tuần"
        >
          <Pin size={16} style={{ transform: 'rotate(-45deg)', color: '#ef4444', fill: '#ef4444' }} />
          <span>LỊCH HOẠT ĐỘNG TRONG TUẦN</span>
          <span style={{ fontSize: '11px', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
            📌 Xem
          </span>
        </button>
      </div>

      {/* Modal Popup */}
      {isOpen && (
        <div className="schedule-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="weekly-schedule-modal-paper" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button className="schedule-close-btn" onClick={() => setIsOpen(false)} title="Đóng">
              <X size={18} />
            </button>

            {/* Sticky Pushpin Icon */}
            <div className="note-pushpin-modal" title="Lịch hoạt động tuần">
              <Pin size={24} style={{ transform: 'rotate(-45deg)', fill: '#ef4444', color: '#dc2626' }} />
            </div>

            {/* Header */}
            <div className="note-header">
              <h3 className="note-title">
                <Calendar size={18} className="note-title-icon" />
                LỊCH HOẠT ĐỘNG TRONG TUẦN
              </h3>
              <span className="note-subtitle">Dành cho các thành viên FC</span>
            </div>

            {/* Schedule Items List */}
            <div className="note-content">
              {SCHEDULE_ITEMS.map((item) => {
                const isToday = currentDay !== -1 && item.days.includes(currentDay);

                return (
                  <div
                    key={item.id}
                    className={`note-step-item ${isToday ? 'is-today' : ''}`}
                  >
                    {/* Day badge */}
                    <div className="step-day-badge">
                      <span className="step-icon">{item.icon}</span>
                      <span className="step-range">{item.dayRange}:</span>
                    </div>

                    {/* Task text */}
                    <div className="step-task-info">
                      <span className="step-task-name">{item.task}</span>
                      {isToday && (
                        <span className="today-tag">
                          <MapPin size={10} style={{ display: 'inline', marginRight: '1px' }} /> HÔM NAY
                        </span>
                      )}
                    </div>

                    {/* Optional Quick Link */}
                    {item.link && (
                      <Link href={item.link} className="step-link-btn" title={item.linkText} onClick={() => setIsOpen(false)}>
                        <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer note */}
            <div className="note-footer">
              <i>Vui lòng chú ý mốc thời gian để điểm danh và đóng tiền đúng hạn!</i>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
