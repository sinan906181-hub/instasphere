import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Reel } from '../../types';
import {
  doc,
  updateDoc,
  increment,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Avatar from '../common/Avatar';
import ShareModal from '../common/ShareModal';
import ReportModal from '../common/ReportModal';
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  ShieldAlert,
  Music2,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReelItemProps {
  reel: Reel;
  isActive: boolean;
  onOpenComments: (reel: Reel) => void;
}

export const ReelItem: React.FC<ReelItemProps> = ({ reel, isActive, onOpenComments }) => {
  const { user, profile, setIsAuthModalOpen, navigateToProfile } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
  const [viewsCount, setViewsCount] = useState(reel.viewsCount || 0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Play/pause based on active slide
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.currentTime = 0;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  // Real View Tracking
  useEffect(() => {
    if (!isActive || !reel.id) return;

    const trackRealView = async () => {
      try {
        const viewerKey = user ? user.uid : 'anon_' + Math.random().toString(36).substring(2, 9);
        const q = query(
          collection(db, 'reelViews'),
          where('reelId', '==', reel.id),
          where('viewerId', '==', viewerKey)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          await addDoc(collection(db, 'reelViews'), {
            reelId: reel.id,
            viewerId: viewerKey,
            viewedAt: Date.now()
          });

          await updateDoc(doc(db, 'reels', reel.id), {
            viewsCount: increment(1)
          });
          setViewsCount((prev) => prev + 1);
        }
      } catch (err) {
        console.error('Error recording reel view:', err);
      }
    };

    trackRealView();
  }, [isActive, reel.id, user]);

  // Check like status
  useEffect(() => {
    if (!user) return;
    const checkLiked = async () => {
      try {
        const snap = await getDoc(doc(db, 'reels', reel.id, 'likes', user.uid));
        setLiked(snap.exists());
      } catch (err) {
        console.error('Error checking reel like:', err);
      }
    };
    checkLiked();
  }, [user, reel.id]);

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
        spread: 40,
        origin: { y: 0.7 }
      });
    }

    try {
      const likeRef = doc(db, 'reels', reel.id, 'likes', user.uid);
      const reelRef = doc(db, 'reels', reel.id);

      if (nextState) {
        await setDoc(likeRef, {
          userId: user.uid,
          username: profile?.username || 'user',
          createdAt: Date.now()
        });
        await updateDoc(reelRef, { likesCount: increment(1) });
      } else {
        await deleteDoc(likeRef);
        await updateDoc(reelRef, { likesCount: increment(-1) });
      }
    } catch (err) {
      console.error('Failed to update reel like:', err);
    }
  };

  const handleVideoClick = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative w-full h-full max-w-sm mx-auto rounded-3xl overflow-hidden bg-black shadow-2xl flex items-center justify-center select-none group">
      {/* Background Video */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        loop
        playsInline
        muted={isMuted}
        onClick={handleVideoClick}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Pause indicator overlay */}
      {!isPlaying && (
        <div
          onClick={handleVideoClick}
          className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-10"
        >
          <div className="p-4 rounded-full bg-black/50 backdrop-blur-md text-white">
            <Play className="w-8 h-8 fill-current translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Top Header Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-white">
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          <span>{viewsCount} real views</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:text-rose-400 transition-colors"
            title="Report Reel"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Side Actions Bar */}
      <div className="absolute right-3 bottom-16 flex flex-col items-center gap-5 z-20">
        <button onClick={handleToggleLike} className="flex flex-col items-center gap-1 group/btn">
          <div
            className={`p-3 rounded-full backdrop-blur-md transition-transform active:scale-125 ${
              liked ? 'bg-rose-500/20 text-rose-500' : 'bg-black/40 text-white hover:bg-black/60'
            }`}
          >
            <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow-md">{likesCount}</span>
        </button>

        <button onClick={() => onOpenComments(reel)} className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-transform active:scale-95">
            <MessageCircle className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow-md">{reel.commentsCount || 0}</span>
        </button>

        <button onClick={() => setShowShareModal(true)} className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-transform active:scale-95">
            <Share2 className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow-md">Share</span>
        </button>
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute bottom-4 left-4 right-16 z-20 space-y-2 pointer-events-auto">
        <div
          onClick={() => navigateToProfile(reel.authorId)}
          className="flex items-center gap-2.5 cursor-pointer group/user"
        >
          <Avatar src={reel.authorPhotoURL} alt={reel.authorDisplayName} size="sm" />
          <div className="text-white">
            <div className="text-xs font-bold group-hover/user:underline">{reel.authorDisplayName}</div>
            <div className="text-[10px] text-zinc-300">@{reel.authorUsername}</div>
          </div>
        </div>

        {reel.caption && (
          <p className="text-xs text-white drop-shadow-md line-clamp-2 leading-relaxed">{reel.caption}</p>
        )}

        {reel.audioTitle && (
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full w-fit">
            <Music2 className="w-3 h-3 text-indigo-400 animate-spin" />
            <span className="truncate max-w-[160px]">{reel.audioTitle}</span>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`Reel by @${reel.authorUsername}`}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="reel"
        targetId={reel.id}
        targetAuthorId={reel.authorId}
        targetAuthorUsername={reel.authorUsername}
        targetContentPreview={reel.caption || 'Reel video'}
      />
    </div>
  );
};

export default ReelItem;
