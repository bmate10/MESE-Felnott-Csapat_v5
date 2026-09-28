import { MvpVote, MVP_SKIP_ID } from '../types';

// A vote for a doubles pair is stored as one candidate id so each voter
// still casts a single vote per match; it expands to both partners.
export const pairCandidateId = (playerIds: string[]) => `pair:${[...playerIds].sort().join(',')}`;

export const candidatePlayerIds = (candidateId: string): string[] => {
  if (candidateId === MVP_SKIP_ID) return [];
  if (candidateId.startsWith('pair:')) return candidateId.slice(5).split(',');
  return [candidateId];
};

// The most-voted candidate wins the match MVP (every player in a winning
// pair gets it); a tie for the top spot means no MVP for that match.
export function matchMvpWinners(votes: MvpVote[]): string[] {
  const tally: Record<string, number> = {};
  votes.forEach(v => {
    if (v.playerId !== MVP_SKIP_ID) tally[v.playerId] = (tally[v.playerId] || 0) + 1;
  });
  let topId: string | undefined;
  let topCount = 0;
  let tied = false;
  Object.entries(tally).forEach(([id, count]) => {
    if (count > topCount) { topId = id; topCount = count; tied = false; }
    else if (count === topCount) { tied = true; }
  });
  return !topId || tied ? [] : candidatePlayerIds(topId);
}
