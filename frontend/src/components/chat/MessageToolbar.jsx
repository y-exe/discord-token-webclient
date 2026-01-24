import { useState, useEffect } from 'react';
import { FaReply, FaPen, FaPlus, FaEllipsisH } from 'react-icons/fa';
import twemoji from 'twemoji';

const DEFAULT_EMOJIS_TOOLBAR = ['👍', '✅', '💓'];

const MessageToolbar = ({ message, isMe, onReaction, onReply, onEdit, onOpenMenu, onReactionOpen }) => {
  const [emojis, setEmojis] = useState(DEFAULT_EMOJIS_TOOLBAR);

  useEffect(() => {
    const stored = localStorage.getItem('frequentEmojis');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 3) setEmojis(parsed.slice(0, 3));
      } catch (e) {}
    }
  }, []);

  const renderEmoji = (char) => (
    <div 
      className="w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-[#404249] rounded transition-colors hover:scale-110"
      dangerouslySetInnerHTML={{ __html: twemoji.parse(char, { folder: 'svg', ext: '.svg' }) }}
      onClick={(e) => { e.stopPropagation(); onReaction(message.id, char, true); }}
    />
  );

  return (
    <div className="absolute right-4 -top-4 bg-[#111214] border border-[#1e1f22] rounded shadow-sm flex items-center p-0.5 z-10 select-none shadow-md h-8">
      {emojis.map((emoji, i) => <div key={i}>{renderEmoji(emoji)}</div>)}
      <div className="w-[1px] h-4 bg-[#3f4147] mx-1"></div>
      <TooltipButton icon={<FaPlus size={14}/>} label="リアクション" onClick={(e) => { e.stopPropagation(); onReactionOpen(e, message.id); }} />
      {isMe && <TooltipButton icon={<FaPen size={12}/>} label="編集" onClick={(e) => { e.stopPropagation(); onEdit(message); }} />}
      <TooltipButton icon={<FaReply size={14}/>} label="返信" onClick={(e) => { e.stopPropagation(); onReply(message); }} />
      <TooltipButton icon={<FaEllipsisH size={14}/>} label="その他" onClick={(e) => { e.stopPropagation(); onOpenMenu(e, message); }} />
    </div>
  );
};

const TooltipButton = ({ icon, label, onClick }) => (
  <button className="w-8 h-8 flex items-center justify-center hover:bg-[#404249] text-[#b5bac1] hover:text-[#dbdee1] rounded transition-colors" title={label} onClick={onClick}>
    {icon}
  </button>
);

export default MessageToolbar;