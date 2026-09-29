import React, { useEffect, useState } from 'react';
import { Plus, User, Trash2, Edit2, ShieldAlert, Link2Off, Link2, ChevronDown, Trophy, Check, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { tennisService } from '../services/tennisService';
import { Player, Match, MvpVote } from '../types';
import { matchMvpWinners } from '../lib/mvp';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { tallyIndividualRecords, individualResultsFor, emptyRecord, winRate, WinLoss } from '../lib/results';

const StatTile: React.FC<{ value: React.ReactNode; label: string; sub?: string }> = ({ value, label, sub }) => (
  <div className="bg-ink-50 border border-ink-100 rounded-xl p-3 text-center">
    <p className="text-xl font-bold text-ink-800">{value}</p>
    <p className="text-[9px] uppercase font-bold text-ink-400 tracking-widest">{label}</p>
    {sub && <p className="text-[9px] text-ink-400 mt-0.5">{sub}</p>}
  </div>
);

const winRateSub = (wl: WinLoss) => {
  const rate = winRate(wl);
  return rate === undefined ? 'No results' : `${Math.round(rate * 100)}% won`;
};

export const Players: React.FC = () => {
  const { year, league, user, isAdmin } = useAppContext();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchVotesMap, setMatchVotesMap] = useState<Record<string, MvpVote[]>>({});
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRank, setNewRank] = useState('1');
  const [isSaving, setIsSaving] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRank, setEditRank] = useState('1');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPlayers([]);
      setMatches([]);
      return;
    }
    const unsubPlayers = tennisService.subscribePlayers(year, league, (data) => {
      setPlayers(data);
    });
    const unsubMatches = tennisService.subscribeMatches(year, league, (data) => {
      setMatches(data);
    });
    return () => {
      unsubPlayers();
      unsubMatches();
    };
  }, [year, league, user]);

  const completedMatches = matches.filter(m => m.status === 'Completed');
  const completedIds = completedMatches.map(m => m.id).sort().join(',');

  useEffect(() => {
    setMatchVotesMap({});
    if (!user || completedMatches.length === 0) return;
    const unsubs = completedMatches.map(m =>
      tennisService.subscribeMvpVotes(year, league, m.id, (votes) => {
        setMatchVotesMap(prev => ({ ...prev, [m.id]: votes }));
      })
    );
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, league, user, completedIds]);

  const wasMatchMvp = (matchId: string, playerId: string) =>
    matchMvpWinners(matchVotesMap[matchId] || []).includes(playerId);

  const individualRecords = tallyIndividualRecords(completedMatches);

  const statsFor = (playerId: string) => {
    const played = completedMatches.filter(m =>
      (m.lineupSingles || []).includes(playerId) || (m.lineupDoubles || []).includes(playerId)
    );
    const singlesCount = played.filter(m => (m.lineupSingles || []).includes(playerId)).length;
    const doublesCount = played.filter(m => (m.lineupDoubles || []).includes(playerId)).length;
    const mvpWins = completedMatches.filter(m => wasMatchMvp(m.id, playerId)).length;
    const record = individualRecords[playerId] || emptyRecord();
    const recent = [...played].sort((a, b) => b.date.toMillis() - a.date.toMillis());
    return { played: played.length, singlesCount, doublesCount, mvpWins, record, recent };
  };

  const toggleExpanded = (playerId: string) => {
    setExpandedPlayerId(expandedPlayerId === playerId ? null : playerId);
    setShowAllRecent(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    setIsSaving(true);
    setSavingError(null);
    try {
      await tennisService.addPlayer(year, league, {
        name: newName,
        rank: parseInt(newRank)
      });
      setNewName('');
      setNewRank('1');
      setIsAdding(false);
    } catch (err: any) {
      console.error('Failed to add player:', err);
      setSavingError(err.message || String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this player?')) {
      await tennisService.deletePlayer(year, league, id);
    }
  };

  const handleUnlink = async (id: string) => {
    if (confirm('Remove the linked Google account from this player?')) {
      await tennisService.unlinkPlayer(year, league, id);
    }
  };

  const startEdit = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditName(player.name);
    setEditRank(String(player.rank));
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingPlayerId(null);
    setEditError(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await tennisService.updatePlayer(year, league, id, {
        name: editName,
        rank: parseInt(editRank)
      });
      setEditingPlayerId(null);
    } catch (err: any) {
      console.error('Failed to update player:', err);
      setEditError(err.message || String(err));
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink-800 tracking-tight">Team Roster</h2>
          <p className="text-xs text-ink-400 font-bold uppercase tracking-widest mt-1">{league} • {year}</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-700 transition-all font-bold text-sm shadow-lg shadow-brand-600/20"
          >
            <Plus className="w-5 h-5" />
            <span>Add Player</span>
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="tonal-card p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-ink-100 pb-3">
            <h3 className="font-bold text-ink-800">New Player Entry</h3>
            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">Active Season</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Full Name</label>
              <input 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. John Doe"
                className="bg-ink-50 border border-ink-200 p-3 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Assigned Rank</label>
              <input 
                type="number"
                value={newRank}
                onChange={(e) => setNewRank(e.target.value)}
                className="bg-ink-50 border border-ink-200 p-3 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
          </div>
          {savingError && (
            <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-xl text-xs font-bold animate-in fade-in space-y-2">
              <div>Failed to add player:</div>
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
            <button 
              type="button"
              disabled={isSaving}
              onClick={() => setIsAdding(false)}
              className="px-6 py-2.5 text-ink-400 font-bold text-sm hover:text-ink-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="bg-brand-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-700 transition-all shadow-lg disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save to Roster'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {players.map((player) => {
          const isExpanded = expandedPlayerId === player.id;
          const stats = isExpanded ? statsFor(player.id) : null;
          const isEditing = editingPlayerId === player.id;
          return (
            <div key={player.id} className="tonal-card overflow-hidden group hover:border-brand-100 transition-all">
              {isEditing ? (
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Full name"
                      className="flex-1 bg-ink-50 border border-ink-200 p-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                    />
                    <input
                      type="number"
                      value={editRank}
                      onChange={e => setEditRank(e.target.value)}
                      className="w-20 bg-ink-50 border border-ink-200 p-2.5 rounded-xl text-sm font-bold text-center focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                    />
                    <button
                      onClick={() => handleSaveEdit(player.id)}
                      disabled={isSavingEdit || !editName}
                      title="Save"
                      className="p-2.5 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={isSavingEdit}
                      title="Cancel"
                      className="p-2.5 rounded-xl bg-ink-50 text-ink-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {editError && <p className="text-xs text-red-500 font-bold">{editError}</p>}
                </div>
              ) : (
              <div
                onClick={() => toggleExpanded(player.id)}
                className="p-4 flex items-center gap-6 cursor-pointer"
              >
                <div className="h-14 w-14 rounded-2xl bg-ink-100 flex flex-col items-center justify-center text-ink-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase leading-none mb-1">Rank</span>
                  <span className="font-black text-xl leading-none">{player.rank}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-ink-800 text-lg group-hover:text-brand-700 transition-colors">{player.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-2 py-0.5 rounded bg-ink-50 text-[9px] font-bold text-ink-400 uppercase tracking-widest border border-ink-200">Active</span>
                    <span className="text-[10px] text-ink-400 font-medium">Joined {year}</span>
                    {player.uid ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-brand-600">
                        <Link2 className="w-3 h-3" /> Linked
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-ink-300">Unclaimed</span>
                    )}
                  </div>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-ink-300 flex-shrink-0 transition-transform", isExpanded && "rotate-180")} />
                {isAdmin && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {player.uid && (
                      <button
                         onClick={(e) => { e.stopPropagation(); handleUnlink(player.id); }}
                         title="Unlink account"
                         className="p-2.5 rounded-xl bg-ink-50 text-ink-400 hover:text-clay-600 hover:bg-clay-50 transition-all"
                      >
                        <Link2Off className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(player); }}
                      title="Edit player"
                      className="p-2.5 rounded-xl bg-ink-50 text-ink-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                       onClick={(e) => { e.stopPropagation(); handleDelete(player.id); }}
                       className="p-2.5 rounded-xl bg-ink-50 text-ink-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              )}
              {isExpanded && stats && (
                <div className="px-4 pb-4 pt-1 border-t border-ink-100 flex flex-col gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                    <StatTile value={stats.played} label="Played" sub={`${stats.singlesCount}S · ${stats.doublesCount}D`} />
                    <StatTile value={`${stats.record.singles.wins}-${stats.record.singles.losses}`} label="Singles W-L" sub={winRateSub(stats.record.singles)} />
                    <StatTile value={`${stats.record.doubles.wins}-${stats.record.doubles.losses}`} label="Doubles W-L" sub={winRateSub(stats.record.doubles)} />
                    <StatTile value={stats.record.clutches} label="Clutches" sub="Won after losing set 1" />
                    <StatTile value={stats.mvpWins} label="MVP Wins" />
                    <StatTile value={player.rank} label="Club Rank" />
                  </div>
                  {stats.recent.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-ink-400 uppercase tracking-widest">Recent Matches</span>
                      {(showAllRecent ? stats.recent : stats.recent.slice(0, 3)).map(m => {
                        const results = individualResultsFor(m, player.id);
                        const wasMvp = wasMatchMvp(m.id, player.id);
                        const badge = (kind: 'singles' | 'doubles') => {
                          const r = results.find(x => x.kind === kind);
                          if (!r) return <span />;
                          return (
                            <span className={cn(
                              "px-1 sm:px-2 py-0.5 rounded text-[9px] font-bold uppercase text-center whitespace-nowrap",
                              r.won ? "bg-win-100 text-win-700" : "bg-red-100 text-red-500"
                            )}>
                              {kind === 'singles' ? 'S' : 'D'} {r.won ? 'Win' : 'Loss'}
                            </span>
                          );
                        };
                        return (
                          <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_2.75rem_0.875rem_3.25rem_3.25rem] sm:grid-cols-[minmax(0,1fr)_3.5rem_1rem_3.75rem_3.75rem] items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-lg bg-ink-50 border border-ink-100 text-xs">
                            <span className="font-bold text-ink-700 truncate">{m.opponent}</span>
                            <span className="text-ink-400">{format(m.date.toDate(), 'MMM d')}</span>
                            {wasMvp ? <Trophy className="w-3.5 h-3.5 text-brand-600" /> : <span />}
                            {results.length === 0 ? (
                              <span className="col-span-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase text-center bg-ink-100 text-ink-400">N/A</span>
                            ) : (
                              <>
                                {badge('singles')}
                                {badge('doubles')}
                              </>
                            )}
                          </div>
                        );
                      })}
                      {stats.recent.length > 3 && (
                        <button
                          onClick={() => setShowAllRecent(v => !v)}
                          className="flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400 hover:text-brand-600 transition-colors"
                        >
                          {showAllRecent ? 'Show less' : `Show all ${stats.recent.length}`}
                          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAllRecent && "rotate-180")} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {players.length === 0 && !isAdding && (
          <div className="p-16 text-center flex flex-col items-center gap-6 bg-white rounded-3xl border-2 border-dashed border-ink-100">
            <div className="w-20 h-20 bg-ink-50 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-ink-200" />
            </div>
            <div>
              <p className="font-bold text-ink-800 text-lg">No players listed yet</p>
              <p className="text-sm text-ink-400 mt-1">Start by adding players to your {year} {league} roster.</p>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setIsAdding(true)}
                className="px-8 py-3 bg-ink-100 text-ink-600 rounded-xl font-bold text-sm hover:bg-brand-50 hover:text-brand-600 transition-all"
              >
                Add First Player
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
