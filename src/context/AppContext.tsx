import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User
} from 'firebase/auth';
import { auth } from '../lib/firebase';

type League = 'BP 3' | 'BP 2' | 'BP 1' | 'OB 3' | 'OB 2' | 'OB 1';
const LEAGUES: League[] = ['BP 3', 'BP 2', 'BP 1', 'OB 3', 'OB 2', 'OB 1'];

interface AppContextType {
  year: string;
  setYear: (year: string) => void;
  league: League;
  setLeague: (league: League) => void;
  user: User | null;
  authLoading: boolean;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [year, setYearState] = useState(() => localStorage.getItem('mese.year') || String(new Date().getFullYear()));
  const [league, setLeagueState] = useState<League>(() => {
    const stored = localStorage.getItem('mese.league');
    return (stored && LEAGUES.includes(stored as League)) ? stored as League : 'BP 1';
  });

  const setYear = (y: string) => {
    setYearState(y);
    localStorage.setItem('mese.year', y);
  };

  const setLeague = (l: League) => {
    setLeagueState(l);
    localStorage.setItem('mese.league', l);
  };
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isAdmin = !!(user && user.email === 'bmate10@gmail.com');

  return (
    <AppContext.Provider value={{ 
      year, 
      setYear, 
      league, 
      setLeague,
      user,
      authLoading,
      isAdmin,
      login,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
