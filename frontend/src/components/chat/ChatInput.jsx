import { useState, useRef, useEffect } from 'react';
import { FaLaugh } from 'react-icons/fa';
import { FaPlus, FaCircleXmark } from 'react-icons/fa6';

const ChatInput = ({ channelName, disabled, onSend, replyingTo, onCancelReply, onToggleMention, onEmojiClick }) => {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const textAreaRef = useRef(null);

  useEffect(() => {
    const handleEmojiInsert = (e) => {
      setText(prev => prev + e.detail);
      textAreaRef.current?.focus();
    };
    window.addEventListener('insert-emoji', handleEmojiInsert);
    return () => window.removeEventListener('insert-emoji', handleEmojiInsert);
  }, []);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if ((!text.trim() && !file) || disabled) return;
    onSend(text, file);
    setText("");
    setFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-4 pb-6 pt-2 shrink-0 relative z-20">
      {replyingTo && (
        <div className="flex items-center justify-between bg-[#141517] rounded-t-lg px-4 py-2 text-sm text-discord-muted border-x border-t border-[#27282b]">
           <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#b5bac1]">返信先:</span>
              <span className="font-bold text-white">@{replyingTo.username}</span>
              <div className="flex items-center gap-1 cursor-pointer select-none hover:text-discord-text ml-2" onClick={onToggleMention}>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${replyingTo.mention ? 'bg-discord-green' : 'bg-gray-500'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${replyingTo.mention ? 'left-4.5' : 'left-0.5'}`}></div></div>
                <span className="text-xs">{replyingTo.mention ? 'ON' : 'OFF'}</span>
              </div>
           </div>
           <button onClick={onCancelReply} className="hover:text-white"><FaCircleXmark/></button>
        </div>
      )}
      {file && (
        <div className="bg-[#141517] px-4 py-2 border-x border-t border-[#27282b] flex items-center justify-between first:rounded-t-lg">
           <div className="text-sm text-discord-text truncate">📁 {file.name} ({(file.size/1024).toFixed(1)}KB)</div>
           <button onClick={()=>{setFile(null); if(fileInputRef.current) fileInputRef.current.value="";}} className="text-discord-red hover:underline text-xs">削除</button>
        </div>
      )}
      <div className={`bg-[#141517] border border-[#27282b] px-4 py-2.5 flex items-start gap-3 ${replyingTo || file ? 'rounded-b-lg' : 'rounded-lg'}`}>
        <button onClick={() => fileInputRef.current?.click()} className="mt-1 text-discord-text hover:text-white bg-[#b5bac1]/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0 transition hover:bg-[#b5bac1]/20"><FaPlus size={12} /></button>
        <input type="file" hidden ref={fileInputRef} onChange={e => e.target.files[0] && setFile(e.target.files[0])} />
        <div className="flex-1">
          <textarea 
            ref={textAreaRef}
            rows={Math.min(text.split('\n').length, 10)}
            value={text} 
            onChange={e => setText(e.target.value)} 
            onKeyDown={handleKeyDown}
            placeholder={channelName ? `#${channelName} へメッセージを送信` : "メッセージを送信"} 
            disabled={disabled} 
            className="bg-transparent w-full outline-none text-discord-text placeholder-[#4e5058] resize-none pt-1" 
          />
        </div>
        <div className="flex items-center gap-3 text-[#b5bac1] text-xl shrink-0 mt-1">
           <div className="cursor-pointer hover:text-white transition" onClick={onEmojiClick}><FaLaugh /></div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;