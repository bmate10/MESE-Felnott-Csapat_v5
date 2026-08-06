import React, { useEffect, useState } from 'react';
import { Plus, User, Trash2, Edit2, ShieldAlert, Link2Off, Link2, ChevronDown, Trophy, Check, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { tennisService } from '../services/tennisService';
import { Player, Match, MvpVote, MVP_SKIP_ID } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export const Players: React.FC = () => {
  const { year, league, user, isAdmin } = useAppContext();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchVotesMap, setMatchVotesMap] = useState<Record<string, MvpVote[]>>({});
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
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

  const matchMvpWinnerId = (matchId: string): string | undefined => {
    const votes = (matchVotesMap[matchId] || []).filter(v => v.playerId !== MVP_SKIP_ID);
    if (votes.length === 0) return undefined;
    const tally: Record<string, number> = {};
    votes.forEach(v => { tally[v.playerId] = (tally[v.playerId] || 0) + 1; });
    let topId: string | undefined;
    let topCount = 0;
    let tied = false;
    Object.entries(tally).forEach(([pid, count]) => {
      if (count > topCount) { topId = pid; topCount = count; tied = false; }
      else if (count === topCount) { tied = true; }
    });
    return tied ? undefined : topId;
  };

  const statsFor = (playerId: string) => {
    const played = completedMatches.filter(m =>
      (m.lineupSingles || []).includes(playerId) || (m.lineupDoubles || []).includes(playerId)
    );
    const singlesCount = played.filter(m => (m.lineupSingles || []).includes(playerId)).length;
    const doublesCount = played.filter(m => (m.lineupDoubles || []).includes(playerId)).length;
    const mvpWins = completedMatches.filter(m => matchMvpWinnerId(m.id) === playerId).length;
    const recent = [...played].sort((a, b) => b.date.toMillis() - a.date.toMillis()).slice(0, 3);
    return { played: played.length, singlesCount, doublesCount, mvpWins, recent };
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
    <div className="p-6 flex flex-col gap-6 pb-32 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Team Roster</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{league} • {year}</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all font-bold text-sm shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-5 h-5" />
            <span>Add Player</span>
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="tonal-card p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800">New Player Entry</h3>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Active Season</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
              <input 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. John Doe"
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Rank</label>
              <input 
                type="number"
                value={newRank}
                onChange={(e) => setNewRank(e.target.value)}
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
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
              className="px-6 py-2.5 text-slate-400 font-bold text-sm hover:text-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
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
            <div key={player.id} className="tonal-card overflow-hidden group hover:border-emerald-100 transition-all">
              {isEditing ? (
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Full name"
                      className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    />
                    <input
                      type="number"
                      value={editRank}
                      onChange={e => setEditRank(e.target.value)}
                      className="w-20 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-center focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    />
                    <button
                      onClick={() => handleSaveEdit(player.id)}
                      disabled={isSavingEdit || !editName}
                      title="Save"
                      className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={isSavingEdit}
                      title="Cancel"
                      className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {editError && <p className="text-xs text-red-500 font-bold">{editError}</p>}
                </div>
              ) : (
              <div
                onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                className="p-4 flex items-center gap-6 cursor-pointer"
              >
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase leading-none mb-1">Rank</span>
                  <span className="font-archivo font-black text-xl leading-none">{player.rank}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-lg group-hover:text-emerald-700 transition-colors">{player.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200">Active</span>
                    <span className="text-[10px] text-slate-400 font-medium">Joined {year}</span>
                    {player.uid ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <Link2 className="w-3 h-3" /> Linked
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300">Unclaimed</span>
                    )}
                  </div>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-slate-300 flex-shrink-0 transition-transform", isExpanded && "rotate-180")} />
                {isAdmin && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 flex-shrink-0">
                    {player.uid && (
                      <button
                         onClick={(e) => { e.stopPropagation(); handleUnlink(player.id); }}
                         title="Unlink account"
                         className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                      >
                        <Link2Off className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(player); }}
                      title="Edit player"
                      className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                       onClick={(e) => { e.stopPropagation(); handleDelete(player.id); }}
                       className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              )}
              {isExpanded && stats && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-3 pt-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-slate-800">{stats.played}</p>
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Played</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{stats.singlesCount}S &middot; {stats.doublesCount}D</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-slate-800">{stats.mvpWins}</p>
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">MVP Wins</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-slate-800">{player.rank}</p>
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Club Rank</p>
                    </div>
                  </div>
                  {stats.recent.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recent Matches</span>
                      {stats.recent.map(m => {
                        const isWin = (m.teamScore || 0) > (m.opponentScore || 0);
                        const wasMvp = matchMvpWinnerId(m.id) === player.id;
                        return (
                          <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                            <span className="font-bold text-slate-700 truncate">{m.opponent}</span>
                            <span className="text-slate-400">{format(m.date.toDate(), 'MMM d')}</span>
                            {wasMvp && <Trophy className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-bold uppercase flex-shrink-0",
                              isWin ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-500"
                            )}>
                              {isWin ? 'Win' : 'Loss'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {players.length === 0 && !isAdding && (
          <div className="p-16 text-center flex flex-col items-center gap-6 bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-slate-200" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">No players listed yet</p>
              <p className="text-sm text-slate-400 mt-1">Start by adding players to your {year} {league} roster.</p>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setIsAdding(true)}
                className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-emerald-50 hover:text-emerald-600 transition-all"
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
