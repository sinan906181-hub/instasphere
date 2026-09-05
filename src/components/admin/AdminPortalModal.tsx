import React, { useState, useEffect } from 'react';
import { useAuth, PRIMARY_ADMIN_EMAIL } from '../../context/AuthContext';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  UserProfile,
  Post,
  Reel,
  Story,
  ReportItem,
  AdminAuditLog
} from '../../types';
import {
  ShieldCheck,
  X,
  Users,
  FileText,
  Video,
  Layers,
  AlertTriangle,
  Lock,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  History,
  Activity,
  UserX,
  EyeOff,
  Eye,
  KeyRound,
  ShieldX,
  Sparkles,
  AlertOctagon,
  LogOut
} from 'lucide-react';
import Avatar from '../common/Avatar';

export const AdminPortalModal: React.FC = () => {
  const {
    isAdminPortalOpen,
    setIsAdminPortalOpen,
    user,
    profile,
    isAdmin,
    banUser,
    suspendUser,
    unbanUser,
    deleteUserAccount,
    sanitizeUserProfile,
    removeContent,
    restoreContent,
    recordAdminAction
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'reports' | 'banned' | 'cleanup' | 'audit'>('overview');
  const [contentSubTab, setContentSubTab] = useState<'posts' | 'reels' | 'stories'>('posts');

  // Passcode unlock if not logged in as primary admin
  const [passcode, setPasscode] = useState('');
  const [unlockedWithPasscode, setUnlockedWithPasscode] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);

  // Loaded Data
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [postsList, setPostsList] = useState<Post[]>([]);
  const [reelsList, setReelsList] = useState<Reel[]>([]);
  const [storiesList, setStoriesList] = useState<Story[]>([]);
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Search & Filters
  const [userSearch, setUserSearch] = useState('');
  const [contentFilter, setContentFilter] = useState<'all' | 'removed' | 'active'>('all');

  // Moderation Prompt State
  const [actionPrompt, setActionPrompt] = useState<{
    type: 'ban' | 'suspend' | 'delete' | 'remove';
    targetUser?: UserProfile;
    targetContent?: { collection: 'posts' | 'reels' | 'stories'; id: string; title: string };
    reason: string;
    durationHours: number;
  } | null>(null);

  const [cleanStatus, setCleanStatus] = useState<string | null>(null);

  const isAuthorized = isAdmin || unlockedWithPasscode || (user?.email && user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase());

  // Real-time or batch data fetching
  const refreshAdminData = async () => {
    if (!isAuthorized) return;
    setLoadingData(true);
    try {
      // 1. Users
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(100)));
      const uList = usersSnap.docs.map((d) => d.data() as UserProfile);
      setUsersList(uList);

      // 2. Posts
      const postsSnap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50)));
      setPostsList(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post));

      // 3. Reels
      const reelsSnap = await getDocs(query(collection(db, 'reels'), orderBy('createdAt', 'desc'), limit(50)));
      setReelsList(reelsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reel));

      // 4. Stories
      const storiesSnap = await getDocs(query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(50)));
      setStoriesList(storiesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Story));

      // 5. Reports
      const reportsSnap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50)));
      setReportsList(reportsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReportItem));

      // 6. Audit Logs
      const auditSnap = await getDocs(query(collection(db, 'adminAuditLogs'), orderBy('timestamp', 'desc'), limit(50)));
      setAuditLogs(auditSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AdminAuditLog));
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdminPortalOpen && isAuthorized) {
      refreshAdminData();
    }
  }, [isAdminPortalOpen, isAuthorized]);

  if (!isAdminPortalOpen) return null;

  // Passcode Verification check
  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = passcode.trim();
    // Support admin secret or master passkey
    if (
      cleanPass === '9061814655' ||
      cleanPass === 'admin2026' ||
      cleanPass === 'msinank003' ||
      cleanPass === 'vyora_admin'
    ) {
      setUnlockedWithPasscode(true);
      setPasscodeError(false);
      if (user) {
        setDoc(doc(db, 'adminUsers', user.uid), {
          uid: user.uid,
          role: 'admin',
          grantedAt: Date.now()
        }).catch(() => {});
      }
    } else {
      setPasscodeError(true);
    }
  };

  // Execute moderation prompt
  const handleConfirmAction = async () => {
    if (!actionPrompt) return;
    const { type, targetUser, targetContent, reason, durationHours } = actionPrompt;

    try {
      if (type === 'ban' && targetUser) {
        await banUser(targetUser.uid, targetUser.username, reason || 'Banned by administrator');
      } else if (type === 'suspend' && targetUser) {
        await suspendUser(targetUser.uid, targetUser.username, durationHours || 24, reason || 'Temporary restriction');
      } else if (type === 'delete' && targetUser) {
        await deleteUserAccount(targetUser.uid, targetUser.username, reason || 'Account purged');
      } else if (type === 'remove' && targetContent) {
        await removeContent(targetContent.collection, targetContent.id, reason || 'Removed for policy violation');
      }
      setActionPrompt(null);
      await refreshAdminData();
    } catch (err) {
      console.error('Moderation action failed:', err);
    }
  };

  // Purge Demo / Fake Data tool
  const handlePurgeDemoData = async () => {
    if (!confirm('Are you sure you want to scan and remove legacy dummy/test items? Real user data will NOT be touched.')) {
      return;
    }
    setCleanStatus('Scanning for legacy fake data...');
    try {
      let cleanedCount = 0;
      // Find fake posts with placeholder or dummy flags
      for (const p of postsList) {
        if (p.authorUsername?.startsWith('demo_') || p.authorUsername === 'sarah_m' || p.caption?.includes('[Demo]')) {
          await deleteDoc(doc(db, 'posts', p.id));
          cleanedCount++;
        }
      }
      for (const r of reelsList) {
        if (r.authorUsername?.startsWith('demo_') || r.caption?.includes('[Demo]')) {
          await deleteDoc(doc(db, 'reels', r.id));
          cleanedCount++;
        }
      }
      for (const u of usersList) {
        if (u.username?.startsWith('demo_') || u.email?.includes('example.com')) {
          await deleteDoc(doc(db, 'users', u.uid));
          try {
            await deleteDoc(doc(db, 'usernames', u.username));
          } catch {}
          cleanedCount++;
        }
      }

      await recordAdminAction('cleanup_demo_data', 'system', 'system', 'Data Purge', `Removed ${cleanedCount} dummy items`);
      setCleanStatus(`Successfully purged ${cleanedCount} legacy test/demo items.`);
      await refreshAdminData();
    } catch (err: any) {
      setCleanStatus(`Cleanup error: ${err.message}`);
    }
  };

  // Resolve Report
  const handleResolveReport = async (reportId: string, actionTaken: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'resolved',
        resolvedAt: Date.now(),
        resolvedBy: user?.email || 'admin',
        actionTaken
      });
      await recordAdminAction('resolve_report', 'report', reportId, reportId, actionTaken);
      await refreshAdminData();
    } catch (err) {
      console.error('Resolve report error:', err);
    }
  };

  const activeUsers = usersList.filter((u) => u.status !== 'banned' && u.status !== 'suspended');
  const bannedUsers = usersList.filter((u) => u.status === 'banned' || u.status === 'suspended');
  const pendingReports = reportsList.filter((r) => r.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-zinc-200">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">MediaSphere Admin Portal</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  SECRET ACCESS (Ctrl + Shift + /)
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Logged in as: <span className="text-zinc-200 font-medium">{user?.email || profile?.displayName || 'Administrator'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshAdminData}
              disabled={loadingData}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsAdminPortalOpen(false)}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security Unlock if not authenticated as Admin */}
        {!isAuthorized ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <form onSubmit={handlePasscodeSubmit} className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-rose-400">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Administrator Verification</h3>
              <p className="text-xs text-zinc-400">
                This portal is protected for administrators. Please enter the master administrative key or sign in with your verified admin email (<span className="text-indigo-400">{PRIMARY_ADMIN_EMAIL}</span>).
              </p>

              {passcodeError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Invalid access key.
                </div>
              )}

              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter administrator keycode..."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-center tracking-widest"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
              >
                <KeyRound className="w-4 h-4" /> Authenticate Access
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Admin Navigation Sidebar */}
            <div className="w-56 border-r border-zinc-800/80 bg-zinc-900/30 p-3 flex flex-col justify-between shrink-0">
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'overview' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <Activity className="w-4 h-4" /> System Overview
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'users' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4" /> User Management
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-[10px]">{usersList.length}</span>
                </button>

                <button
                  onClick={() => setActiveTab('content')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'content' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Content Moderation
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'reports' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4" /> User Reports
                  </div>
                  {pendingReports.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white font-bold text-[10px]">
                      {pendingReports.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('banned')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'banned' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserX className="w-4 h-4" /> Banned / Suspended
                  </div>
                  {bannedUsers.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px]">
                      {bannedUsers.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('cleanup')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'cleanup' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> Data Purge & System
                </button>

                <button
                  onClick={() => setActiveTab('audit')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'audit' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <History className="w-4 h-4" /> Audit Trail ({auditLogs.length})
                </button>
              </div>

              <div className="pt-4 border-t border-zinc-800/60">
                <div className="px-3 py-2 bg-zinc-900 rounded-xl text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Firestore Live
                  </div>
                  Real authentic user system active.
                </div>
              </div>
            </div>

            {/* Main Content Pane */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">System & Moderation Overview</h3>
                    <p className="text-xs text-zinc-400">Real-time statistics directly from Firebase Firestore.</p>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-400 font-medium">Total Registered Users</span>
                        <Users className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="text-2xl font-black text-white">{usersList.length}</div>
                      <div className="text-[11px] text-emerald-400 mt-1">{activeUsers.length} active authentic accounts</div>
                    </div>

                    <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-400 font-medium">Banned / Suspended</span>
                        <UserX className="w-4 h-4 text-rose-400" />
                      </div>
                      <div className="text-2xl font-black text-white">{bannedUsers.length}</div>
                      <div className="text-[11px] text-zinc-500 mt-1">Active restriction enforcement</div>
                    </div>

                    <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-400 font-medium">Total Feed Content</span>
                        <Layers className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-2xl font-black text-white">{postsList.length + reelsList.length + storiesList.length}</div>
                      <div className="text-[11px] text-zinc-400 mt-1">
                        {postsList.length} posts · {reelsList.length} reels · {storiesList.length} stories
                      </div>
                    </div>

                    <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-400 font-medium">Reports Pending</span>
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-2xl font-black text-amber-400">{pendingReports.length}</div>
                      <div className="text-[11px] text-zinc-400 mt-1">{reportsList.length} total received</div>
                    </div>
                  </div>

                  {/* Quick Activity Panels */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recent Users */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase text-zinc-400">Recently Registered Users</h4>
                        <button onClick={() => setActiveTab('users')} className="text-xs text-indigo-400 hover:underline">
                          View all
                        </button>
                      </div>
                      <div className="space-y-2">
                        {usersList.slice(0, 5).map((u) => (
                          <div key={u.uid} className="flex items-center justify-between p-2 rounded-xl bg-zinc-800/40 border border-zinc-800 text-xs">
                            <div className="flex items-center gap-2.5">
                              <Avatar src={u.photoURL} alt={u.displayName} size="sm" />
                              <div>
                                <div className="font-semibold text-white">{u.displayName}</div>
                                <div className="text-zinc-400">@{u.username}</div>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'banned'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : u.status === 'suspended'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {u.status || 'active'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pending Reports */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase text-zinc-400">Pending Safety Reports</h4>
                        <button onClick={() => setActiveTab('reports')} className="text-xs text-rose-400 hover:underline">
                          Review all
                        </button>
                      </div>
                      <div className="space-y-2">
                        {pendingReports.length === 0 ? (
                          <div className="py-8 text-center text-xs text-zinc-500">No pending reports. Community is clean.</div>
                        ) : (
                          pendingReports.slice(0, 5).map((r) => (
                            <div key={r.id} className="p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-800 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-rose-400 uppercase tracking-wider">{r.targetType}</span>
                                <span className="text-[10px] text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="text-white font-medium">{r.reason}</div>
                              <div className="text-zinc-400 text-[11px]">Reported by: @{r.reporterUsername}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: USER MANAGEMENT */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">Registered Users ({usersList.length})</h3>
                      <p className="text-xs text-zinc-400">Search, suspend, ban, or sanitize real registered accounts.</p>
                    </div>
                    <div className="relative w-64">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search by handle or email..."
                        className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900 text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                        <tr>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Joined</th>
                          <th className="px-4 py-3 text-right">Moderation Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {usersList
                          .filter(
                            (u) =>
                              u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
                              u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
                              u.email?.toLowerCase().includes(userSearch.toLowerCase())
                          )
                          .map((u) => {
                            const isBanned = u.status === 'banned';
                            const isSuspended = u.status === 'suspended';
                            return (
                              <tr key={u.uid} className="hover:bg-zinc-800/30 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <Avatar src={u.photoURL} alt={u.displayName} size="sm" />
                                    <div>
                                      <div className="font-semibold text-white">{u.displayName}</div>
                                      <div className="text-zinc-400">@{u.username}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-zinc-300 font-mono text-[11px]">{u.email}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800 text-zinc-400'}`}>
                                    {u.role || 'user'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isBanned
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                        : isSuspended
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    }`}
                                  >
                                    {u.status || 'active'}
                                  </span>
                                  {isBanned && u.banReason && (
                                    <div className="text-[10px] text-rose-400/80 truncate max-w-[140px] mt-0.5" title={u.banReason}>
                                      {u.banReason}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-zinc-400 text-[11px]">
                                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {isBanned || isSuspended ? (
                                      <button
                                        onClick={() => unbanUser(u.uid, u.username)}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition-colors"
                                      >
                                        Reactivate / Unban
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() =>
                                            setActionPrompt({
                                              type: 'suspend',
                                              targetUser: u,
                                              reason: 'Temporary safety restriction',
                                              durationHours: 24
                                            })
                                          }
                                          className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 rounded-lg text-[11px] font-semibold border border-amber-500/30 transition-colors"
                                        >
                                          Suspend
                                        </button>
                                        <button
                                          onClick={() =>
                                            setActionPrompt({
                                              type: 'ban',
                                              targetUser: u,
                                              reason: 'Community guidelines violation',
                                              durationHours: 0
                                            })
                                          }
                                          className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded-lg text-[11px] font-semibold border border-rose-500/30 transition-colors"
                                        >
                                          Ban
                                        </button>
                                      </>
                                    )}

                                    <button
                                      onClick={() => sanitizeUserProfile(u.uid, u.username)}
                                      className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                                      title="Sanitize profile info"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() =>
                                        setActionPrompt({
                                          type: 'delete',
                                          targetUser: u,
                                          reason: 'Account deletion requested by moderation',
                                          durationHours: 0
                                        })
                                      }
                                      className="p-1 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-900/30"
                                      title="Delete account permanently"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: CONTENT MODERATION */}
              {activeTab === 'content' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">Content Moderation</h3>
                      <p className="text-xs text-zinc-400">Review live posts, reels, and stories. Remove policy-violating media.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setContentSubTab('posts')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                          contentSubTab === 'posts' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        Posts ({postsList.length})
                      </button>
                      <button
                        onClick={() => setContentSubTab('reels')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                          contentSubTab === 'reels' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        Reels ({reelsList.length})
                      </button>
                      <button
                        onClick={() => setContentSubTab('stories')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                          contentSubTab === 'stories' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        Stories ({storiesList.length})
                      </button>
                    </div>
                  </div>

                  {/* Grid of Content */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {contentSubTab === 'posts' &&
                      postsList.map((p) => (
                        <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-2 text-xs">
                              <span className="font-semibold text-white">@{p.authorUsername}</span>
                              {p.isRemoved && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 font-bold">
                                  REMOVED
                                </span>
                              )}
                            </div>
                            {p.mediaUrls?.[0] && (
                              <div className="h-36 rounded-xl overflow-hidden bg-black mb-2">
                                <img src={p.mediaUrls[0]} alt="post" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <p className="text-xs text-zinc-300 line-clamp-2">{p.caption || 'No caption'}</p>
                            <div className="text-[10px] text-zinc-500 mt-2">
                              ❤️ {p.likesCount || 0} · 💬 {p.commentsCount || 0} · 👁️ {p.viewsCount || 0} views
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                            {p.isRemoved ? (
                              <button
                                onClick={() => restoreContent('posts', p.id)}
                                className="text-xs text-emerald-400 hover:underline font-semibold"
                              >
                                Restore Post
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setActionPrompt({
                                    type: 'remove',
                                    targetContent: { collection: 'posts', id: p.id, title: p.caption || 'Post' },
                                    reason: 'Violated Community Guidelines',
                                    durationHours: 0
                                  })
                                }
                                className="text-xs text-rose-400 hover:underline font-semibold"
                              >
                                Remove Post
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (confirm('Delete post permanently?')) {
                                  await deleteDoc(doc(db, 'posts', p.id));
                                  await refreshAdminData();
                                }
                              }}
                              className="p-1 text-zinc-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                    {contentSubTab === 'reels' &&
                      reelsList.map((r) => (
                        <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-2 text-xs">
                              <span className="font-semibold text-white">@{r.authorUsername}</span>
                              {r.isRemoved && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 font-bold">
                                  REMOVED
                                </span>
                              )}
                            </div>
                            <div className="h-44 rounded-xl overflow-hidden bg-black mb-2 flex items-center justify-center">
                              <video src={r.videoUrl} className="h-full w-full object-cover" />
                            </div>
                            <p className="text-xs text-zinc-300 line-clamp-2">{r.caption || 'No caption'}</p>
                            <div className="text-[10px] text-zinc-500 mt-2">
                              ❤️ {r.likesCount || 0} · 💬 {r.commentsCount || 0} · 👁️ {r.viewsCount || 0} real views
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                            {r.isRemoved ? (
                              <button
                                onClick={() => restoreContent('reels', r.id)}
                                className="text-xs text-emerald-400 hover:underline font-semibold"
                              >
                                Restore Reel
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setActionPrompt({
                                    type: 'remove',
                                    targetContent: { collection: 'reels', id: r.id, title: r.caption || 'Reel' },
                                    reason: 'Violated Community Guidelines',
                                    durationHours: 0
                                  })
                                }
                                className="text-xs text-rose-400 hover:underline font-semibold"
                              >
                                Remove Reel
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (confirm('Delete reel permanently?')) {
                                  await deleteDoc(doc(db, 'reels', r.id));
                                  await refreshAdminData();
                                }
                              }}
                              className="p-1 text-zinc-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                    {contentSubTab === 'stories' &&
                      storiesList.map((s) => (
                        <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-2 text-xs">
                              <span className="font-semibold text-white">@{s.authorUsername}</span>
                              {s.isRemoved && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 font-bold">
                                  REMOVED
                                </span>
                              )}
                            </div>
                            <div className="h-40 rounded-xl overflow-hidden bg-black mb-2 flex items-center justify-center">
                              {s.mediaUrl ? (
                                <img src={s.mediaUrl} alt="story" className="h-full w-full object-cover" />
                              ) : (
                                <div className="p-3 text-center text-xs text-white">{s.caption}</div>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              👁️ {s.viewsCount || s.viewersCount || 0} unique viewers
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                            <button
                              onClick={async () => {
                                if (confirm('Delete story permanently?')) {
                                  await deleteDoc(doc(db, 'stories', s.id));
                                  await refreshAdminData();
                                }
                              }}
                              className="text-xs text-rose-400 hover:underline font-semibold"
                            >
                              Purge Story
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* TAB 4: USER REPORTS */}
              {activeTab === 'reports' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">User Submitted Reports ({reportsList.length})</h3>
                    <p className="text-xs text-zinc-400">Reports submitted by active community members.</p>
                  </div>

                  <div className="space-y-3">
                    {reportsList.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 text-sm">No community reports submitted yet.</div>
                    ) : (
                      reportsList.map((r) => (
                        <div
                          key={r.id}
                          className={`p-4 rounded-2xl border transition-colors ${
                            r.status === 'pending'
                              ? 'bg-zinc-900 border-amber-500/30'
                              : 'bg-zinc-900/40 border-zinc-800 opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                                {r.targetType}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  r.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {r.status}
                              </span>
                            </div>
                            <span className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString()}</span>
                          </div>

                          <div className="text-sm font-semibold text-white mb-1">Reason: {r.reason}</div>
                          {r.details && <div className="text-xs text-zinc-400 mb-2">Details: {r.details}</div>}
                          <div className="text-xs text-zinc-500">
                            Reported by <span className="text-zinc-300">@{r.reporterUsername}</span> · Target ID:{' '}
                            <span className="font-mono text-zinc-400">{r.targetId}</span>
                          </div>

                          {r.status === 'pending' && (
                            <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-2">
                              <button
                                onClick={() => handleResolveReport(r.id, 'Warned and resolved')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                              >
                                Mark Resolved
                              </button>
                              <button
                                onClick={() => handleResolveReport(r.id, 'Dismissed as non-violating')}
                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: BANNED ACCOUNTS */}
              {activeTab === 'banned' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Banned & Suspended Accounts ({bannedUsers.length})</h3>
                    <p className="text-xs text-zinc-400">
                      These accounts cannot access the platform or view feed/stories. Reinstatement restores full access immediately.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {bannedUsers.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 text-sm">No accounts currently banned or suspended.</div>
                    ) : (
                      bannedUsers.map((u) => (
                        <div key={u.uid} className="bg-zinc-900 border border-rose-900/40 rounded-2xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar src={u.photoURL} alt={u.displayName} size="md" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{u.displayName}</span>
                                <span className="text-xs text-zinc-400">@{u.username}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 uppercase">
                                  {u.status}
                                </span>
                              </div>
                              <div className="text-xs text-zinc-400 mt-1">
                                Reason: <span className="text-white">{u.banReason || 'Administrative decision'}</span>
                              </div>
                              {u.status === 'suspended' && u.banExpiresAt && (
                                <div className="text-[11px] text-amber-400 mt-0.5">
                                  Expires on: {new Date(u.banExpiresAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => unbanUser(u.uid, u.username)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors"
                          >
                            Lift Ban / Restore Access
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: DATA PURGE & SYSTEM */}
              {activeTab === 'cleanup' && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-xl font-bold text-white">System Data Purge & Integrity</h3>
                    <p className="text-xs text-zinc-400">
                      Remove legacy dummy/mock seeds to maintain 100% authentic registered user community.
                    </p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Purge Legacy Demo / Fake Data</h4>
                        <p className="text-xs text-zinc-400">
                          Scans Firestore for any fake posts or dummy profiles created during prototyping and permanently removes them.
                        </p>
                      </div>
                    </div>

                    {cleanStatus && (
                      <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs text-zinc-200">
                        {cleanStatus}
                      </div>
                    )}

                    <button
                      onClick={handlePurgeDemoData}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Run Purge Routine
                    </button>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-2">
                    <h4 className="text-sm font-bold text-white">Shortcuts & Portal Rules</h4>
                    <ul className="text-xs text-zinc-400 space-y-1.5 list-disc pl-4">
                      <li>
                        Shortcut to open this panel from any view:{' '}
                        <kbd className="px-2 py-0.5 bg-zinc-800 rounded-md border border-zinc-700 text-zinc-200">
                          Ctrl + Shift + /
                        </kbd>
                      </li>
                      <li>No admin buttons are visible to general visitors or users.</li>
                      <li>Real tracked story viewers, reel views, and post likes recorded in separate Firestore collections.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 7: AUDIT LOGS */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Immutable Administrative Audit Trail</h3>
                    <p className="text-xs text-zinc-400">Permanent record of all bans, suspensions, content removals, and system events.</p>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900 text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                        <tr>
                          <th className="px-4 py-3">Timestamp</th>
                          <th className="px-4 py-3">Admin</th>
                          <th className="px-4 py-3">Action</th>
                          <th className="px-4 py-3">Target</th>
                          <th className="px-4 py-3">Reason / Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-zinc-800/30">
                            <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-zinc-300 font-medium">{log.adminEmail}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-zinc-800 text-rose-300">
                                {log.action.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-white">{log.targetIdentifier || log.targetId}</td>
                            <td className="px-4 py-3 text-zinc-400">{log.reason || 'Administrative action'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODERATION ACTION MODAL PROMPT */}
        {actionPrompt && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white capitalize">{actionPrompt.type} Action</h4>
                  <p className="text-xs text-zinc-400">
                    {actionPrompt.targetUser
                      ? `Target: @${actionPrompt.targetUser.username}`
                      : `Target: ${actionPrompt.targetContent?.title}`}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Reason for action</label>
                <input
                  type="text"
                  value={actionPrompt.reason}
                  onChange={(e) => setActionPrompt({ ...actionPrompt, reason: e.target.value })}
                  placeholder="e.g. Harassment, Spam, Explicit Content"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {actionPrompt.type === 'suspend' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Duration</label>
                  <select
                    value={actionPrompt.durationHours}
                    onChange={(e) => setActionPrompt({ ...actionPrompt, durationHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-hidden"
                  >
                    <option value={24}>24 Hours</option>
                    <option value={72}>3 Days</option>
                    <option value={168}>7 Days (1 Week)</option>
                    <option value={720}>30 Days (1 Month)</option>
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setActionPrompt(null)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/30"
                >
                  Confirm & Execute
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPortalModal;
