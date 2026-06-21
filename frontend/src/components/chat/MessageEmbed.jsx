import { getProxyUrl } from '../../utils/helpers';
import MessageContent from './MessageContent';

const MessageEmbed = ({ embed, onImageClick }) => {
  if (!embed) return null;

  const embedColor = typeof embed.color === 'number' ? `#${embed.color.toString(16).padStart(6, '0')}` : (embed.color || '#1e1f22');

  return (
    <div className="border-l-4 bg-[#1e1f22] rounded-r p-3 mt-2 max-w-[520px] grid gap-2" style={{ borderColor: embedColor }}>
      <div className="grid gap-1">
        {embed.provider && <div className="text-xs text-discord-muted">{embed.provider.name}</div>}
        {embed.author && (
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            {(embed.author.iconURL || embed.author.icon_url) && <img src={getProxyUrl(embed.author.iconURL || embed.author.icon_url)} className="w-6 h-6 rounded-full" />}
            <span>{embed.author.name}</span>
          </div>
        )}
        {embed.title && (
          <div className="font-bold text-[#00a8fc] hover:underline cursor-pointer">
            {embed.url ? <a href={embed.url} target="_blank" rel="noreferrer">{embed.title}</a> : embed.title}
          </div>
        )}
        {embed.description && (
          <div className="text-sm">
            <MessageContent content={embed.description} />
          </div>
        )}
        {embed.fields && embed.fields.length > 0 && (
          <div className="grid grid-cols-12 gap-2 mt-1">
            {embed.fields.map((f, i) => (
              <div key={i} className={`${f.inline ? 'col-span-4' : 'col-span-12'}`}>
                <div className="text-xs font-bold text-discord-muted">{f.name}</div>
                <div className="text-sm text-discord-text whitespace-pre-wrap"><MessageContent content={f.value} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-4">
        {embed.thumbnail && <img src={getProxyUrl(embed.thumbnail.url)} className="rounded max-w-[80px] max-h-[80px] object-cover cursor-pointer" onClick={(e) => { e.stopPropagation(); onImageClick(embed.thumbnail.url); }} />}
        {embed.image && <img src={getProxyUrl(embed.image.url)} className="rounded max-w-full max-h-[300px] object-contain cursor-pointer" onClick={(e) => { e.stopPropagation(); onImageClick(embed.image.url); }} />}
      </div>
      {(embed.footer || embed.timestamp) && (
        <div className="text-xs text-discord-muted flex items-center gap-2 mt-1">
          {(embed.footer?.iconURL || embed.footer?.icon_url) && <img src={getProxyUrl(embed.footer.iconURL || embed.footer.icon_url)} className="w-4 h-4 rounded-full" />}
          <span>{embed.footer?.text}{embed.footer && embed.timestamp && " ・ "}{embed.timestamp && new Date(embed.timestamp).toLocaleString('ja-JP')}</span>
        </div>
      )}
    </div>
  );
};

export default MessageEmbed;
