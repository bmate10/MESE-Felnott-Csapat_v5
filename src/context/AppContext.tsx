import React, { createContext, useContext, useState } from 'react';

type League = 'BP 3' | 'BP 2' | 'BP 1' | 'OB 3' | 'OB 2' | 'OB 1';

interface AppContextType {
  year: string;
  setYear: (year: string) => void;
  league: League;
  setLeague: (league: League) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [year, setYear] = useState('2025');
  const [league, setLeague] = useState<League>('BP 2');

  return (
    <AppContext.Provider value={{ year, setYear, league, setLeague }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
