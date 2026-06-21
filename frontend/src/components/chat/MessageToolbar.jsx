import { FaEllipsisVertical, FaFaceSmile, FaPen, FaReply, FaTrash } from 'react-icons/fa6';

const MessageToolbar = ({ message, isMe, onReply, onEdit, onOpenMenu, onReactionOpen }) => {
  return (
    <div className="app-toolbar">
      <md-icon-button type="button" class="app-tool m3-toolbar-button" onClick={(e) => { e.stopPropagation(); onReply(message); }} title="返信">
        <FaReply size={18} />
      </md-icon-button>
      <md-icon-button type="button" class="app-tool m3-toolbar-button" onClick={(e) => { e.stopPropagation(); onReactionOpen(e, message.id); }} title="リアクション">
        <FaFaceSmile size={18} />
      </md-icon-button>
      {isMe && (
        <md-icon-button type="button" class="app-tool m3-toolbar-button" onClick={(e) => { e.stopPropagation(); onEdit(message); }} title="編集">
          <FaPen size={16} />
        </md-icon-button>
      )}
      {isMe && (
        <md-icon-button type="button" class="app-tool m3-toolbar-button" onClick={(e) => { e.stopPropagation(); onOpenMenu(e, message); }} title="削除">
          <FaTrash size={16} />
        </md-icon-button>
      )}
      <md-icon-button type="button" class="app-tool m3-toolbar-button" onClick={(e) => { e.stopPropagation(); onOpenMenu(e, message); }} title="その他">
        <FaEllipsisVertical size={18} />
      </md-icon-button>
    </div>
  );
};

export default MessageToolbar;
