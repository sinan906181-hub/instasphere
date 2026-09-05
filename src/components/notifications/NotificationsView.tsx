import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { NotificationItem } from '../../types';
import { formatTimeAgo } from '../../utils/media';
import Avatar from '../common/Avatar';
import { Bell, Heart, MessageCircle, UserPlus, ShieldAlert, Check } from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const { user, navigateToProfile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationItem);
        setNotifications(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching notifications:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const unread = notifications.filter((n) => !n.read);
      for (const n of unread) {
        await updateDoc(doc(db, 'notifications', n.id), { read: true });
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like_post':
      case 'like_reel':
        return <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />;
      case 'comment_post':
      case 'comment_reel':
        return <MessageCircle className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500" />;
      case 'follow':
        return <UserPlus className="w-3.5 h-3.5 text-emerald-500" />;
      case 'mention':
        return <Bell className="w-3.5 h-3.5 text-purple-500" />;
      case 'admin_alert':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getActivityText = (n: NotificationItem) => {
    switch (n.type) {
      case 'like_post':
        return 'liked your post';
      case 'like_reel':
        return 'liked your reel';
      case 'comment_post':
        return 'commented on your post';
      case 'comment_reel':
        return 'commented on your reel';
      case 'follow':
        return 'started following you';
      case 'mention':
        return 'mentioned you in a post';
      case 'admin_alert':
        return 'Administrative update regarding your account';
      default:
        return 'interacted with your profile';
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-20">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">Notifications</h2>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            <Check className="w-3.5 h-3.5" /> Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800">
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center text-xs text-zinc-400 px-6">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">No notifications yet</p>
            <p className="text-[11px] text-zinc-400 mt-1">When someone interacts with your posts or follows you, you'll see it here.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                !n.read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <Avatar src={n.senderPhotoURL} alt={n.senderDisplayName} size="md" />
                  <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-zinc-900 shadow-xs">
                    {getIcon(n.type)}
                  </span>
                </div>

                <div className="text-xs min-w-0">
                  <p className="text-zinc-900 dark:text-white leading-snug">
                    <span
                      onClick={() => navigateToProfile(n.senderId)}
                      className="font-bold hover:underline cursor-pointer"
                    >
                      {n.senderDisplayName}
                    </span>{' '}
                    <span className="text-zinc-600 dark:text-zinc-300">{getActivityText(n)}</span>
                  </p>
                  {n.previewText && (
                    <p className="text-[11px] text-zinc-500 truncate max-w-xs mt-0.5">"{n.previewText}"</p>
                  )}
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">{formatTimeAgo(n.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsView;
