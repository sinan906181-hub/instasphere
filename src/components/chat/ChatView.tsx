import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ChatConversation, ChatMessage, UserProfile } from '../../types';
import { uploadMediaFile, formatTimeAgo } from '../../utils/media';
import Avatar from '../common/Avatar';
import EmojiPicker from '../common/EmojiPicker';
import {
  Send,
  Image as ImageIcon,
  Mic,
  Smile,
  Search,
  Check,
  CheckCheck,
  StopCircle,
  Loader2
} from 'lucide-react';

export const ChatView: React.FC = () => {
  const { user, profile, setIsAuthModalOpen } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [discoveredUsers, setDiscoveredUsers] = useState<UserProfile[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTimestamp', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatConversation);
        setConversations(list);
        if (!activeChat && list.length > 0) {
          setActiveChat(list[0]);
        }
      },
      (err) => {
        console.error('Error fetching conversations:', err);
      }
    );

    return () => unsub();
  }, [user]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'conversations', activeChat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage);
      setMessages(list);
    });

    return () => unsub();
  }, [activeChat]);

  // Search real users to start new chat
  useEffect(() => {
    if (!userSearchTerm.trim() || !user) {
      setDiscoveredUsers([]);
      return;
    }

    const searchUsers = async () => {
      try {
        const q = query(collection(db, 'users'));
        const snap = await getDocs(q);
        const users = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)
          .filter(
            (u) =>
              u.uid !== user.uid &&
              (u.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                u.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()))
          );
        setDiscoveredUsers(users);
      } catch (err) {
        console.error('Error searching users:', err);
      }
    };

    searchUsers();
  }, [userSearchTerm, user]);

  const startConversationWith = async (targetUser: UserProfile) => {
    if (!user) return;

    // Check if conversation already exists
    const existing = conversations.find((c) => c.participants.includes(targetUser.uid));
    if (existing) {
      setActiveChat(existing);
      setUserSearchTerm('');
      setDiscoveredUsers([]);
      return;
    }

    // Create new conversation
    const newConvRef = doc(collection(db, 'conversations'));
    const newConv: ChatConversation = {
      id: newConvRef.id,
      participants: [user.uid, targetUser.uid],
      participantDetails: {
        [user.uid]: {
          displayName: profile?.displayName || 'User',
          username: profile?.username || 'user',
          photoURL: profile?.photoURL
        },
        [targetUser.uid]: {
          displayName: targetUser.displayName,
          username: targetUser.username,
          photoURL: targetUser.photoURL
        }
      },
      lastMessage: 'Conversation started',
      lastMessageTimestamp: Date.now(),
      unreadCount: {
        [user.uid]: 0,
        [targetUser.uid]: 1
      },
      createdAt: Date.now()
    };

    await setDoc(newConvRef, newConv);
    setActiveChat(newConv);
    setUserSearchTerm('');
    setDiscoveredUsers([]);
  };

  // Send text message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChat || !textInput.trim()) return;

    const messageText = textInput.trim();
    setTextInput('');
    setShowEmoji(false);

    try {
      const otherParticipantId = activeChat.participants.find((p) => p !== user.uid) || '';

      await addDoc(collection(db, 'conversations', activeChat.id, 'messages'), {
        senderId: user.uid,
        senderUsername: profile?.username || 'user',
        text: messageText,
        timestamp: Date.now(),
        isRead: false
      });

      // Update conversation header
      await setDoc(
        doc(db, 'conversations', activeChat.id),
        {
          lastMessage: messageText,
          lastMessageTimestamp: Date.now(),
          unreadCount: {
            [otherParticipantId]: ((activeChat.unreadCount?.[otherParticipantId] || 0) + 1)
          }
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Send image in chat
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user || !activeChat) return;
    const file = e.target.files[0];
    setUploadingImage(true);

    try {
      const uploadRes = await uploadMediaFile(file, 'chat');
      const otherParticipantId = activeChat.participants.find((p) => p !== user.uid) || '';

      await addDoc(collection(db, 'conversations', activeChat.id, 'messages'), {
        senderId: user.uid,
        senderUsername: profile?.username || 'user',
        mediaUrl: uploadRes.url,
        mediaType: 'image',
        timestamp: Date.now(),
        isRead: false
      });

      await setDoc(
        doc(db, 'conversations', activeChat.id),
        {
          lastMessage: '📷 Sent an image',
          lastMessageTimestamp: Date.now(),
          unreadCount: {
            [otherParticipantId]: ((activeChat.unreadCount?.[otherParticipantId] || 0) + 1)
          }
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to send chat image:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  // Real Voice Message Recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

        try {
          if (activeChat && user) {
            const uploadRes = await uploadMediaFile(audioFile, 'chat');
            const otherParticipantId = activeChat.participants.find((p) => p !== user.uid) || '';

            await addDoc(collection(db, 'conversations', activeChat.id, 'messages'), {
              senderId: user.uid,
              senderUsername: profile?.username || 'user',
              mediaUrl: uploadRes.url,
              mediaType: 'audio',
              timestamp: Date.now(),
              isRead: false
            });

            await setDoc(
              doc(db, 'conversations', activeChat.id),
              {
                lastMessage: '🎤 Voice message',
                lastMessageTimestamp: Date.now(),
                unreadCount: {
                  [otherParticipantId]: ((activeChat.unreadCount?.[otherParticipantId] || 0) + 1)
                }
              },
              { merge: true }
            );
          }
        } catch (err) {
          console.error('Failed to send audio note:', err);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Audio recording not supported or permitted:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  if (!user) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center p-6">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Direct Messages</h3>
        <p className="text-xs text-zinc-500 mt-1 mb-4">Sign in to connect in real time with creators.</p>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-full"
        >
          Sign In
        </button>
      </div>
    );
  }

  const otherParticipant = activeChat?.participants.find((p) => p !== user.uid);
  const activeChatDetails = otherParticipant && activeChat?.participantDetails?.[otherParticipant];

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-6rem)] flex border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
      {/* Sidebar: Conversations & User Discovery */}
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/40">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Messages</h2>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              placeholder="Search or start new chat..."
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* User Search Results */}
        {userSearchTerm.trim() ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 px-3 uppercase">Found Users</span>
            {discoveredUsers.length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-400">No users found</div>
            ) : (
              discoveredUsers.map((u) => (
                <div
                  key={u.uid}
                  onClick={() => startConversationWith(u)}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-800/80 cursor-pointer transition-colors"
                >
                  <Avatar src={u.photoURL} alt={u.displayName} size="sm" isOnline={u.isOnline} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{u.displayName}</p>
                    <p className="text-[11px] text-zinc-500 truncate">@{u.username}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Conversation List */
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center py-16 text-xs text-zinc-400 px-4">
                No active conversations. Search above to start chatting with real creators!
              </div>
            ) : (
              conversations.map((conv) => {
                const otherUid = conv.participants.find((p) => p !== user.uid) || '';
                const details = conv.participantDetails?.[otherUid];
                const isSelected = activeChat?.id === conv.id;
                const unread = conv.unreadCount?.[user.uid] || 0;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveChat(conv)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-zinc-800 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80'
                        : 'hover:bg-white/60 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <Avatar src={details?.photoURL} alt={details?.displayName} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {details?.displayName || 'User'}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {formatTimeAgo(conv.lastMessageTimestamp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[140px]">
                          {conv.lastMessage}
                        </p>
                        {unread > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Main Chat Box */}
      {activeChat ? (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900">
          {/* Chat Header */}
          <div className="p-3.5 px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar src={activeChatDetails?.photoURL} alt={activeChatDetails?.displayName} size="sm" />
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  {activeChatDetails?.displayName || 'Chat'}
                </h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  @{activeChatDetails?.username || 'user'}
                </p>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {messages.map((m) => {
              const isMine = m.senderId === user.uid;
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs ${
                      isMine
                        ? 'bg-indigo-600 text-white rounded-tr-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-tl-xs'
                    }`}
                  >
                    {/* Media Type: Image */}
                    {m.mediaType === 'image' && m.mediaUrl && (
                      <img src={m.mediaUrl} alt="Chat attachment" className="rounded-xl max-h-60 mb-1 object-cover" />
                    )}

                    {/* Media Type: Audio / Voice note */}
                    {m.mediaType === 'audio' && m.mediaUrl && (
                      <div className="py-1">
                        <audio src={m.mediaUrl} controls className="h-8 max-w-[220px]" />
                      </div>
                    )}

                    {/* Text Message */}
                    {m.text && <p className="leading-relaxed break-words">{m.text}</p>}

                    <div
                      className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${
                        isMine ? 'text-indigo-200' : 'text-zinc-400'
                      }`}
                    >
                      <span>{new Date(m.timestamp || m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMine && (m.isRead ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 relative bg-zinc-50/50 dark:bg-zinc-950/40">
            {showEmoji && (
              <div className="absolute bottom-16 left-4 z-20">
                <EmojiPicker
                  onSelect={(emoji) => {
                    setTextInput((prev) => prev + emoji);
                    setShowEmoji(false);
                  }}
                  onClose={() => setShowEmoji(false)}
                />
              </div>
            )}

            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            {isRecording ? (
              <div className="flex items-center justify-between p-2 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400">
                <div className="flex items-center gap-2 text-xs font-semibold pl-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Recording Voice Note ({recordingDuration}s)...</span>
                </div>
                <button
                  onClick={stopVoiceRecording}
                  className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                >
                  <StopCircle className="w-4 h-4" /> Send Voice
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmoji(!showEmoji)}
                  className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Smile className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Record voice note"
                >
                  <Mic className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Message..."
                  className="flex-1 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />

                <button
                  type="submit"
                  disabled={!textInput.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full disabled:opacity-40 transition-transform active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-400">
          <p className="text-xs">Select a conversation or start a new direct message.</p>
        </div>
      )}
    </div>
  );
};

export default ChatView;
