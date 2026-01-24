const MessageComponent = ({ components, onClick }) => {
  if (!components || components.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      {components.map((row, i) => (
        <div key={i} className="flex flex-wrap gap-2">
          {row.components.map((comp, j) => {
            // Button (Type 2)
            if (comp.type === 2) {
              const isLink = comp.style === 5;
              const baseClass = "px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2";
              const styleClass = isLink 
                ? "bg-discord-element hover:bg-discord-hover text-discord-text" // Link style
                : "bg-discord-primary hover:bg-discord-primary/80 text-white"; // Primary style (simplified)

              if (isLink) {
                return (
                  <a key={j} href={comp.url} target="_blank" rel="noreferrer" className={baseClass + " " + styleClass}>
                    {comp.label}
                  </a>
                );
              }
              
              return (
                <button 
                  key={j} 
                  onClick={(e) => { e.stopPropagation(); onClick(comp.customId); }}
                  disabled={comp.disabled}
                  className={`${baseClass} ${styleClass} ${comp.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {comp.label}
                </button>
              );
            }
            return null; // Other components (Select Menu etc) omitted for now
          })}
        </div>
      ))}
    </div>
  );
};

export default MessageComponent;