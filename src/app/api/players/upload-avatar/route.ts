import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const filename = formData.get('filename') as string | null;

    if (!file || !filename) {
      return NextResponse.json({ error: 'File và filename là bắt buộc' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Ensure bucket 'players' exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const hasPlayersBucket = buckets?.some((b) => b.name === 'players' || b.id === 'players');
      if (!hasPlayersBucket) {
        await supabase.storage.createBucket('players', { public: true });
      }
    } catch (bErr) {
      console.warn('Bucket check warning:', bErr);
    }

    // 2. Upload file to Supabase storage 'players' bucket
    const targetPath = filename.endsWith('.webp') ? filename : `${filename}.webp`;
    const { data, error } = await supabase.storage
      .from('players')
      .upload(targetPath, buffer, {
        cacheControl: '0',
        upsert: true,
        contentType: file.type || 'image/webp',
      });

    if (error) {
      console.error('Supabase storage server upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, targetPath, data });
  } catch (err: any) {
    console.error('Upload route exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
