import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Post, UserProfile } from '../../types';
import Avatar from '../common/Avatar';
import MediaViewer4KModal from '../common/MediaViewer4KModal';
import { Search, Sparkles, TrendingUp, Users, Loader2 } from 'lucide-react';

export const ExploreView: React.FC = () => {
  const { navigateToProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; isVideo: boolean } | null>(null);

  useEffect(() => {
    const fetchExploreData = async () => {
      try {
        // 1. Fetch real posts
        const postsSnap = await getDocs(
          query(collection(db, 'posts'), orderBy('likesCount', 'desc'), limit(30))
        );
        const postList = postsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Post)
          .filter((p) => !p.isRemoved);
        setPosts(postList);

        // 2. Fetch real creators
        const usersSnap = await getDocs(
          query(collection(db, 'users'), limit(20))
        );
        const userList = usersSnap.docs
          .map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)
          .filter((u) => u.status !== 'banned');
        setUsers(userList);
      } catch (err) {
        console.error('Error fetching explore data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExploreData();
  }, []);

  const filteredUsers = searchTerm.trim()
    ? users.filter(
        (u) =>
          u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.bio?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const filteredPosts = searchTerm.trim()
    ? posts.filter(
        (p) =>
          p.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.tags?.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : posts;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Search Header */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-3.5 text-zinc-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search authentic creators, topics, tags..."
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
      </div>

      {/* Discovered Creators */}
      {filteredUsers.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
            <Users className="w-4 h-4 text-indigo-500" />
            <span>Creators ({filteredUsers.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredUsers.map((u) => (
              <div
                key={u.uid}
                onClick={() => navigateToProfile(u.uid)}
                className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <Avatar src={u.photoURL} alt={u.displayName} size="md" isOnline={u.isOnline} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">{u.displayName}</span>
                    {u.isVerified && <span className="text-[10px] text-blue-500 font-bold">✓</span>}
                  </div>
                  <span className="text-[11px] text-zinc-500 block truncate">@{u.username}</span>
                  {u.bio && <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{u.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explore Media Bento Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
          <TrendingUp className="w-4 h-4 text-rose-500" />
          <span>Trending Real Creations</span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-xs">Exploring media...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            No creations found matching "{searchTerm}".
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {filteredPosts.map((post) => {
              const mediaUrl = post.mediaUrls?.[0];
              const isVideo = mediaUrl?.includes('.mp4') || mediaUrl?.includes('.webm') || post.mediaType === 'video';
              if (!mediaUrl) return null;

              return (
                <div
                  key={post.id}
                  onClick={() => setSelectedMedia({ url: mediaUrl, isVideo: !!isVideo })}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-950 cursor-pointer group shadow-xs"
                >
                  {isVideo ? (
                    <video src={mediaUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={mediaUrl} alt="Explore" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}

                  {/* 4K Badge */}
                  {post.is4K && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white font-bold text-[9px] backdrop-blur-xs">
                      4K
                    </span>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-3">
                    <span>❤️ {post.likesCount || 0}</span>
                    <span>💬 {post.commentsCount || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4K Viewer Modal */}
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

export default ExploreView;
