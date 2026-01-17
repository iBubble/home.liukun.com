import { useEffect, useState } from 'react';
import { useModeStore } from '../../stores/modeStore';
import { getColors } from '../../styles/colors';

interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface CursorTrailProps {
  enabled: boolean;
  maxTrails?: number;
  fadeOutDuration?: number;
}

export default function CursorTrail({
  enabled,
  maxTrails = 5,
  fadeOutDuration = 2500,
}: CursorTrailProps) {
  const [trails, setTrails] = useState<TrailPoint[][]>([]);
  const [currentTrail, setCurrentTrail] = useState<TrailPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const { mode } = useModeStore();
  const colors = getColors(mode);

  const trailColor = mode === 'dream' ? colors.accent : colors.secondary;

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      const point: TrailPoint = {
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
      };

      setCurrentTrail((prev) => [...prev, point]);
      setIsDrawing(true);
    };

    const handleMouseStop = () => {
      if (currentTrail.length > 0) {
        setTrails((prev) => {
          const newTrails = [...prev, currentTrail];
          return newTrails.slice(-maxTrails);
        });
        setCurrentTrail([]);
      }
      setIsDrawing(false);
    };

    let timeout: NodeJS.Timeout;
    const handleMouseMoveWithDelay = (e: MouseEvent) => {
      handleMouseMove(e);
      clearTimeout(timeout);
      timeout = setTimeout(handleMouseStop, 100);
    };

    window.addEventListener('mousemove', handleMouseMoveWithDelay);

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveWithDelay);
      clearTimeout(timeout);
    };
  }, [enabled, currentTrail, maxTrails]);

  // 清除过期轨迹
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTrails((prev) =>
        prev.filter((trail) => {
          const lastPoint = trail[trail.length - 1];
          return now - lastPoint.timestamp < fadeOutDuration;
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [fadeOutDuration]);

  if (!enabled) return null;

  const renderPath = (points: TrailPoint[]) => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  const getOpacity = (trail: TrailPoint[]) => {
    const lastPoint = trail[trail.length - 1];
    const age = Date.now() - lastPoint.timestamp;
    return Math.max(0, 1 - age / fadeOutDuration);
  };

  return (
    <>
      {/* 自定义光标 */}
      <style>{`
        body {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M12 2 L12 8 M12 16 L12 22 M2 12 L8 12 M16 12 L22 12' stroke='${encodeURIComponent(trailColor)}' stroke-width='2'/%3E%3Ccircle cx='12' cy='12' r='3' fill='${encodeURIComponent(trailColor)}'/%3E%3C/svg%3E") 12 12, auto;
        }
      `}</style>

      {/* SVG 轨迹 */}
      <svg
        className="fixed inset-0 pointer-events-none z-50"
        style={{ width: '100vw', height: '100vh' }}
      >
        {/* 渲染所有轨迹 */}
        {trails.map((trail, index) => (
          <g key={`trail-${index}`} opacity={getOpacity(trail)}>
            <path
              d={renderPath(trail)}
              stroke={trailColor}
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
              strokeLinecap="round"
            />
            {/* 针脚效果 */}
            {trail.filter((_, i) => i % 10 === 0).map((point, i) => (
              <circle
                key={`stitch-${index}-${i}`}
                cx={point.x}
                cy={point.y}
                r="2"
                fill={trailColor}
              />
            ))}
          </g>
        ))}

        {/* 当前正在绘制的轨迹 */}
        {isDrawing && currentTrail.length > 1 && (
          <g>
            <path
              d={renderPath(currentTrail)}
              stroke={trailColor}
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
              strokeLinecap="round"
            />
            {currentTrail.filter((_, i) => i % 10 === 0).map((point, i) => (
              <circle
                key={`current-stitch-${i}`}
                cx={point.x}
                cy={point.y}
                r="2"
                fill={trailColor}
              />
            ))}
          </g>
        )}
      </svg>
    </>
  );
}
