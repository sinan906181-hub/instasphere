import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Moon, Sun, Shield, Bell, LogOut, Trash2 } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen, user, profile, theme, toggleTheme, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);

  if (!isSettingsOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">Account Settings</h3>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* User Details */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-semibold text-zinc-900 dark:text-white">{profile?.displayName}</p>
            <p className="text-[11px] text-zinc-500">@{profile?.username}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{user.email}</p>
          </div>

          {/* Preferences */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Preferences</h4>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/30">
              <div className="flex items-center gap-2.5 text-xs text-zinc-800 dark:text-zinc-200">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span>Theme Mode</span>
              </div>
              <button
                onClick={toggleTheme}
                className="px-3 py-1 bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold rounded-lg capitalize"
              >
                {theme}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/30">
              <div className="flex items-center gap-2.5 text-xs text-zinc-800 dark:text-zinc-200">
                <Bell className="w-4 h-4 text-purple-400" />
                <span>Push Notifications</span>
              </div>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/30">
              <div className="flex items-center gap-2.5 text-xs text-zinc-800 dark:text-zinc-200">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Private Profile</span>
              </div>
              <input
                type="checkbox"
                checked={privateAccount}
                onChange={() => setPrivateAccount(!privateAccount)}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </div>
          </div>

          {/* Account Actions */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
            <button
              onClick={() => {
                logout();
                setIsSettingsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
