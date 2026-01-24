import { FaDiscord } from 'react-icons/fa';
import { getProxyUrl } from '../../utils/helpers';

const ServerList = ({ guilds, currentGuildId, onSelect }) => {
  return (
    <nav className="w-[72px] bg-discord-server flex flex-col items-center py-3 gap-2 shrink-0 overflow-y-auto no-scrollbar z-20 select-none">
      <div onClick={() => onSelect('@me')} className="group relative cursor-pointer shrink-0">
         <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 bg-white rounded-r-lg transition-all ${currentGuildId==='@me' ? 'h-10' : 'h-2 opacity-0 group-hover:opacity-100 group-hover:h-5'}`}></div>
         <div className={`w-12 h-12 bg-discord-element rounded-[24px] hover:rounded-[16px] transition-all cursor-pointer flex items-center justify-center text-white shrink-0 ${currentGuildId==='@me' ? '!rounded-[16px] bg-discord-primary' : 'hover:bg-discord-primary'}`}>
            <FaDiscord size={28} />
         </div>
      </div>
      <div className="w-8 h-[2px] bg-discord-element rounded-full my-1 shrink-0"></div>
      
      {guilds.map((g) => (
         <div key={g.id} className="group relative cursor-pointer shrink-0" onClick={() => onSelect(g.id)}>
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 bg-white rounded-r-lg transition-all ${currentGuildId===g.id ? 'h-10' : 'h-2 opacity-0 group-hover:opacity-100 group-hover:h-5'}`}></div>
            <div className={`w-12 h-12 bg-discord-element transition-all overflow-hidden flex items-center justify-center ${currentGuildId===g.id ? 'rounded-[16px] bg-discord-primary' : 'rounded-[24px] group-hover:rounded-[16px] group-hover:bg-discord-primary'}`}>
              {g.icon ? <img src={getProxyUrl(g.icon)} className="w-full h-full object-cover pointer-events-none"/> : <span className="text-white font-bold">{g.acronym}</span>}
            </div>
         </div>
      ))}
    </nav>
  );
};

export default ServerList;