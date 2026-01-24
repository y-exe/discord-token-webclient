import React, { useEffect, useState, useRef } from 'react';
import twemoji from 'twemoji';
import { getProxyUrl } from '../../utils/helpers';

const RollingNumber = ({ count, colorClass }) => {
  const [displayCount, setDisplayCount] = useState(count);
  const [animating, setAnimating] = useState(false);
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (prevCountRef.current !== count) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setDisplayCount(count);
        setAnimating(false);
      }, 150);
      prevCountRef.current = count;
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <div className="relative overflow-hidden h-5 flex flex-col items-center select-none">
      <span className={`text-[13px] font-bold transition-all duration-150 flex items-center h-full ${colorClass} ${animating ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        {displayCount}
      </span>
      {animating && (
        <span key={count} className={`absolute top-0 left-0 text-[13px] font-bold animate-rolling flex items-center h-full ${colorClass}`}>
          {count}
        </span>
      )}
    </div>
  );
};

const ReactionList = ({ reactions, onReactionClick }) => {
  const getTwemojiHtml = (emojiChar) => {
    return twemoji.parse(emojiChar, { folder: 'svg', ext: '.svg', base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/' });
  };

  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5 w-full relative z-[20] isolate">
      {reactions.map((r) => {
        const reactionKey = r.emoji.id || r.emoji.name;
        return (
          <button 
            key={reactionKey} 
            onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation(); 
              const emojiData = r.emoji.id ? { name: r.emoji.name, id: r.emoji.id } : r.emoji.name;
              onReactionClick(emojiData, !r.me); 
            }}
            className={`
              group/reaction flex items-center gap-1.5 px-2 py-1 rounded-[8px] border min-h-[32px]
              transition-all select-none cursor-pointer active:scale-95 outline-none
              ${r.me 
                ? 'bg-[#1a1d40] border-[#5764f2] hover:bg-[#252a5a]' 
                : 'bg-[#19191c] border-transparent hover:bg-[#2a2a2e] hover:border-[#313235]'
              }
            `}
            title={r.emoji.name}
          >
            <div className="flex items-center justify-center w-[16px] h-[16px] shrink-0 pointer-events-none">
              {r.emoji.id ? (
                <img src={getProxyUrl(r.emoji.url)} className="w-full h-full object-contain" alt={r.emoji.name} />
              ) : (
                <span className="text-base flex items-center emoji-span" dangerouslySetInnerHTML={{ __html: getTwemojiHtml(r.emoji.name) }} />
              )}
            </div>
            <div className="flex items-center pointer-events-none">
               <RollingNumber count={r.count} colorClass={r.me ? 'text-[#a3b4ff]' : 'text-[#9b9ca3]'} />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ReactionList;