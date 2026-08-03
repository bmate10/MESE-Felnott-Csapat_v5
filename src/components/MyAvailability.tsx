import React, { useEffect, useState } from 'react';
import { CalendarCheck, MapPin, UserCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { tennisService } from '../services/tennisService';
import { Match, Player, AvailabilityStatus } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export const MyAvailability: React.FC = () => {
  const { year, league, user, isAdmin } = useAppContext();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [statusMap, setStatusMap] = useState<Record<string, AvailabilityStatus | undefined>>({});
  const [claimSelection, setClaimSelection] = useState<string[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setMatches([]);
      setPlayers([]);
      return;
    }
    const unsubMatches = tennisService.subscribeMatches(year, league, setMatches);
    const unsubPlayers = tennisService.subscribePlayers(year, league, setPlayers);
    return () => {
      unsubMatches();
      unsubPlayers();
    };
  }, [year, league, user]);

  const myPlayers = players.filter(p => p.uid === user?.uid);
  const selectablePlayers = isAdmin ? players : myPlayers;
  const unclaimedPlayers = players.filter(p => !p.uid);
  const upcomingMatches = matches.filter(m => m.status === 'Scheduled').sort((a, b) => a.date.toMillis() - b.date.toMillis());
  const selectableIds = selectablePlayers.map(p => p.id).join(',');

  useEffect(() => {
    if (selectablePlayers.length === 0) {
      setSelectedPlayerId('');
      return;
    }
    if (!selectablePlayers.some(p => p.id === selectedPlayerId)) {
      setSelectedPlayerId(selectablePlayers[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectableIds]);

  const upcomingIds = upcomingMatches.map(m => m.id).join(',');

  useEffect(() => {
    setStatusMap({});
    if (!selectedPlayerId || upcomingMatches.length === 0) return;
    const unsubs = upcomingMatches.map(m =>
      tennisService.subscribePlayerAvailability(year, league, m.id, selectedPlayerId, (status) => {
        setStatusMap(prev => ({ ...prev, [m.id]: status }));
      })
    );
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, league, selectedPlayerId, upcomingIds]);

  const handleClaim = async () => {
    if (claimSelection.length === 0 || !user) return;
    setIsClaiming(true);
    setClaimError(null);
    try {
      for (const playerId of claimSelection) {
        await tennisService.claimPlayer(year, league, playerId, user.uid);
      }
      setClaimSelection([]);
    } catch (err: any) {
      setClaimError(err.message || String(err));
    } finally {
      setIsClaiming(false);
    }
  };

  const selectedPlayer = selectablePlayers.find(p => p.id === selectedPlayerId);

  return (
    <div className="p-6 flex flex-col gap-6 pb-32 bg-slate-50">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">My Availability</h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Upcoming Matches</p>
      </div>

      {myPlayers.length === 0 && (
        <div className="tonal-card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            Which player(s) are you?
          </div>
          {unclaimedPlayers.length === 0 ? (
            <p className="text-sm text-slate-400">No unclaimed players on this roster right now. Ask an admin to add you or check for a mistaken link.</p>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Link your account to one or more players on the roster (e.g. yourself, or a child you manage) so you can mark availability on their behalf.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {unclaimedPlayers.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm cursor-pointer hover:border-emerald-200 transition-all">
                    <input
                      type="checkbox"
                      checked={claimSelection.includes(p.id)}
                      onChange={e => setClaimSelection(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span className="font-bold text-slate-700">{p.name}</span>
                  </label>
                ))}
              </div>
              {claimError && <p className="text-xs text-red-500 font-bold">{claimError}</p>}
              <div className="flex justify-end">
                <button
                  onClick={handleClaim}
                  disabled={claimSelection.length === 0 || isClaiming}
                  className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
                >
                  {isClaiming ? 'Linking...' : 'Claim Selected'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {selectablePlayers.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {isAdmin ? 'Managing Availability For' : 'Showing Availability For'}
          </label>
          <select
            value={selectedPlayerId}
            onChange={e => setSelectedPlayerId(e.target.value)}
            className="bg-white border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer font-bold text-slate-800 max-w-sm"
          >
            {selectablePlayers.map(p => (
              <option key={p.id} value={p.id}>{p.name}{!p.uid ? ' (unclaimed)' : ''}</option>
            ))}
          </select>
        </div>
      )}

      {selectedPlayer && (
        <div className="flex flex-col gap-4">
          {upcomingMatches.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium italic bg-white rounded-2xl border border-slate-200">
              No upcoming matches scheduled.
            </div>
          ) : (
            upcomingMatches.map(match => {
              const status = statusMap[match.id];
              return (
                <div key={match.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-500 flex-shrink-0">
                      <span className="text-[9px] uppercase font-bold">{format(match.date.toDate(), 'MMM')}</span>
                      <span className="text-base font-bold leading-none">{format(match.date.toDate(), 'd')}</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{match.opponent}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-0.5">
                        <CalendarCheck className="w-3.5 h-3.5" />
                        {format(match.date.toDate(), 'EEEE, h:mm a')}
                        <span className="text-slate-300">•</span>
                        {match.homeAway}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 font-medium mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {match.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(['Yes', 'No', 'If Needed'] as AvailabilityStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => tennisService.setAvailability(year, league, match.id, selectedPlayer.id, s)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                          status === s
                            ? (s === 'Yes' ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" : s === 'No' ? "bg-slate-800 text-white" : "bg-amber-500 text-white")
                            : "bg-white border border-slate-200 text-slate-400 hover:border-emerald-200 hover:text-emerald-500"
                        )}
                      >
                        {s === 'If Needed' ? 'Need' : s}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
