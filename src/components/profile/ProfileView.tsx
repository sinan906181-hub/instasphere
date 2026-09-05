import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, Post, Reel } from '../../types';
import Avatar from '../common/Avatar';
import EditProfileModal from './EditProfileModal';
import ReportModal from '../common/ReportModal';
import MediaViewer4KModal from '../common/MediaViewer4KModal';
import {
  Grid,
  Film,
  Settings,
  ShieldAlert,
  Link as LinkIcon,
  Calendar,
  Check,
  UserPlus,
  UserCheck,
  Sparkles,
  Loader2
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, profile: myProfile, activeProfileUid, setIsAuthModalOpen, setIsSettingsOpen } = useAuth();
  const targetUid = activeProfileUid || user?.uid;

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; isVideo: boolean } | null>(null);

  const isMyProfile = user && targetUid === user.uid;

  // Load target profile
  useEffect(() => {
    if (!targetUid) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'users', targetUid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setProfileData(data);
          setFollowersCount(data.followersCount || 0);
          setFollowingCount(data.followingCount || 0);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUid]);

  // Check if following
  useEffect(() => {
    if (!user || !targetUid || isMyProfile) return;

    const checkFollow = async () => {
      try {
        const followDoc = await getDoc(doc(db, 'users', targetUid, 'followers', user.uid));
        setIsFollowing(followDoc.exists());
      } catch (err) {
        console.error('Error checking follow:', err);
      }
    };

    checkFollow();
  }, [user, targetUid, isMyProfile]);

  // Load user's posts
  useEffect(() => {
    if (!targetUid) return;

    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', targetUid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Post)
          .filter((p) => !p.isRemoved);
        setPosts(list);
      },
      (err) => {
        console.warn('Error fetching profile posts:', err);
      }
    );

    return () => unsub();
  }, [targetUid]);

  // Load user's reels
  useEffect(() => {
    if (!targetUid) return;

    const q = query(
      collection(db, 'reels'),
      where('authorId', '==', targetUid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Reel)
          .filter((r) => !r.isRemoved);
        setReels(list);
      },
      (err) => {
        console.warn('Error fetching profile reels:', err);
      }
    );

    return () => unsub();
  }, [targetUid]);

  // Follow / Unfollow Handler
  const handleToggleFollow = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!targetUid || isMyProfile) return;

    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowersCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const followerRef = doc(db, 'users', targetUid, 'followers', user.uid);
      const followingRef = doc(db, 'users', user.uid, 'following', targetUid);

      if (nextState) {
        await setDoc(followerRef, {
          userId: user.uid,
          username: myProfile?.username || 'user',
          displayName: myProfile?.displayName || 'User',
          photoURL: myProfile?.photoURL || '',
          followedAt: Date.now()
        });
        await setDoc(followingRef, {
          userId: targetUid,
          followedAt: Date.now()
        });
        await updateDoc(doc(db, 'users', targetUid), { followersCount: increment(1) });
        await updateDoc(doc(db, 'users', user.uid), { followingCount: increment(1) });
      } else {
        await deleteDoc(followerRef);
        await deleteDoc(followingRef);
        await updateDoc(doc(db, 'users', targetUid), { followersCount: increment(-1) });
        await updateDoc(doc(db, 'users', user.uid), { followingCount: increment(-1) });
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-xs">Loading profile...</span>
      </div>
    );
  }

  if (!profileData && !isMyProfile) {
    return (
      <div className="py-20 text-center text-xs text-zinc-400">
        Profile not found or unavailable.
      </div>
    );
  }

  const currentProfile = isMyProfile ? myProfile : profileData;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Profile Card Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar
            src={currentProfile?.photoURL}
            alt={currentProfile?.displayName}
            size="xl"
            isOnline={currentProfile?.isOnline}
          />

          <div className="flex-1 text-center sm:text-left space-y-3">
            {/* Top row: username & action button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {currentProfile?.displayName}
                  </h2>
                  {currentProfile?.isVerified && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold">
                      ✓ Verified
                    </span>
                  )}
                  {currentProfile?.role === 'admin' && (
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-bold">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">@{currentProfile?.username}</p>
              </div>

              <div className="flex items-center gap-2">
                {isMyProfile ? (
                  <>
                    <button
                      onClick={() => setIsEditOpen(true)}
                      className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-full text-xs font-semibold transition-colors"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleToggleFollow}
                      className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        isFollowing
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setIsReportOpen(true)}
                      className="p-2 text-zinc-400 hover:text-rose-500 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Report account"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Metrics Counters */}
            <div className="flex items-center justify-center sm:justify-start gap-8 text-xs py-1">
              <div>
                <span className="font-bold text-zinc-900 dark:text-white">{posts.length}</span>{' '}
                <span className="text-zinc-500">Posts</span>
              </div>
              <div>
                <span className="font-bold text-zinc-900 dark:text-white">{followersCount}</span>{' '}
                <span className="text-zinc-500">Followers</span>
              </div>
              <div>
                <span className="font-bold text-zinc-900 dark:text-white">{followingCount}</span>{' '}
                <span className="text-zinc-500">Following</span>
              </div>
            </div>

            {/* Bio & Website */}
            {currentProfile?.bio && (
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed max-w-lg">
                {currentProfile.bio}
              </p>
            )}

            {currentProfile?.website && (
              <a
                href={currentProfile.website.startsWith('http') ? currentProfile.website : `https://${currentProfile.website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                <LinkIcon className="w-3 h-3" />
                <span>{currentProfile.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs: Posts / Reels */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Posts ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reels')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'reels'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Reels ({reels.length})</span>
        </button>
      </div>

      {/* Content Grids */}
      {activeTab === 'posts' ? (
        posts.length === 0 ? (
          <div className="py-20 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            No posts published yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {posts.map((p) => {
              const mediaUrl = p.mediaUrls?.[0];
              const isVideo = mediaUrl?.includes('.mp4') || mediaUrl?.includes('.webm') || p.mediaType === 'video';
              if (!mediaUrl) return null;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedMedia({ url: mediaUrl, isVideo: !!isVideo })}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-black cursor-pointer group shadow-xs"
                >
                  {isVideo ? (
                    <video src={mediaUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={mediaUrl} alt="Post thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}

                  {p.is4K && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white font-bold text-[9px] backdrop-blur-xs">
                      4K
                    </span>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-3">
                    <span>❤️ {p.likesCount || 0}</span>
                    <span>💬 {p.commentsCount || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : reels.length === 0 ? (
        <div className="py-20 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          No reels published yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {reels.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedMedia({ url: r.videoUrl, isVideo: true })}
              className="relative aspect-9/16 rounded-2xl overflow-hidden bg-black cursor-pointer group shadow-xs"
            >
              <video src={r.videoUrl} className="w-full h-full object-cover" muted />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[11px] text-white font-semibold drop-shadow-md">
                <Film className="w-3 h-3" />
                <span>{r.viewsCount || 0} views</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditOpen && <EditProfileModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />}

      {/* Report Modal */}
      {isReportOpen && currentProfile && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          targetType="user"
          targetId={currentProfile.uid}
          targetAuthorId={currentProfile.uid}
          targetAuthorUsername={currentProfile.username}
          targetContentPreview={`User Profile: ${currentProfile.displayName} (@${currentProfile.username})`}
        />
      )}

      {/* 4K Modal */}
      {selectedMedia && (
        <MediaViewer4KModal
          isOpen={true}
          onClose={() => setSelectedMedia(null)}
          mediaUrl={selectedMedia.url}
          mediaType={selectedMedia.isVideo ? 'video' : 'image'}
          is4K={true}
        />
      )}
    </div>
  );
};

export default ProfileView;
