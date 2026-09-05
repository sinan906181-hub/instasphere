import React from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import MobileNav from './components/layout/MobileNav';
import PostFeed from './components/posts/PostFeed';
import ExploreView from './components/explore/ExploreView';
import ReelsFeed from './components/reels/ReelsFeed';
import ChatView from './components/chat/ChatView';
import ProfileView from './components/profile/ProfileView';
import NotificationsView from './components/notifications/NotificationsView';

// Modals
import AuthModal from './components/auth/AuthModal';
import BannedAccountScreen from './components/auth/BannedAccountScreen';
import CreatePostModal from './components/posts/CreatePostModal';
import CreateReelModal from './components/reels/CreateReelModal';
import CreateStoryModal from './components/stories/CreateStoryModal';
import SettingsModal from './components/settings/SettingsModal';
import AdminPortalModal from './components/admin/AdminPortalModal';

export const App: React.FC = () => {
  const { currentTab, isAccountBanned, isAdminPortalOpen } = useAuth();

  // If user is banned or suspended by admin moderation, lock down their experience
  if (isAccountBanned) {
    return <BannedAccountScreen />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar />

      {/* Main App Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 pt-4">
        {/* Left Sticky Sidebar */}
        <Sidebar />

        {/* Dynamic Center Viewport */}
        <main className="flex-1 min-w-0">
          {currentTab === 'feed' && <PostFeed />}
          {currentTab === 'explore' && <ExploreView />}
          {currentTab === 'reels' && <ReelsFeed />}
          {currentTab === 'chat' && <ChatView />}
          {currentTab === 'profile' && <ProfileView />}
          {currentTab === 'notifications' && <NotificationsView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Global Application Modals */}
      <AuthModal />
      <CreatePostModal />
      <CreateReelModal />
      <CreateStoryModal />
      <SettingsModal />

      {/* Hidden Global Admin Portal - toggled via Ctrl + Shift + / */}
      {isAdminPortalOpen && <AdminPortalModal />}
    </div>
  );
};

export default App;
