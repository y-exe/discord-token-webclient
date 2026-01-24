import { getProxyUrl } from '../../utils/helpers';
import { FaMinus, FaRegSquare, FaXmark } from 'react-icons/fa6';

const WindowHeader = ({ guild }) => {
  return (
    <div className="h-9 bg-discord-header flex items-center justify-center px-2 shrink-0 select-none drag-region relative border-b border-discord-border">
      {guild ? (
        <div className="flex items-center gap-2 opacity-90 transition-opacity hover:opacity-100 cursor-default">
          {guild.icon ? (
             <img src={getProxyUrl(guild.icon)} className="w-4 h-4 rounded-md object-cover" alt="" />
          ) : (
             <div className="w-4 h-4 rounded-md bg-discord-element text-[9px] flex items-center justify-center text-white">{guild.acronym}</div>
          )}
          <span className="text-sm font-bold text-discord-text">{guild.name}</span>
        </div>
      ) : (
        <span className="text-xs font-bold text-discord-muted">Discord</span>
      )}

    </div>
  );
};

export default WindowHeader;