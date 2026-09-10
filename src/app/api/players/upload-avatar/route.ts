import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const filename = formData.get('filename') as string | null;
    const playerId = formData.get('playerId') as string | null;
    const onlyPng = formData.get('onlyPng') === 'true';

    if (!file || !filename) {
      return NextResponse.json({ error: 'File và filename là bắt buộc' }, { status: 400 });
    }

    const isPng =
      file.type === 'image/png' ||
      file.name.toLowerCase().endsWith('.png') ||
      filename.toLowerCase().endsWith('.png');

    if (onlyPng && !isPng) {
      return NextResponse.json(
        { error: 'Chỉ chấp nhận ảnh định dạng PNG! Vui lòng tách nền tại remove.bg rồi tải ảnh PNG lên.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let targetPath = filename;
    if (!targetPath.endsWith('.webp') && !targetPath.endsWith('.png')) {
      targetPath = isPng ? `${targetPath}.png` : `${targetPath}.webp`;
    }

    const contentType = isPng ? 'image/png' : (file.type || 'image/webp');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udlhudfxwuwbecjqvvhv.supabase.co';

    // 1. Attempt upload to Supabase Storage 'players' bucket
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const hasPlayersBucket = buckets?.some((b) => b.name === 'players' || b.id === 'players');
      if (!hasPlayersBucket) {
        await supabase.storage.createBucket('players', { public: true });
      }
    } catch (bErr) {
      console.warn('Bucket check warning:', bErr);
    }

    const { data, error } = await supabase.storage
      .from('players')
      .upload(targetPath, buffer, {
        cacheControl: '0',
        upsert: true,
        contentType,
      });

    // Touch player's avatar_version if playerId provided
    if (playerId) {
      try {
        await supabase
          .from('players')
          .update({ avatar_version: Date.now() })
          .eq('id', playerId);
      } catch (pErr) {
        console.warn('Failed to update player avatar_version:', pErr);
      }
    }

    if (!error && supabaseUrl) {
      const avatarUrl = `${supabaseUrl}/storage/v1/object/public/players/${targetPath}?v=${Date.now()}`;
      return NextResponse.json({ success: true, avatarUrl, targetPath, data });
    }

    console.warn('Supabase storage upload failed, using Data URL fallback:', error?.message);

    // Fallback: If storage upload fails (e.g. RLS policy blocking storage), convert to Data URL
    const mimeType = isPng ? 'image/png' : (file.type || 'image/jpeg');
    const base64Str = buffer.toString('base64');
    const avatarUrl = `data:${mimeType};base64,${base64Str}`;

    return NextResponse.json({ success: true, avatarUrl, isBase64: true });
  } catch (err: any) {
    console.error('Upload route exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
