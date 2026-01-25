import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import twemoji from 'twemoji';
import { getProxyUrl } from '../../utils/helpers';

const MessageContent = ({ content }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      twemoji.parse(containerRef.current, {
        folder: 'svg',
        ext: '.svg',
        base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
      });
    }
  }, [content]);

  const parseCustomEmojis = (text) => {
    if (!text) return null;
    const emojiRegex = /<(a?):(\w+):(\d+)>/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = emojiRegex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
      const isAnimated = match[1] === 'a';
      const name = match[2];
      const id = match[3];
      const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}?size=48`;
      
      parts.push(
        <img 
          key={`${id}-${match.index}`} 
          src={getProxyUrl(url)} 
          alt={`:${name}:`} 
          className="custom-emoji inline-block" 
        />
      );
      lastIndex = emojiRegex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(text.substring(lastIndex));
    return parts.length > 0 ? parts : text;
  };

  return (
    <div ref={containerRef} className="text-discord-text whitespace-pre-wrap break-words leading-[1.375rem] select-text">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        components={{
          p: ({children}) => {
             const processed = Array.isArray(children) 
                ? children.map(c => typeof c === 'string' ? parseCustomEmojis(c) : c)
                : typeof children === 'string' ? parseCustomEmojis(children) : children;
             return <p className="m-0 inline">{processed}</p>;
          },
          a: ({node, ...props}) => <a {...props} className="text-[#00a8fc] hover:underline cursor-pointer" target="_blank" rel="noreferrer"/>,
          code: ({inline, ...props}) => inline 
             ? <code {...props} className="bg-[#2b2d31] p-0.5 rounded text-sm font-mono" /> 
             : <code {...props} className="block bg-[#2b2d31] p-2 rounded my-1 text-sm font-mono overflow-x-auto" />,
          blockquote: ({node, ...props}) => <blockquote {...props} className="border-l-4 border-[#4e5058] pl-3 text-[#b5bac1]" />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;