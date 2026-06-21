import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getProxyUrl } from '../../utils/helpers';
import { useTwemoji } from '../../hooks/useTwemoji';

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

const MessageContent = ({ content }) => {
  const { ref, apply } = useTwemoji();

  useEffect(() => {
    if (!ref.current) return;

    const observer = new MutationObserver(() => {
      apply();
    });

    observer.observe(ref.current, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="app-markdown">
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
             ? <code {...props} className="app-code-inline" />
             : <code {...props} className="app-code-block" />,
          blockquote: ({node, ...props}) => <blockquote {...props} className="app-blockquote" />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;
