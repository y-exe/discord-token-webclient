import { FaChevronLeft, FaClock } from 'react-icons/fa6';

import { formatTimestamp } from '../../utils/helpers';

const ForumIcon = ({ size = 18 }) => (
  <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" d="M18.91 12.98a5.45 5.45 0 0 1 2.18 6.2c-.1.33-.09.68.1.96l.83 1.32a1 1 0 0 1-.84 1.54h-5.5A5.6 5.6 0 0 1 10 17.5a5.6 5.6 0 0 1 5.68-5.5c1.2 0 2.32.36 3.23.98Z" />
    <path fill="currentColor" d="M19.24 10.86c.32.16.72-.02.74-.38L20 10c0-4.42-4.03-8-9-8s-9 3.58-9 8c0 1.5.47 2.91 1.28 4.11.14.21.12.49-.06.67l-1.51 1.51A1 1 0 0 0 2.4 18h5.1a.5.5 0 0 0 .49-.5c0-4.2 3.5-7.5 7.68-7.5 1.28 0 2.5.3 3.56.86Z" />
  </svg>
);

const ForumView = ({ threads, onSelectThread, channelName, onBack }) => {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-discord-bg">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-discord-border px-4 shadow-sm">
        <md-icon-button type="button" onClick={onBack} class="m3-icon-button md:hidden" title="戻る">
          <FaChevronLeft size={20} />
        </md-icon-button>
        <span className="text-discord-muted"><ForumIcon size={18} /></span>
        <h3 className="truncate font-bold text-white">{channelName}</h3>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
        <div className="mx-auto grid max-w-4xl gap-3">
          {threads.length === 0 ? (
            <div className="py-20 text-center font-medium text-discord-muted">
              投稿はまだありません。
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread)}
                className="group cursor-pointer rounded-lg border border-discord-border bg-discord-popup p-4 transition-all hover:border-discord-muted/30 hover:bg-discord-hover"
              >
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 truncate text-[17px] font-bold text-white group-hover:underline">
                      {thread.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-discord-muted">
                      <span className="flex items-center gap-1.5 rounded-full bg-discord-element px-2 py-0.5 font-medium text-discord-text">
                        <ForumIcon size={10} />
                        {thread.messageCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaClock size={11} />
                        {formatTimestamp(thread.lastMessageTimestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-discord-element text-discord-muted transition-colors group-hover:text-white">
                    <ForumIcon size={20} />
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
