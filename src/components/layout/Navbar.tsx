import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MediaSphereLogo } from '../common/VyoraLogo';
import Avatar from '../common/Avatar';
import {
  Search,
  Bell,
  Sun,
  Moon,
  PlusSquare,
  Sparkles,
  LogOut,
  User as UserIcon,
  Settings,
  LogIn
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    user,
    profile,
    currentTab,
    setCurrentTab,
    setIsAuthModalOpen,
    setIsCreatePostOpen,
    setIsSettingsOpen,
    navigateToProfile,
    theme,
    toggleTheme,
    unreadNotificationsCount,
    logout
  } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setCurrentTab('explore');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          onClick={() => {
            setCurrentTab('feed');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2 text-left"
        >
          <MediaSphereLogo size="md" />
        </button>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden sm:flex flex-1 max-w-sm relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search creators, hashtags, reels..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </form>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Create Post Button */}
          {user ? (
            <button
              onClick={() => setIsCreatePostOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full text-xs font-semibold shadow-sm transition-transform active:scale-95"
            >
              <PlusSquare className="w-4 h-4" />
              <span className="hidden md:inline">Create</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-semibold shadow-sm transition-transform active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Notifications */}
          {user && (
            <button
              onClick={() => setCurrentTab('notifications')}
              className="relative p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-950" />
              )}
            </button>
          )}

          {/* Profile / Menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Avatar src={profile?.photoURL} alt={profile?.displayName} size="sm" isOnline={true} />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 z-50 text-xs animate-in fade-in"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="font-bold text-zinc-900 dark:text-white truncate">{profile?.displayName}</p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px] truncate">@{profile?.username}</p>
                  </div>

                  <button
                    onClick={() => navigateToProfile(user.uid)}
                    className="w-full px-4 py-2 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left"
                  >
                    <UserIcon className="w-4 h-4" /> Profile
                  </button>

                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-full px-4 py-2 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left"
                  >
                    <Settings className="w-4 h-4" /> Account Settings
                  </button>

                  <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                    <button
                      onClick={logout}
                      className="w-full px-4 py-2 flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left font-semibold"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
