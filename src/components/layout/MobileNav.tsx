import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Home, Compass, Film, MessageCircle, User, PlusCircle } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { currentTab, setCurrentTab, user, setIsAuthModalOpen, setIsCreatePostOpen, navigateToProfile } = useAuth();

  const handleNav = (tabId: string) => {
    if ((tabId === 'chat' || tabId === 'profile') && !user) {
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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-around">
      <button
        onClick={() => handleNav('feed')}
        className={`p-2 rounded-xl flex flex-col items-center ${
          currentTab === 'feed' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'
        }`}
      >
        <Home className="w-6 h-6" />
        <span className="text-[10px] mt-0.5">Feed</span>
      </button>

      <button
        onClick={() => handleNav('explore')}
        className={`p-2 rounded-xl flex flex-col items-center ${
          currentTab === 'explore' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'
        }`}
      >
        <Compass className="w-6 h-6" />
        <span className="text-[10px] mt-0.5">Explore</span>
      </button>

      <button
        onClick={() => (user ? setIsCreatePostOpen(true) : setIsAuthModalOpen(true))}
        className="p-2 rounded-xl flex flex-col items-center text-indigo-600 dark:text-indigo-400 -mt-3"
      >
        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
          <PlusCircle className="w-6 h-6" />
        </div>
      </button>

      <button
        onClick={() => handleNav('reels')}
        className={`p-2 rounded-xl flex flex-col items-center ${
          currentTab === 'reels' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'
        }`}
      >
        <Film className="w-6 h-6" />
        <span className="text-[10px] mt-0.5">Reels</span>
      </button>

      <button
        onClick={() => handleNav('chat')}
        className={`p-2 rounded-xl flex flex-col items-center ${
          currentTab === 'chat' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'
        }`}
      >
        <MessageCircle className="w-6 h-6" />
        <span className="text-[10px] mt-0.5">Direct</span>
      </button>
    </nav>
  );
};

export default MobileNav;
