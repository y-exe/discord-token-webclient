import { FaHashtag, FaVolumeHigh, FaPodcast, FaBullhorn, FaMessage } from 'react-icons/fa6';
import { BiSolidRightArrow } from "react-icons/bi";
import { getProxyUrl } from '../../utils/helpers';

const ChannelSidebar = ({ 
  currentGuild, channels, currentChannelId, onSelectChannel, 
  joinedVoiceChannelId, onLeaveVoice 
}) => {
  return (
    <div className="h-full flex-1 bg-discord-sidebar flex flex-col min-w-0 overflow-hidden select-none">
      <header className="h-12 px-4 flex items-center justify-between shadow-sm border-b border-discord-border shrink-0 cursor-pointer hover:bg-[#1f2023] transition-colors">
        <h1 className="font-bold text-white truncate text-[15px]">{currentGuild?.name || "サーバー選択"}</h1>
      </header>
      
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scrollbar">
        {channels.map((cat) => (
          <div key={cat.id || 'uncategorized'}>
            {cat.name && (
              <div className="flex items-center px-1 mb-1 text-xs font-bold text-discord-muted uppercase hover:text-white cursor-pointer transition-colors mt-4">
                <BiSolidRightArrow size={8} className="rotate-90 mr-1" />{cat.name}
              </div>
            )}
            
            {cat.channels && cat.channels.map(ch => {
              const isForum = ch.type === 'GUILD_FORUM' || ch.type === 15;
              const isActive = currentChannelId === ch.id;

              return (
                <div key={ch.id} className="mb-[2px]">
                  <div 
                    onClick={() => onSelectChannel(ch)} 
                    className={`
                      px-2 py-[6px] rounded mx-1 flex items-center gap-1.5 cursor-pointer group transition-all duration-75
                      ${isActive || joinedVoiceChannelId === ch.id
                        ? 'bg-[#3f4147] text-white' 
                        : 'text-[#949ba4] hover:bg-[#35373c] hover:text-white'
                      }
                    `}
                  >
                    <ChannelIcon type={ch.type} />
                    <span className="truncate font-medium">{ch.name}</span>
                  </div>

                  {ch.threads && ch.threads.length > 0 && !isForum && (
                    <div className="ml-4 border-l-2 border-[#4e5058] my-1">
                      {ch.threads.map(thread => (
                        <div 
                          key={thread.id}
                          onClick={() => onSelectChannel(thread)}
                          className={`
                            ml-3 px-2 py-[4px] rounded flex items-center gap-1.5 cursor-pointer transition-all text-sm
                            ${currentChannelId === thread.id 
                              ? 'bg-[#3f4147] text-white' 
                              : 'text-[#949ba4] hover:bg-[#35373c] hover:text-white'
                            }
                          `}
                        >
                           <FaHashtag size={12} className="text-[#80848e]" />
                           <span className="truncate">{thread.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* VCメンバー表示 */}
                  {(ch.type === 'GUILD_VOICE' || ch.type === 'GUILD_STAGE_VOICE' || ch.type === 2 || ch.type === 13) && ch.members && ch.members.length > 0 && (
                    <div className="ml-8 mt-1 space-y-0.5">
                      {ch.members.map(m => (
                        <div key={m.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-[#ffffff0a] cursor-pointer">
                          <img src={getProxyUrl(m.avatar)} className="w-5 h-5 rounded-full" />
                          <span className="text-sm font-medium text-[#dbdee1] truncate">{m.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {joinedVoiceChannelId && (
        <div className="bg-[#1e1f22] px-3 py-1.5 border-t border-discord-border flex items-center justify-between shadow-lg">
          <div className="min-w-0 text-discord-green text-[10px] font-bold flex items-center gap-1">
             <span className="w-1 h-1 bg-discord-green rounded-full animate-pulse"></span>
             ボイス接続中
          </div>
          <button onClick={onLeaveVoice} className="text-discord-muted hover:text-discord-red transition-colors p-1 rounded hover:bg-black/20">
            <FaVolumeHigh size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

const ChannelIcon = ({ type }) => {
    switch (type) {
        case 'GUILD_VOICE': case 2: return <FaVolumeHigh size={16} className="text-[#80848e] group-hover:text-white" />;
        case 'GUILD_STAGE_VOICE': case 13: return <FaPodcast size={16} className="text-[#80848e] group-hover:text-white" />;
        case 'GUILD_NEWS': case 5: return <FaBullhorn size={16} className="text-[#80848e] group-hover:text-white" />;
        case 'GUILD_FORUM': case 15: return <FaMessage size={15} className="text-[#80848e] group-hover:text-white" />;
        default: return <FaHashtag size={18} className="text-[#80848e] group-hover:text-white" />;
    }
};

export default ChannelSidebar;