export type Season = 'Spring' | 'Fall';
export type MatchStatus = 'Scheduled' | 'Completed';
export type AvailabilityStatus = 'Yes' | 'No' | 'If Needed';
export type HomeAway = 'Home' | 'Away';

export interface Player {
  id: string;
  name: string;
  rank: number;
  uid?: string; // Google account uid managing this player's availability
}

export interface Match {
  id: string;
  opponent: string;
  location: string;
  date: any; // Firestore Timestamp
  season: Season;
  status: MatchStatus;
  homeAway: HomeAway;
  teamScore?: number;
  opponentScore?: number;
  lineupSingles?: string[]; // Up to 6 player ids; court order derives from each player's club rank
  lineupDoubles?: string[]; // Player ids in the doubles pool for the day (pairing decided onsite)
}

// Doc id is the playerId; lives at matches/{matchId}/availability/{playerId}
export interface AvailabilityEntry {
  id: string;
  status: AvailabilityStatus;
}

export interface League {
  id: string;
  name: string;
}

export interface Year {
  id: string;
}

export interface MvpVote {
  id: string;
  playerId: string;
  voterId: string;
}

// Sentinel playerId used when a user opts out of voting for a given match.
export const MVP_SKIP_ID = 'skip';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
