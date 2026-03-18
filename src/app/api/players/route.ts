import { NextResponse } from 'next/server';
import { getPlayers, addPlayer, updatePlayer, deletePlayer } from '@/lib/players';

export const dynamic = 'force-dynamic';

// GET all players
export async function GET() {
  const players = getPlayers();
  return NextResponse.json(players);
}

// POST - add new player
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, subNames, telegramHandle, jerseyNumber } = body;

    if (!name || jerseyNumber === undefined) {
      return NextResponse.json({ error: 'name and jerseyNumber are required' }, { status: 400 });
    }

    const player = addPlayer({
      name,
      subNames: subNames || [],
      telegramHandle: telegramHandle || '',
      jerseyNumber: Number(jerseyNumber),
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PUT - update player
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (data.jerseyNumber !== undefined) {
      data.jerseyNumber = Number(data.jerseyNumber);
    }

    const updated = updatePlayer(id, data);
    if (!updated) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE - delete player
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const deleted = deletePlayer(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
