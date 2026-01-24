import { useState, useEffect } from 'react';
import { getProxyUrl } from '../../utils/helpers';

const UserPopout = ({ userId, guildId, x, y, socket, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    socket.emit('getUserProfile', { userId, guildId }, (data) => {
        if (data) setProfile(data);
        setLoading(false);
    });
  }, [userId, guildId, socket]);

  const WIDTH = 300;
  const BANNER_HEIGHT = 105;

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 z-[998]" onClick={onClose}></div>
        <div className="fixed bg-[#111214] rounded-2xl shadow-2xl z-[999] p-4 flex items-center justify-center border border-[#27282b] w-[300px] h-[200px]" style={{ top: y, left: x }} onClick={e=>e.stopPropagation()}>
           <div className="animate-spin h-8 w-8 border-4 border-[#5865F2] rounded-full border-t-transparent"></div>
        </div>
      </>
    );
  }

  if (!profile) return null;

  let styleTop = y;
  let styleLeft = x;
  if (x + WIDTH > window.innerWidth) styleLeft = x - WIDTH - 10;
  if (y + 400 > window.innerHeight) styleTop = window.innerHeight - 450;
  if (styleTop < 10) styleTop = 10;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ja-JP', {year: 'numeric', month: 'numeric', day: 'numeric'}) : "不明";

  return (
    <>
      <div className="fixed inset-0 z-[998]" onClick={onClose}></div>
      <div 
        className="fixed bg-[#111214] rounded-2xl shadow-2xl z-[999] font-sans text-[#dbdee1] flex flex-col border border-[#27282b] overflow-hidden" 
        style={{ top: styleTop, left: styleLeft, width: WIDTH }}
        onClick={e => e.stopPropagation()} 
      >
         <div 
            className="relative shrink-0" 
            style={{ 
                height: BANNER_HEIGHT, 
                backgroundColor: profile.accentColor || '#5865F2',
                backgroundImage: profile.banner ? `url(${getProxyUrl(profile.banner)})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
         ></div>

         <div className="relative px-4 pb-4">
            <div className="absolute" style={{ top: -45, left: 12 }}>
               <div className="relative w-[92px] h-[92px] rounded-full bg-[#111214] p-[6px]">
                  <img src={getProxyUrl(profile.avatar)} className="w-full h-full rounded-full object-cover bg-gray-700" alt="" />
                  <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-[4px] border-[#111214] ${
                    profile.status === 'online' ? 'bg-[#23a559]' : profile.status === 'idle' ? 'bg-[#f0b232]' : profile.status === 'dnd' ? 'bg-[#f23f43]' : 'bg-[#80848e]'
                  }`}></div>
               </div>
            </div>

            <div className="pt-[52px]">
               <h2 className="text-xl font-bold text-white leading-tight truncate">{profile.displayName}</h2>
               <div className="text-sm text-[#b5bac1]">{profile.username}</div>
            </div>

            <div className="w-full h-[1px] bg-[#27282b] my-3"></div>

            <div className="max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                <div className="mb-4">
                   <div className="text-xs font-bold text-[#b5bac1] uppercase mb-1">Discord参加日</div>
                   <div className="text-xs text-[#dbdee1]">{formatDate(profile.createdAt)}</div>
                </div>

                {profile.roles?.length > 0 && (
                   <div className="mb-4">
                      <div className="text-xs font-bold text-[#b5bac1] uppercase mb-1">ロール</div>
                      <div className="flex flex-wrap gap-1">
                         {profile.roles.map((r, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-[#1e1f22] rounded-[4px] px-2 py-1 border border-[#27282b]">
                               <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: (r.color && r.color !== '#000000') ? r.color : '#ffffff'}}></div>
                               <span className="text-[11px] font-medium">{r.name}</span>
                            </div>
                         ))}
                      </div>
                   </div>
                )}
            </div>
            
            <div className="mt-2">
               <input type="text" placeholder={`@${profile.displayName} へメッセージを送信`} className="w-full bg-[#1e1f22] rounded-[8px] px-3 py-2 text-sm text-white placeholder-[#949ba4] outline-none border border-transparent focus:border-[#5865F2]" />
            </div>
         </div>
      </div>
    </>
  );
};

export default UserPopout;