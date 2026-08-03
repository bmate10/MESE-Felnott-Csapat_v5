import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  deleteField,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { OperationType, Player, Match, MvpVote, AvailabilityEntry, AvailabilityStatus } from '../types';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const tennisService = {
  // Players
  subscribePlayers: (year: string, league: string, callback: (players: Player[]) => void) => {
    const path = `years/${year}/leagues/${league}/players`;
    const q = query(collection(db, path), orderBy('rank', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
      callback(players);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  addPlayer: async (year: string, league: string, player: Omit<Player, 'id'>) => {
    const path = `years/${year}/leagues/${league}/players`;
    try {
      await addDoc(collection(db, path), player);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  updatePlayer: async (year: string, league: string, playerId: string, updates: Partial<Player>) => {
    const path = `years/${year}/leagues/${league}/players/${playerId}`;
    try {
      await updateDoc(doc(db, path), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deletePlayer: async (year: string, league: string, playerId: string) => {
    const path = `years/${year}/leagues/${league}/players/${playerId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  claimPlayer: async (year: string, league: string, playerId: string, uid: string) => {
    const path = `years/${year}/leagues/${league}/players/${playerId}`;
    try {
      await updateDoc(doc(db, path), { uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  unlinkPlayer: async (year: string, league: string, playerId: string) => {
    const path = `years/${year}/leagues/${league}/players/${playerId}`;
    try {
      await updateDoc(doc(db, path), { uid: deleteField() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Matches
  subscribeMatches: (year: string, league: string, callback: (matches: Match[]) => void) => {
    const path = `years/${year}/leagues/${league}/matches`;
    const q = query(collection(db, path), orderBy('date', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      callback(matches);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  addMatch: async (year: string, league: string, match: Omit<Match, 'id'>) => {
    const path = `years/${year}/leagues/${league}/matches`;
    try {
      await addDoc(collection(db, path), match);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  updateMatch: async (year: string, league: string, matchId: string, updates: Partial<Match>) => {
    const path = `years/${year}/leagues/${league}/matches/${matchId}`;
    try {
      await updateDoc(doc(db, path), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteMatch: async (year: string, league: string, matchId: string) => {
    const path = `years/${year}/leagues/${league}/matches/${matchId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Availability
  subscribeAvailability: (year: string, league: string, matchId: string, callback: (entries: AvailabilityEntry[]) => void) => {
    const path = `years/${year}/leagues/${league}/matches/${matchId}/availability`;
    return onSnapshot(collection(db, path), (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AvailabilityEntry));
      callback(entries);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  subscribePlayerAvailability: (year: string, league: string, matchId: string, playerId: string, callback: (status: AvailabilityStatus | undefined) => void) => {
    const path = `years/${year}/leagues/${league}/matches/${matchId}/availability/${playerId}`;
    return onSnapshot(doc(db, path), (snap) => {
      callback(snap.exists() ? (snap.data().status as AvailabilityStatus) : undefined);
    }, (error) => handleFirestoreError(error, OperationType.GET, path));
  },

  setAvailability: async (year: string, league: string, matchId: string, playerId: string, status: AvailabilityStatus) => {
    const path = `years/${year}/leagues/${league}/matches/${matchId}/availability/${playerId}`;
    try {
      await setDoc(doc(db, path), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // MVP Votes
  subscribeMvpVotes: (year: string, league: string, matchId: string, callback: (votes: MvpVote[]) => void) => {
    const path = `years/${year}/leagues/${league}/matches/${matchId}/mvpVotes`;
    return onSnapshot(collection(db, path), (snapshot) => {
      const votes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MvpVote));
      callback(votes);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  voteMvp: async (year: string, league: string, matchId: string, playerId: string, voterId: string) => {
    const path = `years/${year}/leagues/${league}/matches/${matchId}/mvpVotes/${voterId}`;
    try {
      await setDoc(doc(db, path), { playerId, voterId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
