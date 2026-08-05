import React, { useEffect, useState } from 'react';
import { Plus, Calendar, MapPin, CheckCircle2, Trophy, Users, Info, Trash2, Home, ExternalLink } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { tennisService } from '../services/tennisService';
import { Match, Player, Season, HomeAway, MatchStatus, MvpVote, MVP_SKIP_ID, AvailabilityEntry } from '../types';
import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import { cn } from '../lib/utils';
import { Timestamp } from 'firebase/firestore';

const MvpVoteBox: React.FC<{ year: string; league: string; match: Match; players: Player[]; userId: string }> = ({ year, league, match, players, userId }) => {
  const [votes, setVotes] = useState<MvpVote[]>([]);
  const [selected, setSelected] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    return tennisService.subscribeMvpVotes(year, league, match.id, setVotes);
  }, [year, league, match.id]);

  const myVote = votes.find(v => v.voterId === userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsVoting(true);
    setVoteError(null);
    try {
      await tennisService.voteMvp(year, league, match.id, selected, userId);
    } catch (err: any) {
      setVoteError(err.message || String(err));
    } finally {
      setIsVoting(false);
    }
  };

  if (myVote) {
    const votedPlayer = players.find(p => p.id === myVote.playerId);
    return (
      <div className="mt-6 flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-xs font-bold text-emerald-700">
        <Trophy className="w-4 h-4 flex-shrink-0" />
        {myVote.playerId === MVP_SKIP_ID ? (
          <span>You skipped the MVP vote for this match.</span>
        ) : (
          <span>You voted <span className="text-slate-800">{votedPlayer?.name || 'Unknown Player'}</span> as Match MVP.</span>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
        <Trophy className="w-3.5 h-3.5" />
        Vote for Match MVP
      </div>
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer text-sm"
        >
          <option value="" disabled>Select a player...</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value={MVP_SKIP_ID}>Skip — I wasn't there</option>
        </select>
        <button
          type="submit"
          disabled={!selected || isVoting}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
        >
          {isVoting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
      {voteError && <p className="text-[10px] text-red-500 font-bold">{voteError}</p>}
    </form>
  );
};

const AvailabilityList: React.FC<{ entries: AvailabilityEntry[]; players: Player[] }> = ({ entries, players }) => {
  const nameOf = (playerId: string) => players.find(p => p.id === playerId)?.name || 'Unknown';
  const available = entries.filter(e => e.status === 'Yes');
  const reserves = entries.filter(e => e.status === 'If Needed');
  const unavailable = entries.filter(e => e.status === 'No');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
        <span>Rotation Roster Availability</span>
        <div className="flex gap-4">
          <span className="text-emerald-600">Available: {available.length}</span>
          <span className="text-slate-500">Reserves: {reserves.length}</span>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2">No responses yet. Set yours from the My Availability tab.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map(e => (
            <span key={e.id} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700">{nameOf(e.id)}</span>
          ))}
          {reserves.map(e => (
            <span key={e.id} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-700">{nameOf(e.id)}</span>
          ))}
          {unavailable.map(e => (
            <span key={e.id} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500">{nameOf(e.id)}</span>
          ))}
        </div>
      )}
    </div>
  );
};

const LineupPicker: React.FC<{
  players: Player[];
  entries: AvailabilityEntry[];
  initialSingles: string[];
  initialDoubles: string[];
  onConfirm: (singles: string[], doubles: string[]) => Promise<void>;
  compact?: boolean;
}> = ({ players, entries, initialSingles, initialDoubles, onConfirm, compact }) => {
  const [singles, setSingles] = useState<string[]>(initialSingles);
  const [doubles, setDoubles] = useState<string[]>(initialDoubles);
  const [isSaving, setIsSaving] = useState(false);
  const statusOf = (playerId: string) => entries.find(e => e.id === playerId)?.status;

  const toggleSingles = (playerId: string) => {
    setSingles(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
      if (prev.length >= 6) return prev;
      return [...prev, playerId];
    });
  };

  const toggleDoubles = (playerId: string) => {
    setDoubles(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await onConfirm(singles, doubles);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
        <span>Pick Today's Lineup</span>
        <span>Singles {singles.length}/6 &middot; Doubles {doubles.length}</span>
      </div>
      <div className={cn("grid gap-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
        {players.map(player => {
          const status = statusOf(player.id);
          const isSingles = singles.includes(player.id);
          const isDoubles = doubles.includes(player.id);
          const singlesDisabled = !isSingles && singles.length >= 6;
          return (
            <div key={player.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-slate-700 truncate max-w-[90px]">{player.name}</span>
                {status && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex-shrink-0",
                    status === 'Yes' ? "bg-emerald-100 text-emerald-700" : status === 'If Needed' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"
                  )}>
                    {status === 'If Needed' ? 'Need' : status}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => toggleSingles(player.id)}
                  disabled={singlesDisabled}
                  title="Singles"
                  className={cn(
                    "w-7 h-7 rounded-lg text-[10px] font-black transition-all",
                    isSingles
                      ? "bg-emerald-600 text-white"
                      : singlesDisabled
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                        : "bg-white border border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-600"
                  )}
                >
                  S
                </button>
                <button
                  type="button"
                  onClick={() => toggleDoubles(player.id)}
                  title="Doubles"
                  className={cn(
                    "w-7 h-7 rounded-lg text-[10px] font-black transition-all",
                    isDoubles
                      ? "bg-sky-600 text-white"
                      : "bg-white border border-slate-200 text-slate-400 hover:border-sky-400 hover:text-sky-600"
                  )}
                >
                  D
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleConfirm}
          disabled={isSaving}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Confirm Lineup'}
        </button>
      </div>
    </div>
  );
};

const MatchRoster: React.FC<{ year: string; league: string; match: Match; players: Player[]; isAdmin: boolean; compact?: boolean }> = ({ year, league, match, players, isAdmin, compact }) => {
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [viewAvailability, setViewAvailability] = useState(false);

  useEffect(() => {
    return tennisService.subscribeAvailability(year, league, match.id, setEntries);
  }, [year, league, match.id]);

  const lineupSingles = match.lineupSingles || [];
  const lineupDoubles = match.lineupDoubles || [];
  const hasLineup = lineupSingles.length > 0 || lineupDoubles.length > 0;
  const playerById = (id: string) => players.find(p => p.id === id);

  const handleConfirm = async (singles: string[], doubles: string[]) => {
    await tennisService.setLineup(year, league, match.id, singles, doubles);
    setViewAvailability(false);
  };

  if (!hasLineup || viewAvailability) {
    return (
      <div className="mt-8 flex flex-col gap-4">
        {isAdmin ? (
          <LineupPicker players={players} entries={entries} initialSingles={lineupSingles} initialDoubles={lineupDoubles} onConfirm={handleConfirm} compact={compact} />
        ) : (
          <AvailabilityList entries={entries} players={players} />
        )}
        {hasLineup && (
          <div className="flex justify-end">
            <button onClick={() => setViewAvailability(false)} className="text-xs text-emerald-600 font-bold hover:underline">Lineup</button>
          </div>
        )}
      </div>
    );
  }

  const singlesSorted = lineupSingles
    .map(playerById)
    .filter((p): p is Player => !!p)
    .sort((a, b) => a.rank - b.rank);

  const doublesSorted = lineupDoubles
    .map(playerById)
    .filter((p): p is Player => !!p)
    .sort((a, b) => a.rank - b.rank);

  return (
    <div className="mt-8 flex flex-col gap-4">
      <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
        <span>Playing Today</span>
        <button onClick={() => setViewAvailability(true)} className="text-emerald-600 hover:underline normal-case font-bold">Availability</button>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Singles</span>
        <div className="flex flex-wrap gap-2">
          {singlesSorted.length === 0 && <span className="text-xs text-slate-400 italic">None selected</span>}
          {singlesSorted.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black flex-shrink-0">{i + 1}</span>
              {p.name} <span className="text-emerald-500">#{p.rank}</span>
            </span>
          ))}
        </div>
      </div>
      {doublesSorted.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Doubles</span>
          <div className="flex flex-wrap gap-2">
            {doublesSorted.map(p => (
              <span key={p.id} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-sky-100 text-sky-700">
                {p.name} <span className="text-sky-500">#{p.rank}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MatchCard: React.FC<{
  year: string;
  league: string;
  match: Match;
  players: Player[];
  isAdmin: boolean;
  userId?: string;
  onDelete: (id: string) => void;
  onToggleStatus: (match: Match) => void;
  onUpdateScore: (matchId: string, team: number) => void;
  compact?: boolean;
}> = ({ year, league, match, players, isAdmin, userId, onDelete, onToggleStatus, onUpdateScore, compact }) => {
  const isWin = (match.teamScore || 0) > (match.opponentScore || 0);
  const statusLabel = match.status === 'Completed' ? (isWin ? 'Win' : 'Loss') : match.status;
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group hover:border-emerald-100 transition-all h-full">
      <div className={cn(
        "px-6 py-3 border-b flex justify-between items-center transition-colors",
        match.status === 'Completed' ? "bg-slate-50 border-slate-100" : "bg-emerald-50/30 border-emerald-100"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center text-slate-500 shadow-sm">
             <span className="text-[8px] uppercase font-black leading-none mb-0.5">{format(match.date.toDate(), 'MMM')}</span>
             <span className="text-sm font-black leading-none">{format(match.date.toDate(), 'd')}</span>
          </div>
          <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{match.season} League</p>
             <p className="text-xs font-bold text-slate-800">{format(match.date.toDate(), 'EEEE, h:mm a')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <span className={cn(
             "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm",
             match.homeAway === 'Home' ? "bg-emerald-600 text-white" : "bg-slate-800 text-white"
           )}>
             {match.homeAway}
           </span>
           {isAdmin && (
             <button onClick={() => onDelete(match.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h4 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">{match.opponent}</h4>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <MapPin className="w-4 h-4 text-emerald-500" />
              {match.location}
            </div>
          </div>

          {isAdmin ? (
            <button
              onClick={() => onToggleStatus(match)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border",
                match.status === 'Completed'
                  ? (isWin ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-red-100 border-red-200 text-red-500")
                  : "bg-white border-slate-200 text-slate-400 hover:border-emerald-500 hover:text-emerald-600"
              )}
            >
              {statusLabel}
            </button>
          ) : (
            <span className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border font-bold",
              match.status === 'Completed'
                ? (isWin ? "bg-emerald-100 border-emerald-100 text-emerald-700" : "bg-red-100 border-red-100 text-red-500")
                : "bg-slate-50 border-slate-200 text-slate-400"
            )}>
              {statusLabel}
            </span>
          )}
        </div>

        {match.status === 'Completed' ? (
          <div className="mt-8 flex items-center gap-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">M.E.S.E</span>
              {isAdmin ? (
                <select
                  value={match.teamScore ?? 0}
                  onChange={e => onUpdateScore(match.id, parseInt(e.target.value))}
                  className="w-16 h-16 text-4xl font-bold bg-white rounded-xl text-center border border-slate-150 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer"
                >
                  {Array.from({ length: 10 }, (_, i) => i).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              ) : (
                <span className="w-16 h-16 text-4xl font-bold flex items-center justify-center text-slate-800 bg-white rounded-xl border border-slate-150 shadow-sm">{match.teamScore}</span>
              )}
            </div>
            <div className="text-3xl font-light text-slate-200 self-end mb-4">:</div>
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">{match.opponent.split(' ')[0]}</span>
              <span className="w-16 h-16 text-4xl font-bold flex items-center justify-center text-slate-800 bg-white rounded-xl border border-slate-150 shadow-sm">{match.opponentScore}</span>
            </div>
          </div>
        ) : null}

        {match.status === 'Completed' && userId ? (
          <MvpVoteBox year={year} league={league} match={match} players={players} userId={userId} />
        ) : null}

        {match.status !== 'Completed' && (
          <MatchRoster year={year} league={league} match={match} players={players} isAdmin={isAdmin} compact={compact} />
        )}
      </div>
    </section>
  );
};

export const Matches: React.FC = () => {
  const { year, league, user, isAdmin } = useAppContext();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MatchStatus>('Scheduled');
  
  // Form state
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchHour, setMatchHour] = useState('09');
  const [season, setSeason] = useState<Season>('Spring');
  const [homeAway, setHomeAway] = useState<HomeAway>('Home');

  useEffect(() => {
    if (!user) {
      setMatches([]);
      setPlayers([]);
      return;
    }
    const unsubMatches = tennisService.subscribeMatches(year, league, (data) => setMatches(data));
    const unsubPlayers = tennisService.subscribePlayers(year, league, (data) => setPlayers(data));
    return () => {
      unsubMatches();
      unsubPlayers();
    };
  }, [year, league, user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent || !location || !matchDate) return;

    setIsSaving(true);
    setSavingError(null);
    try {
      await tennisService.addMatch(year, league, {
        opponent,
        location,
        date: Timestamp.fromDate(new Date(`${matchDate}T${matchHour}:00`)),
        season,
        homeAway,
        status: 'Scheduled'
      });

      setOpponent('');
      setLocation('');
      setMatchDate('');
      setMatchHour('09');
      setIsAdding(false);
    } catch (err: any) {
      console.error('Failed to add match:', err);
      setSavingError(err.message || String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this match?')) {
      await tennisService.deleteMatch(year, league, id);
    }
  };

  const toggleStatus = async (match: Match) => {
    const newStatus: MatchStatus = match.status === 'Scheduled' ? 'Completed' : 'Scheduled';
    const updates: Partial<Match> = { status: newStatus };
    if (newStatus === 'Completed') {
      updates.teamScore = 0;
      updates.opponentScore = 9;
    }
    await tennisService.updateMatch(year, league, match.id, updates);
  };

  // A match is always 6 singles + 3 doubles, so the two scores always sum to 9.
  const updateScore = async (matchId: string, team: number) => {
    await tennisService.updateMatch(year, league, matchId, { teamScore: team, opponentScore: 9 - team });
  };

  const upcomingCount = matches.filter(m => m.status === 'Scheduled').length;
  const completedCount = matches.filter(m => m.status === 'Completed').length;

  const sortedMatches = matches
    .filter(m => m.status === statusFilter)
    .sort((a, b) => {
      const diff = a.date.toMillis() - b.date.toMillis();
      return statusFilter === 'Scheduled' ? diff : -diff;
    });

  // Group into weekends: an ISO week always contains both days of a calendar
  // weekend, so this groups Sat+Sun together while still handling a
  // postponed/single-match weekend gracefully.
  const weekendGroups: { key: string; matches: Match[] }[] = [];
  sortedMatches.forEach(match => {
    const d = match.date.toDate();
    const key = `${getISOWeekYear(d)}-${getISOWeek(d)}`;
    const last = weekendGroups[weekendGroups.length - 1];
    if (last && last.key === key) {
      last.matches.push(match);
    } else {
      weekendGroups.push({ key, matches: [match] });
    }
  });
  // Within a group, always show the earlier date on the left, regardless of
  // whether the overall section (upcoming vs completed) sorts asc or desc.
  weekendGroups.forEach(group => group.matches.sort((a, b) => a.date.toMillis() - b.date.toMillis()));

  const formatWeekendRange = (group: Match[]) => {
    const dates = group.map(m => m.date.toDate()).sort((a, b) => a.getTime() - b.getTime());
    const start = dates[0];
    const end = dates[dates.length - 1];
    if (start.toDateString() === end.toDateString()) return format(start, 'MMMM d');
    if (format(start, 'MMMM yyyy') === format(end, 'MMMM yyyy')) return `${format(start, 'MMMM d')} – ${format(end, 'd')}`;
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
  };

  return (
    <div className="p-6 flex flex-col gap-6 pb-32 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Match Schedule</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Upcoming & Past Events</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all font-bold text-sm shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-5 h-5" />
            <span>New Match</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setStatusFilter('Scheduled')}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
            statusFilter === 'Scheduled' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Upcoming &middot; {upcomingCount}
        </button>
        <button
          onClick={() => setStatusFilter('Completed')}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
            statusFilter === 'Completed' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Results &middot; {completedCount}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="tonal-card p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800">Match Details</h3>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{season} Season</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opponent Club</label>
              <input 
                 value={opponent} 
                 onChange={e => setOpponent(e.target.value)} 
                 placeholder="e.g. Evergreen Club"
                 className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venue Location</label>
              <input 
                value={location} 
                onChange={e => setLocation(e.target.value)} 
                placeholder="e.g. Riverside Courts"
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Time</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={matchDate}
                  onChange={e => setMatchDate(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
                <select
                  value={matchHour}
                  onChange={e => setMatchHour(e.target.value)}
                  className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                >
                  {Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')).map(h => (
                    <option key={h} value={h}>{h}:00</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format</label>
              <div className="flex gap-2">
                <select value={season} onChange={e => setSeason(e.target.value as any)} className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer">
                  <option value="Spring">Spring</option>
                  <option value="Fall">Fall</option>
                </select>
                <select value={homeAway} onChange={e => setHomeAway(e.target.value as any)} className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer">
                  <option value="Home">Home</option>
                  <option value="Away">Away</option>
                </select>
              </div>
            </div>
          </div>
          {savingError && (
            <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-xl text-xs font-bold animate-in fade-in space-y-2">
              <div>Failed to schedule match:</div>
              <div className="font-mono text-[11px] bg-red-100/50 p-3 rounded-lg border border-red-200 overflow-x-auto text-left whitespace-pre-wrap max-h-60">
                {savingError.startsWith('{') ? (
                  (() => {
                    try {
                      return JSON.stringify(JSON.parse(savingError), null, 2);
                    } catch (e) {
                      return savingError;
                    }
                  })()
                ) : (
                  savingError
                )}
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
             <button type="button" disabled={isSaving} onClick={() => setIsAdding(false)} className="px-6 py-2.5 text-slate-400 font-bold text-sm hover:text-slate-800 transition-colors disabled:opacity-50">Cancel</button>
             <button type="submit" disabled={isSaving} className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50">
               {isSaving ? 'Scheduling...' : 'Schedule Match'}
             </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-8">
        {weekendGroups.length === 0 && (
          <div className="p-12 text-center text-slate-400 italic bg-white rounded-2xl border border-slate-200">
            {statusFilter === 'Scheduled' ? 'No upcoming matches scheduled' : 'No completed matches yet'}
          </div>
        )}
        {weekendGroups.map(group => (
          <div key={group.key} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Calendar className="w-3.5 h-3.5" />
              {formatWeekendRange(group.matches)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {group.matches.map(match => (
                <div key={match.id} className={group.matches.length === 1 ? "lg:col-span-2" : ""}>
                  <MatchCard
                    year={year}
                    league={league}
                    match={match}
                    players={players}
                    isAdmin={isAdmin}
                    userId={user?.uid}
                    onDelete={handleDelete}
                    onToggleStatus={toggleStatus}
                    onUpdateScore={updateScore}
                    compact={group.matches.length > 1}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
