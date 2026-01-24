import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import twemoji from 'twemoji';
import { getProxyUrl } from '../../utils/helpers';

const MessageContent = ({ content }) => {
  const containerRef = useRef(null);

  const parseText = (text) => {
    if (!text) return null;
    // カスタム絵文字パース: <:name:id> または <a:name:id>
    const emojiRegex = /<(a?):(\w+):(\d+)>/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    try {
      while ((match = emojiRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }
        const isAnimated = match[1] === 'a';
        const name = match[2];
        const id = match[3];
        const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}?size=48`;
        
        parts.push(
          <img 
            key={`${id}-${match.index}`} 
            src={getProxyUrl(url)} 
            alt={`:${name}:`} 
            className="custom-emoji inline-block align-bottom w-5 h-5 mx-[1px]" 
            title={`:${name}:`}
          />
        );
        lastIndex = emojiRegex.lastIndex;
      }
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
      return parts.length > 0 ? parts : text;
    } catch (e) { return text; }
  };

  useEffect(() => {
    if (containerRef.current) {
      try {
        const parse = twemoji?.parse || twemoji?.default?.parse;
        if (typeof parse === 'function') {
          parse(containerRef.current, { folder: 'svg', ext: '.svg', base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/' });
        }
      } catch (e) {}
    }
  }, [content]);

  return (
    <div ref={containerRef} className="text-discord-text whitespace-pre-wrap break-words leading-[1.375rem] markdown-content select-text">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        components={{
          p: ({node, children, ...props}) => {
             const processedChildren = Array.isArray(children) 
                ? children.map(c => typeof c === 'string' ? parseText(c) : c)
                : typeof children === 'string' ? parseText(children) : children;
             return <p {...props}>{processedChildren}</p>;
          },
          a: ({node, ...props}) => <a {...props} className="text-[#00a8fc] hover:underline cursor-pointer" target="_blank" rel="noreferrer"/>,
          code: ({inline, ...props}) => inline 
             ? <code {...props} className="bg-[#2b2d31] p-0.5 rounded text-sm font-mono" /> 
             : <code {...props} className="block bg-[#2b2d31] p-2 rounded my-1 text-sm font-mono overflow-x-auto" />,
          blockquote: ({node, ...props}) => <blockquote {...props} className="border-l-4 border-discord-element pl-2 text-discord-muted" />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;