import React, { useEffect, useState } from 'react';
import { Download, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { tennisService } from '../services/tennisService';
import { Match, Player } from '../types';
import { format } from 'date-fns';

export const Settings: React.FC = () => {
  const { year, league, user, isAdmin, isOwner } = useAppContext();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [adminUids, setAdminUids] = useState<Set<string>>(new Set());
  const [busyUid, setBusyUid] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setMatches([]);
      return;
    }
    return tennisService.subscribeMatches(year, league, setMatches);
  }, [year, league, user]);

  useEffect(() => {
    if (!user || !isOwner) {
      setPlayers([]);
      return;
    }
    return tennisService.subscribePlayers(year, league, setPlayers);
  }, [year, league, user, isOwner]);

  const linkedPlayers = players.filter(p => !!p.uid);
  const linkedUidsKey = linkedPlayers.map(p => p.uid).sort().join(',');

  useEffect(() => {
    if (!isOwner || !linkedUidsKey) {
      setAdminUids(new Set());
      return;
    }
    return tennisService.subscribeAdminStatuses(linkedUidsKey.split(','), setAdminUids);
  }, [linkedUidsKey, isOwner]);

  const toggleAdmin = async (uid: string, currentlyAdmin: boolean) => {
    setBusyUid(uid);
    try {
      if (currentlyAdmin) {
        await tennisService.revokeAdmin(uid);
      } else {
        await tennisService.grantAdmin(uid);
      }
    } finally {
      setBusyUid(null);
    }
  };

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

      {isOwner && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-3">
          <h3 className="font-bold text-slate-800">Admin Access</h3>
          <p className="text-sm text-slate-500">
            Grant or revoke admin access for players linked to a Google account in {league} &middot; {year}.
          </p>
          {linkedPlayers.length === 0 ? (
            <p className="text-sm text-slate-400">No linked player accounts yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {linkedPlayers.map(p => {
                const isSelf = p.uid === user?.uid;
                const playerIsAdmin = !!p.uid && adminUids.has(p.uid);
                return (
                  <div key={p.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-slate-800 truncate">{p.name}</span>
                      {playerIsAdmin && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    {isSelf ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
                        You
                      </span>
                    ) : (
                      <button
                        onClick={() => toggleAdmin(p.uid as string, playerIsAdmin)}
                        disabled={busyUid === p.uid}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all disabled:opacity-50 ${
                          playerIsAdmin
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {playerIsAdmin ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        {playerIsAdmin ? 'Revoke' : 'Grant'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm text-slate-400">More settings are available to admins.</p>
        </div>
      )}
    </div>
  );
};
