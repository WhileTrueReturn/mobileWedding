import React from 'react';

interface ProgressBarProps {
  count: number;
  current: number;
  duration: number;
  isPaused: boolean;
  // ★★★★★ 변경점 1: prop 이름을 'navigationDirection'으로 변경 ★★★★★
  navigationDirection: 'next' | 'prev' | null;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ count, current, duration, isPaused, navigationDirection }) => {
  return (
    <div className="absolute top-2 left-0 right-0 flex items-center gap-1 z-10 px-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex-1 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
          
          {/* ★★★★★ 변경점 2: 렌더링 로직을 새 방식으로 수정 ★★★★★ */}
          
          {/* 이미 지나간 바 or 현재 바인데 다음으로 넘어갈 예정인 경우 -> 100% 채움 */}
          {(index < current || (index === current && navigationDirection === 'next')) && (
            <div className="h-full bg-white w-full" />
          )}

          {/* 현재 바이고, 넘어가는 중이 아닐 때 -> 애니메이션 실행 */}
          {index === current && !navigationDirection && (
            <div
              key={`${current}-${isPaused}`}
              className={`h-full bg-white ${isPaused ? 'paused' : ''}`}
              style={{ animation: `fill ${duration / 1000}s linear forwards` }}
            />
          )}

        </div>
      ))}
    </div>
  );
};

export default ProgressBar;