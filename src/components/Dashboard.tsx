import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { History, Shield, Trophy, MapPin, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { tennisService } from '../services/tennisService';
import { Match, Player } from '../types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { year, league, user, isAdmin } = useAppContext();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [mvpVotes, setMvpVotes] = useState<Record<string, number>>({});
  const [seedingError, setSeedingError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    if (!user) {
      setMatches([]);
      setPlayers([]);
      return;
    }
    const unsubMatches = tennisService.subscribeMatches(year, league, (data) => {
      setMatches(data);
    });
    const unsubPlayers = tennisService.subscribePlayers(year, league, (data) => {
      setPlayers(data);
    });
    return () => {
      unsubMatches();
      unsubPlayers();
    };
  }, [year, league, user]);

  // Calculate stats
  const completedMatches = matches.filter(m => m.status === 'Completed');
  const wins = completedMatches.filter(m => (m.teamScore || 0) > (m.opponentScore || 0)).length;
  const losses = completedMatches.length - wins;
  const winRate = completedMatches.length > 0 ? Math.round((wins / completedMatches.length) * 100) : 0;

  const upcomingMatches = matches.filter(m => m.status === 'Scheduled').slice(0, 1);
  const recentResults = completedMatches.sort((a, b) => b.date.toMillis() - a.date.toMillis()).slice(0, 2);

  const handleSeed = async () => {
    setIsSeeding(true);
    setSeedingError(null);
    try {
      // Players
      const seedPlayers = [
        { name: 'Marco Silva', rank: 1 },
        { name: 'Alex Thompson', rank: 2 },
        { name: 'David Chen', rank: 3 },
        { name: 'James Miller', rank: 4 },
      ];
      for (const p of seedPlayers) {
        await tennisService.addPlayer(year, league, p);
      }

      // Matches
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      await tennisService.addMatch(year, league, {
        opponent: 'Evergreen Club',
        location: 'Riverside Tennis Center, Court 4',
        date: Timestamp.fromDate(inTwoDays),
        season: 'Spring',
        homeAway: 'Away',
        status: 'Scheduled',
        availability: {}
      });

      await tennisService.addMatch(year, league, {
        opponent: 'City Aces',
        location: 'M.E.S.E Home Court',
        date: Timestamp.fromDate(oneWeekAgo),
        season: 'Spring',
        homeAway: 'Home',
        status: 'Completed',
        teamScore: 6,
        opponentScore: 3,
        availability: {}
      });
    } catch (err: any) {
      console.error('Seeding failed:', err);
      let errorMsg = err.message || String(err);
      try {
        const parsed = JSON.parse(err.message);
        if (parsed && parsed.error) {
          errorMsg = parsed.error;
        }
      } catch (e) {}
      setSeedingError(errorMsg);
    } finally {
      setIsSeeding(false);
    }
  };

  // Chart data
  const data = [
    { name: 'Wins', value: wins || 1 }, // Fallback if no matches
    { name: 'Losses', value: losses || 0 }
  ];
  const COLORS = ['#10b981', '#f1f5f9'];

  return (
    <div className="p-6 flex flex-col gap-8 pb-32 bg-slate-50">
      {/* Key Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="tonal-card p-6 flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Season Win Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-light text-slate-800">{winRate}%</span>
            <span className="text-emerald-500 text-sm font-bold">{wins}W / {losses}L</span>
          </div>
        </div>

        <div className="tonal-card p-6 flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Matches</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-light text-slate-800">{completedMatches.length}</span>
            <span className="text-slate-400 text-sm">Played</span>
          </div>
        </div>

        <div className="tonal-card p-6 flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MVP Leader</span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800">Marco Silva</span>
              <span className="text-[10px] uppercase font-bold text-slate-400">12 Votes</span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-600 p-6 rounded-2xl shadow-sm flex flex-col justify-between text-white min-h-[120px]">
          <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Team Ranking</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-light">#2</span>
            <span className="text-emerald-200 text-sm">in {league}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upcoming Match */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Next Match</h2>
              <button onClick={() => navigate('/matches')} className="text-xs text-emerald-600 font-bold hover:underline">Full Schedule</button>
            </div>
            
            {upcomingMatches.length > 0 ? upcomingMatches.map(match => (
              <div key={match.id} className="p-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl flex flex-col items-center justify-center mb-4 sm:mb-0 sm:mr-4 text-slate-500 flex-shrink-0">
                    <span className="text-[10px] uppercase font-bold">{format(match.date.toDate(), 'MMM')}</span>
                    <span className="text-lg font-bold leading-none">{format(match.date.toDate(), 'd')}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-lg">{match.opponent}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {match.homeAway} • {format(match.date.toDate(), 'EEEE, h:mm a')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 mt-4 sm:mt-0">
                    <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium truncate max-w-[150px]">{match.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-12 text-center text-slate-400 font-medium italic">No upcoming matches scheduled</div>
            )}
          </section>

          {/* Recent Results */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Recent Results</h2>
              <button onClick={() => navigate('/matches')} className="text-xs text-emerald-600 font-bold hover:underline">View All</button>
            </div>
            
            <div className="flex flex-col">
              {recentResults.map(match => (
                <div key={match.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className={cn("text-2xl font-bold", (match.teamScore || 0) > (match.opponentScore || 0) ? "text-slate-800" : "text-slate-400")}>{match.teamScore}</p>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">M.E.S.E</p>
                      </div>
                      <div className="text-slate-200 font-light text-2xl mb-4">:</div>
                      <div className="text-center">
                        <p className={cn("text-2xl font-bold", (match.opponentScore || 0) > (match.teamScore || 0) ? "text-slate-800" : "text-slate-400")}>{match.opponentScore}</p>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">{match.opponent.split(' ')[0]}</p>
                      </div>
                    </div>
                    <div className="hidden sm:block h-10 w-px bg-slate-100"></div>
                    <div className="hidden sm:block">
                      <p className="text-xs font-bold text-slate-800 mb-0.5">Match Day Result</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{format(match.date.toDate(), 'MMMM d, yyyy')}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={cn(
                      "text-xs font-bold uppercase tracking-widest",
                      (match.teamScore || 0) > (match.opponentScore || 0) ? "text-emerald-600" : "text-slate-400"
                    )}>
                      {(match.teamScore || 0) > (match.opponentScore || 0) ? 'WIN' : 'LOSS'}
                    </p>
                    <button className="text-[10px] text-slate-400 hover:text-emerald-600 font-bold transition-colors">DETAILS</button>
                  </div>
                </div>
              ))}
              {recentResults.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic">No recent match data</div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column / Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-800">Season MVP</h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">Voted</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-emerald-50 mb-4 flex items-center justify-center p-2">
                <div className="w-full h-full bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  MS
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800">Marco Silva</h3>
              <p className="text-xs text-slate-400 font-medium mb-6 uppercase tracking-wider">Rank #1 • Season Leader</p>
              <div className="w-full grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-slate-800">12</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Votes</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-slate-800">8</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Wins</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {matches.length === 0 && (
          <div className="col-span-12 p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-slate-300" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 mb-1">Begin Your Season</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                {isAdmin 
                  ? "Initialize your team dashboard with baseline data to start tracking performance." 
                  : `Welcome to the selection portal! No match records have been scheduled for ${year} ${league} yet.`}
              </p>
            </div>
            {isAdmin ? (
              <>
                {seedingError && (
                  <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-xl text-center text-xs font-bold max-w-md animate-in fade-in space-y-2">
                    <div>Error Seeding:</div>
                    <div className="font-mono text-[11px] bg-red-100/50 p-3 rounded-lg border border-red-200 overflow-x-auto text-left whitespace-pre-wrap max-h-60">
                      {seedingError.startsWith('{') ? (
                        (() => {
                          try {
                            return JSON.stringify(JSON.parse(seedingError), null, 2);
                          } catch (e) {
                            return seedingError;
                          }
                        })()
                      ) : (
                        seedingError
                      )}
                    </div>
                  </div>
                )}
                <button 
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSeeding ? 'Seeding Baseline Data...' : 'Seed Example Data'}
                </button>
              </>
            ) : (
              <div className="text-xs font-semibold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-5 py-2.5 rounded-xl border border-emerald-100">
                Awaiting Administration Setup
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
