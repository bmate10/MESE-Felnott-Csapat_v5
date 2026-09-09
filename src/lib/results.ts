import { SetScore, SinglesResult, DoublesResult } from '../types';

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

// The team score always sums to 9 (6 singles + 3 doubles); this counts
// individual match wins recorded so far, so it stays accurate as results
// are entered one at a time rather than requiring all 9 up front.
export function computeTeamScore(singlesResults: SinglesResult[], doublesResults: DoublesResult[]) {
  const wins = [...singlesResults, ...doublesResults].filter(r => matchWinner(r.sets) === 'us').length;
  return { teamScore: wins, opponentScore: 9 - wins };
}
