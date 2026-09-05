import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Post } from '../../types';
import {
  doc,
  updateDoc,
  increment,
  setDoc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatTimeAgo } from '../../utils/media';
import Avatar from '../common/Avatar';
import ShareModal from '../common/ShareModal';
import ReportModal from '../common/ReportModal';
import MediaViewer4KModal from '../common/MediaViewer4KModal';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Sparkles,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PostCardProps {
  post: Post;
  onOpenComments: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onOpenComments }) => {
  const { user, profile, setIsAuthModalOpen, navigateToProfile } = useAuth();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [currentMediaIdx, setCurrentMediaIdx] = useState(0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [show4KViewer, setShow4KViewer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Real like status check
  useEffect(() => {
    if (!user) return;
    const checkLiked = async () => {
      try {
        const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);
        const snap = await getDoc(likeRef);
        setLiked(snap.exists());
      } catch (err) {
        console.error('Error checking like status:', err);
      }
    };
    checkLiked();
  }, [user, post.id]);

  // Real like action
  const handleToggleLike = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const nextState = !liked;
    setLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    if (nextState) {
      confetti({
        particleCount: 20,
        spread: 50,
        origin: { y: 0.7 }
      });
    }

    try {
      const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);
      const postRef = doc(db, 'posts', post.id);

      if (nextState) {
        await setDoc(likeRef, {
          userId: user.uid,
          username: profile?.username || 'user',
          createdAt: Date.now()
        });
        await updateDoc(postRef, { likesCount: increment(1) });
      } else {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      }
    } catch (err) {
      console.error('Failed to update like:', err);
    }
  };

  // Double tap to like
  const handleDoubleTap = () => {
    if (!liked) {
      handleToggleLike();
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 900);
  };

  const currentMediaUrl = post.mediaUrls?.[currentMediaIdx] || '';
  const isVideo = currentMediaUrl.includes('.mp4') || currentMediaUrl.includes('.webm') || post.mediaType === 'video';

  return (
    <article className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-xs transition-colors">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div
          onClick={() => navigateToProfile(post.authorId)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <Avatar src={post.authorPhotoURL} alt={post.authorDisplayName} size="md" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {post.authorDisplayName}
              </span>
              {post.is4K && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-linear-to-r from-amber-500 to-rose-500 text-white font-black text-[9px] tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" /> 4K
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span>@{post.authorUsername}</span>
              <span>·</span>
              <span>{formatTimeAgo(post.createdAt)}</span>
              {post.location && (
                <>
                  <span>·</span>
                  <span className="truncate max-w-[120px]">{post.location}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1 z-30 text-xs animate-in fade-in"
              onClick={() => setMenuOpen(false)}
            >
              <button
                onClick={() => setShowShareModal(true)}
                className="w-full px-4 py-2 flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left"
              >
                <Share2 className="w-4 h-4" /> Share Post
              </button>
              <button
                onClick={() => setShow4KViewer(true)}
                className="w-full px-4 py-2 flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left"
              >
                <Sparkles className="w-4 h-4 text-amber-500" /> View in 4K Fullscreen
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="w-full px-4 py-2 flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left font-medium"
              >
                <ShieldAlert className="w-4 h-4" /> Report Post
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Media Canvas Area */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div
          className="relative aspect-square sm:aspect-4/3 w-full bg-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer"
          onDoubleClick={handleDoubleTap}
        >
          {isVideo ? (
            <video
              src={currentMediaUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={currentMediaUrl}
              alt="Post media"
              className="w-full h-full object-cover"
            />
          )}

          {/* Double Tap Floating Heart Animation */}
          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <Heart className="w-24 h-24 text-rose-500 fill-rose-500 animate-heart-burst drop-shadow-2xl" />
            </div>
          )}

          {/* Multi-image pagination arrows */}
          {post.mediaUrls.length > 1 && (
            <>
              {currentMediaIdx > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMediaIdx((prev) => prev - 1);
                  }}
                  className="absolute left-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {currentMediaIdx < post.mediaUrls.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMediaIdx((prev) => prev + 1);
                  }}
                  className="absolute right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              {/* Dots */}
              <div className="absolute bottom-3 flex items-center gap-1.5 z-10">
                {post.mediaUrls.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentMediaIdx ? 'w-4 bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Post Action Buttons */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-1.5 transition-transform active:scale-125 ${
                liked ? 'text-rose-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-rose-500'
              }`}
            >
              <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
              <span className="text-xs font-bold">{likesCount}</span>
            </button>

            <button
              onClick={() => onOpenComments(post)}
              className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs font-bold">{post.commentsCount || 0}</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Share2 className="w-6 h-6" />
            </button>
          </div>

          <button
            onClick={() => setSaved(!saved)}
            className={`transition-colors ${
              saved ? 'text-amber-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Bookmark className={`w-6 h-6 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Likes summary */}
        {likesCount > 0 && (
          <div className="text-xs font-bold text-zinc-900 dark:text-white">
            {likesCount} {likesCount === 1 ? 'like' : 'likes'}
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
            <span
              onClick={() => navigateToProfile(post.authorId)}
              className="font-bold text-zinc-900 dark:text-white mr-2 cursor-pointer hover:underline"
            >
              @{post.authorUsername}
            </span>
            {post.caption}
          </div>
        )}

        {/* View all comments link */}
        {(post.commentsCount || 0) > 0 ? (
          <button
            onClick={() => onOpenComments(post)}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:underline block"
          >
            View all {post.commentsCount} comments
          </button>
        ) : (
          <button
            onClick={() => onOpenComments(post)}
            className="text-xs text-zinc-400 dark:text-zinc-500 hover:underline block"
          >
            Add the first comment...
          </button>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`Post by @${post.authorUsername}`}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="post"
        targetId={post.id}
        targetAuthorId={post.authorId}
        targetAuthorUsername={post.authorUsername}
        targetContentPreview={post.caption || 'Post media'}
      />

      {/* 4K Modal */}
      <MediaViewer4KModal
        isOpen={show4KViewer}
        onClose={() => setShow4KViewer(false)}
        mediaUrl={currentMediaUrl}
        mediaType={isVideo ? 'video' : 'image'}
        is4K={post.is4K}
        resolution={post.resolution}
      />
    </article>
  );
};

export default PostCard;
