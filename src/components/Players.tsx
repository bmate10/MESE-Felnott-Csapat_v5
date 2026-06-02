import React, { useEffect, useState } from 'react';
import { Plus, User, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { tennisService } from '../services/tennisService';
import { Player } from '../types';
import { cn } from '../lib/utils';

export const Players: React.FC = () => {
  const { year, league, user } = useAppContext();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRank, setNewRank] = useState('1');

  useEffect(() => {
    if (!user) {
      setPlayers([]);
      return;
    }
    const unsub = tennisService.subscribePlayers(year, league, (data) => {
      setPlayers(data);
    });
    return () => unsub();
  }, [year, league, user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    await tennisService.addPlayer(year, league, {
      name: newName,
      rank: parseInt(newRank)
    });
    setNewName('');
    setNewRank('1');
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this player?')) {
      await tennisService.deletePlayer(year, league, id);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6 pb-32 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Team Roster</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{league} • {year}</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all font-bold text-sm shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          <span>Add Player</span>
        </button>
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
          <div className="flex gap-3 justify-end pt-2">
            <button 
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-6 py-2.5 text-slate-400 font-bold text-sm hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
            >
              Save to Roster
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {players.map((player) => (
          <div key={player.id} className="tonal-card p-4 flex items-center gap-6 group hover:border-emerald-100 transition-all">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
              <span className="text-[10px] font-bold uppercase leading-none mb-1">Rank</span>
              <span className="font-archivo font-black text-xl leading-none">{player.rank}</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 text-lg group-hover:text-emerald-700 transition-colors">{player.name}</h4>
              <div className="flex items-center gap-3 mt-1">
                <span className="px-2 py-0.5 rounded bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200">Active</span>
                <span className="text-[10px] text-slate-400 font-medium">Joined {year}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
              <button className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                 onClick={() => handleDelete(player.id)}
                 className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {players.length === 0 && !isAdding && (
          <div className="p-16 text-center flex flex-col items-center gap-6 bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-slate-200" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">No players listed yet</p>
              <p className="text-sm text-slate-400 mt-1">Start by adding players to your {year} {league} roster.</p>
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-emerald-50 hover:text-emerald-600 transition-all"
            >
              Add First Player
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
