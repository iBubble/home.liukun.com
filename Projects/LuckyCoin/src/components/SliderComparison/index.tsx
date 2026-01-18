import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface SliderComparisonProps {
  dreamContent: {
    image: string;
    caption: string;
  };
  realityContent: {
    image: string;
    caption: string;
  };
  initialPosition?: number;
}

export default function SliderComparison({
  dreamContent,
  realityContent,
  initialPosition = 50,
}: SliderComparisonProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPosition = (x / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, newPosition)));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const newPosition = (x / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, newPosition)));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] overflow-hidden cursor-col-resize select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      {/* 梦境场景（左侧） */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <div className="relative w-full h-full">
          <img
            src={dreamContent.image}
            alt="Dream scene"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <p className="text-white text-xl font-chinese italic">
              {dreamContent.caption}
            </p>
          </div>
        </div>
      </div>

      {/* 现实场景（右侧） */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <div className="relative w-full h-full">
          <img
            src={realityContent.image}
            alt="Reality scene"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <p className="text-white text-xl font-chinese italic">
              {realityContent.caption}
            </p>
          </div>
        </div>
      </div>

      {/* 滑块手柄 */}
      <motion.div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-col-resize"
        style={{ left: `${position}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        whileHover={{ scale: 1.2 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex gap-1">
            <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-800" />
            <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-gray-800" />
          </div>
        </div>
      </motion.div>

      {/* 位置指示器 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-mono">
        {Math.round(position)}% / {Math.round(100 - position)}%
      </div>
    </div>
  );
}
