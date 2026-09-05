import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldX, Clock, LogOut, AlertOctagon } from 'lucide-react';

export const BannedAccountScreen: React.FC = () => {
  const { banInfo, logout, user } = useAuth();

  const isSuspended = banInfo?.status === 'suspended';

  let remainingTimeStr = '';
  if (isSuspended && banInfo?.expiresAt) {
    const diff = banInfo.expiresAt - Date.now();
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      remainingTimeStr = `${hours}h ${mins}m remaining`;
    } else {
      remainingTimeStr = 'Expired - refresh to reactivate';
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-rose-900/50 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto mb-6 shadow-inner">
          {isSuspended ? <Clock className="w-10 h-10" /> : <ShieldX className="w-10 h-10" />}
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-2">
          {isSuspended ? 'Account Temporarily Suspended' : 'Account Suspended / Banned'}
        </h2>

        <p className="text-sm text-zinc-400 mb-6">
          Your MediaSphere account ({user?.email || 'this user'}) has been{' '}
          {isSuspended ? 'temporarily restricted' : 'permanently suspended'} by the moderation team for violating our
          Community Guidelines.
        </p>

        <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-2xl p-4 text-left mb-6 space-y-2.5">
          <div className="flex items-start gap-2 text-xs">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-zinc-400">Reason: </span>
              <span className="text-white font-medium">{banInfo?.reason || 'Violated terms of service'}</span>
            </div>
          </div>

          {isSuspended && remainingTimeStr && (
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-zinc-400">Duration: </span>
                <span className="text-amber-300 font-semibold">{remainingTimeStr}</span>
              </div>
            </div>
          )}

          {banInfo?.bannedAt && (
            <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-700/40">
              Enforced on {new Date(banInfo.bannedAt).toLocaleString()}
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-500 mb-6">
          If you believe this action was taken in error, you may submit an appeal or sign in with an alternate account.
        </p>

        <button
          onClick={logout}
          className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border border-zinc-700"
        >
          <LogOut className="w-4 h-4" /> Sign Out & Switch Account
        </button>
      </div>
    </div>
  );
};

export default BannedAccountScreen;
