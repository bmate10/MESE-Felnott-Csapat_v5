export type Season = 'Spring' | 'Fall';
export type MatchStatus = 'Scheduled' | 'Completed';
export type AvailabilityStatus = 'Yes' | 'No' | 'If Needed';
export type HomeAway = 'Home' | 'Away';

export interface Player {
  id: string;
  name: string;
  rank: number;
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
  availability?: Record<string, AvailabilityStatus>;
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
