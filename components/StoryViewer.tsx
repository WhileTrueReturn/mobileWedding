import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Story, InvitationData } from '../types';
import ProgressBar from './ProgressBar';

// TypeScript가 window 객체에 kakao 속성이 있을 수 있음을 인지하도록 합니다.
declare global {
  interface Window {
    kakao: any;
  }
}

// 카카오맵을 렌더링하는 독립적인 컴포넌트입니다.
const KakaoMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  useEffect(() => {
    if (!lat || !lng || !window.kakao?.maps) return;
    const container = document.getElementById('kakao-map-container');
    if (!container) return;
    const options = {
      center: new window.kakao.maps.LatLng(lat, lng),
      level: 4,
    };
    const map = new window.kakao.maps.Map(container, options);
    const markerPosition = new window.kakao.maps.LatLng(lat, lng);
    const marker = new window.kakao.maps.Marker({ position: markerPosition });
    marker.setMap(map);

    setTimeout(() => {
      map.relayout();
    }, 0);

  }, [lat, lng]);

  return <div id="kakao-map-container" className="w-full h-56 rounded-lg border bg-gray-100"></div>;
};

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => console.error('Copy failed', err));
    };
    return (
        <button onClick={handleCopy} className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">
            {copied ? '복사됨!' : '복사'}
        </button>
    );
};

interface StoryViewerProps {
  stories: (Story | { type: 'finalPage'; id: number; })[];
  invitationData: InvitationData;
  onClose: () => void;
  onRestart: () => void;
}

const DURATION = 3000;

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, invitationData, onClose, onRestart }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [navigationDirection, setNavigationDirection] = useState<'next' | 'prev' | null>(null);

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setNavigationDirection('next');
    } else {
      // 마지막 스토리에서 다음으로 넘기려고 하면 onClose를 호출 (선택적 동작)
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);
  
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setNavigationDirection('prev');
    }
  }, [currentIndex]);
  
  useEffect(() => {
    if (navigationDirection) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (navigationDirection === 'next') {
        setCurrentIndex(prev => prev + 1);
      } else if (navigationDirection === 'prev') {
        setCurrentIndex(prev => prev - 1);
      }
      setNavigationDirection(null);
    }
  }, [navigationDirection]);

  useEffect(() => {
    const currentStory = stories[currentIndex];
    if ('type' in currentStory && currentStory.type === 'finalPage') {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    
    if (isPaused || navigationDirection) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    
    const duration = ('duration' in currentStory ? currentStory.duration : DURATION) || DURATION;
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(handleNext, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, stories, isPaused, navigationDirection, handleNext]);
  
  const handleInteractionStart = () => setIsPaused(true);
  const handleInteractionEnd = () => setIsPaused(false);

  const currentStoryOrPage = stories[currentIndex];
  if (!currentStoryOrPage) return null;

  if ('type' in currentStoryOrPage && currentStoryOrPage.type === 'finalPage') {
    const { weddingLat, weddingLng, weddingLocation, transportationInfos, accounts } = invitationData;
    const groomAccounts = accounts.filter(a => a.type === 'groom');
    const brideAccounts = accounts.filter(a => a.type === 'bride');
    const locationNameEncoded = encodeURIComponent(weddingLocation);

    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center font-serif">
        <div className="w-full h-full max-w-[400px] max-h-[800px] bg-white rounded-lg shadow-2xl p-6 text-gray-800 flex flex-col overflow-y-auto">
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-center">오시는 길</h2>
            {(weddingLat && weddingLng) && (
              <>
                <KakaoMap lat={weddingLat} lng={weddingLng} />
                <div className="grid grid-cols-2 gap-2 mt-3">
                    <a href={`https://map.kakao.com/link/map/${locationNameEncoded},${weddingLat},${weddingLng}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-[#FEE500] text-black py-2 rounded-md text-sm font-bold">카카오맵</a>
                    <a href={`https://map.naver.com/v5/search/${locationNameEncoded}?lat=${weddingLat}&lng=${weddingLng}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-[#03C75A] text-white py-2 rounded-md text-sm font-bold">네이버지도</a>
                </div>
              </>
            )}
             <div className="mt-6 text-sm space-y-4">
                {(transportationInfos || []).map(info => (
                    <div key={info.id} className="text-left">
                        <p className="font-bold text-base mb-1">{info.title}</p>
                        <p className="text-gray-600 whitespace-pre-wrap">{info.description}</p>
                    </div>
                ))}
            </div>
          </div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">마음 전하실 곳</h2>
            <p className="text-sm text-gray-600 mb-8">
              참석이 어려우신 분들을 위해 계좌번호를 남깁니다.<br/>
              너그러운 마음으로 양해 부탁드립니다.
            </p>
            <div className="text-sm w-full max-w-xs mx-auto space-y-4">
              {groomAccounts.length > 0 && (
                <div className="text-left p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold mb-2 border-b border-gray-300 pb-1">신랑측</p>
                  {groomAccounts.map(acc => (
                    <div key={acc.id} className="mb-1">
                      <p>{acc.relationship} {acc.name}</p>
                      <p>{acc.bankName} {acc.accountNumber} <CopyButton textToCopy={acc.accountNumber} /></p>
                    </div>
                  ))}
                </div>
              )}
              {brideAccounts.length > 0 && (
                <div className="text-left p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold mb-2 border-b border-gray-300 pb-1">신부측</p>
                  {brideAccounts.map(acc => (
                    <div key={acc.id} className="mb-1">
                      <p>{acc.relationship} {acc.name}</p>
                      <p>{acc.bankName} {acc.accountNumber} <CopyButton textToCopy={acc.accountNumber} /></p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-auto pt-8 space-y-2">
            <button 
              onClick={onRestart}
              className="w-full bg-pink-500 text-white p-3 rounded-lg font-bold hover:bg-pink-600 transition-colors"
            >
              청첩장 다시보기
            </button>
            {/* ★★★★★ 변경점 1: '닫기' 버튼을 완전히 삭제합니다. ★★★★★ */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div 
        className="relative w-full h-full max-w-[400px] max-h-[800px] bg-gray-800 rounded-lg overflow-hidden shadow-2xl"
        onMouseDown={handleInteractionStart}
        onMouseUp={handleInteractionEnd}
        onMouseLeave={handleInteractionEnd}
        onTouchStart={handleInteractionStart}
        onTouchEnd={handleInteractionEnd}
      >
        <div style={{ display: 'none' }}>
          {stories.map(story => {
            if ('imageUrl' in story) {
              return <img key={`preload-${story.id}`} src={story.imageUrl} alt={`Preload story ${story.id}`} />;
            }
            return null;
          })}
        </div>

        <img src={currentStoryOrPage.imageUrl} alt="Story background" className="absolute w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>

        <ProgressBar 
          count={stories.length} 
          current={currentIndex} 
          duration={('duration' in currentStoryOrPage && currentStoryOrPage.duration) || DURATION}
          isPaused={isPaused}
          navigationDirection={navigationDirection}
        />
        
        <div 
          className="absolute top-0 left-0 bottom-0 w-[30%] z-20" 
          onClick={handlePrev}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        ></div>
        <div 
          className="absolute top-0 right-0 bottom-0 w-[70%] z-20" 
          onClick={handleNext}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        ></div>

        {/* ★★★★★ 변경점 2: 우측 상단의 'X' 버튼을 완전히 삭제합니다. ★★★★★ */}

        <div className="absolute inset-0 flex items-end justify-center p-4 pb-20 z-10">
          <div className="bg-black/30 backdrop-blur-sm px-6 py-4 rounded-xl text-white text-center font-serif text-shadow korean-wrap max-w-full">
            {currentStoryOrPage.content}
          </div>
        </div>
      </div>
      <style>{`
        .text-shadow { text-shadow: 0px 2px 4px rgba(0, 0, 0, 0.7); }
        .korean-wrap { word-break: keep-all; }
      `}</style>
    </div>
  );
};

export default StoryViewer;