export type PrivacyLevel = 'everyone' | 'followers' | 'nobody';

export type MediaResolutionQuality = '4k' | '2k' | '1080p' | '720p' | 'auto';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string; // unique lowercase handle
  photoURL?: string;
  coverURL?: string;
  coverPhotoURL?: string;
  bio?: string;
  website?: string;
  location?: string;
  isPrivate?: boolean;
  isVerified?: boolean;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isOnline?: boolean;
  lastSeen?: number;
  createdAt: number;
  updatedAt?: number;
  
  // Real Admin & Moderation Status
  status?: 'active' | 'suspended' | 'banned';
  role?: 'user' | 'admin' | 'moderator';
  banReason?: string;
  banExpiresAt?: number | null; // null for permanent ban
  bannedAt?: number;
  bannedBy?: string;
  suspendedAt?: number;
  suspensionDuration?: string;

  privacy?: {
    whoCanMessage: PrivacyLevel;
    whoCanComment: PrivacyLevel;
    whoCanViewStories: PrivacyLevel;
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    readReceipts: boolean;
    isPrivateAccount: boolean;
    mediaStreamingQuality?: MediaResolutionQuality;
  };
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL?: string;
  caption: string;
  mediaUrls: string[];
  mediaType: 'image' | 'video' | 'mixed';
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount?: number;
  is4K?: boolean;
  resolution?: string; // e.g. '3840x2160'
  isFollowersOnly?: boolean;
  tags?: string[];
  location?: string;
  
  // Moderation state
  isRemoved?: boolean;
  removedReason?: string;
  removedAt?: number;
  removedBy?: string;

  createdAt: number;
  updatedAt?: number;
}

export interface Reel {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption: string;
  audioTitle?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount?: number;
  is4K?: boolean;
  resolution?: string;
  isFollowersOnly?: boolean;

  // Moderation state
  isRemoved?: boolean;
  removedReason?: string;
  removedAt?: number;
  removedBy?: string;

  createdAt: number;
}

export interface Story {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL?: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'text';
  caption?: string;
  bgGradient?: string;
  viewsCount?: number;
  viewersCount?: number;
  is4K?: boolean;
  isCloseFriendsOnly?: boolean;

  // Moderation state
  isRemoved?: boolean;
  removedReason?: string;
  removedAt?: number;
  removedBy?: string;

  createdAt: number;
  expiresAt: number; // 24 hours from creation
}

export interface StoryViewerRecord {
  id: string;
  storyId: string;
  viewerId: string;
  viewerUsername: string;
  viewerDisplayName: string;
  viewerPhotoURL?: string;
  viewedAt: number;
}

export interface Comment {
  id: string;
  postId?: string;
  reelId?: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL?: string;
  text: string;
  likesCount: number;
  replyToId?: string;
  replyToUsername?: string;
  createdAt: number;
  isRemoved?: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string; // recipient
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderPhotoURL?: string;
  type: 'like_post' | 'like_reel' | 'comment_post' | 'comment_reel' | 'follow' | 'mention' | 'admin_alert';
  targetId?: string;
  previewText?: string;
  read: boolean;
  createdAt: number;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterUsername: string;
  targetType: 'post' | 'reel' | 'story' | 'user' | 'comment';
  targetId: string;
  targetAuthorId?: string;
  targetAuthorUsername?: string;
  targetContentPreview?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
  actionTaken?: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action:
    | 'ban_user'
    | 'suspend_user'
    | 'unban_user'
    | 'delete_user'
    | 'sanitize_profile'
    | 'remove_post'
    | 'restore_post'
    | 'remove_reel'
    | 'restore_reel'
    | 'remove_story'
    | 'remove_comment'
    | 'resolve_report'
    | 'dismiss_report'
    | 'cleanup_demo_data'
    | 'system_config_change';
  targetType: 'user' | 'post' | 'reel' | 'story' | 'comment' | 'report' | 'system';
  targetId: string;
  targetIdentifier?: string; // username, post caption preview, etc.
  reason?: string;
  duration?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface UserNote {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  photoURL?: string;
  text: string;
  emoji?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Highlight {
  id: string;
  userId: string;
  title: string;
  coverUrl: string;
  storyIds: string[];
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName?: string;
  senderPhotoURL?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'none';
  createdAt?: number;
  timestamp?: number;
  readBy?: string[];
  isRead?: boolean;
}

export interface ChatConversation {
  id: string;
  participants: string[]; // user UIDs
  participantDetails?: Record<string, { username: string; displayName: string; photoURL?: string }>;
  lastMessage?: string;
  lastMessageTimestamp?: number;
  lastSenderId?: string;
  unreadCount?: Record<string, number>;
  createdAt: number;
}

export interface BlockItem {
  id: string;
  blockedUserId: string;
  blockedUsername: string;
  createdAt: number;
}
