import { useEffect, useState } from 'react';
import { FaReply, FaPlus, FaPen, FaTrash, FaCopy, FaLink, FaHashtag } from 'react-icons/fa6';
import twemoji from 'twemoji';

const DEFAULT_EMOJIS = ['👍', '✅', '💓', '🤔'];

const MessageContextMenu = ({ 
  x, y, message, currentUser, onClose, onReaction, onReply, onEdit, onDelete, onReactionOpen 
}) => {
  const [frequentEmojis, setFrequentEmojis] = useState(DEFAULT_EMOJIS);

  useEffect(() => {
    const stored = localStorage.getItem('frequentEmojis');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 4) setFrequentEmojis(parsed.slice(0, 4));
      } catch (e) {}
    }
  }, []);

  let styleTop = y;
  let styleLeft = x;
  if (x + 220 > window.innerWidth) styleLeft = x - 230;
  if (y + 400 > window.innerHeight) styleTop = window.innerHeight - 420;

  const isMe = message.author.id === currentUser?.id;

  const renderEmoji = (char) => (
    <span 
      className="cursor-pointer hover:scale-125 transition-transform text-lg"
      dangerouslySetInnerHTML={{ __html: twemoji.parse(char, { folder: 'svg', ext: '.svg' }) }}
      onClick={() => { onReaction(message.id, char, true); onClose(); }}
    />
  );

  return (
    <>
      <div className="fixed inset-0 z-[998]" onClick={onClose} onContextMenu={(e)=>{e.preventDefault(); onClose();}}></div>
      <div 
        className="fixed bg-[#111214] border border-[#1e1f22] rounded-[4px] shadow-2xl z-[999] py-1.5 w-[220px] font-sans text-[#dbdee1] text-sm select-none"
        style={{ top: styleTop, left: styleLeft }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-2 py-1 flex justify-between bg-[#111214] mb-1">
           {frequentEmojis.map((emoji, i) => (
             <div key={i} className="p-1 rounded hover:bg-[#404249] flex items-center justify-center w-8 h-8">
               {renderEmoji(emoji)}
             </div>
           ))}
        </div>
        <div className="h-[1px] bg-[#1e1f22] my-1 mx-2"></div>
        <MenuItem label="リアクションを付ける" icon={<FaPlus/>} onClick={(e) => { onReactionOpen(e); onClose(); }} hasSub={true} />
        <MenuItem label="返信" icon={<FaReply/>} onClick={() => { onReply(message); onClose(); }} />
        {isMe && <MenuItem label="メッセージを編集" icon={<FaPen/>} onClick={() => { onEdit(message); onClose(); }} />}
        {isMe && (
          <>
            <div className="h-[1px] bg-[#1e1f22] my-1 mx-2"></div>
            <MenuItem label="メッセージを削除" icon={<FaTrash/>} color="text-discord-red" onClick={() => { onDelete(message.id); onClose(); }} />
          </>
        )}
        <div className="h-[1px] bg-[#1e1f22] my-1 mx-2"></div>
        <MenuItem label="テキストをコピー" icon={<FaCopy/>} onClick={() => { navigator.clipboard.writeText(message.content); onClose(); }} />
        <MenuItem label="メッセージリンクをコピー" icon={<FaLink/>} onClick={() => { navigator.clipboard.writeText(`https://discord.com/channels/@me/${message.channelId}/${message.id}`); onClose(); }} />
        <MenuItem label="メッセージIDをコピー" icon={<FaHashtag/>} onClick={() => { navigator.clipboard.writeText(message.id); onClose(); }} />
      </div>
    </>
  );
};

const MenuItem = ({ label, icon, onClick, color="text-[#dbdee1]", hasSub }) => (
  <div className={`px-2 py-1.5 mx-2 rounded-[2px] hover:bg-[#5865F2] hover:text-white cursor-pointer flex items-center justify-between group transition-colors ${color}`} onClick={onClick}>
     <span>{label}</span>
     <span className="text-xs opacity-60 group-hover:opacity-100 flex items-center">{icon}{hasSub && <span className="ml-2 text-[10px]">▶</span>}</span>
  </div>
);

export default MessageContextMenu;