const WindowHeader = ({ guild }) => {
  return (
    <div className="app-titlebar drag-region">
      <span>{guild?.name || 'Discord'}</span>
    </div>
  );
};

export default WindowHeader;
