import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaHashtag, FaMicrophone, FaHeadphones, FaGear, FaChevronLeft } from 'react-icons/fa6';

import ServerList from './server/ServerList';
import ChannelSidebar from './channel/ChannelSidebar';
import MessageContent from './chat/MessageContent';
import ReactionList from './chat/ReactionList';
import ChatInput from './chat/ChatInput';
import WindowHeader from './window/WindowHeader';
import MessageEmbed from './chat/MessageEmbed';
import ForumView from './chat/ForumView'; 
import ImageViewer from './chat/ImageViewer';
import UserPopout from './overlay/UserPopout';
import MessageContextMenu from './overlay/MessageContextMenu';
import MessageToolbar from './chat/MessageToolbar';
import { getProxyUrl, formatTimestamp } from '../utils/helpers';

export default function DiscordClient({ socket, user }) {
    const { guildId: paramGuildId = '@me', channelId: paramChannelId } = useParams();
    const navigate = useNavigate();
    
    const [guilds, setGuilds] = useState([]);
    const [channels, setChannels] = useState([]);
    const [messages, setMessages] = useState([]);
    const [guildEmojis, setGuildEmojis] = useState([]);
    const [showMobileChat, setShowMobileChat] = useState(!!paramChannelId);
    
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

    const scrollRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback((smooth = false) => {
        if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    }, []);

    useEffect(() => {
        if (!socket) return;
        socket.emit('getGuilds', setGuilds);
    }, [socket]);

    useEffect(() => {
        if (!socket || !paramGuildId) return;
        
        setChannels([]);
        
        socket.emit('getChannels', paramGuildId, (data) => {
            setChannels(data);
        });

        if (paramGuildId !== '@me') {
            socket.emit('getGuildEmojis', paramGuildId, setGuildEmojis);
        } else {
            setGuildEmojis([]);
        }

        if (!paramChannelId) setShowMobileChat(false);
    }, [socket, paramGuildId]);

    useEffect(() => {
        if (!socket || !paramChannelId) {
            setMessages([]);
            return;
        }
        setShowMobileChat(true);
        setMessages([]);
        socket.emit('getMessages', paramChannelId, (msgs) => {
            setMessages(msgs);
            setTimeout(() => scrollToBottom(false), 50);
        });
    }, [socket, paramChannelId, scrollToBottom]);

    useEffect(() => {
        if (!socket) return;

        const onNewMsg = (msg) => { 
            if (msg.channelId === paramChannelId) { 
                setMessages(p => (p.some(m => m.id === msg.id) ? p : [...p, msg])); 
                setTimeout(() => scrollToBottom(true), 100); 
            }
        };
        const onUpdMsg = (msg) => { if (msg.channelId === paramChannelId) setMessages(p => p.map(m => m.id === msg.id ? msg : m)); };
        const onDelMsg = ({ id }) => setMessages(p => p.filter(m => m.id !== id));
        const onChannelsUpd = (data) => setChannels(data);

        socket.on('newMessage', onNewMsg);
        socket.on('messageUpdate', onUpdMsg);
        socket.on('messageDelete', onDelMsg);
        socket.on('channelsUpdate', onChannelsUpd);

        return () => {
            socket.off('newMessage', onNewMsg);
            socket.off('messageUpdate', onUpdMsg);
            socket.off('messageDelete', onDelMsg);
            socket.off('channelsUpdate', onChannelsUpd);
        };
    }, [socket, paramChannelId, scrollToBottom]);

    const handleScroll = (e) => {
        const { scrollTop } = e.currentTarget;
        if (scrollTop === 0 && messages.length > 0 && !loadingOlder) {
            setLoadingOlder(true);
            const oldestId = messages[0].id;
            const oldScrollHeight = scrollRef.current.scrollHeight;
            socket.emit('getMessages', { channelId: paramChannelId, before: oldestId }, (newMsgs) => {
                if (newMsgs && newMsgs.length > 0) {
                    setMessages(prev => [...newMsgs, ...prev]);
                    requestAnimationFrame(() => {
                        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - oldScrollHeight;
                    });
                }
                setLoadingOlder(false);
            });
        }
    };

    const allFlattenedChannels = channels.flatMap(c => [...(c.channels || []), ...(c.channels?.flatMap(mc => mc.threads || []) || [])]);
    const currentChannel = allFlattenedChannels.find(c => c.id === paramChannelId);
    const isForum = currentChannel?.type === 'GUILD_FORUM' || currentChannel?.type === 15;
    const currentGuildData = paramGuildId === '@me' ? { id: '@me', name: "ダイレクトメッセージ" } : guilds.find(g => g.id === paramGuildId);

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden text-discord-text font-ggsans bg-discord-bg dark-scrollbar" onClick={() => { setContextMenu(null); setUserPopout(null); setShowEmojiPicker(false); }}>
            <WindowHeader guild={currentGuildData} />
            <div className="flex flex-1 min-h-0 relative">
                <div className={`flex flex-col shrink-0 bg-[#050505] border-r border-discord-border h-full w-full md:w-[400px] ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex flex-1 min-h-0">
                        <ServerList guilds={guilds} currentGuildId={paramGuildId} onSelect={(gid) => navigate(`/${gid}`)} />
                        <div className="flex-1 min-w-0">
                            <ChannelSidebar currentGuild={currentGuildData} channels={channels} currentChannelId={paramChannelId} onSelectChannel={(ch) => navigate(`/${paramGuildId}/${ch.id}`)} joinedVoiceChannelId={joinedVoiceChannelId} onLeaveVoice={() => socket.emit('leave-voice')} />
                        </div>
                    </div>
                    <div className="bg-[#050505] h-[52px] px-2 flex items-center shrink-0 border-t border-discord-border select-none">
                        <div className="flex items-center p-1 rounded hover:bg-[#1c1d1f] cursor-pointer mr-auto min-w-0 group transition-all" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setUserPopout({ x: e.pageX, y: e.pageY - 200, userId: user.id }); }}>
                            <div className="relative w-8 h-8 rounded-full overflow-hidden mr-2 bg-gray-800 shrink-0">
                                <img src={getProxyUrl(user?.avatar)} className="w-full h-full object-cover" alt="" />
                                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 bg-discord-green rounded-full border-[2px] border-[#050505]`}></div>
                            </div>
                            <div className="min-w-0"><div className="font-bold text-white text-[13px] truncate group-hover:underline leading-tight">{user?.username}</div><div className="text-[11px] text-discord-muted truncate leading-tight">オンライン</div></div>
                        </div>
                        <div className="flex text-[#b5bac1]"><button className="w-8 h-8 flex items-center justify-center hover:bg-[#1c1d1f] rounded transition-colors"><FaMicrophone size={14}/></button><button className="w-8 h-8 flex items-center justify-center hover:bg-[#1c1d1f] rounded transition-colors"><FaHeadphones size={16}/></button><button className="w-8 h-8 flex items-center justify-center hover:bg-[#1c1d1f] rounded transition-colors"><FaGear size={14}/></button></div>
                    </div>
                </div>
                <div className={`flex-1 flex flex-col min-w-0 bg-discord-bg h-full ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
                    {isForum ? (
                        <ForumView threads={currentChannel.threads || []} channelName={currentChannel.name} onSelectThread={(ch) => navigate(`/${paramGuildId}/${ch.id}`)} onBack={() => navigate(`/${paramGuildId}`)} />
                    ) : (
                        <div className="flex-1 flex flex-col min-w-0 relative h-full">
                            <header className="h-12 px-4 flex items-center border-b border-discord-border shrink-0 shadow-sm gap-2">
                                <button onClick={() => navigate(`/${paramGuildId}`)} className="md:hidden text-discord-muted hover:text-white p-2"><FaChevronLeft size={20} /></button>
                                <FaHashtag className="text-discord-muted text-xl" />
                                <h3 className="font-bold text-white truncate">{currentChannel?.name || (paramGuildId === '@me' ? "DM" : "チャンネル")}</h3>
                            </header>
                            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col px-4 pt-4 select-text">
                               {loadingOlder && <div className="text-center py-4 text-xs text-discord-muted animate-pulse">過去のログを読み込み中...</div>}
                               {messages.map((m) => {
                                 const isMe = m.author.id === user?.id;
                                 const nameColor = (m.author.color && m.author.color !== '#000000') ? m.author.color : '#ffffff';
                                 return (
                                   <div key={m.id} className="group relative -mx-4 px-4 py-1 hover:bg-discord-hover transition-colors" onContextMenu={(e)=>{e.preventDefault(); e.stopPropagation(); setContextMenu({x: e.pageX, y: e.pageY, message: m})}} onMouseEnter={()=>setHoveredMessageId(m.id)} onMouseLeave={()=>setHoveredMessageId(null)}>
                                      {hoveredMessageId === m.id && <MessageToolbar message={m} isMe={isMe} onReaction={(id, emo, add) => {
                                          const identifier = emo.id ? `${emo.name}:${emo.id}` : (emo.name || emo);
                                          socket.emit(add ? 'addReaction' : 'removeReaction', { channelId: paramChannelId, messageId: id, emoji: identifier });
                                      }} onReply={(msg) => setReplyingTo({id: msg.id, username: msg.author.username})} onEdit={(msg) => {setEditingMessageId(msg.id); setEditInput(msg.content);}} onOpenMenu={(e)=>setContextMenu({x: e.pageX, y: e.pageY, message: m})} onReactionOpen={() => setShowEmojiPicker(true)} />}
                                      <div className="flex gap-4">
                                         <img src={getProxyUrl(m.author.avatar)} className="w-10 h-10 rounded-full shrink-0 cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setUserPopout({ x: e.pageX, y: e.pageY, userId: m.author.id }); }} />
                                         <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center gap-2">
                                               <span className="font-bold hover:underline cursor-pointer" style={{color: nameColor}} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setUserPopout({ x: e.pageX, y: e.pageY, userId: m.author.id }); }}>{m.author.displayName}</span>
                                               <span className="text-xs text-discord-muted font-medium">{formatTimestamp(m.timestamp)}</span>
                                            </div>
                                            {editingMessageId === m.id ? (
                                               <div className="bg-discord-element p-2 rounded mt-1 border border-discord-border">
                                                 <textarea className="bg-transparent w-full text-discord-text outline-none p-1 resize-none font-ggsans" rows={editInput.split('\n').length || 1} value={editInput} onChange={e=>setEditInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); socket.emit('editMessage', { channelId: paramChannelId, messageId: m.id, content: editInput }); setEditingMessageId(null);}}} autoFocus />
                                               </div>
                                            ) : ( <MessageContent content={m.content} /> )}
                                            {m.attachments?.length > 0 && <div className="flex flex-wrap gap-2 mt-1">{m.attachments.map((att, idx) => <img key={idx} src={getProxyUrl(att.url)} className="rounded max-w-[400px] max-h-[300px] cursor-pointer" onClick={() => setPreviewData({ isOpen: true, images: m.attachments.map(a=>a.url), index: idx })} />)}</div>}
                                            {m.embeds?.map((e, idx) => <MessageEmbed key={idx} embed={e} />)}
                                            <ReactionList reactions={m.reactions} onReactionClick={(emoji, add) => {
                                                const identifier = emoji.id ? `${emoji.name}:${emoji.id}` : (emoji.name || emoji);
                                                socket.emit(add ? 'addReaction' : 'removeReaction', { channelId: paramChannelId, messageId: m.id, emoji: identifier });
                                            }} />
                                         </div>
                                      </div>
                                   </div>
                                 );
                               })}
                               <div ref={messagesEndRef} className="h-6 shrink-0" />
                            </div>
                            <ChatInput channelName={currentChannel?.name} disabled={!paramChannelId} replyingTo={replyingTo} onSend={(t) => {
                                socket.emit('sendMessage', { channelId: paramChannelId, content: t.trim(), reply: replyingTo ? { messageId: replyingTo.id } : null });
                                setReplyingTo(null);
                            }} onCancelReply={() => setReplyingTo(null)} onEmojiClick={()=>setShowEmojiPicker(true)} />
                        </div>
                    )}
                </div>
            </div>
            {previewData.isOpen && <ImageViewer images={previewData.images} initialIndex={previewData.index} onClose={() => setPreviewData({ ...previewData, isOpen: false })} />}
            {userPopout && <UserPopout userId={userPopout.userId} guildId={paramGuildId} x={userPopout.x} y={userPopout.y} socket={socket} onClose={()=>setUserPopout(null)} />}
            {contextMenu && <MessageContextMenu x={contextMenu.x} y={contextMenu.y} message={contextMenu.message} currentUser={user} onClose={() => setContextMenu(null)} onReaction={(id, emo, add) => {
                const identifier = emo.id ? `${emo.name}:${emo.id}` : (emo.name || emo);
                socket.emit(add ? 'addReaction' : 'removeReaction', { channelId: paramChannelId, messageId: id, emoji: identifier });
            }} onDelete={(id) => socket.emit('deleteMessage', { channelId: paramChannelId, messageId: id })} />}
        </div>
    );
}