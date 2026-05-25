import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Search, UserCircle, Home, Calendar, Users, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

export const Layout: React.FC = () => {
  const location = useLocation();
  
  const topTabs = [
    { name: 'Dashboard', path: '/' },
    { name: 'Matches', path: '/matches' },
    { name: 'Players', path: '/players' },
  ];

  return (
    <div className="min-h-screen pb-24 bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-white px-6 pt-4 flex flex-col border-b border-slate-200">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full"></div>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">ACE TRACKER</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              <UserCircle className="w-5 h-5" />
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
