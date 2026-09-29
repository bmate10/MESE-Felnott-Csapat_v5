import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { History, Shield, Trophy, MapPin, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { tennisService } from '../services/tennisService';
import { Match, Player, MvpVote, AvailabilityStatus } from '../types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { tallyIndividualRecords, winRate as individualWinRate, IndividualRecord } from '../lib/results';
import { candidatePlayerIds, matchMvpWinners } from '../lib/mvp';
import { heroBackground } from '../lib/hero';

interface LeaderEntry {
  player: Player;
  value: string;
  label: string;
}

const LeaderTile: React.FC<{ title: string; entries: LeaderEntry[]; emptyText: string }> = ({ title, entries, emptyText }) => (
  <div className="bg-linear-to-br from-white to-brand-50 rounded-3xl shadow-sm border border-brand-100 p-6">
    <h2 className="font-bold text-ink-800 mb-6">{title}</h2>
    <div className="flex flex-col gap-2">
      {entries.length === 0 ? (
        <p className="text-sm text-ink-400 text-center py-6">{emptyText}</p>
      ) : (
        entries.map((e, i) => (
          <div key={e.player.id} className="flex items-center justify-between p-3 rounded-xl bg-white/70 border border-brand-100">
            <div className="flex items-center gap-3">
              <span className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0",
                i === 0 ? "bg-clay-600 text-white" : i === 1 ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700"
              )}>
                {i + 1}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-ink-800">{e.player.name}</span>
                <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Rank #{e.player.rank}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-brand-600">{e.value}</p>
              <p className="text-[9px] uppercase font-bold text-ink-400 tracking-wider">{e.label}</p>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { year, league, user, isAdmin } = useAppContext();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchVotesMap, setMatchVotesMap] = useState<Record<string, MvpVote[]>>({});
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

  const upcomingMatches = matches.filter(m => m.status === 'Scheduled').slice(0, 2);
  const recentResults = completedMatches.sort((a, b) => b.date.toMillis() - a.date.toMillis()).slice(0, 3);

  // MVP vote aggregation
  const completedMatchIds = completedMatches.map(m => m.id).sort().join(',');

  useEffect(() => {
    setMatchVotesMap({});
    if (!user || completedMatches.length === 0) return;
    const unsubs = completedMatches.map(m =>
      tennisService.subscribeMvpVotes(year, league, m.id, (votes) => {
        setMatchVotesMap(prev => ({ ...prev, [m.id]: votes }));
      })
    );
    return () => unsubs.forEach(unsub => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, league, user, completedMatchIds]);

  const seasonTally: Record<string, number> = {};
  for (const matchId in matchVotesMap) {
    matchVotesMap[matchId].forEach(v => {
      candidatePlayerIds(v.playerId).forEach(pid => {
        seasonTally[pid] = (seasonTally[pid] || 0) + 1;
      });
    });
  }
  let leaderId: string | undefined;
  let leaderVotes = 0;
  Object.entries(seasonTally).forEach(([pid, count]) => {
    if (count > leaderVotes) {
      leaderId = pid;
      leaderVotes = count;
    }
  });
  const leaderPlayer = players.find(p => p.id === leaderId);

  const matchWinnerCounts: Record<string, number> = {};
  completedMatches.forEach(m => {
    matchMvpWinners(matchVotesMap[m.id] || []).forEach(pid => {
      matchWinnerCounts[pid] = (matchWinnerCounts[pid] || 0) + 1;
    });
  });

  const topMvpPlayers = Object.entries(seasonTally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pid]) => players.find(p => p.id === pid))
    .filter((p): p is Player => !!p);

  const records = Object.entries(tallyIndividualRecords(completedMatches))
    .map(([pid, rec]) => ({ player: players.find(p => p.id === pid), rec }))
    .filter((e): e is { player: Player; rec: IndividualRecord } => !!e.player);

  const topSingles: LeaderEntry[] = records
    .map(e => ({ ...e, rate: individualWinRate(e.rec.singles) }))
    .filter((e): e is typeof e & { rate: number } => e.rate !== undefined)
    .sort((a, b) => b.rate - a.rate || b.rec.singles.wins - a.rec.singles.wins || a.rec.singles.losses - b.rec.singles.losses)
    .slice(0, 3)
    .map(e => ({ player: e.player, value: `${e.rec.singles.wins}-${e.rec.singles.losses}`, label: `${Math.round(e.rate * 100)}% Won` }));

  const mostDoublesWins: LeaderEntry[] = records
    .filter(e => e.rec.doubles.wins > 0)
    .sort((a, b) => b.rec.doubles.wins - a.rec.doubles.wins || a.rec.doubles.losses - b.rec.doubles.losses)
    .slice(0, 3)
    .map(e => ({ player: e.player, value: String(e.rec.doubles.wins), label: `Wins · ${e.rec.doubles.wins}-${e.rec.doubles.losses}` }));

  const hasVotedAllMvp =!user || completedMatches.length === 0 || completedMatches.every(m =>
    (matchVotesMap[m.id] || []).some(v => v.voterId === user.uid)
  );

  // Availability aggregation for "my" linked players
  const myPlayers = players.filter(p => p.uid === user?.uid);
  const scheduledMatches = matches.filter(m => m.status === 'Scheduled');
  const myPlayerIds = myPlayers.map(p => p.id).sort().join(',');
  const scheduledMatchIds = scheduledMatches.map(m => m.id).sort().join(',');
  const [myAvailabilityMap, setMyAvailabilityMap] = useState<Record<string, AvailabilityStatus | undefined>>({});

  useEffect(() => {
    setMyAvailabilityMap({});
    if (!user || myPlayers.length === 0 || scheduledMatches.length === 0) return;
    const unsubs: (() => void)[] = [];
    myPlayers.forEach(p => {
      scheduledMatches.forEach(m => {
        unsubs.push(tennisService.subscribePlayerAvailability(year, league, m.id, p.id, (status) => {
          setMyAvailabilityMap(prev => ({ ...prev, [`${p.id}:${m.id}`]: status }));
        }));
      });
    });
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, league, user, myPlayerIds, scheduledMatchIds]);

  const missingAvailabilityCount = myPlayers.reduce((count, p) =>
    count + scheduledMatches.filter(m => !myAvailabilityMap[`${p.id}:${m.id}`]).length, 0
  );

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
        status: 'Scheduled'
      });

      await tennisService.addMatch(year, league, {
        opponent: 'City Aces',
        location: 'M.E.S.E Home Court',
        date: Timestamp.fromDate(oneWeekAgo),
        season: 'Spring',
        homeAway: 'Home',
        status: 'Completed',
        teamScore: 6,
        opponentScore: 3
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
    <div className="p-6 flex flex-col gap-8 pb-32">
      {/* Key Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-brand-600 p-6 rounded-3xl shadow-sm flex flex-col justify-between text-white min-h-[120px]">
          <span className="text-[10px] font-bold text-brand-200 uppercase tracking-wider">Season Win Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-light">{winRate}%</span>
            <span className="text-brand-200 text-sm font-bold">{wins}W / {losses}L</span>
          </div>
        </div>

        <div className="tonal-card p-6 flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">MVP Leader</span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-clay-200 bg-clay-50 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-clay-600" />
            </div>
            <span className="text-sm font-bold text-ink-800">{leaderPlayer?.name || 'No Votes Yet'}</span>
          </div>
        </div>

        <div className="tonal-card p-6 flex flex-col justify-between min-h-[120px]">
          <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Availability</span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-ink-800">
              {myPlayers.length === 0
                ? 'Not Linked'
                : missingAvailabilityCount === 0
                  ? 'All Set'
                  : `${missingAvailabilityCount} Needed`}
            </span>
            {myPlayers.length === 0 || missingAvailabilityCount > 0 ? (
              <button
                onClick={() => navigate('/matches')}
                className="text-[10px] bg-clay-100 text-clay-700 font-bold px-2 py-0.5 rounded hover:bg-clay-200 transition-colors"
              >
                {myPlayers.length === 0 ? 'Link' : 'Update'}
              </button>
            ) : (
              <span className="text-[10px] bg-win-100 text-win-700 font-bold px-2 py-0.5 rounded">Done</span>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upcoming Match */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-clay-700 bg-cover bg-center text-white rounded-3xl shadow-lg shadow-clay-900/25 overflow-hidden" style={heroBackground}>
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="font-bold text-white">Upcoming</h2>
              <button onClick={() => navigate('/matches')} className="text-xs text-white/85 font-bold hover:text-white transition-colors">Full Schedule →</button>
            </div>

            {upcomingMatches.length > 0 ? (
              <div className="divide-y divide-white/10">
                {upcomingMatches.map((match, index) => (
                  <div key={match.id} className="px-6 py-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                      <div className="w-14 h-14 bg-white/10 border border-white/15 rounded-xl flex flex-col items-center justify-center mb-4 sm:mb-0 sm:mr-4 text-white flex-shrink-0">
                        <span className="text-[10px] uppercase font-bold text-white/70">{format(match.date.toDate(), 'MMM')}</span>
                        <span className="text-lg font-bold leading-none">{format(match.date.toDate(), 'd')}</span>
                      </div>
                      <div className="flex-1">
                        {index === 0 && (
                          <span className="inline-flex mb-1.5 px-2.5 py-0.5 rounded-full bg-white text-[10px] font-bold text-clay-700">Next match</span>
                        )}
                        <p className="font-extrabold text-white text-xl tracking-tight">{match.opponent}</p>
                        <p className="text-xs text-white/70 font-medium">
                          {match.homeAway} • {format(match.date.toDate(), 'EEEE, h:mm a')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 mt-4 sm:mt-0">
                        <div className="flex items-center gap-2 text-white/80 text-xs bg-white/10 px-3 py-1.5 rounded-lg border border-white/15">
                          <MapPin className="w-4 h-4 text-clay-100" />
                          <span className="font-medium truncate max-w-[150px]">{match.location}</span>
                        </div>
                      </div>
                    </div>
                    {myPlayers.length > 0 && (
                      <div className="mt-4 p-3 rounded-2xl bg-white/10 border border-white/10 flex flex-col gap-2">
                        {myPlayers.map(player => {
                          const status = myAvailabilityMap[`${player.id}:${match.id}`];
                          return (
                            <div key={player.id} className="flex items-center justify-between gap-3">
                              <span className="text-xs font-bold text-white/90 truncate">{player.name}</span>
                              <div className="flex gap-1.5 flex-shrink-0">
                                {(['Yes', 'No', 'If Needed'] as AvailabilityStatus[]).map(s => (
                                  <button
                                    key={s}
                                    onClick={() => tennisService.setAvailability(year, league, match.id, player.id, s)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                      status === s
                                        ? (s === 'Yes' ? "bg-win-500 text-white shadow-sm" : s === 'No' ? "bg-white text-ink-900" : "bg-ink-900 text-white")
                                        : "bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white"
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
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-white/60 font-medium italic">No upcoming matches scheduled</div>
            )}
          </section>

          {/* Recent Results */}
          <section className="bg-white rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="px-6 py-4 border-b border-ink-100 flex justify-between items-center">
              <h2 className="font-bold text-ink-800">Recent Results</h2>
              <button onClick={() => navigate('/matches')} className="text-xs text-clay-600 font-bold hover:text-clay-700 transition-colors">View All →</button>
            </div>
            
            <div className="flex flex-col">
              {recentResults.map(match => (
                <div key={match.id} className="p-6 flex items-center justify-between hover:bg-ink-50 transition-colors border-b border-ink-50 last:border-0">
                  <div className="grid grid-cols-[2.5rem_1.25rem_2.5rem] sm:grid-cols-[3rem_1.5rem_3rem_1px_9rem] items-center gap-x-3 sm:gap-x-6">
                    <div className="text-center">
                      <p className={cn("text-2xl font-bold", (match.teamScore || 0) > (match.opponentScore || 0) ? "text-ink-800" : "text-ink-400")}>{match.teamScore}</p>
                      <p className="text-[10px] uppercase font-bold text-ink-400 tracking-tight truncate">M.E.S.E</p>
                    </div>
                    <div className="text-center text-ink-200 font-light text-2xl">:</div>
                    <div className="text-center">
                      <p className={cn("text-2xl font-bold", (match.opponentScore || 0) > (match.teamScore || 0) ? "text-ink-800" : "text-ink-400")}>{match.opponentScore}</p>
                      <p className="text-[10px] uppercase font-bold text-ink-400 tracking-tight truncate">{match.opponent.split(' ')[0]}</p>
                    </div>
                    <div className="hidden sm:block h-10 w-px bg-ink-100 justify-self-center"></div>
                    <div className="hidden sm:block">
                      <p className="text-xs font-bold text-ink-700 whitespace-nowrap">{format(match.date.toDate(), 'MMMM d, yyyy')}</p>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                      (match.teamScore || 0) > (match.opponentScore || 0) ? "bg-win-100 text-win-700" : "bg-red-100 text-red-500"
                    )}>
                      {(match.teamScore || 0) > (match.opponentScore || 0) ? 'WIN' : 'LOSS'}
                    </span>
                    <button onClick={() => navigate('/matches?tab=results')} className="text-[10px] text-ink-400 hover:text-clay-600 font-bold transition-colors">DETAILS</button>
                  </div>
                </div>
              ))}
              {recentResults.length === 0 && (
                <div className="p-12 text-center text-ink-400 italic">No recent match data</div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column / Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-outline-variant p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-ink-800">Season MVP</h2>
              {hasVotedAllMvp ? (
                <span className="text-[10px] bg-win-100 text-win-700 font-bold px-2 py-0.5 rounded">Voted — All Done</span>
              ) : (
                <button
                  onClick={() => navigate('/matches?tab=results')}
                  className="text-[10px] bg-clay-100 text-clay-700 font-bold px-2 py-0.5 rounded hover:bg-clay-200 transition-colors"
                >
                  Vote for MVP
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {topMvpPlayers.length === 0 ? (
                <p className="text-sm text-ink-400 text-center py-6">Cast the first vote after a match</p>
              ) : (
                topMvpPlayers.map((p, i) => (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border",
                      i === 0 ? "bg-clay-50 border-clay-200" : "bg-ink-50 border-ink-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0",
                        i === 0 ? "bg-clay-600 text-white" : "bg-ink-200 text-ink-500"
                      )}>
                        {i + 1}
                      </span>
                      <div className="flex flex-col">
                        <span className={cn("text-sm font-bold", i === 0 ? "text-clay-800" : "text-ink-800")}>{p.name}</span>
                        <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider">Rank #{p.rank}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-bold", i === 0 ? "text-clay-600" : "text-ink-800")}>{matchWinnerCounts[p.id] || 0}</p>
                      <p className="text-[9px] uppercase font-bold text-ink-400 tracking-wider">MVP Wins</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <LeaderTile title="Top Singles Win Rate" entries={topSingles} emptyText="No singles results recorded yet" />
          <LeaderTile title="Most Doubles Wins" entries={mostDoublesWins} emptyText="No doubles wins recorded yet" />
        </div>

        {matches.length === 0 && (
          <div className="col-span-12 p-12 bg-white rounded-2xl border-2 border-dashed border-ink-200 flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-ink-50 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-ink-300" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-ink-800 mb-1">Begin Your Season</h3>
              <p className="text-sm text-ink-400 max-w-xs mx-auto">
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
                  className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-600/20 hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSeeding ? 'Seeding Baseline Data...' : 'Seed Example Data'}
                </button>
              </>
            ) : (
              <div className="text-xs font-semibold uppercase tracking-widest text-brand-600 bg-brand-50 px-5 py-2.5 rounded-xl border border-brand-100">
                Awaiting Administration Setup
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
