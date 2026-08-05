import { TacticalPlayer, PitchType } from './types';

// Preset formation options for each pitch format
export const FORMATION_PRESETS: Record<PitchType, string[]> = {
  5: ['1-2-1', '2-2', '3-1', '1-3'],
  7: ['3-2-1', '2-3-1', '3-1-2', '2-1-2-1'],
  11: ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'],
};

export function getRequiredOutfieldCount(pitchType: PitchType): number {
  if (pitchType === 5) return 4;
  if (pitchType === 7) return 6;
  return 10;
}

export function parseCustomFormation(pitchType: PitchType, formationStr: string, team: 'A' | 'B'): TacticalPlayer[] | null {
  if (!formationStr) return null;
  const targetSum = getRequiredOutfieldCount(pitchType);
  const parts = formationStr.split('-').map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
  
  if (parts.length === 0) return null;
  const currentSum = parts.reduce((acc, v) => acc + v, 0);
  if (currentSum !== targetSum) return null;

  const players: TacticalPlayer[] = [];
  const totalLines = parts.length;
  let numCounter = 2;

  parts.forEach((lineCount, lineIdx) => {
    let lineX = 0;
    if (team === 'A') {
      const minX = 16;
      const maxX = 44;
      lineX = totalLines === 1 ? 30 : minX + (lineIdx / (totalLines - 1)) * (maxX - minX);
    } else {
      const minX = 84;
      const maxX = 56;
      lineX = totalLines === 1 ? 70 : minX - (lineIdx / (totalLines - 1)) * (minX - maxX);
    }

    for (let pIdx = 0; pIdx < lineCount; pIdx++) {
      let pY = 50;
      if (lineCount > 1) {
        const minY = 18;
        const maxY = 82;
        pY = minY + (pIdx / (lineCount - 1)) * (maxY - minY);
      }

      players.push({
        id: `${team}_${numCounter}`,
        number: numCounter,
        name: `${team}${numCounter}`,
        team,
        x: Math.round(lineX),
        y: Math.round(pY),
      });

      numCounter++;
    }
  });

  return players;
}

export function generateDefaultPlayers(pitchType: PitchType, formationA = '', formationB = ''): TacticalPlayer[] {
  const formA = formationA || FORMATION_PRESETS[pitchType][0];
  const formB = formationB || FORMATION_PRESETS[pitchType][0];

  const players: TacticalPlayer[] = [];

  // Team A (Left team)
  players.push(...getTeamAPlayers(pitchType, formA));

  // Team B (Right team)
  players.push(...getTeamBPlayers(pitchType, formB));

  return players;
}

function getTeamAPlayers(pitchType: PitchType, formation: string): TacticalPlayer[] {
  const customPlayers = parseCustomFormation(pitchType, formation, 'A');
  if (customPlayers) {
    return [
      {
        id: 'A_gk',
        number: 1,
        name: 'GK A',
        team: 'A',
        isGk: true,
        x: pitchType === 11 ? 4 : 5,
        y: 50,
      },
      ...customPlayers,
    ];
  }

  const players: TacticalPlayer[] = [];

  // GK A always at left goal
  players.push({
    id: 'A_gk',
    number: 1,
    name: 'GK A',
    team: 'A',
    isGk: true,
    x: pitchType === 11 ? 4 : 5,
    y: 50,
  });

  if (pitchType === 5) {
    if (formation === '2-2') {
      players.push(
        { id: 'A_2', number: 2, name: 'A2', team: 'A', x: 22, y: 30 },
        { id: 'A_3', number: 3, name: 'A3', team: 'A', x: 22, y: 70 },
        { id: 'A_4', number: 4, name: 'A4', team: 'A', x: 40, y: 32 },
        { id: 'A_5', number: 5, name: 'A5', team: 'A', x: 40, y: 68 },
      );
    } else if (formation === '3-1') {
      players.push(
        { id: 'A_2', number: 2, name: 'A2', team: 'A', x: 20, y: 22 },
        { id: 'A_3', number: 3, name: 'A3', team: 'A', x: 18, y: 50 },
        { id: 'A_4', number: 4, name: 'A4', team: 'A', x: 20, y: 78 },
        { id: 'A_5', number: 5, name: 'A5', team: 'A', x: 42, y: 50 },
      );
    } else if (formation === '1-3') {
      players.push(
        { id: 'A_2', number: 2, name: 'A2', team: 'A', x: 18, y: 50 },
        { id: 'A_3', number: 3, name: 'A3', team: 'A', x: 38, y: 20 },
        { id: 'A_4', number: 4, name: 'A4', team: 'A', x: 40, y: 50 },
        { id: 'A_5', number: 5, name: 'A5', team: 'A', x: 38, y: 80 },
      );
    } else {
      // Default 1-2-1 (Diamond)
      players.push(
        { id: 'A_2', number: 2, name: 'A2', team: 'A', x: 20, y: 50 },
        { id: 'A_3', number: 3, name: 'A3', team: 'A', x: 32, y: 22 },
        { id: 'A_4', number: 4, name: 'A4', team: 'A', x: 32, y: 78 },
        { id: 'A_5', number: 5, name: 'A5', team: 'A', x: 42, y: 50 },
      );
    }
  } else if (pitchType === 7) {
    if (formation === '2-3-1') {
      players.push(
        { id: 'A_2', number: 2, name: 'A2', team: 'A', x: 18, y: 30 },
        { id: 'A_3', number: 3, name: 'A3', team: 'A', x: 18, y: 70 },
        { id: 'A_4', number: 4, name: 'A4', team: 'A', x: 32, y: 20 },
        { id: 'A_5', number: 5, name: 'A5', team: 'A', x: 30, y: 50 },
        { id: 'A_6', number: 6, name: 'A6', team: 'A', x: 32, y: 80 },
        { id: 'A_7', number: 7, name: 'A7', team: 'A', x: 44, y: 50 },
      );
    } else if (formation === '3-1-2') {
      players.push(
        { id: 'A_2', number: 2, name: 'A2', team: 'A', x: 18, y: 20 },
        { id: 'A_3', number: 3, name: 'A3', team: 'A', x: 16, y: 50 },
        { id: 'A_4', number: 4, name: 'A4', team: 'A', x: 18, y: 80 },
        { id: 'A_5', number: 5, name: 'A5', team: 'A', x: 30, y: 50 },
        { id: 'A_6', number: 6, name: 'A6', team: 'A', x: 42, y: 32 },
        { id: 'A_7', number: 7, name: 'A7', team: 'A', x: 42, y: 68 },
      );
    } else if (formation === '2-1-2-1') {
      players.push(
        { id: 'A_2', number: 2, name: 'A2', team: 'A', x: 18, y: 30 },
        { id: 'A_3', number: 3, name: 'A3', team: 'A', x: 18, y: 70 },
        { id: 'A_4', number: 4, name: 'A4', team: 'A', x: 28, y: 50 },
        { id: 'A_5', number: 5, name: 'A5', team: 'A', x: 36, y: 25 },
        { id: 'A_6', number: 6, name: 'A6', team: 'A', x: 36, y: 75 },
        { id: 'A_7', number: 7, name: 'A7', team: 'A', x: 44, y: 50 },
      );
    } else {
      // Default 3-2-1
      players.push(
        { id: 'A_2', number: 2, name: 'A2', team: 'A', x: 18, y: 20 },
        { id: 'A_3', number: 3, name: 'A3', team: 'A', x: 16, y: 50 },
        { id: 'A_4', number: 4, name: 'A4', team: 'A', x: 18, y: 80 },
        { id: 'A_5', number: 5, name: 'A5', team: 'A', x: 32, y: 32 },
        { id: 'A_6', number: 6, name: 'A6', team: 'A', x: 32, y: 68 },
        { id: 'A_7', number: 7, name: 'A7', team: 'A', x: 44, y: 50 },
      );
    }
  } else {
    // Sân 11
    if (formation === '4-4-2') {
      players.push(
        { id: 'A_2', number: 2, name: 'LB', team: 'A', x: 18, y: 15 },
        { id: 'A_3', number: 3, name: 'LCB', team: 'A', x: 15, y: 38 },
        { id: 'A_4', number: 4, name: 'RCB', team: 'A', x: 15, y: 62 },
        { id: 'A_5', number: 5, name: 'RB', team: 'A', x: 18, y: 85 },
        { id: 'A_6', number: 6, name: 'LM', team: 'A', x: 32, y: 18 },
        { id: 'A_7', number: 7, name: 'LCM', team: 'A', x: 28, y: 40 },
        { id: 'A_8', number: 8, name: 'RCM', team: 'A', x: 28, y: 60 },
        { id: 'A_9', number: 9, name: 'RM', team: 'A', x: 32, y: 82 },
        { id: 'A_10', number: 10, name: 'LS', team: 'A', x: 43, y: 38 },
        { id: 'A_11', number: 11, name: 'RS', team: 'A', x: 43, y: 62 },
      );
    } else if (formation === '3-5-2') {
      players.push(
        { id: 'A_2', number: 2, name: 'LCB', team: 'A', x: 15, y: 25 },
        { id: 'A_3', number: 3, name: 'CB', team: 'A', x: 14, y: 50 },
        { id: 'A_4', number: 4, name: 'RCB', team: 'A', x: 15, y: 75 },
        { id: 'A_5', number: 5, name: 'LWB', team: 'A', x: 30, y: 12 },
        { id: 'A_6', number: 6, name: 'DM', team: 'A', x: 25, y: 50 },
        { id: 'A_7', number: 7, name: 'CM1', team: 'A', x: 33, y: 35 },
        { id: 'A_8', number: 8, name: 'CM2', team: 'A', x: 33, y: 65 },
        { id: 'A_9', number: 9, name: 'RWB', team: 'A', x: 30, y: 88 },
        { id: 'A_10', number: 10, name: 'LS', team: 'A', x: 43, y: 38 },
        { id: 'A_11', number: 11, name: 'RS', team: 'A', x: 43, y: 62 },
      );
    } else if (formation === '4-2-3-1') {
      players.push(
        { id: 'A_2', number: 2, name: 'LB', team: 'A', x: 18, y: 15 },
        { id: 'A_3', number: 3, name: 'LCB', team: 'A', x: 15, y: 38 },
        { id: 'A_4', number: 4, name: 'RCB', team: 'A', x: 15, y: 62 },
        { id: 'A_5', number: 5, name: 'RB', team: 'A', x: 18, y: 85 },
        { id: 'A_6', number: 6, name: 'LDM', team: 'A', x: 26, y: 35 },
        { id: 'A_7', number: 7, name: 'RDM', team: 'A', x: 26, y: 65 },
        { id: 'A_8', number: 8, name: 'LAM', team: 'A', x: 36, y: 20 },
        { id: 'A_9', number: 9, name: 'CAM', team: 'A', x: 35, y: 50 },
        { id: 'A_10', number: 10, name: 'RAM', team: 'A', x: 36, y: 80 },
        { id: 'A_11', number: 11, name: 'ST', team: 'A', x: 44, y: 50 },
      );
    } else {
      // Default 4-3-3
      players.push(
        { id: 'A_2', number: 2, name: 'LB', team: 'A', x: 18, y: 15 },
        { id: 'A_3', number: 3, name: 'LCB', team: 'A', x: 15, y: 38 },
        { id: 'A_4', number: 4, name: 'RCB', team: 'A', x: 15, y: 62 },
        { id: 'A_5', number: 5, name: 'RB', team: 'A', x: 18, y: 85 },
        { id: 'A_6', number: 6, name: 'LCM', team: 'A', x: 30, y: 28 },
        { id: 'A_7', number: 7, name: 'CM', team: 'A', x: 27, y: 50 },
        { id: 'A_8', number: 8, name: 'RCM', team: 'A', x: 30, y: 72 },
        { id: 'A_9', number: 9, name: 'LW', team: 'A', x: 42, y: 20 },
        { id: 'A_10', number: 10, name: 'ST', team: 'A', x: 44, y: 50 },
        { id: 'A_11', number: 11, name: 'RW', team: 'A', x: 42, y: 80 },
      );
    }
  }

  return players;
}

function getTeamBPlayers(pitchType: PitchType, formation: string): TacticalPlayer[] {
  const customPlayers = parseCustomFormation(pitchType, formation, 'B');
  if (customPlayers) {
    return [
      {
        id: 'B_gk',
        number: 1,
        name: 'GK B',
        team: 'B',
        isGk: true,
        x: pitchType === 11 ? 96 : 95,
        y: 50,
      },
      ...customPlayers,
    ];
  }

  const players: TacticalPlayer[] = [];

  // GK B always at right goal
  players.push({
    id: 'B_gk',
    number: 1,
    name: 'GK B',
    team: 'B',
    isGk: true,
    x: pitchType === 11 ? 96 : 95,
    y: 50,
  });

  if (pitchType === 5) {
    if (formation === '2-2') {
      players.push(
        { id: 'B_2', number: 2, name: 'B2', team: 'B', x: 78, y: 70 },
        { id: 'B_3', number: 3, name: 'B3', team: 'B', x: 78, y: 30 },
        { id: 'B_4', number: 4, name: 'B4', team: 'B', x: 60, y: 68 },
        { id: 'B_5', number: 5, name: 'B5', team: 'B', x: 60, y: 32 },
      );
    } else if (formation === '3-1') {
      players.push(
        { id: 'B_2', number: 2, name: 'B2', team: 'B', x: 80, y: 78 },
        { id: 'B_3', number: 3, name: 'B3', team: 'B', x: 82, y: 50 },
        { id: 'B_4', number: 4, name: 'B4', team: 'B', x: 80, y: 22 },
        { id: 'B_5', number: 5, name: 'B5', team: 'B', x: 58, y: 50 },
      );
    } else if (formation === '1-3') {
      players.push(
        { id: 'B_2', number: 2, name: 'B2', team: 'B', x: 82, y: 50 },
        { id: 'B_3', number: 3, name: 'B3', team: 'B', x: 62, y: 80 },
        { id: 'B_4', number: 4, name: 'B4', team: 'B', x: 60, y: 50 },
        { id: 'B_5', number: 5, name: 'B5', team: 'B', x: 62, y: 20 },
      );
    } else {
      // Default 1-2-1
      players.push(
        { id: 'B_2', number: 2, name: 'B2', team: 'B', x: 80, y: 50 },
        { id: 'B_3', number: 3, name: 'B3', team: 'B', x: 68, y: 78 },
        { id: 'B_4', number: 4, name: 'B4', team: 'B', x: 68, y: 22 },
        { id: 'B_5', number: 5, name: 'B5', team: 'B', x: 58, y: 50 },
      );
    }
  } else if (pitchType === 7) {
    if (formation === '2-3-1') {
      players.push(
        { id: 'B_2', number: 2, name: 'B2', team: 'B', x: 82, y: 70 },
        { id: 'B_3', number: 3, name: 'B3', team: 'B', x: 82, y: 30 },
        { id: 'B_4', number: 4, name: 'B4', team: 'B', x: 68, y: 80 },
        { id: 'B_5', number: 5, name: 'B5', team: 'B', x: 70, y: 50 },
        { id: 'B_6', number: 6, name: 'B6', team: 'B', x: 68, y: 20 },
        { id: 'B_7', number: 7, name: 'B7', team: 'B', x: 56, y: 50 },
      );
    } else if (formation === '3-1-2') {
      players.push(
        { id: 'B_2', number: 2, name: 'B2', team: 'B', x: 82, y: 80 },
        { id: 'B_3', number: 3, name: 'B3', team: 'B', x: 84, y: 50 },
        { id: 'B_4', number: 4, name: 'B4', team: 'B', x: 82, y: 20 },
        { id: 'B_5', number: 5, name: 'B5', team: 'B', x: 70, y: 50 },
        { id: 'B_6', number: 6, name: 'B6', team: 'B', x: 58, y: 68 },
        { id: 'B_7', number: 7, name: 'B7', team: 'B', x: 58, y: 32 },
      );
    } else if (formation === '2-1-2-1') {
      players.push(
        { id: 'B_2', number: 2, name: 'B2', team: 'B', x: 82, y: 70 },
        { id: 'B_3', number: 3, name: 'B3', team: 'B', x: 82, y: 30 },
        { id: 'B_4', number: 4, name: 'B4', team: 'B', x: 72, y: 50 },
        { id: 'B_5', number: 5, name: 'B5', team: 'B', x: 64, y: 75 },
        { id: 'B_6', number: 6, name: 'B6', team: 'B', x: 64, y: 25 },
        { id: 'B_7', number: 7, name: 'B7', team: 'B', x: 56, y: 50 },
      );
    } else {
      // Default 3-2-1
      players.push(
        { id: 'B_2', number: 2, name: 'B2', team: 'B', x: 82, y: 80 },
        { id: 'B_3', number: 3, name: 'B3', team: 'B', x: 84, y: 50 },
        { id: 'B_4', number: 4, name: 'B4', team: 'B', x: 82, y: 20 },
        { id: 'B_5', number: 5, name: 'B5', team: 'B', x: 68, y: 68 },
        { id: 'B_6', number: 6, name: 'B6', team: 'B', x: 68, y: 32 },
        { id: 'B_7', number: 7, name: 'B7', team: 'B', x: 56, y: 50 },
      );
    }
  } else {
    // Sân 11
    if (formation === '4-4-2') {
      players.push(
        { id: 'B_2', number: 2, name: 'LB', team: 'B', x: 82, y: 85 },
        { id: 'B_3', number: 3, name: 'LCB', team: 'B', x: 85, y: 62 },
        { id: 'B_4', number: 4, name: 'RCB', team: 'B', x: 85, y: 38 },
        { id: 'B_5', number: 5, name: 'RB', team: 'B', x: 82, y: 15 },
        { id: 'B_6', number: 6, name: 'LM', team: 'B', x: 68, y: 82 },
        { id: 'B_7', number: 7, name: 'LCM', team: 'B', x: 72, y: 60 },
        { id: 'B_8', number: 8, name: 'RCM', team: 'B', x: 72, y: 40 },
        { id: 'B_9', number: 9, name: 'RM', team: 'B', x: 68, y: 18 },
        { id: 'B_10', number: 10, name: 'LS', team: 'B', x: 57, y: 62 },
        { id: 'B_11', number: 11, name: 'RS', team: 'B', x: 57, y: 38 },
      );
    } else if (formation === '3-5-2') {
      players.push(
        { id: 'B_2', number: 2, name: 'LCB', team: 'B', x: 85, y: 75 },
        { id: 'B_3', number: 3, name: 'CB', team: 'B', x: 86, y: 50 },
        { id: 'B_4', number: 4, name: 'RCB', team: 'B', x: 85, y: 25 },
        { id: 'B_5', number: 5, name: 'LWB', team: 'B', x: 70, y: 88 },
        { id: 'B_6', number: 6, name: 'DM', team: 'B', x: 75, y: 50 },
        { id: 'B_7', number: 7, name: 'CM1', team: 'B', x: 67, y: 65 },
        { id: 'B_8', number: 8, name: 'CM2', team: 'B', x: 67, y: 35 },
        { id: 'B_9', number: 9, name: 'RWB', team: 'B', x: 70, y: 12 },
        { id: 'B_10', number: 10, name: 'LS', team: 'B', x: 57, y: 62 },
        { id: 'B_11', number: 11, name: 'RS', team: 'B', x: 57, y: 38 },
      );
    } else if (formation === '4-2-3-1') {
      players.push(
        { id: 'B_2', number: 2, name: 'LB', team: 'B', x: 82, y: 85 },
        { id: 'B_3', number: 3, name: 'LCB', team: 'B', x: 85, y: 62 },
        { id: 'B_4', number: 4, name: 'RCB', team: 'B', x: 85, y: 38 },
        { id: 'B_5', number: 5, name: 'RB', team: 'B', x: 82, y: 15 },
        { id: 'B_6', number: 6, name: 'LDM', team: 'B', x: 74, y: 65 },
        { id: 'B_7', number: 7, name: 'RDM', team: 'B', x: 74, y: 35 },
        { id: 'B_8', number: 8, name: 'LAM', team: 'B', x: 64, y: 80 },
        { id: 'B_9', number: 9, name: 'CAM', team: 'B', x: 65, y: 50 },
        { id: 'B_10', number: 10, name: 'RAM', team: 'B', x: 64, y: 20 },
        { id: 'B_11', number: 11, name: 'ST', team: 'B', x: 56, y: 50 },
      );
    } else {
      // Default 4-3-3
      players.push(
        { id: 'B_2', number: 2, name: 'LB', team: 'B', x: 82, y: 85 },
        { id: 'B_3', number: 3, name: 'LCB', team: 'B', x: 85, y: 62 },
        { id: 'B_4', number: 4, name: 'RCB', team: 'B', x: 85, y: 38 },
        { id: 'B_5', number: 5, name: 'RB', team: 'B', x: 82, y: 15 },
        { id: 'B_6', number: 6, name: 'LCM', team: 'B', x: 70, y: 72 },
        { id: 'B_7', number: 7, name: 'CM', team: 'B', x: 73, y: 50 },
        { id: 'B_8', number: 8, name: 'RCM', team: 'B', x: 70, y: 28 },
        { id: 'B_9', number: 9, name: 'LW', team: 'B', x: 58, y: 80 },
        { id: 'B_10', number: 10, name: 'ST', team: 'B', x: 56, y: 50 },
        { id: 'B_11', number: 11, name: 'RW', team: 'B', x: 58, y: 20 },
      );
    }
  }

  return players;
}
