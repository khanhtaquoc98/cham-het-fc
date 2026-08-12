'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, ChevronRight, Clock, Users, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface ScheduleItem {
  id: string;
  dayRange: string;
  task: string;
  days: number[]; // 0: Sunday, 1: Monday, 2: Tuesday, 3: Wednesday, 4: Thursday, 5: Friday, 6: Saturday
  icon: string;
  link?: string;
  linkText?: string;
}

const SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: 'diem-danh',
    dayRange: 'T2 -> T3',
    task: 'Điểm danh',
    days: [1, 2], // Mon, Tue
    icon: '📋',
  },
  {
    id: 'xem-danh-sach',
    dayRange: 'T4',
    task: 'Xem danh sách team',
    days: [3], // Wed
    icon: '👥',
  },
  {
    id: 'da-bong',
    dayRange: 'T5',
    task: 'Đá bóng',
    days: [4], // Thu
    icon: '⚽',
    link: '/match-now',
    linkText: 'Xem sân',
  },
  {
    id: 'dong-tien',
    dayRange: 'T6 -> CN',
    task: 'Đóng tiền sân',
    days: [5, 6, 0], // Fri, Sat, Sun
    icon: '💳',
    link: '/payment',
    linkText: 'Đóng tiền',
  },
];

export default function WeeklyScheduleNote() {
  const [currentDay, setCurrentDay] = useState<number>(-1);

  useEffect(() => {
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    setCurrentDay(new Date().getDay());
  }, []);

  return (
    <div className="weekly-schedule-paper">
      {/* Sticky Pushpin Icon */}
      <div className="note-pushpin" title="Lịch hoạt động tuần">
        📌
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
                    <span className="today-pulse" />
                    📍 HÔM NAY
                  </span>
                )}
              </div>

              {/* Optional Quick Link */}
              {item.link && (
                <Link href={item.link} className="step-link-btn" title={item.linkText}>
                  <ChevronRight size={14} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="note-footer">
        📌 <i>Vui lòng chú ý mốc thời gian để điểm danh và đóng tiền đúng hạn!</i>
      </div>
    </div>
  );
}
