import { FaMessage, FaClock, FaChevronLeft } from 'react-icons/fa6';
import { formatTimestamp } from '../../utils/helpers';

const ForumView = ({ threads, onSelectThread, channelName, onBack }) => {
  return (
    <div className="flex-1 bg-discord-bg flex flex-col min-w-0 overflow-hidden h-full">
      <div className="h-12 px-4 flex items-center border-b border-discord-border shrink-0 shadow-sm gap-2">
        <button onClick={onBack} className="md:hidden text-discord-muted hover:text-white p-2">
           <FaChevronLeft size={20} />
        </button>
        <FaMessage className="text-discord-muted" size={18} />
        <h3 className="font-bold text-white truncate">{channelName}</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto grid gap-3">
          {threads.length === 0 ? (
            <div className="text-center py-20 text-discord-muted font-medium">
               まだ投稿がありません。
            </div>
          ) : (
            threads.map((thread) => (
              <div 
                key={thread.id} 
                onClick={() => onSelectThread(thread)}
                className="bg-discord-popup border border-discord-border hover:bg-discord-hover hover:border-discord-muted/30 rounded-lg p-4 cursor-pointer transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[17px] font-bold text-white group-hover:underline truncate mb-1">
                      {thread.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-discord-muted">
                      <span className="flex items-center gap-1.5 bg-discord-element px-2 py-0.5 rounded-full text-discord-text font-medium">
                        <FaMessage size={10} />
                        {thread.messageCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaClock size={11} />
                        {formatTimestamp(thread.lastMessageTimestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-discord-element rounded flex items-center justify-center shrink-0 text-discord-muted group-hover:text-white transition-colors">
                     <FaMessage size={20} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumView;