'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UserRole } from './types';
import { Send, MessageSquare, Shield, User, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface ChatMessage {
  id: string;
  senderRole: UserRole;
  senderName: string;
  text: string;
  timestamp: string;
}

interface LiveChatProps {
  role: UserRole;
  messages: ChatMessage[];
  onSendMessage: (text: string, senderName: string) => void;
  onLogout?: () => void;
}

export const LiveChat: React.FC<LiveChatProps> = ({
  role,
  messages,
  onSendMessage,
  onLogout,
}) => {
  const isHlv = role === 'hlv';

  // Saved player name in localStorage (max 10 chars, no spaces)
  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chamhet_tactical_player_name') || '';
    }
    return '';
  });

  const [inputMsg, setInputMsg] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePlayerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Force continuous string without space and max 10 chars
    const cleaned = e.target.value.replace(/\s+/g, '').slice(0, 10);
    setPlayerName(cleaned);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chamhet_tactical_player_name', cleaned);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMsg.trim();
    if (!text) return;

    if (!isHlv) {
      if (!playerName.trim()) {
        toast.error('Vui lòng nhập tên cầu thủ (viết liền, tối đa 10 ký tự)!');
        return;
      }
    }

    const finalName = isHlv ? 'HLV' : playerName.replace(/\s+/g, '').slice(0, 10);
    onSendMessage(text, finalName);
    setInputMsg('');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '10px 14px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 800, fontSize: '13px' }}>
          <MessageSquare size={16} style={{ color: '#ef4444' }} /> Khung Chat Realtime
        </div>

        {/* LogOut Icon Button */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Đổi quyền / Đăng xuất"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#fff1f2',
              color: '#be123c',
              border: '1px solid #fecdd3',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={14} />
          </button>
        )}
      </div>

      {/* Message List */}
      <div style={{
        flex: 1,
        padding: '12px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {messages.length === 0 ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '12px',
            padding: '20px',
          }}>
            Chưa có tin nhắn nào.<br />Hãy trao đổi chiến thuật ngay!
          </div>
        ) : (
          messages.map((msg) => {
            const isHlvSender = msg.senderRole === 'hlv';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  background: isHlvSender ? 'rgba(239, 68, 68, 0.08)' : '#f1f5f9',
                  border: isHlvSender ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #e2e8f0',
                  padding: '8px 10px',
                  borderRadius: '10px',
                }}
              >
                {/* Sender Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', width: '100%' }}>
                  {isHlvSender ? (
                    <span style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 900,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}>
                      <Shield size={10} /> HLV
                    </span>
                  ) : (
                    <span style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #bae6fd',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}>
                      <User size={10} /> {msg.senderName}
                    </span>
                  )}
                  <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 'auto' }}>
                    {msg.timestamp}
                  </span>
                </div>

                {/* Message Text */}
                <div style={{
                  color: '#0f172a',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  wordBreak: 'break-word',
                  lineHeight: '1.4',
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} style={{
        padding: '10px 12px',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {/* Player Name Input (Required for Player role, max 10 chars, no spaces) */}
        {!isHlv && (
          <div>
            <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: 700, marginBottom: '3px' }}>
              Tên cầu thủ (viết liền, tối đa 10 ký tự):
            </div>
            <input
              type="text"
              value={playerName}
              onChange={handlePlayerNameChange}
              placeholder="VD: Nam99"
              maxLength={10}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Message Input & Send Button */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder={isHlv ? 'Nhập chỉ đạo HLV...' : 'Nhập tin nhắn...'}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '12.5px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: '#ef4444',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            <Send size={13} /> Gửi
          </button>
        </div>
      </form>
    </div>
  );
};
