import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Compass,
  Film,
  MessageCircle,
  Bell,
  User,
  PlusSquare,
  Video,
  Camera,
  Settings
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    user,
    profile,
    setIsAuthModalOpen,
    setIsCreatePostOpen,
    setIsCreateReelOpen,
    setIsCreateStoryOpen,
    setIsSettingsOpen,
    navigateToProfile,
    unreadNotificationsCount
  } = useAuth();

  const navItems = [
    { id: 'feed', label: 'Home Feed', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'reels', label: 'Reels', icon: Film },
    { id: 'chat', label: 'Direct Messages', icon: MessageCircle },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null
    },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const handleNav = (tabId: string) => {
    if ((tabId === 'chat' || tabId === 'notifications' || tabId === 'profile') && !user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (tabId === 'profile' && user) {
      navigateToProfile(user.uid);
      return;
    }
    setCurrentTab(tabId as any);
  };

  return (
    <aside className="w-64 h-[calc(100vh-4rem)] sticky top-16 hidden lg:flex flex-col justify-between py-6 px-4 border-r border-zinc-200 dark:border-zinc-800 shrink-0">
      <div className="space-y-6">
        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Creator Hub */}
        {user && (
          <div className="p-4 rounded-3xl bg-linear-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/20 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/10 border border-indigo-100 dark:border-indigo-900/30 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Create & Share
            </span>
            <div className="space-y-1.5">
              <button
                onClick={() => setIsCreatePostOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold shadow-xs border border-zinc-200/80 dark:border-zinc-800 transition-colors"
              >
                <PlusSquare className="w-4 h-4 text-indigo-500" /> New Post
              </button>

              <button
                onClick={() => setIsCreateReelOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold shadow-xs border border-zinc-200/80 dark:border-zinc-800 transition-colors"
              >
                <Video className="w-4 h-4 text-purple-500" /> New Reel
              </button>

              <button
                onClick={() => setIsCreateStoryOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold shadow-xs border border-zinc-200/80 dark:border-zinc-800 transition-colors"
              >
                <Camera className="w-4 h-4 text-pink-500" /> New Story
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer controls */}
      {user && (
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-xs font-semibold transition-colors"
          >
            <Settings className="w-4 h-4" /> Account Settings
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
