import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import {
  UserProfile,
  NotificationItem,
  AdminAuditLog
} from '../types';

export const PRIMARY_ADMIN_EMAIL = 'msinank003@gmail.com';

interface BanInfo {
  status: 'banned' | 'suspended';
  reason?: string;
  expiresAt?: number | null;
  bannedAt?: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isAccountBanned: boolean;
  banInfo: BanInfo | null;
  currentTab: 'feed' | 'reels' | 'explore' | 'chat' | 'notifications' | 'profile' | 'admin';
  setCurrentTab: (tab: 'feed' | 'reels' | 'explore' | 'chat' | 'notifications' | 'profile' | 'admin') => void;
  activeProfileUid: string | null;
  setActiveProfileUid: (uid: string | null) => void;
  
  // Modals
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isUsernameModalOpen: boolean;
  setIsUsernameModalOpen: (open: boolean) => void;
  isCreatePostOpen: boolean;
  setIsCreatePostOpen: (open: boolean) => void;
  isCreateReelOpen: boolean;
  setIsCreateReelOpen: (open: boolean) => void;
  isCreateStoryOpen: boolean;
  setIsCreateStoryOpen: (open: boolean) => void;
  isAdminPortalOpen: boolean;
  setIsAdminPortalOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  
  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Unread Notifications
  unreadNotificationsCount: number;

  // Auth Operations
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  navigateToProfile: (uid: string) => void;

  // Admin Audit & Moderation Operations
  recordAdminAction: (
    action: AdminAuditLog['action'],
    targetType: AdminAuditLog['targetType'],
    targetId: string,
    targetIdentifier?: string,
    reason?: string,
    duration?: string,
    metadata?: Record<string, any>
  ) => Promise<void>;
  banUser: (uid: string, username: string, reason?: string) => Promise<void>;
  suspendUser: (uid: string, username: string, durationHours: number, reason?: string) => Promise<void>;
  unbanUser: (uid: string, username: string) => Promise<void>;
  deleteUserAccount: (uid: string, username: string, reason?: string) => Promise<void>;
  sanitizeUserProfile: (uid: string, username: string, reason?: string) => Promise<void>;
  removeContent: (collectionName: 'posts' | 'reels' | 'stories', id: string, reason: string) => Promise<void>;
  restoreContent: (collectionName: 'posts' | 'reels' | 'stories', id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAccountBanned, setIsAccountBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);

  // Navigation & State
  const [currentTab, setCurrentTab] = useState<'feed' | 'reels' | 'explore' | 'chat' | 'notifications' | 'profile' | 'admin'>('feed');
  const [activeProfileUid, setActiveProfileUid] = useState<string | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Initialize theme
  useEffect(() => {
    const saved = localStorage.getItem('mediasphere_theme') as 'dark' | 'light';
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('mediasphere_theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  }, []);

  // Check Admin Status helper
  const checkIsAdmin = useCallback(async (u: User | null, prof: UserProfile | null): Promise<boolean> => {
    if (!u) return false;
    if (u.email && u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) return true;
    if (prof?.role === 'admin') return true;
    try {
      const adminDoc = await getDoc(doc(db, 'adminUsers', u.uid));
      if (adminDoc.exists()) return true;
    } catch {
      // Ignored
    }
    return false;
  }, []);

  // Fetch or sync user profile
  const fetchProfile = useCallback(async (authUser: User) => {
    try {
      const userDocRef = doc(db, 'users', authUser.uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        
        // Check Ban / Suspension
        if (data.status === 'banned') {
          setIsAccountBanned(true);
          setBanInfo({
            status: 'banned',
            reason: data.banReason || 'Violation of Community Guidelines',
            bannedAt: data.bannedAt
          });
        } else if (data.status === 'suspended') {
          const now = Date.now();
          if (data.banExpiresAt && data.banExpiresAt > now) {
            setIsAccountBanned(true);
            setBanInfo({
              status: 'suspended',
              reason: data.banReason || 'Temporary suspension',
              expiresAt: data.banExpiresAt,
              bannedAt: data.suspendedAt
            });
          } else {
            // Suspension period ended, automatically reactivate
            setIsAccountBanned(false);
            setBanInfo(null);
            await updateDoc(userDocRef, { status: 'active', banExpiresAt: null, banReason: null });
            data.status = 'active';
          }
        } else {
          setIsAccountBanned(false);
          setBanInfo(null);
        }

        const adminStatus = await checkIsAdmin(authUser, data);
        setIsAdmin(adminStatus);
        setProfile(data);
      } else {
        // Needs initial profile / username setup
        setIsUsernameModalOpen(true);
        const adminStatus = await checkIsAdmin(authUser, null);
        setIsAdmin(adminStatus);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }, [checkIsAdmin]);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsAccountBanned(false);
        setBanInfo(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [fetchProfile]);

  // Real-time unread notifications listener
  useEffect(() => {
    if (!user) {
      setUnreadNotificationsCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsub = onSnapshot(q, (snap) => {
      setUnreadNotificationsCount(snap.size);
    });

    return () => unsub();
  }, [user]);

  // Global Keyboard Shortcut: Ctrl + Shift + /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl + Shift + / (or Ctrl + Shift + ?)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        e.stopPropagation();
        setIsAdminPortalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Google Sign In
  const signInWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        await fetchProfile(res.user);
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Google sign in error:', err);
        throw err;
      }
    }
  };

  // Guest Sign In (Real anonymous Firebase auth with auto-generated real profile)
  const signInAsGuest = async () => {
    try {
      const cred = await signInAnonymously(auth);
      const guestNum = Math.floor(1000 + Math.random() * 9000);
      const guestUsername = `guest_${guestNum}`;
      const guestDisplayName = `MediaSphere Guest ${guestNum}`;

      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: `${guestUsername}@mediasphere.guest`,
        username: guestUsername,
        displayName: guestDisplayName,
        bio: 'Real explorer on MediaSphere 🌐',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        status: 'active',
        role: 'user',
        isOnline: true,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      await setDoc(doc(db, 'usernames', guestUsername), { uid: cred.user.uid, createdAt: Date.now() });
      setProfile(newProfile);
      setIsAuthModalOpen(false);
    } catch (err) {
      console.error('Guest sign-in error:', err);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    if (user && profile) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          isOnline: false,
          lastSeen: Date.now()
        });
      } catch {
        // Ignored
      }
    }
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setIsAccountBanned(false);
    setBanInfo(null);
    setIsAdminPortalOpen(false);
    setCurrentTab('feed');
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated');
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { ...data, updatedAt: Date.now() });
    setProfile((prev) => (prev ? { ...prev, ...data } : null));
  };

  const navigateToProfile = (uid: string) => {
    setActiveProfileUid(uid);
    setCurrentTab('profile');
  };

  // Record an immutable admin audit log in Firestore
  const recordAdminAction = async (
    action: AdminAuditLog['action'],
    targetType: AdminAuditLog['targetType'],
    targetId: string,
    targetIdentifier?: string,
    reason?: string,
    duration?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    try {
      const logEntry: Omit<AdminAuditLog, 'id'> = {
        adminId: user.uid,
        adminEmail: user.email || profile?.email || 'admin@mediasphere.internal',
        action,
        targetType,
        targetId,
        targetIdentifier: targetIdentifier || targetId,
        reason: reason || 'Administrative policy enforcement',
        duration: duration || 'N/A',
        timestamp: Date.now(),
        metadata: metadata || {}
      };
      await addDoc(collection(db, 'adminAuditLogs'), logEntry);
    } catch (err) {
      console.error('Failed to log admin action:', err);
    }
  };

  // Admin: Ban User
  const banUser = async (uid: string, username: string, reason: string = 'Violated Community Guidelines') => {
    await updateDoc(doc(db, 'users', uid), {
      status: 'banned',
      banReason: reason,
      bannedAt: Date.now(),
      bannedBy: user?.email || 'admin',
      banExpiresAt: null
    });
    await recordAdminAction('ban_user', 'user', uid, `@${username}`, reason, 'Permanent');
  };

  // Admin: Suspend User
  const suspendUser = async (uid: string, username: string, durationHours: number, reason: string = 'Temporary safety restriction') => {
    const expiresAt = Date.now() + durationHours * 60 * 60 * 1000;
    await updateDoc(doc(db, 'users', uid), {
      status: 'suspended',
      banReason: reason,
      suspendedAt: Date.now(),
      banExpiresAt: expiresAt,
      suspensionDuration: `${durationHours} hours`
    });
    await recordAdminAction('suspend_user', 'user', uid, `@${username}`, reason, `${durationHours}h`);
  };

  // Admin: Unban User
  const unbanUser = async (uid: string, username: string) => {
    await updateDoc(doc(db, 'users', uid), {
      status: 'active',
      banReason: null,
      bannedAt: null,
      bannedBy: null,
      banExpiresAt: null,
      suspendedAt: null,
      suspensionDuration: null
    });
    await recordAdminAction('unban_user', 'user', uid, `@${username}`, 'Account reinstated');
  };

  // Admin: Delete User Account
  const deleteUserAccount = async (uid: string, username: string, reason?: string) => {
    await deleteDoc(doc(db, 'users', uid));
    try {
      await deleteDoc(doc(db, 'usernames', username.toLowerCase()));
    } catch {
      // Ignored
    }
    await recordAdminAction('delete_user', 'user', uid, `@${username}`, reason || 'Account purged');
  };

  // Admin: Sanitize User Profile
  const sanitizeUserProfile = async (uid: string, username: string, reason?: string) => {
    await updateDoc(doc(db, 'users', uid), {
      bio: '',
      displayName: username,
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      website: '',
      location: ''
    });
    await recordAdminAction('sanitize_profile', 'user', uid, `@${username}`, reason || 'Inappropriate content removed');
  };

  // Admin: Remove Content
  const removeContent = async (collectionName: 'posts' | 'reels' | 'stories', id: string, reason: string) => {
    await updateDoc(doc(db, collectionName, id), {
      isRemoved: true,
      removedReason: reason,
      removedAt: Date.now(),
      removedBy: user?.email || 'admin'
    });
    const act = collectionName === 'posts' ? 'remove_post' : collectionName === 'reels' ? 'remove_reel' : 'remove_story';
    await recordAdminAction(act as any, collectionName === 'posts' ? 'post' : collectionName === 'reels' ? 'reel' : 'story', id, id, reason);
  };

  // Admin: Restore Content
  const restoreContent = async (collectionName: 'posts' | 'reels' | 'stories', id: string) => {
    await updateDoc(doc(db, collectionName, id), {
      isRemoved: false,
      removedReason: null,
      removedAt: null,
      removedBy: null
    });
    const act = collectionName === 'posts' ? 'restore_post' : 'restore_reel';
    await recordAdminAction(act as any, collectionName === 'posts' ? 'post' : 'reel', id, id, 'Content restored by admin');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isAccountBanned,
        banInfo,
        currentTab,
        setCurrentTab,
        activeProfileUid,
        setActiveProfileUid,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isUsernameModalOpen,
        setIsUsernameModalOpen,
        isCreatePostOpen,
        setIsCreatePostOpen,
        isCreateReelOpen,
        setIsCreateReelOpen,
        isCreateStoryOpen,
        setIsCreateStoryOpen,
        isAdminPortalOpen,
        setIsAdminPortalOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        theme,
        toggleTheme,
        unreadNotificationsCount,
        signInWithGoogle,
        signInAsGuest,
        logout,
        refreshProfile,
        updateUserProfile,
        navigateToProfile,
        recordAdminAction,
        banUser,
        suspendUser,
        unbanUser,
        deleteUserAccount,
        sanitizeUserProfile,
        removeContent,
        restoreContent
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
