import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Calendar, MapPin, Trophy, Trash2, UserCheck, Copy, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { tennisService } from '../services/tennisService';
import { Match, Player, Season, HomeAway, MatchStatus, MvpVote, MVP_SKIP_ID, AvailabilityEntry, AvailabilityStatus } from '../types';
import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import { cn } from '../lib/utils';
import { Timestamp } from 'firebase/firestore';

const MyAvailabilityRow: React.FC<{ year: string; league: string; matchId: string; myPlayers: Player[] }> = ({ year, league, matchId, myPlayers }) => {
  const [statusMap, setStatusMap] = useState<Record<string, AvailabilityStatus | undefined>>({});
  const myPlayerIds = myPlayers.map(p => p.id).join(',');

  useEffect(() => {
    setStatusMap({});
    if (myPlayers.length === 0) return;
    const unsubs = myPlayers.map(p =>
      tennisService.subscribePlayerAvailability(year, league, matchId, p.id, (status) => {
        setStatusMap(prev => ({ ...prev, [p.id]: status }));
      })
    );
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, league, matchId, myPlayerIds]);

  if (myPlayers.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
      {myPlayers.map(player => {
        const status = statusMap[player.id];
        return (
          <div key={player.id} className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 truncate">{player.name}</span>
            <div className="flex gap-1.5 flex-shrink-0">
              {(['Yes', 'No', 'If Needed'] as AvailabilityStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => tennisService.setAvailability(year, league, matchId, player.id, s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    status === s
                      ? (s === 'Yes' ? "bg-emerald-600 text-white shadow-sm" : s === 'No' ? "bg-slate-800 text-white" : "bg-amber-500 text-white")
                      : "bg-white border border-slate-200 text-slate-400 hover:border-emerald-200 hover:text-emerald-500"
                  )}
                >
                  {s === 'If Needed' ? 'Sub' : s}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AvailabilityList: React.FC<{ entries: AvailabilityEntry[]; players: Player[]; isAdmin?: boolean }> = ({ entries, players, isAdmin }) => {
  const nameOf = (playerId: string) => players.find(p => p.id === playerId)?.name || 'Unknown';
  const available = entries.filter(e => e.status === 'Yes');
  const reserves = entries.filter(e => e.status === 'If Needed');
  const unavailable = entries.filter(e => e.status === 'No');
  const noResponse = isAdmin ? players.filter(p => !entries.some(e => e.id === p.id)) : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
        <span>Rotation Roster Availability</span>
        <div className="flex gap-4">
          <span className="text-emerald-600">Available: {available.length}</span>
          <span className="text-slate-500">Reserves: {reserves.length}</span>
          {isAdmin && <span className="text-red-400">No Response: {noResponse.length}</span>}
        </div>
      </div>
      {entries.length === 0 && noResponse.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2">No responses yet.</p>
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
          {noResponse.map(p => (
            <span key={p.id} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-400 border border-dashed border-red-200">{p.name}</span>
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
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex-shrink-0",
                  status === 'Yes' ? "bg-emerald-100 text-emerald-700"
                    : status === 'If Needed' ? "bg-amber-100 text-amber-700"
                    : status === 'No' ? "bg-slate-100 text-slate-400"
                    : "bg-red-50 text-red-300 border border-dashed border-red-200"
                )}>
                  {status === 'If Needed' ? 'Sub' : status || 'No Response'}
                </span>
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

const LineupRow: React.FC<{
  player: Player;
  slot?: number;
  canVote: boolean;
  isMyVote: boolean;
  hasVoted: boolean;
  onVote: () => void;
}> = ({ player, slot, canVote, isMyVote, hasVoted, onVote }) => {
  const content = (
    <>
      <span className="flex items-center gap-1.5 min-w-0">
        {slot !== undefined && (
          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black flex-shrink-0">{slot}</span>
        )}
        <span className="font-bold text-slate-700 truncate">{player.name}</span>
        <span className="text-slate-400 text-[10px] flex-shrink-0">#{player.rank}</span>
      </span>
      {isMyVote && (
        <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase flex-shrink-0">
          <Trophy className="w-3 h-3" /> MVP
        </span>
      )}
      {canVote && !hasVoted && (
        <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex-shrink-0 transition-colors bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600">
          MVP
        </span>
      )}
    </>
  );

  if (canVote && !hasVoted) {
    return (
      <button onClick={onVote} className="group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all text-left">
        {content}
      </button>
    );
  }

  return (
    <div className={cn(
      "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs border",
      isMyVote ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100"
    )}>
      {content}
    </div>
  );
};

const MatchRoster: React.FC<{ year: string; league: string; match: Match; players: Player[]; isAdmin: boolean; userId?: string; compact?: boolean }> = ({ year, league, match, players, isAdmin, userId, compact }) => {
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [viewAvailability, setViewAvailability] = useState(false);
  const [mvpVotes, setMvpVotes] = useState<MvpVote[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return tennisService.subscribeAvailability(year, league, match.id, setEntries);
  }, [year, league, match.id]);

  useEffect(() => {
    if (match.status !== 'Completed') return;
    return tennisService.subscribeMvpVotes(year, league, match.id, setMvpVotes);
  }, [year, league, match.id, match.status]);

  const lineupSingles = match.lineupSingles || [];
  const lineupDoubles = match.lineupDoubles || [];
  const hasLineup = lineupSingles.length > 0 || lineupDoubles.length > 0;
  const playerById = (id: string) => players.find(p => p.id === id);

  const handleConfirm = async (singles: string[], doubles: string[]) => {
    await tennisService.setLineup(year, league, match.id, singles, doubles);
    setViewAvailability(false);
  };

  const myVote = userId ? mvpVotes.find(v => v.voterId === userId) : undefined;
  const canVote = match.status === 'Completed' && !!userId;

  const handleVote = async (playerId: string) => {
    if (!userId || myVote) return;
    await tennisService.voteMvp(year, league, match.id, playerId, userId);
  };

  const handleRetractVote = async () => {
    if (!userId) return;
    await tennisService.retractMvpVote(year, league, match.id, userId);
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

  const copyLineup = async () => {
    const lines = [
      `${match.opponent} — ${format(match.date.toDate(), 'EEEE, MMM d, h:mm a')} (${match.homeAway})`,
      match.location,
      '',
      'Singles:',
      ...singlesSorted.map((p, i) => `${i + 1}. ${p.name} (#${p.rank})`),
    ];
    if (doublesSorted.length > 0) {
      lines.push('', 'Doubles:', ...doublesSorted.map(p => `- ${p.name} (#${p.rank})`));
    }
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-8 flex flex-col gap-3">
      <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
        <span>{match.status === 'Completed' ? 'Lineup' : 'Playing Today'}</span>
        <div className="flex items-center gap-3">
          <button onClick={copyLineup} className="flex items-center gap-1 text-slate-400 hover:text-emerald-600 normal-case font-bold transition-colors" title="Copy lineup">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={() => setViewAvailability(true)} className="text-emerald-600 hover:underline normal-case font-bold">Availability</button>
        </div>
      </div>
      <div className={cn("grid gap-4", doublesSorted.length > 0 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Singles</span>
          <div className="flex flex-col gap-1.5">
            {singlesSorted.length === 0 && <span className="text-xs text-slate-400 italic">None selected</span>}
            {singlesSorted.map((p, i) => (
              <LineupRow
                key={p.id}
                player={p}
                slot={i + 1}
                canVote={canVote}
                isMyVote={myVote?.playerId === p.id}
                hasVoted={!!myVote}
                onVote={() => handleVote(p.id)}
              />
            ))}
          </div>
        </div>
        {doublesSorted.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Doubles</span>
            <div className="flex flex-col gap-1.5">
              {doublesSorted.map(p => (
                <LineupRow
                  key={p.id}
                  player={p}
                  canVote={canVote}
                  isMyVote={myVote?.playerId === p.id}
                  hasVoted={!!myVote}
                  onVote={() => handleVote(p.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {canVote && (
        myVote ? (
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
            <span>{myVote.playerId === MVP_SKIP_ID ? 'You skipped the MVP vote for this match.' : 'Thanks for voting!'}</span>
            <button onClick={handleRetractVote} className="text-slate-400 hover:text-red-500 underline transition-colors">
              Change vote
            </button>
          </div>
        ) : (
          <button onClick={() => handleVote(MVP_SKIP_ID)} className="text-[10px] text-slate-400 hover:text-slate-600 font-bold self-start transition-colors">
            Skip — I wasn't there
          </button>
        )
      )}
    </div>
  );
};

const MatchCard: React.FC<{
  year: string;
  league: string;
  match: Match;
  players: Player[];
  myPlayers: Player[];
  isAdmin: boolean;
  userId?: string;
  onDelete: (id: string) => void;
  onToggleStatus: (match: Match) => void;
  onUpdateScore: (matchId: string, team: number) => void;
  compact?: boolean;
}> = ({ year, league, match, players, myPlayers, isAdmin, userId, onDelete, onToggleStatus, onUpdateScore, compact }) => {
  const isWin = (match.teamScore || 0) > (match.opponentScore || 0);
  const statusLabel = match.status === 'Completed' ? (isWin ? 'Win' : 'Loss') : match.status;
  const statusColorClasses = match.status === 'Completed'
    ? (isWin ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-500")
    : "bg-white border border-slate-200 text-slate-500";
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
           {isAdmin ? (
             <button
               onClick={() => onToggleStatus(match)}
               className={cn("px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm transition-all", statusColorClasses)}
             >
               {statusLabel}
             </button>
           ) : (
             <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm", statusColorClasses)}>
               {statusLabel}
             </span>
           )}
           {isAdmin && (
             <button onClick={() => onDelete(match.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      <div className="p-6">
        <div>
          <h4 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">{match.opponent}</h4>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <MapPin className="w-4 h-4 text-emerald-500" />
            {match.location}
            <span className={cn(
              "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
              match.homeAway === 'Home' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
            )}>
              {match.homeAway}
            </span>
          </div>
        </div>

        {match.status === 'Scheduled' && (
          <MyAvailabilityRow year={year} league={league} matchId={match.id} myPlayers={myPlayers} />
        )}

        {match.status === 'Completed' ? (
          <div className="mt-8 flex items-center gap-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">M.E.S.E</span>
              {isAdmin ? (
                <select
                  value={match.teamScore ?? 0}
                  onChange={e => onUpdateScore(match.id, parseInt(e.target.value))}
                  className="w-16 h-16 text-4xl font-bold bg-white rounded-xl text-center border border-slate-150 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer p-0"
                  style={{ textAlignLast: 'center', textAlign: 'center', lineHeight: '4rem' }}
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

        <MatchRoster year={year} league={league} match={match} players={players} isAdmin={isAdmin} userId={userId} compact={compact} />
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
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<MatchStatus>(searchParams.get('tab') === 'results' ? 'Completed' : 'Scheduled');
  const [claimSelection, setClaimSelection] = useState<string[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

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

  const myPlayers = players.filter(p => p.uid === user?.uid);
  const unclaimedPlayers = players.filter(p => !p.uid);

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
                    myPlayers={myPlayers}
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
