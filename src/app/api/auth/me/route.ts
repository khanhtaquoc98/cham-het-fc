import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  
  const { data: user } = await supabase
    .from('accounts')
    .select('id, username, balance, role, player_id')
    .eq('id', session.id)
    .single();

  if (!user) {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    return NextResponse.json({ user: null });
  }

  let avatarUrl: string | null = null;
  let playerInfo: { id: string; name: string; jersey_number?: number | null } | null = null;

  if (user.player_id) {
    const { data: p } = await supabase
      .from('players')
      .select('id, name, jersey_number, avatar_version')
      .eq('id', user.player_id)
      .single();

    if (p) {
      playerInfo = { id: p.id, name: p.name, jersey_number: p.jersey_number };
      const filename = p.jersey_number != null ? p.jersey_number : p.id;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udlhudfxwuwbecjqvvhv.supabase.co';
      avatarUrl = `${supabaseUrl}/storage/v1/object/public/players/${filename}.webp?v=${p.avatar_version || Date.now()}`;
    }
  }

  return NextResponse.json({
    user: {
      ...user,
      avatarUrl,
      playerInfo
    }
  });
}
