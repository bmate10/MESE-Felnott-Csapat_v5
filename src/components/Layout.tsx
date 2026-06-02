import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Search, UserCircle, Home, Calendar, Users, Settings, LogOut, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';

export const Layout: React.FC = () => {
  const location = useLocation();
  const { user, authLoading, isAdmin, login, logout } = useAppContext();
  
  const topTabs = [
    { name: 'Dashboard', path: '/' },
    { name: 'Matches', path: '/matches' },
    { name: 'Players', path: '/players' },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500 mt-4 uppercase tracking-widest">Verifying Session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100 shadow-sm animate-pulse">
              <Lock className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">M.E.S.E</h1>
            <p className="text-xs uppercase font-bold text-slate-400 tracking-widest mt-1">Felnőtt Bajnokság Portal</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left text-sm space-y-3">
            <p className="text-slate-600 leading-relaxed">
              Az adatbázis megtekintéséhez és kezeléséhez bejelentkezés szükséges.
            </p>
            <div className="text-xs space-y-2 text-slate-400 font-medium">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 mt-1.5 bg-emerald-500 rounded-full flex-shrink-0"></span>
                <span><strong>Adminisztrátorok</strong> (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">bmate10@gmail.com</code>): Teljes hozzáférés az adatok feltöltéséhez, törléséhez és módosításához.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 mt-1.5 bg-emerald-400 rounded-full flex-shrink-0"></span>
                <span><strong>Klubtagok</strong>: Csapat játéknapok megtekintése és saját hozzáférés jelölése.</span>
              </div>
            </div>
          </div>

          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white rounded-xl px-5 py-4 font-bold text-sm shadow-lg hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Bejelentkezés Google Fiókkal</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-white px-6 pt-4 flex flex-col border-b border-slate-200">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-800 block leading-none">M.E.S.E</span>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">bajnokság</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img 
                  referrerPolicy="no-referrer"
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="w-7 h-7 rounded-full border border-slate-200"
                />
              ) : (
                <div className="w-7 h-7 bg-emerald-100 text-emerald-800 font-bold rounded-full flex items-center justify-center text-xs">
                  {user.displayName?.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-700 leading-none">{user.displayName || 'Tag'}</span>
                {isAdmin ? (
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest leading-none mt-0.5">Admin</span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Tag</span>
                )}
              </div>
            </div>
            <button 
              onClick={logout}
              title="Kijelentkezés"
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Top Tabs */}
        <div className="flex gap-6">
          {topTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) => cn(
                "px-3 py-2 text-sm font-medium border-b-2 transition-all",
                isActive 
                  ? "border-emerald-600 text-emerald-600 font-bold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              {tab.name}
            </NavLink>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-6 pb-6 pt-3 flex justify-around items-center">
        <NavLink 
          to="/" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-colors",
            isActive ? "text-emerald-600 font-bold" : "text-slate-400 hover:text-slate-800"
          )}
        >
          {({ isActive }) => (
            <>
              <Home className={cn("w-5 h-5", isActive ? "fill-current" : "")} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Dashboard</span>
            </>
          )}
        </NavLink>
        <NavLink 
          to="/matches" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-colors",
            isActive ? "text-emerald-600 font-bold" : "text-slate-400 hover:text-slate-800"
          )}
        >
          {({ isActive }) => (
            <>
              <Calendar className={cn("w-5 h-5", isActive ? "fill-current" : "")} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Matches</span>
            </>
          )}
        </NavLink>
        <NavLink 
          to="/players" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-colors",
            isActive ? "text-emerald-600 font-bold" : "text-slate-400 hover:text-slate-800"
          )}
        >
          {({ isActive }) => (
            <>
              <Users className={cn("w-5 h-5", isActive ? "fill-current" : "")} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Players</span>
            </>
          )}
        </NavLink>
        <NavLink 
          to="/settings" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-colors",
            isActive ? "text-emerald-600 font-bold" : "text-slate-400 hover:text-slate-800"
          )}
        >
          {({ isActive }) => (
            <>
              <Settings className={cn("w-5 h-5", isActive ? "fill-current" : "")} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
            </>
          )}
        </NavLink>
      </footer>
    </div>
  );
};

