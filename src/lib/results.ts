import { SetScore, SinglesResult, DoublesResult, Match } from '../types';

export function setWinner(set: SetScore): 'us' | 'them' | undefined {
  if (set.us === set.them) return undefined;
  return set.us > set.them ? 'us' : 'them';
}

// Best of 3: first to 2 set wins takes the individual match.
export function matchWinner(sets: SetScore[]): 'us' | 'them' | undefined {
  let usWins = 0;
  let themWins = 0;
  for (const set of sets) {
    const winner = setWinner(set);
    if (winner === 'us') usWins++;
    else if (winner === 'them') themWins++;
  }
  if (usWins >= 2) return 'us';
  if (themWins >= 2) return 'them';
  return undefined;
}

export function needsThirdSet(set1: SetScore, set2: SetScore): boolean {
  const w1 = setWinner(set1);
  const w2 = setWinner(set2);
  return !!w1 && !!w2 && w1 !== w2;
}

// A player can have both a singles and a doubles result in the same
// fixture, so these are listed per individual match, not per fixture.
export function individualResultsFor(match: Match, playerId: string): { kind: 'singles' | 'doubles'; won: boolean }[] {
  const results: { kind: 'singles' | 'doubles'; won: boolean }[] = [];
  (match.singlesResults || []).forEach(r => {
    const w = r.playerId === playerId ? matchWinner(r.sets) : undefined;
    if (w) results.push({ kind: 'singles', won: w === 'us' });
  });
  (match.doublesResults || []).forEach(r => {
    const w = r.playerIds.includes(playerId) ? matchWinner(r.sets) : undefined;
    if (w) results.push({ kind: 'doubles', won: w === 'us' });
  });
  return results;
}

// Individual W-L per player across all given matches; a doubles result
// counts for both partners.
export function tallyIndividualRecords(matches: Match[]): Record<string, { wins: number; losses: number }> {
  const records: Record<string, { wins: number; losses: number }> = {};
  const add = (playerIds: string[], sets: SetScore[]) => {
    const w = matchWinner(sets);
    if (!w) return;
    playerIds.forEach(id => {
      const rec = records[id] || (records[id] = { wins: 0, losses: 0 });
      if (w === 'us') rec.wins++;
      else rec.losses++;
    });
  };
  matches.forEach(m => {
    (m.singlesResults || []).forEach(r => add([r.playerId], r.sets));
    (m.doublesResults || []).forEach(r => add(r.playerIds, r.sets));
  });
  return records;
}

// The team score always sums to 9 (6 singles + 3 doubles); this counts
// individual match wins recorded so far, so it stays accurate as results
// are entered one at a time rather than requiring all 9 up front.
export function computeTeamScore(singlesResults: SinglesResult[], doublesResults: DoublesResult[]) {
  const wins = [...singlesResults, ...doublesResults].filter(r => matchWinner(r.sets) === 'us').length;
  return { teamScore: wins, opponentScore: 9 - wins };
}
