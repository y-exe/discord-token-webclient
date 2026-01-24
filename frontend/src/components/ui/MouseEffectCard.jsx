import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { useTheme } from "next-themes";

// ★ パラメータ調整
const DOT_SPACING = 16;       // ドットの間隔（さらに狭く）
const DOT_SIZE = 1.0;         // ドットのサイズ（さらに小さく）
const ANIMATION_SPEED = 0.04; // アニメーション速度

export default function MouseEffectCard({ className, children }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let dots = [];
    let animationFrameId;
    let time = 0;

    const resizeCanvas = () => {
        const container = containerRef.current;
        if (!container || !ctx) return;
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = container.offsetWidth * dpr;
        canvas.height = container.offsetHeight * dpr;
        ctx.scale(dpr, dpr);

        dots = [];
        const cols = Math.ceil(container.offsetWidth / DOT_SPACING);
        const rows = Math.ceil(container.offsetHeight / DOT_SPACING);

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                dots.push({
                    baseX: i * DOT_SPACING,
                    baseY: j * DOT_SPACING,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.4 + Math.random() * 0.6,
                    // ★ 基本の不透明度をさらに上げる
                    baseOpacity: 0.3 + Math.random() * 0.4 
                });
            }
        }
    };

    const animate = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        ctx.fillStyle = isDark ? 'rgba(128, 128, 128, 0.6)' : 'rgba(160, 160, 160, 0.6)';
        
        time += ANIMATION_SPEED;

        dots.forEach(dot => {
            const scale = (Math.sin(time * dot.speed + dot.phase) + 1) / 2;
            
            // ★ 不透明度の変化をより大きく
            ctx.globalAlpha = dot.baseOpacity + scale * 0.6;

            // ★ 円(arc)から四角形(fillRect)に変更
            ctx.fillRect(dot.baseX, dot.baseY, DOT_SIZE, DOT_SIZE);
        });

        animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
        cancelAnimationFrame(animationFrameId);
        observer.disconnect();
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden isolate", className)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}