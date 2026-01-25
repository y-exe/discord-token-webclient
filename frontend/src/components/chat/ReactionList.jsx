import React from 'react';
import twemoji from 'twemoji';
import { getProxyUrl } from '../../utils/helpers';

const ReactionList = ({ reactions, onReactionClick }) => {
  if (!reactions || reactions.length === 0) return null;

  const renderEmoji = (emoji) => {
    if (emoji.id) {
      return <img src={getProxyUrl(emoji.url)} className="w-full h-full object-contain" alt={emoji.name} />;
    }
    return (
      <span 
        className="flex items-center justify-center w-full h-full"
        dangerouslySetInnerHTML={{ 
          __html: twemoji.parse(emoji.name, {
            folder: 'svg',
            ext: '.svg',
            base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
          }) 
        }} 
      />
    );
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1.5 isolate">
      {reactions.map((r) => {
        const reactionKey = r.emoji.id || r.emoji.name;
        return (
          <button 
            key={reactionKey} 
            onClick={(e) => { 
              e.preventDefault(); e.stopPropagation(); 
              const emojiData = r.emoji.id ? { name: r.emoji.name, id: r.emoji.id } : r.emoji.name;
              onReactionClick(emojiData, !r.me); 
            }}
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded-[8px] border min-h-[32px]
              transition-all select-none cursor-pointer active:scale-95 outline-none
              ${r.me 
                ? 'bg-[#1a1d40] border-[#5764f2] hover:bg-[#252a5a]' 
                : 'bg-[#19191c] border-transparent hover:bg-[#2a2a2e] hover:border-[#313235]'
              }
            `}
          >
            <div className="flex items-center justify-center w-[16px] h-[16px] shrink-0 pointer-events-none">
              {renderEmoji(r.emoji)}
            </div>
            <span className={`text-[13px] font-bold ${r.me ? 'text-[#a3b4ff]' : 'text-[#9b9ca3]'}`}>
              {r.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ReactionList;