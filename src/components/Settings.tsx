import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { tennisService } from '../services/tennisService';
import { Match } from '../types';
import { format } from 'date-fns';

export const Settings: React.FC = () => {
  const { year, league, user, isAdmin } = useAppContext();
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!user) {
      setMatches([]);
      return;
    }
    return tennisService.subscribeMatches(year, league, setMatches);
  }, [year, league, user]);

  const completedMatches = matches.filter(m => m.status === 'Completed');

  const exportCsv = () => {
    const header = ['Date', 'Season', 'Opponent', 'Home/Away', 'Team Score', 'Opponent Score', 'Result'];
    const rows = [...completedMatches]
      .sort((a, b) => a.date.toMillis() - b.date.toMillis())
      .map(m => {
        const isWin = (m.teamScore || 0) > (m.opponentScore || 0);
        return [
          format(m.date.toDate(), 'yyyy-MM-dd'),
          m.season,
          m.opponent,
          m.homeAway,
          String(m.teamScore ?? ''),
          String(m.opponentScore ?? ''),
          isWin ? 'Win' : 'Loss'
        ];
      });
    const csv = [header, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${league}-${year}-results.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 flex flex-col gap-6 pb-32 bg-slate-50">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Settings</h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{league} &middot; {year}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-3">
        <h3 className="font-bold text-slate-800">Export Season Results</h3>
        <p className="text-sm text-slate-500">
          Download a CSV of completed matches for {league} &middot; {year} (date, opponent, score, result).
        </p>
        <button
          onClick={exportCsv}
          disabled={completedMatches.length === 0}
          className="self-start flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {completedMatches.length === 0 ? 'No completed matches yet' : `Export ${completedMatches.length} Results`}
        </button>
      </div>

      {!isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm text-slate-400">More settings are available to admins.</p>
        </div>
      )}
    </div>
  );
};
