import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MediaSphereLogo } from '../common/VyoraLogo';
import { X, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, signInWithGoogle, signInAsGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAsGuest();
    } catch (err: any) {
      setError(err?.message || 'Guest sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative text-center">
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-4">
          <MediaSphereLogo size="lg" />
        </div>

        <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">
          Join MediaSphere
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Connect with real people, post high-fidelity reels, share authentic stories, and explore curated community content.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* Google Sign In */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-3 shadow-xs active:scale-98 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Guest Explorer */}
          <button
            onClick={handleGuest}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-98 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" /> Continue as Instant Guest
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Real-user authentic system & privacy protected</span>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
