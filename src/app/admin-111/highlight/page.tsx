'use client';

import React from 'react';
import { AdminYouTubeConfigSection } from '@/components/AdminYouTubeConfigSection';

export default function AdminHighlightPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <AdminYouTubeConfigSection matchId="default_match" />
    </div>
  );
}
