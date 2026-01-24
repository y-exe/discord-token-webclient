import { useEffect, useState } from 'react';
import { getProxyUrl } from '../../utils/helpers';
import { FaXmark, FaChevronLeft, FaChevronRight, FaArrowDown, FaUpRightFromSquare, FaExpand } from 'react-icons/fa6';

const ImageViewer = ({ images, initialIndex, onClose }) => {
  const [index, setIndex] = useState(initialIndex);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [index, images]);

  const handleNext = (e) => { e?.stopPropagation(); if (index < images.length - 1) { setIndex(index + 1); setIsLoaded(false); } };
  const handlePrev = (e) => { e?.stopPropagation(); if (index > 0) { setIndex(index - 1); setIsLoaded(false); } };

  const currentUrl = images[index];

  return (
    <div className="fixed inset-0 bg-black/90 z-[1000] flex flex-col items-center justify-center" onClick={onClose}>
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-6 bg-gradient-to-b from-black/60 to-transparent z-[1010]" onClick={e => e.stopPropagation()}>
         <div className="text-white font-bold text-sm opacity-80">{index + 1} / {images.length}</div>
         <div className="flex items-center gap-6 text-white/70">
            <button className="hover:text-white transition" title="拡大表示"><FaExpand size={18}/></button>
            <a href={currentUrl} target="_blank" rel="noreferrer" className="hover:text-white transition" title="ブラウザで開く"><FaUpRightFromSquare size={18}/></a>
            <button className="hover:text-white transition" title="保存" onClick={() => { const link = document.createElement('a'); link.href = currentUrl; link.download = `image.png`; link.click(); }}><FaArrowDown size={20}/></button>
            <div className="w-[1px] h-6 bg-white/20 mx-2"></div>
            <button className="hover:text-white transition" onClick={onClose} title="閉じる"><FaXmark size={28}/></button>
         </div>
      </div>

      {images.length > 1 && (
        <>
          <button className={`absolute left-6 w-14 h-14 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-all z-[1010] ${index === 0 ? 'opacity-0' : 'opacity-100'}`} onClick={handlePrev}><FaChevronLeft size={28}/></button>
          <button className={`absolute right-6 w-14 h-14 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-all z-[1010] ${index === images.length - 1 ? 'opacity-0' : 'opacity-100'}`} onClick={handleNext}><FaChevronRight size={28}/></button>
        </>
      )}

      <div className="relative max-w-[92vw] max-h-[88vh] flex items-center justify-center select-none animate-viewer-zoom">
        <img key={currentUrl} src={getProxyUrl(currentUrl)} onLoad={() => setIsLoaded(true)} className={`max-w-full max-h-full object-contain shadow-2xl transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} onClick={(e) => e.stopPropagation()} />
        {!isLoaded && <div className="absolute animate-spin h-10 w-10 border-4 border-discord-primary rounded-full border-t-transparent"></div>}
      </div>
    </div>
  );
};

export default ImageViewer;