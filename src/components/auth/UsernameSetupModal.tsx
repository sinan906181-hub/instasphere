import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { AtSign, Check, Loader2 } from 'lucide-react';

export const UsernameSetupModal: React.FC = () => {
  const { user, isUsernameModalOpen, setIsUsernameModalOpen, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isUsernameModalOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');

    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    setChecking(true);
    setError(null);

    try {
      // Check if username is already taken
      const usernameDoc = await getDoc(doc(db, 'usernames', cleanUsername));
      if (usernameDoc.exists() && usernameDoc.data().uid !== user.uid) {
        setError('This username is already taken. Please choose another.');
        setChecking(false);
        return;
      }

      const initialProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: displayName.trim() || user.displayName || cleanUsername,
        username: cleanUsername,
        photoURL: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        bio: 'Hello, I am using MediaSphere!',
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        status: 'active',
        role: user.email === 'msinank003@gmail.com' ? 'admin' : 'user',
        isOnline: true,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'users', user.uid), initialProfile);
      await setDoc(doc(db, 'usernames', cleanUsername), { uid: user.uid, createdAt: Date.now() });

      setIsUsernameModalOpen(false);
      await refreshProfile();
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError(err?.message || 'Failed to setup profile');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Complete Your Profile</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Choose your unique username to start sharing posts, reels, and stories.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 uppercase">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 uppercase">
              Unique Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-zinc-400">
                <AtSign className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                placeholder="username"
                className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">Letters, numbers, underscores and dots only.</span>
          </div>

          <button
            type="submit"
            disabled={checking}
            className="w-full py-3 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 disabled:opacity-50 mt-4"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Continue to MediaSphere
          </button>
        </form>
      </div>
    </div>
  );
};

export default UsernameSetupModal;
