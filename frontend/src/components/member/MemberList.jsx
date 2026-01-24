import { useMemo } from 'react';
import { getProxyUrl } from '../../utils/helpers';

const MemberList = ({ members, onMemberClick }) => {
  const groupedMembers = useMemo(() => {
    if (!members || !Array.isArray(members) || members.length === 0) return [];
    
    const groups = {};
    members.forEach(m => {
      const rid = m.hoistRoleId || 'others';
      const rname = m.hoistRoleName || 'メンバー';
      const rpos = m.hoistRolePosition || 0;
      if (!groups[rid]) groups[rid] = { name: rname, position: rpos, members: [] };
      groups[rid].members.push(m);
    });
    
    const sortedGroups = Object.values(groups).sort((a,b) => b.position - a.position);
    sortedGroups.forEach(grp => grp.members.sort((a, b) => (a.username || "").localeCompare(b.username || "")));
    return sortedGroups;
  }, [members]);

  if (!members || members.length === 0) {
      return <aside className="w-60 bg-discord-sidebar hidden lg:flex flex-col shrink-0 border-l border-discord-border"></aside>;
  }

  return (
    <aside className="w-60 bg-discord-sidebar hidden lg:flex flex-col shrink-0 overflow-y-auto p-3 custom-scrollbar h-full border-l border-discord-border">
       {groupedMembers.map((grp, i) => (
         <div key={i}>
            <div className="mt-4 mb-1 px-2 text-xs font-bold text-discord-muted uppercase select-none">
               {grp.name} — {grp.members.length}
            </div>
            {grp.members.map(m => (
              <div 
                key={m.id} 
                className="
                  flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer transition-all duration-75
                  text-[#949ba4] hover:bg-[#35373c] hover:text-white group
                " 
                onClick={(e) => onMemberClick(e, m.id)}
              >
                  <div className="relative w-8 h-8 shrink-0">
                    <img src={getProxyUrl(m.avatar)} className="w-full h-full rounded-full object-cover" />
                    <div className={`absolute bottom-[-2px] right-[-2px] w-3.5 h-3.5 rounded-full border-[3px] border-discord-sidebar flex items-center justify-center ${
                      m.status === 'online' ? 'bg-[#23a559]' : m.status === 'idle' ? 'bg-[#f0b232]' : m.status === 'dnd' ? 'bg-[#f23f43]' : 'bg-[#80848e]'
                    }`}></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate group-hover:underline" style={{color: m.color || ''}}>{m.username}</div>
                  </div>
                  {m.isBot && <span className="text-[10px] bg-discord-primary text-white px-1 rounded shrink-0 font-bold">BOT</span>}
              </div>
            ))}
         </div>
       ))}
    </aside>
  );
};

export default MemberList;