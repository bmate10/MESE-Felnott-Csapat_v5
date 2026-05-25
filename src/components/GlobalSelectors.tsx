import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const GlobalSelectors: React.FC = () => {
  const { year, setYear, league, setLeague } = useAppContext();

  const years = Array.from({ length: 11 }, (_, i) => (2024 + i).toString());
  const leagues = ['BP 3', 'BP 2', 'BP 1', 'OB 3', 'OB 2', 'OB 1'] as const;

  return (
    <div className="flex px-6 py-4 gap-3 bg-white border-b border-slate-100">
      <div className="flex-1 flex items-center bg-slate-100 rounded-lg px-3 py-1.5 gap-2 group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
        <span className="text-[10px] uppercase font-bold text-slate-400">Year</span>
        <div className="relative flex-1">
          <select 
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-6"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex-1 flex items-center bg-slate-100 rounded-lg px-3 py-1.5 gap-2 group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
        <span className="text-[10px] uppercase font-bold text-slate-400">League</span>
        <div className="relative flex-1">
          <select 
            value={league}
            onChange={(e) => setLeague(e.target.value as any)}
            className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-6"
          >
            {leagues.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
