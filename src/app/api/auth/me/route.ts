import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

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
     return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}
