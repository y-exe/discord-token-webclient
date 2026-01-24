import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { FaHashtag, FaMicrophone, FaHeadphones, FaGear, FaChevronLeft } from 'react-icons/fa6';
import { ThemeProvider } from 'next-themes'; 

// コンポーネントインポート
import Login from './components/auth/Login';
import Terms from './components/legal/Terms';
import Privacy from './components/legal/Privacy';
import ServerList from './components/server/ServerList';
import ChannelSidebar from './components/channel/ChannelSidebar';
import MessageContent from './components/chat/MessageContent';
import ReactionList from './components/chat/ReactionList';
import ChatInput from './components/chat/ChatInput';
import WindowHeader from './components/window/WindowHeader';
import MessageEmbed from './components/chat/MessageEmbed';
import ForumView from './components/chat/ForumView'; 
import ImageViewer from './components/chat/ImageViewer';
import UserPopout from './components/overlay/UserPopout';
import MessageContextMenu from './components/overlay/MessageContextMenu';
import MessageToolbar from './components/chat/MessageToolbar';

import { API_URL, getProxyUrl, formatTimestamp } from './utils/helpers';

// Cookie操作用ヘルパー
const setCookie = (name, value, days) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(JSON.stringify(value)) + '; expires=' + expires + '; path=/';
};

const getCookie = (name) => {
  const value = document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
  try { return JSON.parse(value || '[]'); } catch (e) { return []; }
};

export default function App() {
  const [token, setToken] = useState(null);
  const [isBot, setIsBot] = useState(false);

  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("init");
  const [guilds, setGuilds] = useState([]);
  const [currentGuildId, setCurrentGuildId] = useState(null);
  const [channels, setChannels] = useState([]);
  const [currentChannelId, setCurrentChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [guildEmojis, setGuildEmojis] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [userPopout, setUserPopout] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInput, setEditInput] = useState("");
  const [previewData, setPreviewData] = useState({ isOpen: false, images: [], index: 0 });
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [joinedVoiceChannelId, setJoinedVoiceChannelId] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  // ルーティング用のハッシュ状態
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const isInitialLoad = useRef(true);
  const isAtBottom = useRef(true);

  // ハッシュ変更検知
  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    }
  }, []);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 50;
    if (scrollTop === 0 && messages.length > 0 && !loadingOlder) {
      loadOlderMessages();
    }
  };

  const loadOlderMessages = () => {
    if (!currentChannelId || loadingOlder || !socketRef.current) return;
    setLoadingOlder(true);
    const oldestId = messages[0].id;
    const oldScrollHeight = scrollRef.current.scrollHeight;
    socketRef.current.emit('getMessages', { channelId: currentChannelId, before: oldestId }, (newMsgs) => {
      if (newMsgs && newMsgs.length > 0) {
        setMessages(prev => [...newMsgs, ...prev]);
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - oldScrollHeight;
        });
      }
      setLoadingOlder(false);
    });
  };

  const handleUserClick = (e, userId) => {
    e.preventDefault(); e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setUserPopout({ x: rect.right + 10, y: rect.top, userId });
  };

  const handleReaction = (msgId, emoji, isAdd) => {
    if (!currentChannelId || !socketRef.current) return;
    const identifier = emoji.id ? `${emoji.name}:${emoji.id}` : (emoji.name || emoji);
    socketRef.current.emit(isAdd ? 'addReaction' : 'removeReaction', { 
        channelId: currentChannelId, 
        messageId: msgId, 
        emoji: identifier 
    });
  };

  const handleSend = (text) => {
    if (!currentChannelId || !socketRef.current) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    socketRef.current.emit('sendMessage', { channelId: currentChannelId, content: trimmed, reply: replyingTo ? { messageId: replyingTo.id } : null });
    setReplyingTo(null); isAtBottom.current = true;
  };

  const selectGuild = (gid) => {
    if (currentGuildId === gid) return;
    setCurrentGuildId(gid); setCurrentChannelId(null); setMessages([]);
    setShowMobileChat(false);
    socketRef.current.emit('getChannels', gid, setChannels);
    socketRef.current.emit('getGuildEmojis', gid, setGuildEmojis);
  };

  const selectChannel = (ch) => {
    if (ch.type === 'GUILD_VOICE' || ch.type === 'GUILD_STAGE_VOICE' || ch.type === 2 || ch.type === 13) {
        socketRef.current.emit('join-voice', { channelId: ch.id });
        return;
    }
    isInitialLoad.current = true; setCurrentChannelId(ch.id); setMessages([]);
    setShowMobileChat(true);
    if (ch.type !== 'GUILD_FORUM' && ch.type !== 15) {
        socketRef.current.emit('getMessages', ch.id, setMessages);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const t = searchParams.get('token');
    const b = searchParams.get('bot') === 'true';

    if (t) {
      setToken(t);
      setIsBot(b);
    } else {
      setStatus("no-token");
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(API_URL, { transports: ['websocket'] });
    socketRef.current = newSocket;
    setSocket(newSocket);
    
    newSocket.on('connect', () => { 
        newSocket.emit('login', { token, isBot }); 
    });
    
    newSocket.on('login-success', ({ user }) => { 
        setUser(user); 
        setStatus("ready"); 
        newSocket.emit('getGuilds', setGuilds); 

        try {
            const currentHistory = getCookie('discord-client-history');
            const newHistory = [
                { token, id: user.id, username: user.username, avatar: user.avatar, isBot },
                ...currentHistory.filter(h => h.id !== user.id)
            ].slice(0, 5);
            setCookie('discord-client-history', newHistory, 365);
        } catch (e) { console.error("History save failed:", e); }
    });

    newSocket.on('newMessage', (msg) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      if (isAtBottom.current) setTimeout(() => scrollToBottom(true), 100);
    });
    newSocket.on('messageUpdate', (newMsg) => setMessages(prev => prev.map(m => m.id === newMsg.id ? newMsg : m)));
    newSocket.on('messageDelete', ({ id }) => setMessages(prev => prev.filter(m => m.id !== id)));
    newSocket.on('channelsUpdate', (newChannels) => setChannels(newChannels));
    newSocket.on('voice-joined-success', ({ channelId }) => { setJoinedVoiceChannelId(channelId); });
    
    const handleClickOutside = () => { setContextMenu(null); setUserPopout(null); setShowEmojiPicker(false); };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [token, isBot, scrollToBottom]);

  useEffect(() => { if (messages.length > 0 && isInitialLoad.current) { scrollToBottom(false); isInitialLoad.current = false; } }, [messages, scrollToBottom]);

  const allFlattenedChannels = channels.flatMap(c => {
    const mainChs = c.channels || [];
    const threadChs = mainChs.flatMap(mc => mc.threads || []);
    return [...mainChs, ...threadChs];
  });
  const currentChannel = allFlattenedChannels.find(c => c.id === currentChannelId);
  const isForum = currentChannel?.type === 'GUILD_FORUM' || currentChannel?.type === 15;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {(() => {
        // 規約ページ分岐
        if (currentHash === "#terms") return <Terms />;
        if (currentHash === "#privacy") return <Privacy />;

        if (status === "no-token") {
          return <Login />;
        }

        if (status !== "ready") {
          return (
              <div className="h-screen w-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4 font-google">
                  <div className="animate-spin h-10 w-10 border-4 border-[#5865F2] rounded-full border-t-transparent"></div>
                  <p className="font-bold text-lg animate-pulse">Starting Client...</p>
              </div>
          );
        }

        return (
          <div className="flex flex-col h-screen w-screen overflow-hidden text-discord-text font-ggsans bg-discord-bg dark-scrollbar">
            <WindowHeader guild={guilds.find(g => g.id === currentGuildId)} />
            
            <div className="flex flex-1 min-h-0 relative">
              <div className={`
                flex flex-col shrink-0 bg-[#050505] border-r border-discord-border h-full
                w-full md:w-[400px] ${showMobileChat ? 'hidden md:flex' : 'flex'}
              `}>
                <div className="flex flex-1 min-h-0">
                  <ServerList guilds={guilds} currentGuildId={currentGuildId} onSelect={selectGuild} />
                  <div className="flex-1 min-w-0">
                    <ChannelSidebar 
                      currentGuild={guilds.find(g => g.id === currentGuildId)} 
                      channels={channels} 
                      currentChannelId={currentChannelId} 
                      onSelectChannel={selectChannel} 
                      joinedVoiceChannelId={joinedVoiceChannelId} 
                      onLeaveVoice={() => socketRef.current.emit('leave-voice')}
                    />
                  </div>
                </div>

                <div className="bg-[#050505] h-[52px] px-2 flex items-center shrink-0 border-t border-discord-border select-none">
                  <div className="flex items-center p-1 rounded hover:bg-[#1c1d1f] cursor-pointer mr-auto min-w-0 group transition-all" onClick={(e) => handleUserClick(e, user?.id)}>
                    <div className="relative w-8 h-8 rounded-full overflow-hidden mr-2 bg-gray-800 shrink-0">
                      <img src={getProxyUrl(user?.avatar)} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-discord-green rounded-full border-[2px] border-[#050505]"></div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-[13px] truncate group-hover:underline leading-tight">{user?.username}</div>
                      <div className="text-[11px] text-discord-muted truncate leading-tight">オンライン</div>
                    </div>
                  </div>
                  <div className="flex text-[#b5bac1]">
                     <button className="w-8 h-8 flex items-center justify-center hover:bg-[#1c1d1f] rounded transition-colors"><FaMicrophone size={14}/></button>
                     <button className="w-8 h-8 flex items-center justify-center hover:bg-[#1c1d1f] rounded transition-colors"><FaHeadphones size={16}/></button>
                     <button className="w-8 h-8 flex items-center justify-center hover:bg-[#1c1d1f] rounded transition-colors"><FaGear size={14}/></button>
                  </div>
                </div>
              </div>

              <div className={`
                flex-1 flex flex-col min-w-0 bg-discord-bg h-full
                ${showMobileChat ? 'flex' : 'hidden md:flex'}
              `}>
                {isForum ? (
                  <ForumView threads={currentChannel.threads || []} channelName={currentChannel.name} onSelectThread={selectChannel} onBack={() => setShowMobileChat(false)} />
                ) : (
                  <div className="flex-1 flex flex-col min-w-0 relative h-full">
                    <header className="h-12 px-4 flex items-center border-b border-discord-border shrink-0 shadow-sm gap-2">
                       <button onClick={() => setShowMobileChat(false)} className="md:hidden text-discord-muted hover:text-white p-2">
                         <FaChevronLeft size={20} />
                       </button>
                       <FaHashtag className="text-discord-muted text-xl" />
                       <h3 className="font-bold text-white truncate">{currentChannel?.name || "チャンネル"}</h3>
                    </header>
                    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col px-4 pt-4 select-text">
                       {loadingOlder && <div className="text-center py-4 text-xs text-discord-muted animate-pulse">過去のログを読み込み中...</div>}
                       {messages.map((m) => {
                         const isMe = m.author.id === user?.id;
                         const nameColor = (m.author.color && m.author.color !== '#000000') ? m.author.color : '#ffffff';
                         return (
                           <div key={m.id} className="group relative -mx-4 px-4 py-1 hover:bg-discord-hover transition-colors" onContextMenu={(e)=>setContextMenu({x: e.pageX, y: e.pageY, message: m})} onMouseEnter={()=>setHoveredMessageId(m.id)} onMouseLeave={()=>setHoveredMessageId(null)}>
                              {hoveredMessageId === m.id && <MessageToolbar message={m} isMe={isMe} onReaction={handleReaction} onReply={(msg) => setReplyingTo({id: msg.id, username: msg.author.username})} onEdit={(msg) => {setEditingMessageId(msg.id); setEditInput(msg.content);}} onOpenMenu={(e)=>setContextMenu({x: e.pageX, y: e.pageY, message: m})} onReactionOpen={(e)=>setShowEmojiPicker(true)} />}
                              <div className="flex gap-4">
                                 <img src={getProxyUrl(m.author.avatar)} className="w-10 h-10 rounded-full shrink-0 cursor-pointer" onClick={(e) => handleUserClick(e, m.author.id)} />
                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                       <span className="font-bold hover:underline cursor-pointer" style={{color: nameColor}} onClick={(e) => handleUserClick(e, m.author.id)}>{m.author.displayName}</span>
                                       <span className="text-xs text-discord-muted font-medium">{formatTimestamp(m.timestamp)}</span>
                                    </div>
                                    {editingMessageId === m.id ? (
                                       <div className="bg-discord-element p-2 rounded mt-1 border border-discord-border">
                                         <textarea className="bg-transparent w-full text-discord-text outline-none p-1 resize-none" rows={editInput.split('\n').length || 1} value={editInput} onChange={e=>setEditInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); socketRef.current.emit('editMessage', { channelId: currentChannelId, messageId: m.id, content: editInput }); setEditingMessageId(null);}}} autoFocus />
                                       </div>
                                    ) : ( <MessageContent content={m.content} /> )}
                                    <div className="flex flex-wrap gap-2 mt-1">
                                       {m.attachments?.map((att, idx) => <img key={idx} src={getProxyUrl(att.url)} className="rounded max-w-[400px] max-h-[300px] cursor-pointer" onClick={() => setPreviewData({ isOpen: true, images: m.attachments.map(a=>a.url), index: idx })} />)}
                                    </div>
                                    {m.embeds?.map((e, idx) => <MessageEmbed key={idx} embed={e} />)}
                                    <ReactionList reactions={m.reactions} onReactionClick={(emoji, nextIsAdd) => handleReaction(m.id, emoji, nextIsAdd)} />
                                 </div>
                              </div>
                           </div>
                         );
                       })}
                       <div ref={messagesEndRef} className="h-6 shrink-0" />
                    </div>
                    <ChatInput channelName={currentChannel?.name} disabled={!currentChannelId} replyingTo={replyingTo} onSend={handleSend} onCancelReply={() => setReplyingTo(null)} onEmojiClick={()=>setShowEmojiPicker(true)} />
                  </div>
                )}
              </div>
            </div>
            {previewData.isOpen && <ImageViewer images={previewData.images} initialIndex={previewData.index} onClose={() => setPreviewData({ ...previewData, isOpen: false })} />}
            {userPopout && <UserPopout userId={userPopout.userId} guildId={currentGuildId} x={userPopout.x} y={userPopout.y} socket={socketRef.current} onClose={()=>setUserPopout(null)} />}
            {contextMenu && <MessageContextMenu x={contextMenu.x} y={contextMenu.y} message={contextMenu.message} currentUser={user} onClose={() => setContextMenu(null)} onReaction={handleReaction} onDelete={(id) => socketRef.current.emit('deleteMessage', { channelId: currentChannelId, messageId: id })} />}
          </div>
        );
      })()}
    </ThemeProvider>
  );
}