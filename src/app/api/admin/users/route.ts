import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const [accountsRes, playersRes] = await Promise.all([
      supabase.from("accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("players").select("id, name").order("name")
    ]);

    return NextResponse.json({
      accounts: accountsRes.data || [],
      players: playersRes.data || []
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { accountId, playerId } = await req.json();
    const { error } = await supabase
      .from("accounts")
      .update({ player_id: playerId || null })
      .eq("id", accountId);
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
