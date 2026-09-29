import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Calendar, MapPin, Trophy, Trash2, UserCheck, Copy, Check, X, ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { tennisService } from '../services/tennisService';
import { Match, Player, Season, HomeAway, MatchStatus, MvpVote, MVP_SKIP_ID, AvailabilityEntry, AvailabilityStatus, SetScore, SinglesResult, DoublesResult, Outcome } from '../types';
import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import { cn } from '../lib/utils';
import { Timestamp } from 'firebase/firestore';
import { matchWinner, needsThirdSet, computeTeamScore, resultWinner } from '../lib/results';
import { pairCandidateId } from '../lib/mvp';

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
    <div className="mt-4 pt-4 border-t border-ink-100 flex flex-col gap-2">
      {myPlayers.map(player => {
        const status = statusMap[player.id];
        return (
          <div key={player.id} className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-ink-700 truncate">{player.name}</span>
            <div className="flex gap-1.5 flex-shrink-0">
              {(['Yes', 'No', 'If Needed'] as AvailabilityStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => tennisService.setAvailability(year, league, matchId, player.id, s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    status === s
                      ? (s === 'Yes' ? "bg-win-600 text-white shadow-sm" : s === 'No' ? "bg-ink-800 text-white" : "bg-clay-600 text-white")
                      : "bg-white border border-ink-200 text-ink-400 hover:border-brand-200 hover:text-brand-500"
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
      <div className="flex items-center justify-between text-[10px] font-black text-ink-400 uppercase tracking-widest border-b border-ink-100 pb-2">
        <span>Rotation Roster Availability</span>
        <div className="flex gap-4">
          <span className="text-win-600">Available: {available.length}</span>
          <span className="text-ink-500">Subs: {reserves.length}</span>
          {isAdmin && <span className="text-red-400">No Response: {noResponse.length}</span>}
        </div>
      </div>
      {entries.length === 0 && noResponse.length === 0 ? (
        <p className="text-xs text-ink-400 italic py-2">No responses yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map(e => (
            <span key={e.id} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-win-100 text-win-700">{nameOf(e.id)}</span>
          ))}
          {reserves.map(e => (
            <span key={e.id} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-clay-100 text-clay-700">{nameOf(e.id)}</span>
          ))}
          {unavailable.map(e => (
            <span key={e.id} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-ink-100 text-ink-500">{nameOf(e.id)}</span>
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
      <div className="flex items-center justify-between text-[10px] font-black text-ink-400 uppercase tracking-widest border-b border-ink-100 pb-2">
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
            <div key={player.id} className="flex items-center justify-between p-3 rounded-xl bg-ink-50 border border-ink-100 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-ink-700 truncate max-w-[90px]">{player.name}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex-shrink-0",
                  status === 'Yes' ? "bg-win-100 text-win-700"
                    : status === 'If Needed' ? "bg-clay-100 text-clay-700"
                    : status === 'No' ? "bg-ink-100 text-ink-400"
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
                      ? "bg-brand-600 text-white"
                      : singlesDisabled
                        ? "bg-ink-100 text-ink-300 cursor-not-allowed"
                        : "bg-white border border-ink-200 text-ink-400 hover:border-brand-400 hover:text-brand-600"
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
                      ? "bg-win-600 text-white"
                      : "bg-white border border-ink-200 text-ink-400 hover:border-win-400 hover:text-win-600"
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
          className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-700 transition-all shadow-lg disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Confirm Lineup'}
        </button>
      </div>
    </div>
  );
};

// One tile per singles player, or one tile holding both partners of a
// doubles pair. The background shows the result; on a completed match the
// tile opens to show or enter the score. The arrow and MVP slots are
// fixed-width so they line up across tiles.
const LineupRow: React.FC<{
  players: Player[];
  slot?: number;
  isCompleted: boolean;
  result?: 'win' | 'loss';
  expandable: boolean;
  expanded: boolean;
  onToggle: () => void;
  canVote: boolean;
  isMyVote: boolean;
  hasVoted: boolean;
  onVote: () => void;
  children?: React.ReactNode;
}> = ({ players, slot, isCompleted, result, expandable, expanded, onToggle, canVote, isMyVote, hasVoted, onVote, children }) => {
  // A pair tile is padded to the height of two single tiles so the doubles
  // column (3 pairs) matches the singles column (6 players).
  const rowPadding = players.length > 1 ? "py-3" : "py-1.5";
  return (
    <div className={cn(
      "rounded-lg text-xs border transition-colors",
      result === 'win' ? "bg-win-50 border-win-200" : result === 'loss' ? "bg-red-50 border-red-200" : "bg-ink-50 border-ink-100"
    )}>
      <div
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? expanded : undefined}
        onClick={expandable ? onToggle : undefined}
        onKeyDown={expandable ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } } : undefined}
        className={cn("flex items-center gap-2 px-2.5", rowPadding, expandable && "cursor-pointer")}
      >
        <span className="flex flex-col gap-2 min-w-0 flex-1">
          {players.map((player, i) => (
            <span key={player.id} className="flex items-center gap-1.5 min-w-0 min-h-6">
              {slot !== undefined && i === 0 && (
                <span className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[9px] font-black flex-shrink-0">{slot}</span>
              )}
              <span className="font-bold text-ink-700 truncate">{player.name}</span>
              <span className="text-ink-400 text-[10px] flex-shrink-0">#{player.rank}</span>
            </span>
          ))}
        </span>
        {isCompleted && (
          <ChevronDown className={cn(
            "w-3.5 h-3.5 flex-shrink-0 text-ink-400 transition-transform",
            !expandable && "invisible",
            expanded && "rotate-180"
          )} />
        )}
        {canVote && (
          <span className="w-12 flex justify-end flex-shrink-0">
            {isMyVote ? (
              <span className="flex items-center gap-1 text-[9px] font-black text-brand-600 uppercase">
                <Trophy className="w-3 h-3" /> MVP
              </span>
            ) : !hasVoted ? (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onVote(); }}
                className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors bg-white text-brand-600 border border-brand-200 hover:bg-brand-600 hover:text-white hover:border-brand-600"
              >
                MVP
              </button>
            ) : null}
          </span>
        )}
      </div>
      {expanded && <div className="px-2.5 pb-2.5">{children}</div>}
    </div>
  );
};

type SetInput = { us: string; them: string };

const toSetInputs = (sets?: SetScore[]): SetInput[] => {
  if (sets && sets.length >= 2) return sets.map(s => ({ us: String(s.us), them: String(s.them) }));
  return [{ us: '', them: '' }, { us: '', them: '' }];
};

const toSetScores = (inputs: SetInput[]): SetScore[] =>
  inputs.map(s => ({ us: parseInt(s.us) || 0, them: parseInt(s.them) || 0 }));

const SetScoreEditor: React.FC<{
  initialSets?: SetScore[];
  onSave: (sets: SetScore[]) => Promise<void>;
  onCancel: () => void;
}> = ({ initialSets, onSave, onCancel }) => {
  const [sets, setSets] = useState<SetInput[]>(() => toSetInputs(initialSets));
  const [isSaving, setIsSaving] = useState(false);

  const scores = toSetScores(sets);
  const showThird = needsThirdSet(scores[0] || { us: 0, them: 0 }, scores[1] || { us: 0, them: 0 });
  const visibleSets = showThird ? [sets[0], sets[1], sets[2] || { us: '', them: '' }] : [sets[0], sets[1]];
  const winner = matchWinner(toSetScores(visibleSets));

  const updateSet = (i: number, field: 'us' | 'them', value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 2);
    setSets(prev => {
      const next = [...prev];
      while (next.length <= i) next.push({ us: '', them: '' });
      next[i] = { ...next[i], [field]: cleaned };
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(toSetScores(visibleSets));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visibleSets.map((s, i) => (
        <div key={i} className="flex items-center gap-1 bg-white border border-ink-200 rounded-lg px-2 py-1">
          <input
            inputMode="numeric"
            value={s.us}
            onChange={e => updateSet(i, 'us', e.target.value)}
            placeholder="0"
            className="w-6 text-center text-xs font-bold focus:outline-none placeholder:text-ink-300"
          />
          <span className="text-ink-300 text-xs">-</span>
          <input
            inputMode="numeric"
            value={s.them}
            onChange={e => updateSet(i, 'them', e.target.value)}
            placeholder="0"
            className="w-6 text-center text-xs font-bold focus:outline-none placeholder:text-ink-300"
          />
        </div>
      ))}
      <button
        onClick={handleSave}
        disabled={!winner || isSaving}
        title={winner ? 'Save' : 'Enter a decisive score first'}
        className="p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-all disabled:opacity-40 flex-shrink-0"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={onCancel} disabled={isSaving} className="p-2 rounded-lg bg-ink-50 text-ink-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// Opens inside a lineup tile: the score (read-only for non-admins), and for
// admins the score editor plus quick W/L buttons for when the score isn't known.
const ResultDetails: React.FC<{
  sets: SetScore[];
  winner?: Outcome;
  isAdmin: boolean;
  onSaveScore: (sets: SetScore[]) => Promise<void>;
  onMark: (outcome: Outcome) => Promise<void>;
  onClear?: () => Promise<void>;
  onUnpair?: () => Promise<void>;
  onClose: () => void;
}> = ({ sets, winner, isAdmin, onSaveScore, onMark, onClear, onUnpair, onClose }) => {
  const hasScore = matchWinner(sets) !== undefined;

  if (!isAdmin) {
    return (
      <div className="pt-2 border-t border-ink-200/70 text-ink-500 font-medium">
        {hasScore
          ? sets.map((s, i) => <span key={i} className="mr-2">{s.us}-{s.them}</span>)
          : winner
            ? `Marked as a ${winner === 'us' ? 'win' : 'loss'}, no score entered`
            : 'No score recorded'}
      </div>
    );
  }

  const quickButton = (outcome: Outcome) => (
    <button
      type="button"
      onClick={() => onMark(outcome)}
      title={outcome === 'us' ? 'Mark as won' : 'Mark as lost'}
      className={cn(
        "w-7 h-7 rounded-lg text-[10px] font-black transition-all",
        outcome === 'us'
          ? winner === 'us' ? "bg-win-600 text-white" : "bg-white border border-win-200 text-win-600 hover:bg-win-50"
          : winner === 'them' ? "bg-red-500 text-white" : "bg-white border border-red-200 text-red-500 hover:bg-red-50"
      )}
    >
      {outcome === 'us' ? 'W' : 'L'}
    </button>
  );

  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-ink-200/70">
      <SetScoreEditor key={JSON.stringify(sets)} initialSets={sets.length ? sets : undefined} onSave={onSaveScore} onCancel={onClose} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[9px] font-black text-ink-400 uppercase tracking-widest mr-1">No score?</span>
        {quickButton('us')}
        {quickButton('them')}
        <span className="flex-1" />
        {onClear && (
          <button type="button" onClick={onClear} className="text-[10px] font-bold text-ink-400 hover:text-red-500 transition-colors">
            Clear result
          </button>
        )}
        {onUnpair && (
          <button type="button" onClick={onUnpair} className="text-[10px] font-bold text-ink-400 hover:text-red-500 transition-colors">
            Unpair
          </button>
        )}
      </div>
    </div>
  );
};

const AddDoublesPairing: React.FC<{
  candidates: Player[];
  onAdd: (playerIds: [string, string]) => Promise<void>;
}> = ({ candidates, onAdd }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [isPicking, setIsPicking] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev);
  };

  if (candidates.length < 2) return null;

  if (!isPicking) {
    return (
      <button
        onClick={() => setIsPicking(true)}
        className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed border-ink-200 text-ink-400 hover:border-brand-300 hover:text-brand-600 transition-all text-xs font-bold"
      >
        <Plus className="w-3.5 h-3.5" /> Add Doubles Pairing
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-ink-50 border border-ink-100">
      <span className="text-[9px] font-black text-ink-400 uppercase tracking-widest">Pick 2 Players</span>
      <div className="flex flex-wrap gap-1.5">
        {candidates.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            disabled={!selected.includes(p.id) && selected.length >= 2}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all",
              selected.includes(p.id)
                ? "bg-win-600 text-white"
                : "bg-white border border-ink-200 text-ink-500 hover:border-win-300 disabled:opacity-40"
            )}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={() => { setIsPicking(false); setSelected([]); }} className="text-[10px] text-ink-400 hover:text-ink-600 font-bold">
          Cancel
        </button>
        <button
          onClick={async () => {
            await onAdd([selected[0], selected[1]]);
            setSelected([]);
            setIsPicking(false);
          }}
          disabled={selected.length !== 2}
          className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[10px] font-bold hover:bg-brand-700 transition-all disabled:opacity-40"
        >
          Pair
        </button>
      </div>
    </div>
  );
};

const MatchRoster: React.FC<{ year: string; league: string; match: Match; players: Player[]; isAdmin: boolean; userId?: string; compact?: boolean }> = ({ year, league, match, players, isAdmin, userId, compact }) => {
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [view, setView] = useState<'lineup' | 'availability'>('lineup');
  const [mvpVotes, setMvpVotes] = useState<MvpVote[]>([]);
  const [copied, setCopied] = useState(false);
  // Singles tiles are keyed by player id, pair tiles by their pair candidate id.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

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
    setView('lineup');
  };

  const isCompleted = match.status === 'Completed';
  const singlesResults = match.singlesResults || [];
  const doublesResults = match.doublesResults || [];
  const toResult = (r?: { sets: SetScore[]; outcome?: Outcome }): 'win' | 'loss' | undefined => {
    const w = r ? resultWinner(r) : undefined;
    return w === undefined ? undefined : w === 'us' ? 'win' : 'loss';
  };

  const saveResults = async (newSingles: SinglesResult[], newDoubles: DoublesResult[]) => {
    const { teamScore, opponentScore } = computeTeamScore(newSingles, newDoubles);
    await tennisService.updateMatch(year, league, match.id, {
      singlesResults: newSingles,
      doublesResults: newDoubles,
      teamScore,
      opponentScore
    });
    setExpandedKey(null);
  };

  // A score always carries its outcome. A quick W/L keeps an existing score
  // only if it agrees, otherwise drops it so the two can't contradict.
  const scored = (sets: SetScore[]) => ({ sets, outcome: matchWinner(sets) as Outcome });
  const marked = (existingSets: SetScore[], outcome: Outcome) => ({
    sets: matchWinner(existingSets) === outcome ? existingSets : [],
    outcome,
  });

  const upsertSingles = (playerId: string, result: { sets: SetScore[]; outcome: Outcome }) =>
    saveResults([...singlesResults.filter(r => r.playerId !== playerId), { playerId, ...result }], doublesResults);
  const replaceDoubles = (index: number, result: DoublesResult | null) =>
    saveResults(singlesResults, result
      ? doublesResults.map((r, i) => (i === index ? result : r))
      : doublesResults.filter((_, i) => i !== index));
  const toggleExpanded = (key: string) => setExpandedKey(prev => (prev === key ? null : key));

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

  const singlesSorted = lineupSingles
    .map(playerById)
    .filter((p): p is Player => !!p)
    .sort((a, b) => a.rank - b.rank);

  const doublesSorted = lineupDoubles
    .map(playerById)
    .filter((p): p is Player => !!p)
    .sort((a, b) => a.rank - b.rank);

  // Pairs are known once they're recorded as doubles results; until then
  // the doubles pool is shown player by player.
  const pairedIds = new Set(doublesResults.flatMap(r => r.playerIds));
  const unpairedDoubles = doublesSorted.filter(p => !pairedIds.has(p.id));

  if (!hasLineup || view === 'availability') {
    return (
      <div className="mt-8 flex flex-col gap-4">
        {isAdmin ? (
          <LineupPicker players={players} entries={entries} initialSingles={lineupSingles} initialDoubles={lineupDoubles} onConfirm={handleConfirm} compact={compact} />
        ) : (
          <AvailabilityList entries={entries} players={players} />
        )}
        {hasLineup && (
          <div className="flex justify-end">
            <button onClick={() => setView('lineup')} className="text-xs text-clay-600 font-bold hover:text-clay-700">Lineup</button>
          </div>
        )}
      </div>
    );
  }

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
      <div className="flex items-center justify-between text-[10px] font-black text-ink-400 uppercase tracking-widest border-b border-ink-100 pb-2">
        <span>{match.status === 'Completed' ? 'Lineup' : 'Playing Today'}</span>
        <div className="flex items-center gap-3">
          <button onClick={copyLineup} className="flex items-center gap-1 text-ink-400 hover:text-brand-600 normal-case font-bold transition-colors" title="Copy lineup">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={() => setView('availability')} className="text-clay-600 hover:text-clay-700 normal-case font-bold">Availability</button>
        </div>
      </div>
      <div className={cn("grid gap-4", doublesSorted.length > 0 && !compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-black text-ink-400 uppercase tracking-widest">Singles</span>
          <div className="flex flex-col gap-1.5">
            {singlesSorted.length === 0 && <span className="text-xs text-ink-400 italic">None selected</span>}
            {singlesSorted.map((p, i) => {
              const r = singlesResults.find(x => x.playerId === p.id);
              const winner = r ? resultWinner(r) : undefined;
              return (
                <LineupRow
                  key={p.id}
                  players={[p]}
                  slot={i + 1}
                  isCompleted={isCompleted}
                  result={toResult(r)}
                  expandable={isCompleted && (isAdmin || !!winner)}
                  expanded={expandedKey === p.id}
                  onToggle={() => toggleExpanded(p.id)}
                  canVote={canVote}
                  isMyVote={myVote?.playerId === p.id}
                  hasVoted={!!myVote}
                  onVote={() => handleVote(p.id)}
                >
                  <ResultDetails
                    sets={r?.sets || []}
                    winner={winner}
                    isAdmin={isAdmin}
                    onSaveScore={sets => upsertSingles(p.id, scored(sets))}
                    onMark={outcome => upsertSingles(p.id, marked(r?.sets || [], outcome))}
                    onClear={r ? () => saveResults(singlesResults.filter(x => x.playerId !== p.id), doublesResults) : undefined}
                    onClose={() => setExpandedKey(null)}
                  />
                </LineupRow>
              );
            })}
          </div>
        </div>
        {doublesSorted.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-ink-400 uppercase tracking-widest">Doubles</span>
            <div className="flex flex-col gap-1.5">
              {doublesResults.map((r, index) => {
                const candidateId = pairCandidateId(r.playerIds);
                const winner = resultWinner(r);
                return (
                  <LineupRow
                    key={candidateId}
                    players={r.playerIds.map(playerById).filter((p): p is Player => !!p)}
                    isCompleted={isCompleted}
                    result={toResult(r)}
                    expandable={isCompleted && (isAdmin || !!winner)}
                    expanded={expandedKey === candidateId}
                    onToggle={() => toggleExpanded(candidateId)}
                    canVote={canVote}
                    isMyVote={myVote?.playerId === candidateId}
                    hasVoted={!!myVote}
                    onVote={() => handleVote(candidateId)}
                  >
                    <ResultDetails
                      sets={r.sets}
                      winner={winner}
                      isAdmin={isAdmin}
                      onSaveScore={sets => replaceDoubles(index, { playerIds: r.playerIds, ...scored(sets) })}
                      onMark={outcome => replaceDoubles(index, { playerIds: r.playerIds, ...marked(r.sets, outcome) })}
                      onClear={winner ? () => replaceDoubles(index, { playerIds: r.playerIds, sets: [] }) : undefined}
                      onUnpair={() => replaceDoubles(index, null)}
                      onClose={() => setExpandedKey(null)}
                    />
                  </LineupRow>
                );
              })}
              {unpairedDoubles.map(p => (
                <LineupRow
                  key={p.id}
                  players={[p]}
                  isCompleted={isCompleted}
                  expandable={false}
                  expanded={false}
                  onToggle={() => {}}
                  canVote={canVote}
                  isMyVote={myVote?.playerId === p.id}
                  hasVoted={!!myVote}
                  onVote={() => handleVote(p.id)}
                />
              ))}
              {isAdmin && isCompleted && doublesResults.length < 3 && (
                <AddDoublesPairing
                  candidates={unpairedDoubles}
                  onAdd={playerIds => saveResults(singlesResults, [...doublesResults, { playerIds, sets: [] }])}
                />
              )}
            </div>
          </div>
        )}
      </div>
      {canVote && (
        myVote ? (
          <div className="flex items-center gap-2 text-[10px] text-ink-400 font-bold">
            <span>{myVote.playerId === MVP_SKIP_ID ? 'You skipped the MVP vote for this match.' : 'Thanks for voting!'}</span>
            <button onClick={handleRetractVote} className="text-ink-400 hover:text-red-500 underline transition-colors">
              Change vote
            </button>
          </div>
        ) : (
          <button onClick={() => handleVote(MVP_SKIP_ID)} className="text-[10px] text-ink-400 hover:text-ink-600 font-bold self-start transition-colors">
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
    ? (isWin ? "bg-win-100 text-win-700" : "bg-red-100 text-red-500")
    : "bg-white border border-ink-200 text-ink-500";
  return (
    <section className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden group hover:border-brand-100 transition-all h-full">
      <div className={cn(
        "px-6 py-3 border-b flex justify-between items-center transition-colors",
        match.status === 'Completed' ? "bg-ink-50 border-ink-100" : "bg-brand-50/30 border-brand-100"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg border border-ink-200 flex flex-col items-center justify-center text-ink-500 shadow-sm">
             <span className="text-[8px] uppercase font-black leading-none mb-0.5">{format(match.date.toDate(), 'MMM')}</span>
             <span className="text-sm font-black leading-none">{format(match.date.toDate(), 'd')}</span>
          </div>
          <div>
             <p className="text-[10px] font-black text-clay-600 uppercase tracking-widest">{match.season} League</p>
             <p className="text-xs font-bold text-ink-800">{format(match.date.toDate(), 'EEEE, h:mm a')}</p>
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
             <button onClick={() => onDelete(match.id)} className="p-2 text-ink-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      <div className="p-6">
        <div>
          <h4 className="text-xl font-bold text-ink-800 mb-1 group-hover:text-brand-700 transition-colors">{match.opponent}</h4>
          <div className="flex items-center gap-2 text-ink-400 text-xs font-medium">
            <MapPin className="w-4 h-4 text-clay-600" />
            {match.location}
            <span className={cn(
              "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
              match.homeAway === 'Home' ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-600"
            )}>
              {match.homeAway}
            </span>
          </div>
        </div>

        {match.status === 'Scheduled' && (
          <MyAvailabilityRow year={year} league={league} matchId={match.id} myPlayers={myPlayers} />
        )}

        {match.status === 'Completed' ? (
          <div className={cn(
            "mt-8 flex items-center gap-8 p-6 rounded-2xl border",
            !match.teamScore && !match.opponentScore
              ? "bg-ink-50/50 border-ink-100"
              : isWin ? "bg-win-50 border-win-200" : "bg-red-50 border-red-200"
          )}>
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-black uppercase text-ink-400 tracking-widest mb-4">M.E.S.E</span>
              {isAdmin ? (
                <select
                  value={match.teamScore ?? 0}
                  onChange={e => onUpdateScore(match.id, parseInt(e.target.value))}
                  className="w-16 h-16 text-4xl font-bold bg-white rounded-xl text-center border border-ink-150 shadow-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all appearance-none cursor-pointer p-0"
                  style={{ textAlignLast: 'center', textAlign: 'center', lineHeight: '4rem' }}
                >
                  {Array.from({ length: 10 }, (_, i) => i).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              ) : (
                <span className="w-16 h-16 text-4xl font-bold flex items-center justify-center text-ink-800 bg-white rounded-xl border border-ink-150 shadow-sm">{match.teamScore}</span>
              )}
            </div>
            <div className="text-3xl font-light text-ink-300 self-end mb-4">:</div>
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-black uppercase text-ink-400 tracking-widest mb-4">{match.opponent.split(' ')[0]}</span>
              <span className="w-16 h-16 text-4xl font-bold flex items-center justify-center text-ink-800 bg-white rounded-xl border border-ink-150 shadow-sm">{match.opponentScore}</span>
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
      if (!confirm(`Mark the match against ${match.opponent} as completed? You'll be able to set the score next.`)) return;
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
    <div className="p-6 flex flex-col gap-6 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink-800 tracking-tight">Match Schedule</h2>
          <p className="text-xs text-ink-400 font-bold uppercase tracking-widest mt-1">Upcoming & Past Events</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-700 transition-all font-bold text-sm shadow-lg shadow-brand-600/20"
          >
            <Plus className="w-5 h-5" />
            <span>New Match</span>
          </button>
        )}
      </div>

      {myPlayers.length === 0 && (
        <div className="tonal-card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-ink-800 font-bold">
            <UserCheck className="w-5 h-5 text-brand-600" />
            Which player(s) are you?
          </div>
          {unclaimedPlayers.length === 0 ? (
            <p className="text-sm text-ink-400">No unclaimed players on this roster right now. Ask an admin to add you or check for a mistaken link.</p>
          ) : (
            <>
              <p className="text-sm text-ink-500">
                Link your account to one or more players on the roster (e.g. yourself, or a child you manage) so you can mark availability on their behalf.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {unclaimedPlayers.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-ink-50 border border-ink-100 text-sm cursor-pointer hover:border-brand-200 transition-all">
                    <input
                      type="checkbox"
                      checked={claimSelection.includes(p.id)}
                      onChange={e => setClaimSelection(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                      className="w-4 h-4 accent-brand-600"
                    />
                    <span className="font-bold text-ink-700">{p.name}</span>
                  </label>
                ))}
              </div>
              {claimError && <p className="text-xs text-red-500 font-bold">{claimError}</p>}
              <div className="flex justify-end">
                <button
                  onClick={handleClaim}
                  disabled={claimSelection.length === 0 || isClaiming}
                  className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {isClaiming ? 'Linking...' : 'Claim Selected'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 w-fit">
        <button
          onClick={() => setStatusFilter('Scheduled')}
          className={cn(
            "px-4 py-2 rounded-full border text-xs font-bold transition-all",
            statusFilter === 'Scheduled' ? "bg-brand-600 border-brand-600 text-white shadow-sm" : "bg-white border-ink-200 text-ink-600 hover:border-ink-300"
          )}
        >
          Upcoming &middot; {upcomingCount}
        </button>
        <button
          onClick={() => setStatusFilter('Completed')}
          className={cn(
            "px-4 py-2 rounded-full border text-xs font-bold transition-all",
            statusFilter === 'Completed' ? "bg-brand-600 border-brand-600 text-white shadow-sm" : "bg-white border-ink-200 text-ink-600 hover:border-ink-300"
          )}
        >
          Results &middot; {completedCount}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="tonal-card p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-ink-100 pb-3">
            <h3 className="font-bold text-ink-800">Match Details</h3>
            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{season} Season</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Opponent Club</label>
              <input 
                 value={opponent} 
                 onChange={e => setOpponent(e.target.value)} 
                 placeholder="e.g. Evergreen Club"
                 className="bg-ink-50 border border-ink-200 p-3 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Venue Location</label>
              <input 
                value={location} 
                onChange={e => setLocation(e.target.value)} 
                placeholder="e.g. Riverside Courts"
                className="bg-ink-50 border border-ink-200 p-3 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Date & Time</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={matchDate}
                  onChange={e => setMatchDate(e.target.value)}
                  className="flex-1 bg-ink-50 border border-ink-200 p-3 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
                <select
                  value={matchHour}
                  onChange={e => setMatchHour(e.target.value)}
                  className="bg-ink-50 border border-ink-200 p-3 rounded-xl focus:outline-none focus:border-brand-500 transition-all appearance-none cursor-pointer"
                >
                  {Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')).map(h => (
                    <option key={h} value={h}>{h}:00</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Format</label>
              <div className="flex gap-2">
                <select value={season} onChange={e => setSeason(e.target.value as any)} className="flex-1 bg-ink-50 border border-ink-200 p-3 rounded-xl focus:outline-none focus:border-brand-500 transition-all appearance-none cursor-pointer">
                  <option value="Spring">Spring</option>
                  <option value="Fall">Fall</option>
                </select>
                <select value={homeAway} onChange={e => setHomeAway(e.target.value as any)} className="flex-1 bg-ink-50 border border-ink-200 p-3 rounded-xl focus:outline-none focus:border-brand-500 transition-all appearance-none cursor-pointer">
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
             <button type="button" disabled={isSaving} onClick={() => setIsAdding(false)} className="px-6 py-2.5 text-ink-400 font-bold text-sm hover:text-ink-800 transition-colors disabled:opacity-50">Cancel</button>
             <button type="submit" disabled={isSaving} className="bg-brand-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-700 transition-all shadow-lg disabled:opacity-50">
               {isSaving ? 'Scheduling...' : 'Schedule Match'}
             </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-8">
        {weekendGroups.length === 0 && (
          <div className="p-12 text-center text-ink-400 italic bg-white rounded-2xl border border-ink-200">
            {statusFilter === 'Scheduled' ? 'No upcoming matches scheduled' : 'No completed matches yet'}
          </div>
        )}
        {weekendGroups.map(group => (
          <div key={group.key} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-ink-400 uppercase tracking-widest">
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
